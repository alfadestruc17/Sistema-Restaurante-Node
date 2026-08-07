/**
 * ClasificacionService - Ranking de productos más vendidos (unidades + total generado),
 * con filtros de fecha y categoría. Related to: routes/tenant/clasificacion.js,
 * repositories/Tenant/Stats/ProductStatsRepository.js
 */

const ProductStatsRepository = require('../../repositories/Tenant/Stats/ProductStatsRepository');
const CategoryService = require('../Admin/CategoryService');

class ClasificacionService {
    static async getRanking(tenantId, filters = {}) {
        return ProductStatsRepository.getRankingProductos(tenantId, filters);
    }

    static async getCategorias(tenantId) {
        return CategoryService.getAllActive(tenantId);
    }
}

module.exports = ClasificacionService;
