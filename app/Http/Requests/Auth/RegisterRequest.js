const { body } = require('express-validator');
const BaseRequest = require('../BaseRequest');

class RegisterRequest extends BaseRequest {
    /**
     * Define validation rules for public self-registration
     * @returns {Array} Array of express-validator rules
     */
    static rules() {
        return [
            body('nombre_completo')
                .notEmpty()
                .withMessage('El nombre completo es requerido')
                .trim()
                .isLength({ max: 100 })
                .withMessage('El nombre no puede exceder 100 caracteres'),

            body('username')
                .notEmpty()
                .withMessage('El nombre de usuario es requerido')
                .trim()
                .isLength({ min: 3, max: 50 })
                .withMessage('El usuario debe tener entre 3 y 50 caracteres')
                .matches(/^[a-zA-Z0-9._-]+$/)
                .withMessage('El usuario solo puede contener letras, números, puntos, guiones y guión bajo'),

            body('email')
                .notEmpty()
                .withMessage('El correo electrónico es requerido')
                .isEmail()
                .withMessage('Correo electrónico inválido')
                .normalizeEmail(),

            body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),

            body('password_confirm').custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Las contraseñas no coinciden');
                }
                return true;
            })
        ];
    }
}

module.exports = RegisterRequest;
