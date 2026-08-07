const express = require('express');
const router = express.Router();
const VentasController = require('../../app/Http/Controllers/Admin/VentasController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista principal
router.get('/', VentasController.index);

// GET /:id - Datos editables de una factura (modal Modificar)
router.get('/:id', VentasController.edit);

// PUT /:id - Modificar factura
router.put('/:id', VentasController.update);

// DELETE /:id - Eliminar factura
router.delete('/:id', VentasController.destroy);

module.exports = router;
