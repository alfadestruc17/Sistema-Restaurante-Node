const express = require('express');
const router = express.Router();
const WompiWebhookController = require('../app/Http/Controllers/Webhooks/WompiWebhookController');

// Sin middleware de auth: es un endpoint público que llama Wompi directamente.
// La autenticidad se valida por firma (WompiService.verificarFirmaWebhook),
// no por sesión/cookie.
router.post('/wompi', WompiWebhookController.handle);

module.exports = router;
