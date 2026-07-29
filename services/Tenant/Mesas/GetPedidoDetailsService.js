const db = require('../../../config/database');

class GetPedidoDetailsService {
    /**
     * @description Obtiene los detalles de un pedido y sus items.
     */
    static async execute({ tenantId, pedidoId }) {
        const [pedidos] = await db.query(
            `
            SELECT p.*, c.nombre AS cliente_nombre 
            FROM pedidos p 
            LEFT JOIN clientes c ON c.id = p.cliente_id 
            WHERE p.id = ? AND p.tenant_id = ?`,
            [pedidoId, tenantId]
        );

        if (pedidos.length === 0) {
            throw new Error('Pedido no encontrado');
        }

        const pedido = pedidos[0];
        const [items] = await db.query(
            `
            SELECT i.*,
                   COALESCE(p.nombre, s.nombre) AS producto_nombre
            FROM pedido_items i
            LEFT JOIN productos p ON p.id = i.producto_id
            LEFT JOIN servicios s ON s.id = i.servicio_id
            WHERE i.pedido_id = ?
            ORDER BY i.created_at ASC
        `,
            [pedidoId]
        );

        if (items.length > 0) {
            const itemIds = items.map(i => i.id);
            const [modificadores] = await db.query(
                'SELECT pedido_item_id, opcion_nombre, precio_adicional, cantidad FROM pedido_item_modificadores WHERE pedido_item_id IN (?)',
                [itemIds]
            );
            items.forEach(i => {
                i.modificadores = modificadores.filter(m => m.pedido_item_id === i.id);
            });
        }

        return { pedido, items };
    }
}

module.exports = GetPedidoDetailsService;
