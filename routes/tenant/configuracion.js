const express = require('express');
const router = express.Router();
const multer = require('multer');
const ConfiguracionController = require('../../app/Http/Controllers/Tenant/ConfiguracionController');
const BaseRequest = require('../../app/Http/Requests/BaseRequest');
const StoreConfiguracionRequest = require('../../app/Http/Requests/Tenant/StoreConfiguracionRequest');

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)) {
            return cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, gif, webp)'));
        }
        cb(null, true);
    }
});

function manejarErrorUpload(err, req, res, next) {
    if (!err) {
        return next();
    }
    return res.status(400).render('errors/generic', {
        error: {
            message:
                err.message === 'File too large' ? 'La imagen supera el tamaño máximo permitido (5MB)' : err.message
        },
        tenant: req.tenant || null,
        user: req.user || null
    });
}

// GET /configuracion - Vista principal
router.get('/', ConfiguracionController.index);

// POST /configuracion - Guardar config
router.post(
    '/',
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'qr', maxCount: 1 }
    ]),
    manejarErrorUpload,
    BaseRequest.validate(StoreConfiguracionRequest),
    ConfiguracionController.store
);

// Helpers
router.get('/impresoras', ConfiguracionController.getPrinters);
router.get('/preview', ConfiguracionController.preview);

module.exports = router;
