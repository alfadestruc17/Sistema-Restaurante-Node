const TenantService = require('../../../../services/Admin/TenantService');
const VentaService = require('../../../../services/Tenant/VentaService');
const FacturaRepository = require('../../../../repositories/Tenant/FacturaRepository');

class VentasController {
    // GET /admin/ventas
    static async index(req, res) {
        try {
            const tenants = await TenantService.getAllTenants();
            let activeTenantId = req.query.tenantId;
            if (!activeTenantId) {
                activeTenantId = 'all'; // Default to all so they see all 474+ invoices!
            } else if (activeTenantId !== 'all') {
                activeTenantId = Number(activeTenantId);
            }

            let ventas = [];
            if (activeTenantId) {
                ventas = await VentaService.getWithFilters(activeTenantId, {
                    desde: req.query.desde || undefined,
                    hasta: req.query.hasta || undefined,
                    q: req.query.q || undefined
                });
            }
            res.render('admin/ventas', {
                user: req.user,
                tenants,
                ventas,
                activeTenantId
            });
        } catch (error) {
            console.error('Error al cargar ventas admin:', error);
            res.status(500).render('errors/internal', { error });
        }
    }

    // DELETE /admin/ventas/:id
    static async destroy(req, res) {
        try {
            const facturaId = parseInt(req.params.id);
            if (!facturaId) {
                return res.status(400).json({ error: 'ID inválido' });
            }
            const result = await FacturaRepository.deleteById(facturaId);
            if (!result.deleted) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }
            res.json({ success: true, message: 'Venta eliminada correctamente' });
        } catch (error) {
            console.error('Error al eliminar venta:', error);
            res.status(500).json({ error: error.message || 'Error al eliminar' });
        }
    }

    // GET /admin/ventas/:id - Datos editables para el modal de "Modificar venta"
    static async edit(req, res) {
        try {
            const facturaId = parseInt(req.params.id);
            if (!facturaId) {
                return res.status(400).json({ error: 'ID inválido' });
            }
            const factura = await FacturaRepository.getEditableById(facturaId);
            if (!factura) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }
            res.json(factura);
        } catch (error) {
            console.error('Error al obtener venta para editar:', error);
            res.status(500).json({ error: 'Error al obtener venta' });
        }
    }

    // PUT /admin/ventas/:id - Guardar cambios (uso exclusivo de superadmin)
    static async update(req, res) {
        try {
            const facturaId = parseInt(req.params.id);
            if (!facturaId) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const { cliente_nombre, forma_pago, total, propina, fecha } = req.body || {};

            const formasValidas = ['efectivo', 'transferencia', 'mixto'];
            if (!formasValidas.includes(forma_pago)) {
                return res.status(400).json({ error: 'Forma de pago inválida' });
            }
            const totalNum = Number(total);
            const propinaNum = Number(propina || 0);
            if (!Number.isFinite(totalNum) || totalNum < 0) {
                return res.status(400).json({ error: 'Total inválido' });
            }
            if (!Number.isFinite(propinaNum) || propinaNum < 0) {
                return res.status(400).json({ error: 'Propina inválida' });
            }
            if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
                return res.status(400).json({ error: 'Fecha inválida' });
            }

            const result = await FacturaRepository.updateAdmin(facturaId, {
                cliente_nombre,
                forma_pago,
                total: totalNum,
                propina: propinaNum,
                fecha: fecha.replace('T', ' ') + ':00'
            });
            if (!result.updated) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }
            res.json({ success: true, message: 'Venta actualizada correctamente' });
        } catch (error) {
            console.error('Error al actualizar venta:', error);
            res.status(500).json({ error: error.message || 'Error al actualizar' });
        }
    }
}

module.exports = VentasController;
