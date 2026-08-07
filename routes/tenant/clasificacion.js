const express = require('express');
const router = express.Router();
const ClasificacionController = require('../../app/Http/Controllers/Tenant/ClasificacionController');

// GET /clasificacion - Vista principal
router.get(['/', ''], ClasificacionController.index);

// GET /clasificacion/ranking - API: ranking de productos con filtros
router.get('/ranking', ClasificacionController.getRanking);

module.exports = router;
