const express = require('express');
const router = express.Router();
const CocinaController = require('../../app/Http/Controllers/Tenant/CocinaController');

// GET /cocina - Cola cocina vista
router.get('/', CocinaController.index);

// API Cola
router.get('/cola', CocinaController.getQueue);

// API Estado item
router.put('/item/:id/estado', CocinaController.updateItemEstado);

// API Lote
router.put('/preparar-lote', CocinaController.updateGroupEstado);

// API Completar pedido de mostrador (POS)
router.put('/pedidos/:pedidoId/completar', CocinaController.completarPedidoPOS);

module.exports = router;
