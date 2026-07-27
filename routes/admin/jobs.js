const express = require('express');
const router = express.Router();
const JobsController = require('../../app/Http/Controllers/Admin/JobsController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET /admin/jobs/:id - estado del job (polling)
router.get('/:id', JobsController.show);

// GET /admin/jobs/:id/download - descarga el resultado ya generado
router.get('/:id/download', JobsController.download);

module.exports = router;
