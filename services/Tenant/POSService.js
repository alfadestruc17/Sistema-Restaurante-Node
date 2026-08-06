const POSRepository = require('../../repositories/Tenant/POSRepository');

class POSService {
    static async getProductosForPOS(tenantId) {
        const productos = await POSRepository.getProductosActivos(tenantId);

        const categoriasMap = new Map();
        for (const p of productos) {
            if (p.categoria_id && !categoriasMap.has(p.categoria_id)) {
                categoriasMap.set(p.categoria_id, {
                    id: p.categoria_id,
                    nombre: p.categoria_nombre
                });
            }
        }

        return { productos, categorias: [...categoriasMap.values()] };
    }

    static async getBorradores(tenantId, usuarioId) {
        return POSRepository.getBorradores(tenantId, usuarioId);
    }

    /**
     * Guarda una orden ("Guardar" en el terminal POS) y la envía a cocina de inmediato,
     * usando el nombre del cliente como identificador del pedido en la cola. Si el carrito
     * ya venía de un borrador previamente enviado a cocina (se cargó con "Cargar" y se
     * vuelve a guardar sin cobrar), no se duplica el envío: se reutiliza el mismo pedido.
     */
    static async saveBorrador(tenantId, usuarioId, data, puedeUsarModificadores = true) {
        if (!data.items || !data.items.length) {
            throw new Error('La orden no tiene productos');
        }

        let pedidoCocinaId = data.pedido_cocina_id || null;
        let mesaCocinaId = data.mesa_cocina_id || null;

        if (!pedidoCocinaId) {
            const nombreCliente = (data.nombre_cliente || '').trim();
            const nombrePedido =
                nombreCliente && nombreCliente.toLowerCase() !== 'consumidor final' ? nombreCliente : null;

            const cocina = await this.enviarACocina(tenantId, {
                productos: data.items,
                nombrePedido,
                clienteId: data.cliente_id || null,
                puedeUsarModificadores
            });
            pedidoCocinaId = cocina?.pedidoId || null;
            mesaCocinaId = cocina?.mesaId || null;
        }

        const id = await POSRepository.createBorrador(tenantId, usuarioId, {
            ...data,
            pedido_cocina_id: pedidoCocinaId,
            mesa_cocina_id: mesaCocinaId
        });
        return { id };
    }

    /**
     * Elimina una orden guardada. Si tenía un pedido de cocina asociado (ya se había
     * enviado al guardarla) y no se está solo "cargando" de vuelta al carrito
     * (skipCocina), ese pedido se cancela y sale de la cola también.
     */
    static async deleteBorrador(id, tenantId, { skipCocina = false } = {}) {
        const deleted = await POSRepository.deleteBorrador(id, tenantId);
        if (!deleted) {
            return false;
        }

        if (!skipCocina && deleted.pedidoCocinaId) {
            try {
                const CocinaService = require('./CocinaService');
                await CocinaService.cancelarPedidoPOS(deleted.pedidoCocinaId, tenantId);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error al cancelar pedido de cocina al eliminar borrador POS:', err);
            }
        }

        return true;
    }

    static async getStatsHoy(tenantId) {
        return POSRepository.getStatsHoy(tenantId);
    }

    static async findOrCreateCliente(tenantId, nombre) {
        return POSRepository.findOrCreateCliente(tenantId, nombre.trim() || 'Consumidor final');
    }

    /**
     * Envía una orden del POS a la cola de cocina (ver saveBorrador). Best-effort: si
     * falla, no debe tumbar el guardado de la orden, solo se registra el error.
     * Los items vienen tal cual del carrito (crudos, con modificadores_seleccion sin
     * resolver), así que aquí se resuelve el precio/nombre de cada topping contra el
     * catálogo antes de mandarlos al repository, igual que hace FacturaService.create.
     */
    static async enviarACocina(tenantId, { productos, nombrePedido, clienteId, puedeUsarModificadores = true }) {
        try {
            const ModificadorService = require('./ModificadorService');
            const itemsResueltos = await Promise.all(
                (productos || [])
                    .filter(p => !p.es_servicio && p.producto_id)
                    .map(async p => {
                        const { lineasSnapshot } = await ModificadorService.validarYCalcularSeleccion(
                            tenantId,
                            p.producto_id,
                            p.modificadores_seleccion || [],
                            { permitido: puedeUsarModificadores }
                        );
                        return { ...p, _modificadoresSnapshot: lineasSnapshot };
                    })
            );

            const result = await POSRepository.enviarPedidoACocina(tenantId, {
                productos: itemsResueltos,
                nombrePedido,
                clienteId
            });
            if (result) {
                const WhatsAppService = require('./WhatsAppService');
                WhatsAppService.events.emit('orderCreated', {
                    tenantId,
                    pedidoId: result.pedidoId,
                    mesaId: result.mesaId,
                    action: 'items_updated'
                });
            }
            return result;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error al enviar pedido POS a cocina:', err);
            return null;
        }
    }
}

module.exports = POSService;
