const SuscripcionService = require('../../../../services/Admin/SuscripcionService');
const WompiService = require('../../../../services/Shared/WompiService');

class FacturacionController {
    // GET /facturacion
    static async index(req, res) {
        try {
            const tenantId = req.tenant.id;
            const estado = await SuscripcionService.getEstado(tenantId);
            const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY || null;
            // El frontend tokeniza la tarjeta contra la API de Wompi con la
            // llave pública (GET /merchants/{key} + POST /tokens/cards); necesita
            // la URL base para no hardcodear el host sandbox/production.
            const wompiApiBase = wompiPublicKey ? WompiService.apiBaseUrl() : null;

            res.render('facturacion/index', {
                tenant: req.tenant,
                user: req.user,
                estado,
                wompiPublicKey,
                wompiApiBase
            });
        } catch (error) {
            console.error('Error cargando facturación:', error);
            res.status(500).render('errors/internal', { error: { message: 'Error cargando facturación' } });
        }
    }

    // POST /facturacion/metodo-pago
    // Body: { cardToken, acceptanceToken } -- el token de tarjeta (tok_...) y el
    // acceptance_token los genera el frontend contra la API de Wompi con la
    // llave pública (ver public/js/modulos/facturacion.js). Este backend nunca
    // ve datos de tarjeta cruda: solo cambia el token por un payment_source_id
    // reutilizable usando la llave privada.
    static async guardarMetodoPago(req, res) {
        try {
            const tenantId = req.tenant.id;
            const { cardToken, acceptanceToken } = req.body;
            if (!cardToken || !acceptanceToken) {
                return res.status(400).json({ error: 'cardToken y acceptanceToken requeridos' });
            }

            const customerEmail = req.tenant.email || req.user?.email || null;
            const paymentSourceId = await WompiService.crearFuenteDePago({
                token: cardToken,
                customerEmail,
                acceptanceToken
            });

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
