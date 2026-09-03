-- 084_suscripciones_wompi.sql
-- Cobro automatizado de suscripciones a tenants vía Wompi: método de pago
-- guardado, próximo cobro, contador de intentos fallidos y bandera para
-- distinguir suspensión automática por impago de una desactivación manual
-- del superadmin.

ALTER TABLE tenants ADD COLUMN wompi_payment_source_id VARCHAR(100) NULL;
ALTER TABLE tenants ADD COLUMN proximo_cobro DATE NULL;
ALTER TABLE tenants ADD COLUMN intentos_fallidos_pago INT NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN suspendido_por_pago BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN ultimo_intento_cobro_at DATETIME NULL;

-- Historial de intentos de cobro de suscripción (no confundir con `facturas`,
-- que son las ventas propias de cada restaurante a sus clientes).
CREATE TABLE IF NOT EXISTS suscripcion_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado ENUM('pendiente', 'exitoso', 'fallido') NOT NULL DEFAULT 'pendiente',
    wompi_transaction_id VARCHAR(100) NULL,
    wompi_reference VARCHAR(100) NOT NULL UNIQUE,
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    respuesta_raw JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_sp_tenant (tenant_id, created_at),
    INDEX idx_sp_estado (estado, created_at)
);

-- Permisos del módulo de facturación/suscripción del tenant (mismo patrón que
-- 032_perfil_tenant.sql: se asignan automáticamente al rol admin).
INSERT IGNORE INTO permisos (nombre, descripcion) VALUES
('facturacion.ver', 'Ver estado de la suscripción y el historial de cobros'),
('facturacion.editar', 'Actualizar el método de pago de la suscripción');

INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'admin' AND p.nombre IN ('facturacion.ver', 'facturacion.editar');
