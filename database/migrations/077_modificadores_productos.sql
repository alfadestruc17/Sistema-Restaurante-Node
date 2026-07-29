-- 077_modificadores_productos.sql
-- Sistema de toppings/modificadores: cada tenant define grupos de opciones
-- (ej. "Elige tu salsa" obligatorio de selección única, "Toppings extra"
-- opcional de selección múltiple) que se asignan a productos y se eligen
-- al agregar el producto al carrito en POS o Mesas/Salón.
-- Las tablas *_modificadores guardan un snapshot (nombre/precio) de lo elegido
-- en cada línea de venta, para que el histórico no cambie si luego se edita
-- o borra la opción del catálogo.

USE restaurante;

CREATE TABLE IF NOT EXISTS grupos_modificadores (
    id                  INT           PRIMARY KEY AUTO_INCREMENT,
    tenant_id           INT           NOT NULL,
    nombre              VARCHAR(100)  NOT NULL,
    descripcion         VARCHAR(255)  DEFAULT NULL,
    tipo_seleccion      ENUM('unica','multiple') NOT NULL DEFAULT 'unica',
    obligatorio         TINYINT(1)    NOT NULL DEFAULT 0,
    minimo_selecciones  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    maximo_selecciones  TINYINT UNSIGNED DEFAULT NULL,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_grupos_mod_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS opciones_modificador (
    id                INT           PRIMARY KEY AUTO_INCREMENT,
    grupo_id          INT           NOT NULL,
    tenant_id         INT           NOT NULL,
    nombre            VARCHAR(100)  NOT NULL,
    precio_adicional  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    insumo_id         INT           DEFAULT NULL COMMENT 'Enlace opcional a inventario para descontar stock al vender',
    cantidad_insumo   DECIMAL(10,4) DEFAULT NULL COMMENT 'Cantidad de insumo que consume 1 unidad de esta opción',
    unidad_insumo     VARCHAR(20)   DEFAULT NULL,
    orden             SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    activo            TINYINT(1)    NOT NULL DEFAULT 1,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL,
    INDEX idx_opciones_mod_grupo (grupo_id),
    INDEX idx_opciones_mod_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS producto_modificador_grupo (
    id           INT       PRIMARY KEY AUTO_INCREMENT,
    producto_id  INT       NOT NULL,
    grupo_id     INT       NOT NULL,
    orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
    UNIQUE KEY uq_producto_grupo (producto_id, grupo_id),
    INDEX idx_pmg_grupo (grupo_id)
);

CREATE TABLE IF NOT EXISTS detalle_factura_modificadores (
    id                     INT           PRIMARY KEY AUTO_INCREMENT,
    detalle_factura_id     INT           NOT NULL,
    opcion_modificador_id  INT           DEFAULT NULL,
    grupo_nombre           VARCHAR(100)  NOT NULL,
    opcion_nombre          VARCHAR(100)  NOT NULL,
    precio_adicional       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cantidad               TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (detalle_factura_id) REFERENCES detalle_factura(id) ON DELETE CASCADE,
    FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificador(id) ON DELETE SET NULL,
    INDEX idx_dfm_detalle (detalle_factura_id)
);

CREATE TABLE IF NOT EXISTS pedido_item_modificadores (
    id                     INT           PRIMARY KEY AUTO_INCREMENT,
    pedido_item_id         INT           NOT NULL,
    opcion_modificador_id  INT           DEFAULT NULL,
    grupo_nombre           VARCHAR(100)  NOT NULL,
    opcion_nombre          VARCHAR(100)  NOT NULL,
    precio_adicional       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cantidad               TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (pedido_item_id) REFERENCES pedido_items(id) ON DELETE CASCADE,
    FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificador(id) ON DELETE SET NULL,
    INDEX idx_pim_item (pedido_item_id)
);

-- Clave de agrupación denormalizada (ids de opciones ordenados y concatenados) para que
-- Cocina pueda distinguir/agrupar correctamente ítems del mismo producto+nota con distintos
-- toppings, sin tener que joinear pedido_item_modificadores en cada bulk-update de la cola.
ALTER TABLE pedido_items
    ADD COLUMN modificadores_hash VARCHAR(255) DEFAULT NULL AFTER nota;

-- Permisos del módulo (solo administración del catálogo; usarlos en POS/Mesas
-- ya está cubierto por pos.vender / mesas.gestionar existentes)
INSERT IGNORE INTO permisos (nombre, descripcion) VALUES
('modificadores.ver',    'Ver catálogo de grupos de modificadores/toppings'),
('modificadores.editar', 'Crear, editar y eliminar grupos y opciones de modificadores');

INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('admin', 'superadmin')
  AND p.nombre IN ('modificadores.ver', 'modificadores.editar');
