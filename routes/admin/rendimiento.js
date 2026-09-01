const express = require('express');
const router = express.Router();
const RendimientoController = require('../../app/Http/Controllers/Admin/RendimientoController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Panel de rendimiento y crecimiento
router.get('/', RendimientoController.index);

module.exports = router;
