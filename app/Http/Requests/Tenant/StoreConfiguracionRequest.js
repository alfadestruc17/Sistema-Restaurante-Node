const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class StoreConfiguracionRequest extends BaseRequest {
    /**
     * Define validation rules for tenant configuration
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('nombre_negocio')
                .notEmpty()
                .withMessage('El nombre del negocio es obligatorio')
                .trim()
                .isLength({ max: 100 })
                .withMessage('El nombre no puede exceder 100 caracteres'),

            body('nit')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 30 })
                .withMessage('El NIT no puede exceder 30 caracteres'),

            body('direccion')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 200 })
                .withMessage('La dirección no puede exceder 200 caracteres'),

            body('telefono')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 30 })
                .withMessage('El teléfono no puede exceder 30 caracteres'),

            body('pie_pagina')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 300 })
                .withMessage('El pie de página no puede exceder 300 caracteres'),

            body('ancho_papel')
                .optional({ checkFalsy: true })
                .isInt({ min: 58, max: 80 })
                .withMessage('El ancho del papel debe estar entre 58 y 80 mm'),

            body('font_size')
                .optional({ checkFalsy: true })
                .isInt({ min: 1, max: 2 })
                .withMessage('Tamaño de fuente inválido'),

            body('impresora_nombre')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 150 })
                .withMessage('El nombre de la impresora no puede exceder 150 caracteres'),

            body('cajon_comando_hex')
                .optional({ checkFalsy: true })
                .trim()
                .matches(/^([0-9A-Fa-f]{2}\s?)+$/)
                .withMessage('El comando del cajón debe ser una secuencia hexadecimal (ej: 1B 70 00 19 FA)')
        ];
    }
}

module.exports = StoreConfiguracionRequest;
