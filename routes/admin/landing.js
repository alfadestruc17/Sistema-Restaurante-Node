const express = require('express');
const router = express.Router();
const LandingController = require('../../app/Http/Controllers/Admin/LandingController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista del editor
router.get('/', LandingController.index);

// POST / - Actualizar ajustes
router.post('/', LandingController.update);

module.exports = router;
