const express = require('express');
const router = express.Router();
const FacturacionController = require('../../app/Http/Controllers/Tenant/FacturacionController');
const { requirePermission } = require('../../middleware/auth');

// GET /facturacion - Estado de la suscripción, historial de cobros, método de pago
router.get('/', requirePermission('facturacion.ver'), FacturacionController.index);

// POST /facturacion/metodo-pago - Guardar/actualizar la tarjeta (token ya generado en el frontend)
router.post('/metodo-pago', requirePermission('facturacion.editar'), FacturacionController.guardarMetodoPago);

// POST /facturacion/cobrar-ahora - Reintentar el cobro manualmente
router.post('/cobrar-ahora', requirePermission('facturacion.editar'), FacturacionController.cobrarAhora);

module.exports = router;
