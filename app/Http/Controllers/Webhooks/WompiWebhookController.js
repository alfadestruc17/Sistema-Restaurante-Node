const WompiService = require('../../../../services/Shared/WompiService');
const SuscripcionService = require('../../../../services/Admin/SuscripcionService');

class WompiWebhookController {
    // POST /webhooks/wompi
    // Endpoint público (sin auth) llamado por Wompi. Debe responder 200 rápido
    // -- si no, Wompi reintenta hasta 3 veces en 24h.
    static async handle(req, res) {
        const payload = req.body;

        let firmaValida;
        try {
            firmaValida = WompiService.verificarFirmaWebhook(payload);
        } catch (err) {
            console.error('Error verificando firma de webhook Wompi:', err.message);
            return res.status(401).json({ error: 'Firma inválida' });
        }

        if (!firmaValida) {
            console.error('Webhook Wompi con firma inválida, ignorado');
            return res.status(401).json({ error: 'Firma inválida' });
        }

        // Responder 200 de inmediato; procesar después no bloquea la respuesta
        // a Wompi (el manejo es liviano, solo unos pocos UPDATE/INSERT).
        res.status(200).json({ ok: true });

        try {
            const transaction = payload?.data?.transaction;
            if (transaction?.reference && transaction?.status) {
                await SuscripcionService.finalizarPago({
                    reference: transaction.reference,
                    transactionId: transaction.id,
                    status: transaction.status,
                    rawPayload: payload
                });
            }
        } catch (err) {
            console.error('Error procesando webhook Wompi:', err.message);
        }
    }
}

module.exports = WompiWebhookController;
