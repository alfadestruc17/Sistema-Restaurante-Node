-- Permiso opcional del POS: permite que el nombre puesto al guardar una orden
-- (antes solo se usaba para identificarla en cocina) se convierta en el cliente
-- real de la factura al cobrarla, en vez de quedar siempre como "Consumidor final".
USE restaurante;

INSERT IGNORE INTO permisos (nombre, descripcion) VALUES
('pos.nombrar_cliente', 'Facturar en el POS a nombre del cliente indicado al guardar la orden, en vez de Consumidor final');

-- Por defecto solo admin/superadmin lo tienen; cada restaurante decide si se lo
-- da también a sus cajeros (a diferencia de pos.ver/pos.vender, que sí van a cajero).
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin')
  AND p.nombre = 'pos.nombrar_cliente';
