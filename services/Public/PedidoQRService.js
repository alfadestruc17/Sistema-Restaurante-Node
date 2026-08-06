const db = require('../../config/database');
const MenuQRRepository = require('../../repositories/Public/MenuQRRepository');
const WhatsAppService = require('../Tenant/WhatsAppService');
const InventarioService = require('../Tenant/InventarioService'); // Para validación de stock

class PedidoQRService {
    static async procesarPedido(qrToken, itemsInput, notasGlobales, clientIp, cookies = {}) {
        if (!itemsInput || !Array.isArray(itemsInput) || itemsInput.length === 0) {
            throw Object.assign(new Error('El pedido no contiene productos.'), { status: 400 });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Encontrar y validar mesa y tenant
            const [mesas] = await connection.query(
                `SELECT m.id, m.tenant_id, m.numero, m.qr_session_id, m.last_qr_activity, t.activo 
                 FROM mesas m 
                 JOIN tenants t ON m.tenant_id = t.id 
                 WHERE m.qr_token = ? AND m.tipo = 'fisica'`, 
                [qrToken]
            );

            if (mesas.length === 0) {
                throw Object.assign(new Error('Código QR inválido o mesa no encontrada.'), { status: 404 });
            }
            
            const mesa = mesas[0];

            // VALIDACIÓN DE SEGURIDAD Y TIEMPO (Solución para expiración)
            const clientSession = cookies ? cookies[`qr_session_${mesa.id}`] : null;
            
            // Si la mesa tiene una sesión activa en DB, el cliente DEBE tener la misma en su cookie
            if (mesa.qr_session_id && clientSession !== mesa.qr_session_id) {
                throw Object.assign(new Error('Tu sesión ha expirado o el código QR ya no es válido para esta mesa. Por favor, escanea el código nuevamente.'), { status: 403 });
            }

            // Si han pasado más de 2 horas desde el primer escaneo/actividad y la mesa sigue ocupada, invalidar por tiempo
            if (mesa.last_qr_activity) {
                const diffHoras = (Date.now() - new Date(mesa.last_qr_activity).getTime()) / (1000 * 60 * 60);
                if (diffHoras > 2) {
                    // Limpiar sesión vieja para forzar re-escaneo
                    await connection.query('UPDATE mesas SET qr_session_id = NULL, last_qr_activity = NULL WHERE id = ?', [mesa.id]);
                    throw Object.assign(new Error('La sesión de esta mesa ha expirado por inactividad. Por favor, escanea el código nuevamente.'), { status: 403 });
                }
            }

            if (!mesa.activo) {
                throw Object.assign(new Error('El restaurante se encuentra inactivo actualmente.'), { status: 403 });
            }

            // Actualizar última actividad
            await connection.query('UPDATE mesas SET last_qr_activity = NOW() WHERE id = ?', [mesa.id]);

            const tenantId = mesa.tenant_id;
            const mesaId = mesa.id;

            // 2. Extraer IDs de productos únicos y validar existencias / precios reales
            const productoIds = [...new Set(itemsInput.map(i => Number(i.producto_id)))];
            const [productosDb] = await connection.query(
                `SELECT id, precio_unidad, nombre FROM productos WHERE id IN (?) AND tenant_id = ? AND activo = 1`,
                [productoIds, tenantId]
            );

            if (productosDb.length !== productoIds.length) {
                throw Object.assign(new Error('Algunos productos ya no están disponibles. Por favor, recarga el menú.'), { status: 400 });
            }

            const productosMap = new Map();
            productosDb.forEach(p => productosMap.set(Number(p.id), p));

            // 3. Buscar si hay pedido abierto en esa mesa
            const [existentes] = await connection.query(
                `SELECT id, total FROM pedidos WHERE mesa_id = ? AND estado NOT IN ('cerrado','cancelado') LIMIT 1`,
                [mesaId]
            );

            let pedidoId;
            let currentTotal = 0;

            if (existentes.length > 0) {
                pedidoId = existentes[0].id;
                currentTotal = Number(existentes[0].total) || 0;
                
                // Opcional: si ya hay pedido abierto y envían notas desde el QR, podríamos agregarlas (appended) o ignorarlas.
                if (notasGlobales) {
                    await connection.query(
                        `UPDATE pedidos SET notas = CONCAT_WS('\\n', notas, ?) WHERE id = ?`,
                        [`[Nota QR]: ${notasGlobales}`, pedidoId]
                    );
                }
            } else {
                // Crear un nuevo pedido con origen='qr' (numeración reiniciada cada día)
                const [numResult] = await connection.query(
                    `SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM pedidos WHERE tenant_id = ? AND DATE(created_at) = CURDATE()`,
                    [tenantId]
                );
                const siguienteNumero = numResult[0].siguiente;

                const [insert] = await connection.query(
                    `INSERT INTO pedidos (tenant_id, mesa_id, estado, total, notas, numero, origen, sesion_cliente) 
                     VALUES (?, ?, 'abierto', 0, ?, ?, 'qr', ?)`,
                    [tenantId, mesaId, notasGlobales ? `[Nota QR]: ${notasGlobales}` : null, siguienteNumero, clientIp]
                );
                pedidoId = insert.insertId;

                await connection.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [mesaId]);
            }

            // 4. Insertar los items y acumular el nuevo total
            let totalItemsNuevos = 0;

            for (const item of itemsInput) {
                const prod = productosMap.get(Number(item.producto_id));
                const cantidad = parseFloat(item.cantidad);
                if (isNaN(cantidad) || cantidad <= 0) {continue;}

                // Validación de stock (Soft validation, registramos warning si no hay)
                const check = await InventarioService.checkStockParaProducto(tenantId, prod.id, cantidad);
                if (!check.ok) {
                    console.warn(`[Menu QR] Venta sin stock suficiente: Producto ID ${prod.id} en Tenant ${tenantId}`);
                }

                const subtotal = cantidad * Number(prod.precio_unidad);
                totalItemsNuevos += subtotal;

                await connection.query(
                    `INSERT INTO pedido_items (tenant_id, pedido_id, producto_id, cantidad, unidad_medida, precio_unitario, subtotal, estado, nota)
                     VALUES (?, ?, ?, ?, 'UND', ?, ?, 'pendiente', NULL)`,
                    [tenantId, pedidoId, prod.id, cantidad, prod.precio_unidad, subtotal]
                );
            }

            // 5. Actualizar el total del pedido
            const nuevoTotalGlobal = currentTotal + totalItemsNuevos;
            await connection.query('UPDATE pedidos SET total = ? WHERE id = ?', [nuevoTotalGlobal, pedidoId]);

            await connection.commit();

            // Emitir evento para notificaciones en tiempo real en el panel administrativo
            WhatsAppService.events.emit('orderCreated', { 
                tenantId, 
                pedidoId, 
                mesaId,
                origen: 'qr'
            });

            return { pedidoId, nuevoTotalGlobal };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = PedidoQRService;
