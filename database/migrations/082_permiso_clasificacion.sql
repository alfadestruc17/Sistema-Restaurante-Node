-- Nuevo módulo "Clasificación": ranking completo de productos más vendidos
-- (unidades vendidas + total generado), con filtros de fecha y categoría.
USE restaurante;

INSERT IGNORE INTO permisos (nombre, descripcion) VALUES
('clasificacion.ver', 'Ver el ranking de productos más vendidos (Clasificación)');

-- Por defecto solo admin/superadmin; cada restaurante decide si se lo da a más roles.
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin')
  AND p.nombre = 'clasificacion.ver';
