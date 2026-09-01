const TenantService = require('../../../../services/Admin/TenantService');

const PERIODOS_VALIDOS = [7, 30, 90, 180, 365];

class RendimientoController {
    // GET /admin/rendimiento - Panel de crecimiento y comparación de ventas entre restaurantes
    static async index(req, res) {
        try {
            const periodoDias = PERIODOS_VALIDOS.includes(parseInt(req.query.periodo, 10))
                ? parseInt(req.query.periodo, 10)
                : 30;

            const stats = await TenantService.getCrecimientoStats({ periodoDias });

            res.render('admin/rendimiento', {
                user: req.user,
                stats,
                periodoDias,
                currentAdminPage: 'rendimiento'
            });
        } catch (error) {
            console.error('Error al cargar el panel de rendimiento:', error);
            res.status(500).render('errors/internal', { error });
        }
    }
}

module.exports = RendimientoController;
