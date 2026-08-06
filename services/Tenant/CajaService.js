const CajaRepository = require('../../repositories/Tenant/CajaRepository');

class CajaService {
    static async getEstadoCaja(tenantId) {
        const sesion = await CajaRepository.getSesionAbierta(tenantId);
        if (!sesion) {
            return { abierta: false };
        }

        const stats = await CajaRepository.getEstadisticasSesion(sesion.id);

        const teoricoEfectivo =
            Number.parseFloat(sesion.monto_inicial_efectivo) +
            Number.parseFloat(stats.ventas_efectivo) +
            Number.parseFloat(stats.entradas) -
            Number.parseFloat(stats.salidas);
        const teoricoTransferencia =
            Number.parseFloat(sesion.monto_inicial_transferencia) + Number.parseFloat(stats.ventas_transferencia);
        const montoTeorico = teoricoEfectivo + teoricoTransferencia;

        return {
            abierta: true,
            sesion: {
                ...sesion,
                ...stats,
                monto_final_teorico_efectivo: teoricoEfectivo,
                monto_final_teorico_transferencia: teoricoTransferencia,
                monto_final_teorico: montoTeorico
            }
        };
    }

    static async abrirCaja(tenantId, usuarioId, data) {
        const abierta = await CajaRepository.getSesionAbierta(tenantId);
        if (abierta) {
            throw new Error('Ya existe un turno abierto');
        }

        const efectivo = Number.parseFloat(data.monto_inicial_efectivo) || 0;
        const transferencia = Number.parseFloat(data.monto_inicial_transferencia) || 0;
        return await CajaRepository.abrirSesion(tenantId, usuarioId, efectivo, transferencia, data.notas);
    }

    static async cerrarCaja(tenantId, sesionId, data) {
        const montoReal = Number.parseFloat(data.monto_final_real) || 0;
        return await CajaRepository.cerrarSesion(sesionId, tenantId, montoReal, data.notas);
    }

    static async registrarMovimiento(tenantId, sesionId, usuarioId, data) {
        return await CajaRepository.registrarMovimiento(
            tenantId,
            sesionId,
            usuarioId,
            data.tipo,
            Number.parseFloat(data.monto),
            data.motivo
        );
    }

    static async getHistorial(tenantId) {
        return await CajaRepository.getHistorial(tenantId);
    }

    /**
     * true si conviene avisar al usuario que no hay turno de caja abierto:
     * solo para tenants que alguna vez han usado el módulo (si nunca lo han
     * usado, mostrar el aviso sería imponerles un flujo que no quieren).
     */
    static async debeAvisarCajaCerrada(tenantId) {
        const abierta = await CajaRepository.getSesionAbierta(tenantId);
        if (abierta) {
            return false;
        }
        return await CajaRepository.hasHistorial(tenantId);
    }
}

module.exports = CajaService;
