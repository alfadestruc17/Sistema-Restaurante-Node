const db = require('../../config/database');

class POSRepository {
    static async getProductosActivos(tenantId) {
        const [rows] = await db.query(
            `SELECT p.id, p.nombre, p.precio_unidad, p.codigo, p.es_favorito,
                    c.id AS categoria_id, c.nombre AS categoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.tenant_id = ? AND p.activo = 1
             ORDER BY p.es_favorito DESC, c.nombre, p.nombre`,
            [tenantId]
        );
        return rows;
    }

    static async getBorradores(tenantId, usuarioId) {
        const [rows] = await db.query(
            `SELECT id, cliente_id, nombre_cliente, items, total, notas, pedido_cocina_id, mesa_cocina_id, created_at
             FROM pos_borradores
             WHERE tenant_id = ? AND usuario_id = ?
             ORDER BY updated_at DESC`,
            [tenantId, usuarioId]
        );
        return rows.map(r => ({
            ...r,
            items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
    }

    static async createBorrador(
        tenantId,
        usuarioId,
        { cliente_id, nombre_cliente, items, total, notas, pedido_cocina_id, mesa_cocina_id }
    ) {
        const [result] = await db.query(
            `INSERT INTO pos_borradores (tenant_id, usuario_id, cliente_id, nombre_cliente, items, total, notas, pedido_cocina_id, mesa_cocina_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                usuarioId,
                cliente_id || null,
                nombre_cliente || null,
                JSON.stringify(items),
                total || 0,
                notas || null,
                pedido_cocina_id || null,
                mesa_cocina_id || null
            ]
        );
        return result.insertId;
    }

    static async deleteBorrador(id, tenantId) {
        const [rows] = await db.query(`SELECT pedido_cocina_id FROM pos_borradores WHERE id = ? AND tenant_id = ?`, [
            id,
            tenantId
        ]);
        if (rows.length === 0) {
            return null;
        }
        await db.query(`DELETE FROM pos_borradores WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
        return { pedidoCocinaId: rows[0].pedido_cocina_id };
    }

    static async getStatsHoy(tenantId) {
        const [rows] = await db.query(
            `SELECT COUNT(*) AS num_ordenes, COALESCE(SUM(total), 0) AS total_hoy
             FROM facturas
             WHERE tenant_id = ? AND fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY`,
            [tenantId]
        );
        return rows[0] || { num_ordenes: 0, total_hoy: 0 };
    }

    static async findOrCreateCliente(tenantId, nombre) {
        const [existing] = await db.query(
            'SELECT id FROM clientes WHERE tenant_id = ? AND LOWER(nombre) = LOWER(?) LIMIT 1',
            [tenantId, nombre.trim()]
        );
        if (existing.length) {
            return existing[0].id;
        }
        const [result] = await db.query('INSERT INTO clientes (tenant_id, nombre) VALUES (?, ?)', [
            tenantId,
            nombre.trim()
        ]);
        return result.insertId;
    }

    /**
     * Crea un pedido "de cocina" para una venta ya facturada del POS: una mesa virtual
     * dedicada (igual al patrón usado por WhatsAppService) + un pedido con origen='caja'
     * + sus pedido_items en estado 'enviado' (la venta ya está pagada, cocina debe
     * prepararla de inmediato). Se completa después desde CocinaRepository.completarPedidoPOS.
     */
    static async enviarPedidoACocina(tenantId, { productos, nombrePedido, clienteId }) {
        const itemsValidos = (productos || []).filter(p => !p.es_servicio && p.producto_id);
        if (itemsValidos.length === 0) {
            return null;
        }

        const [numResult] = await db.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM pedidos WHERE tenant_id = ? AND DATE(created_at) = CURDATE()`,
            [tenantId]
        );
        const siguienteNumero = numResult[0].siguiente;
        const numeroMesa = `POS-${siguienteNumero}`;

        const [mesaResult] = await db.query(
            `INSERT INTO mesas (tenant_id, numero, descripcion, tipo, estado) VALUES (?, ?, ?, 'virtual', 'ocupada')`,
            [tenantId, numeroMesa, nombrePedido || null]
        );
        const mesaId = mesaResult.insertId;

        const [pedidoResult] = await db.query(
            `INSERT INTO pedidos (tenant_id, mesa_id, cliente_id, estado, total, notas, numero, origen)
             VALUES (?, ?, ?, 'abierto', 0, ?, ?, 'caja')`,
            [tenantId, mesaId, clienteId || null, nombrePedido || null, siguienteNumero]
        );
        const pedidoId = pedidoResult.insertId;

        let total = 0;
        for (const p of itemsValidos) {
            const cantidad = parseFloat(p.cantidad) || 1;
            const precio = parseFloat(p.precio) || 0;
            const subtotal = parseFloat(p.subtotal) || cantidad * precio;
            total += subtotal;

            const mods = p._modificadoresSnapshot || [];
            const modificadoresHash =
                mods.length > 0
                    ? mods
                          .map(m => m.opcion_modificador_id)
                          .slice()
                          .sort((a, b) => a - b)
                          .join(',')
                    : null;

            const [itemResult] = await db.query(
                `INSERT INTO pedido_items (tenant_id, pedido_id, producto_id, cantidad, unidad_medida, precio_unitario, subtotal, estado, modificadores_hash, enviado_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'enviado', ?, NOW())`,
                [tenantId, pedidoId, p.producto_id, cantidad, p.unidad || 'UND', precio, subtotal, modificadoresHash]
            );

            if (mods.length > 0) {
                const modValues = mods.map(m => [
                    itemResult.insertId,
                    m.opcion_modificador_id,
                    m.grupo_nombre,
                    m.opcion_nombre,
                    m.precio_adicional,
                    m.cantidad || 1
                ]);
                await db.query(
                    'INSERT INTO pedido_item_modificadores (pedido_item_id, opcion_modificador_id, grupo_nombre, opcion_nombre, precio_adicional, cantidad) VALUES ?',
                    [modValues]
                );
            }
        }

        await db.query('UPDATE pedidos SET total = ? WHERE id = ?', [Math.round(total * 100) / 100, pedidoId]);

        return { pedidoId, mesaId };
    }
}

module.exports = POSRepository;
