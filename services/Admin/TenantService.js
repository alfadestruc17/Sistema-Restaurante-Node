const TenantCRUDService = require('./Tenant/TenantCRUDService');
const TenantSeederService = require('./Tenant/TenantSeederService');
const TenantStatsService = require('./Tenant/TenantStatsService');
const CrecimientoStatsService = require('./Tenant/CrecimientoStatsService');

class TenantService {
    static async getAllTenants() {
        return TenantCRUDService.getAllTenants();
    }

    static async createTenant(data) {
        return TenantCRUDService.createTenant(data);
    }

    static async seedInitialData(tenantId) {
        return TenantSeederService.seedInitialData(tenantId);
    }

    static async updateTenant(id, data) {
        return TenantCRUDService.updateTenant(id, data);
    }

    static async setTenantConfig(id, config) {
        return TenantCRUDService.setTenantConfig(id, config);
    }

    static async changeTenantStatus(id, activo) {
        return TenantCRUDService.changeTenantStatus(id, activo);
    }

    static async deleteTenant(id) {
        return TenantCRUDService.deleteTenant(id);
    }

    static async getDashboardStats() {
        return TenantStatsService.getDashboardStats();
    }

    static async getCrecimientoStats(options) {
        return CrecimientoStatsService.getCrecimientoStats(options);
    }

    static async getTenantById(id) {
        return TenantCRUDService.getTenantById(id);
    }
}

module.exports = TenantService;
