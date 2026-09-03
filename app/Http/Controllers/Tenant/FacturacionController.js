const SuscripcionService = require('../../../../services/Admin/SuscripcionService');
const WompiService = require('../../../../services/Shared/WompiService');

class FacturacionController {
    // GET /facturacion
    static async index(req, res) {
        try {
            const tenantId = req.tenant.id;
            const estado = await SuscripcionService.getEstado(tenantId);
            const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY || null;

            // Referencia + firma de integridad para el Widget de Checkout, generadas
            // aquí (nunca en el frontend) porque requieren WOMPI_INTEGRITY_SECRET,
            // que no debe salir del backend. Solo tienen sentido si hay un monto
            // real que cobrar en la primera activación.
            let checkoutSetup = null;
            const amountInCents = Math.round(Number((estado && estado.montoTotal) || 0) * 100);
            if (wompiPublicKey && amountInCents > 0) {
                try {
                    const reference = `sub-setup-${tenantId}-${Date.now()}`;
                    const signature = WompiService.firmarIntegridad({ reference, amountInCents, currency: 'COP' });
                    checkoutSetup = { reference, signature, amountInCents };
                } catch (err) {
                    console.error('No se pudo generar la firma de integridad de Wompi:', err.message);
                }
            }

            res.render('facturacion/index', {
                tenant: req.tenant,
                user: req.user,
                estado,
                wompiPublicKey,
                checkoutSetup
            });
        } catch (error) {
            console.error('Error cargando facturación:', error);
            res.status(500).render('errors/internal', { error: { message: 'Error cargando facturación' } });
        }
    }

    // POST /facturacion/metodo-pago
    // Body: { paymentSourceId } -- ya generado por el Widget de Checkout de
    // Wompi en el frontend (ver public/js/modulos/facturacion.js).
    static async guardarMetodoPago(req, res) {
        try {
            const tenantId = req.tenant.id;
            const { paymentSourceId } = req.body;
            if (!paymentSourceId) {
                return res.status(400).json({ error: 'paymentSourceId requerido' });
            }
            await SuscripcionService.registrarMetodoPago(tenantId, { paymentSourceId });
            res.json({ ok: true });
        } catch (error) {
            console.error('Error guardando método de pago:', error);
            res.status(400).json({ error: error.message || 'Error al guardar el método de pago' });
        }
    }

    // POST /facturacion/cobrar-ahora
    static async cobrarAhora(req, res) {
        try {
            const tenantId = req.tenant.id;
            await SuscripcionService.cobrarAhora(tenantId, req.user?.id || null);
            res.json({ ok: true, mensaje: 'Cobro iniciado. El resultado se actualizará en unos segundos.' });
        } catch (error) {
            console.error('Error al cobrar ahora:', error);
            res.status(400).json({ error: error.message || 'Error al iniciar el cobro' });
        }
    }
}

module.exports = FacturacionController;
