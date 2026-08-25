const express = require('express');
const router = express.Router();
const OnboardingController = require('../../app/Http/Controllers/Admin/OnboardingController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

router.get('/', OnboardingController.index);
router.post('/tenants/:id/aprobar', OnboardingController.aprobarTenant);
router.post('/tenants/:id/rechazar', OnboardingController.rechazarTenant);
router.post('/usuarios/:id/reenviar', OnboardingController.reenviarVerificacion);
router.delete('/usuarios/:id', OnboardingController.eliminarUsuarioPendiente);

module.exports = router;
