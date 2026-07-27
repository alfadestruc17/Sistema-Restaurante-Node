const express = require('express');
const router = express.Router();
const ReportesController = require('../../app/Http/Controllers/Admin/ReportesController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista principal para exportación de reportes
router.get('/', ReportesController.index);

// GET /exportar-pdf - Generación y descarga del PDF consolidado
router.get('/exportar-pdf', ReportesController.exportPdf);

module.exports = router;
