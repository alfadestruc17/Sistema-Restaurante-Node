const ClasificacionService = require('../../../../services/Tenant/ClasificacionService');
const logger = require('../../../../utils/logger');

class ClasificacionController {
    // GET /clasificacion
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res
                    .status(403)
                    .render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
            }
            const categorias = await ClasificacionService.getCategorias(tenantId);
            res.render('clasificacion/index', { user: req.user, tenant: req.tenant, categorias });
        } catch (error) {
            logger.error('Error al cargar clasificación', { error: error.message, stack: error.stack });
            res.status(500).render('errors/internal', {
                error: { message: 'Error al cargar clasificación', stack: error.stack }
            });
        }
    }

    // GET /clasificacion/ranking
    static async getRanking(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const filters = {
                desde: req.query.desde || undefined,
                hasta: req.query.hasta || undefined,
                categoria_id: req.query.categoria_id ? Number.parseInt(req.query.categoria_id) : undefined
            };
            const ranking = await ClasificacionService.getRanking(tenantId, filters);
            res.json(ranking);
        } catch (error) {
            logger.error('Error al obtener ranking de clasificación', { error: error.message });
            res.status(500).json({ error: 'Error al obtener el ranking' });
        }
    }
}

module.exports = ClasificacionController;
