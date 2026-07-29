const express = require('express');
const router = express.Router();
const ModificadoresController = require('../../app/Http/Controllers/Tenant/ModificadoresController');
const { requirePermission } = require('../../middleware/auth');

// GET /modificadores - Vista principal
router.get('/', ModificadoresController.index);

// API Grupos
router.get('/api/grupos', ModificadoresController.list);
router.get('/api/grupos/:id', ModificadoresController.show);
router.post('/api/grupos', requirePermission('modificadores.editar'), ModificadoresController.store);
router.put('/api/grupos/:id', requirePermission('modificadores.editar'), ModificadoresController.update);
router.delete('/api/grupos/:id', requirePermission('modificadores.editar'), ModificadoresController.destroy);

// API Asignación a productos
router.get('/api/productos/:productoId/grupos', ModificadoresController.getGruposDeProducto);
router.put(
    '/api/productos/:productoId/grupos',
    requirePermission('modificadores.editar'),
    ModificadoresController.setGruposDeProducto
);

// API Helpers
router.get('/api/productos', ModificadoresController.listProductos);
router.get('/api/insumos', ModificadoresController.listInsumos);

module.exports = router;
