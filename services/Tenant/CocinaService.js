/**
 * CocinaService - Business logic layer for kitchen
 * Handles kitchen queue business logic
 * Related to: routes/cocina.js, repositories/CocinaRepository.js
 */

const CocinaRepository = require('../../repositories/Tenant/CocinaRepository');

class CocinaService {
    /**
     * Get kitchen queue
     * @returns {Promise<Array>} Array of kitchen items
     */
    static async getQueue(tenantId) {
        return await CocinaRepository.getQueue(tenantId);
    }

    /**
     * Update item state in kitchen (item must belong to tenant)
     * @param {number} id - Item ID
     * @param {number} tenantId - Tenant ID
     * @param {string} estado - New state ('preparando' or 'listo')
     * @returns {Promise<Object>} Update result
     * @throws {Error} If invalid state or item not found
     */
    static async updateItemEstado(id, tenantId, estado) {
        const permitidos = ['preparando', 'listo'];
        if (!permitidos.includes(estado)) {
            throw new Error('Estado inválido');
        }

        const result = await CocinaRepository.updateItemEstado(id, tenantId, estado);
        if (result.affectedRows === 0) {
            throw new Error('Item no encontrado o en estado no válido');
        }

        return { message: 'Estado actualizado' };
    }

    static async updateGroupEstado(tenantId, productoNombre, nota, estado, modificadoresHash) {
        const permitidos = ['preparando', 'listo'];
        if (!permitidos.includes(estado)) {
            throw new Error('Estado inválido');
        }

        return await CocinaRepository.updateGroupEstado(tenantId, productoNombre, nota, estado, modificadoresHash);
    }
}

module.exports = CocinaService;
