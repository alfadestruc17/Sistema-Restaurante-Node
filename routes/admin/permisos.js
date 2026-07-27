const express = require('express');
const router = express.Router();
const PermisosController = require('../../app/Http/Controllers/Admin/PermisosController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista principal
router.get('/', PermisosController.index);

// API Usuarios por tenant
router.get('/usuarios', PermisosController.listUsuarios);

// API Permisos por usuario
router.get('/usuario/:userId', PermisosController.getUsuarioPermisos);
router.put('/usuario/:userId', PermisosController.updateUsuarioPermisos);

module.exports = router;
