-- Registro público + onboarding con aprobación del superadmin.
-- Permite que una persona se auto-registre (queda pendiente de verificar
-- correo), verifique su correo (queda activo) y cree su propio local
-- (que queda pendiente de aprobación del superadmin antes de poder usarse).
USE restaurante;

-- Verificación de correo en usuarios
ALTER TABLE usuarios ADD COLUMN email_verificado_at DATETIME NULL AFTER email;
ALTER TABLE usuarios ADD COLUMN verificacion_token_hash VARCHAR(64) NULL AFTER email_verificado_at;
ALTER TABLE usuarios ADD COLUMN verificacion_token_expira DATETIME NULL AFTER verificacion_token_hash;

-- Rol placeholder para "verificado pero sin local todavía" (0 permisos:
-- así, aunque caiga en el fallback de tenant por defecto de attachTenantContext,
-- no puede ver ni hacer nada hasta crear su local y subir a rol admin).
INSERT INTO roles (nombre, descripcion) VALUES
('propietario_pendiente', 'Usuario auto-registrado, verificado, sin restaurante creado todavía')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Estado de aprobación del local. DEFAULT 'aprobado' para que los tenants
-- existentes (creados manualmente por el superadmin) no se vean afectados;
-- solo los tenants creados por auto-registro se insertan como 'pendiente'.
ALTER TABLE tenants ADD COLUMN estado_aprobacion ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'aprobado' AFTER activo;
ALTER TABLE tenants ADD COLUMN aprobado_at DATETIME NULL AFTER estado_aprobacion;
ALTER TABLE tenants ADD COLUMN aprobado_por INT NULL AFTER aprobado_at;
ALTER TABLE tenants ADD COLUMN motivo_rechazo VARCHAR(255) NULL AFTER aprobado_por;
ALTER TABLE tenants ADD COLUMN creado_por_usuario_id INT NULL AFTER motivo_rechazo;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_aprobado_por FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_creado_por FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
