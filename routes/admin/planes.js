const express = require('express');
const router = express.Router();
const PlanesController = require('../../app/Http/Controllers/Admin/PlanesController');

// Guard de superadmin aplicado en routes/web.js (requireRole(ROLES.SUPERADMIN))

// GET / - Vista principal
router.get('/', PlanesController.index);

// API Planes & Precios
router.put('/api/planes/:id/precios', PlanesController.updatePrices);
router.put('/api/planes/:id', PlanesController.updateGeneral);
router.get('/exportar-pdf', PlanesController.exportPdf);

// API Add-ons
router.get('/api/addons', PlanesController.listAddons);
router.put('/api/addons/:id', PlanesController.updateAddon);

// API Tenant Add-ons & Tamano
router.get('/api/tenant/:tenantId/addons', PlanesController.getTenantAddons);
router.post('/api/tenant/:tenantId/addons', PlanesController.addAddonToTenant);
router.delete('/api/tenant/:tenantId/addons/:addonId', PlanesController.removeAddonFromTenant);
router.put('/api/tenant/:tenantId/tamano', PlanesController.updateTenantTamano);

module.exports = router;
