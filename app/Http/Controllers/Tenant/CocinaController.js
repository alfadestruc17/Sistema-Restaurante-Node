const CocinaService = require('../../../../services/Tenant/CocinaService');

class CocinaController {
    // GET /cocina
    static async index(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res
                    .status(403)
                    .render('errors/internal', { error: { message: 'Contexto de tenant no disponible' } });
            }

            let items = await CocinaService.getQueue(tenantId);

            // Filtrado por permisos
            if (req.user && req.user.rol !== 'admin') {
                const canSeeAll = req.user.permisos?.includes('cocina.ver_todo');
                const canSeeReady = req.user.permisos?.includes('cocina.ver_listos');

                if (!canSeeAll) {
                    // Si no puede ver todo, le quitamos lo que no esté listo
                    items = items.filter(it => it.estado === 'listo');
                }
                if (!canSeeReady && !canSeeAll) {
                    // Si no puede ver listos ni todo, pues nada (aunque debería tener al menos uno si entró aquí)
                    items = [];
                }
            }

            res.render('cocina/index', {
                items: items || [],
                user: req.user,
                tenant: req.tenant
            });
        } catch (error) {
            console.error('Error al cargar cocina:', error);
            res.status(500).render('errors/internal', {
                error: { message: 'Error al cargar cocina', stack: error.stack }
            });
        }
    }

    // GET /cocina/cola
    static async getQueue(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }

            let items = await CocinaService.getQueue(tenantId);

            // Filtrado por permisos
            if (req.user && req.user.rol !== 'admin') {
                const canSeeAll = req.user.permisos?.includes('cocina.ver_todo');
                const canSeeReady = req.user.permisos?.includes('cocina.ver_listos');

                if (!canSeeAll) {
                    items = items.filter(it => it.estado === 'listo');
                }
                if (!canSeeReady && !canSeeAll) {
                    items = [];
                }
            }

            res.json(items);
        } catch (error) {
            console.error('Error al obtener cola:', error);
            res.status(500).json({ error: 'Error al obtener cola' });
        }
    }

    // PUT /cocina/item/:id/estado
    static async updateItemEstado(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const id = parseInt(req.params.id);
            const { estado } = req.body || {};
            const result = await CocinaService.updateItemEstado(id, tenantId, estado);
            res.json(result);
        } catch (error) {
            console.error('Error al actualizar estado en cocina:', error);
            if (error.message === 'Estado inválido' || error.message.includes('no encontrado')) {
                const statusCode = error.message === 'Estado inválido' ? 400 : 404;
                return res.status(statusCode).json({ error: error.message });
            }
            res.status(500).json({ error: 'Error al actualizar estado' });
        }
    }

    // PUT /cocina/preparar-lote
    static async updateGroupEstado(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }

            const { productoNombre, nota, estado, modificadoresHash } = req.body || {};
            if (!productoNombre || !estado) {
                return res.status(400).json({ error: 'productoNombre y estado son requeridos' });
            }

            const result = await CocinaService.updateGroupEstado(
                tenantId,
                productoNombre,
                nota,
                estado,
                modificadoresHash
            );
            res.json(result);
        } catch (error) {
            console.error('Error al actualizar lote en cocina:', error);
            res.status(500).json({ error: 'Error al actualizar lote' });
        }
    }

    // PUT /cocina/pedidos/:pedidoId/completar
    static async completarPedidoPOS(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const pedidoId = parseInt(req.params.pedidoId);
            const result = await CocinaService.completarPedidoPOS(pedidoId, tenantId);
            res.json(result);
        } catch (error) {
            console.error('Error al completar pedido POS:', error);
            if (error.message === 'Pedido no encontrado') {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Error al completar pedido' });
        }
    }

    // PUT /cocina/pedidos/:pedidoId/cancelar
    static async cancelarPedidoPOS(req, res) {
        try {
            const tenantId = req.tenant?.id;
            if (!tenantId) {
                return res.status(403).json({ error: 'Contexto de tenant no disponible' });
            }
            const pedidoId = parseInt(req.params.pedidoId);
            const pedido = await CocinaService.cancelarPedidoPOS(pedidoId, tenantId);
            if (!pedido) {
                return res.status(404).json({ error: 'Pedido no encontrado' });
            }
            res.json({ message: 'Pedido cancelado' });
        } catch (error) {
            console.error('Error al cancelar pedido POS:', error);
            res.status(500).json({ error: 'Error al cancelar pedido' });
        }
    }
}

module.exports = CocinaController;
