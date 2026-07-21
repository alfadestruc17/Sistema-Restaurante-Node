const FinanzasService = require('../../../../services/Tenant/FinanzasService');
const TemaRepository = require('../../../../repositories/Shared/TemaRepository');
const ParametroService = require('../../../../services/Shared/ParametroService');

class FinanzasController {
    /**
     * Vista principal del Dashboard Financiero
     */
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res
                    .status(403)
                    .render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
            }

            const dias = parseInt(req.query.dias) || 30;
            const data = await FinanzasService.getDashboardData(tenantId, dias);

            // Obtener categorías para el modal de nuevo gasto
            const temaFin = await TemaRepository.findByName('CATEGORIAS DE FINANZAS', tenantId);
            let categorias = [];
            if (temaFin) {
                categorias = await ParametroService.getByTemaId(temaFin.id, tenantId);
            }

            res.render('finanzas/index', {
                user: req.user,
                tenant: req.tenant,
                resumen: data,
                categorias,
                dias,
                allowedByPlan: res.locals.allowedByPlan || {}
            });
        } catch (e) {
            console.error('Error finanzas:', e);
            res.status(500).render('errors/internal', { error: e });
        }
    }

    /**
     * API para obtener datos de gráficos
     */
    static async getChartData(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const dias = parseInt(req.query.dias) || 30;
            const data = await FinanzasService.getDashboardData(tenantId, dias);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * Registra un movimiento manual (ingreso/egreso) desde el modal "Nueva Operación Financiera"
     */
    static async registrarMovimiento(req, res) {
        try {
            const tenantId = req.tenant?.id;
            const { monto, motivo, categoria, tipo } = req.body;
            const id = await FinanzasService.registrarMovimientoManual(tenantId, {
                monto,
                motivo,
                categoria,
                tipo,
                usuario_id: req.user?.id
            });
            res.status(201).json({ id });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
}

module.exports = FinanzasController;
