const express = require('express');
const router = express.Router();
const OnboardingController = require('../app/Http/Controllers/OnboardingController');
const { requireAuth, requireOnboarding } = require('../middleware/auth');

// GET /onboarding/crear-local - Vista
router.get('/crear-local', requireAuth, requireOnboarding, OnboardingController.showCrearLocal);

// POST /onboarding/crear-local - Logic
router.post('/crear-local', requireAuth, requireOnboarding, OnboardingController.crearLocal);

// GET /onboarding/pendiente - Confirmación tras crear el local
router.get('/pendiente', requireAuth, OnboardingController.showPendiente);

module.exports = router;
