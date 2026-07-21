const express = require('express');
const router = express.Router();
const FinanzasController = require('../../app/Http/Controllers/Tenant/FinanzasController');
const { requirePermission } = require('../../middleware/auth');

// GET /finanzas - Vista principal
router.get('/', requirePermission('finanzas.ver'), FinanzasController.index);

// API para gráficos
router.get('/api/chart-data', requirePermission('finanzas.ver'), FinanzasController.getChartData);

// Registrar un movimiento manual (ingreso/egreso) desde el módulo de Finanzas
router.post('/api/movimientos', requirePermission('finanzas.ver'), FinanzasController.registrarMovimiento);

module.exports = router;
