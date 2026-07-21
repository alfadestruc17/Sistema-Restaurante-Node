const express = require('express');
const router = express.Router();
const multer = require('multer');
const ProveedoresController = require('../../app/Http/Controllers/Tenant/ProveedoresController');
const { requirePermission } = require('../../middleware/auth');

// Configuración de Multer para facturas de proveedores
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // Máx 2 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato no permitido. Solo PDF, JPG o PNG.'));
        }
    }
});

// El fileFilter/límite de Multer llama a next(err) en vez de lanzar, así que
// sin este handler el error salía sin capturar hacia el 500 genérico global.
function manejarErrorUploadFactura(err, req, res, next) {
    if (!err) {
        return next();
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido (2MB)' });
    }
    return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
}

// --- Rutas de Proveedores ---

router.get('/', requirePermission('proveedores.ver'), ProveedoresController.index);
router.get('/:id', requirePermission('proveedores.ver'), ProveedoresController.show);
router.post('/', requirePermission('proveedores.editar'), ProveedoresController.store);
router.put('/:id', requirePermission('proveedores.editar'), ProveedoresController.update);
router.get('/:id/historial-costos', requirePermission('proveedores.ver'), ProveedoresController.getHistorialCostos);
router.delete('/:id', requirePermission('proveedores.editar'), ProveedoresController.destroy);

// --- Rutas de Facturas de Proveedores ---

// Listar facturas de un proveedor
router.get('/:id/facturas', requirePermission('proveedores.facturas'), ProveedoresController.listFacturas);

// Cargar nueva factura
router.post(
    '/:id/facturas',
    requirePermission('proveedores.facturas'),
    upload.single('archivo'),
    manejarErrorUploadFactura,
    ProveedoresController.storeFactura
);

// Ver/Descargar factura
router.get('/facturas/:facturaId/ver', requirePermission('proveedores.facturas'), ProveedoresController.showFactura);

// Eliminar factura
router.delete('/facturas/:facturaId', requirePermission('proveedores.facturas'), ProveedoresController.destroyFactura);

module.exports = router;
