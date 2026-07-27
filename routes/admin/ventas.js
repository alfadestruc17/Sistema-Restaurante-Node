const express = require('express');
const router = express.Router();
const VentasController = require('../../app/Http/Controllers/Admin/VentasController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista principal
router.get('/', VentasController.index);

// DELETE /:id - Eliminar factura
router.delete('/:id', VentasController.destroy);

module.exports = router;
