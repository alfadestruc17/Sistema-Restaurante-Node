-- 079_usuario_roles.sql
-- Permite asignar más de un rol a un usuario. usuarios.rol_id se mantiene
-- como rol principal (compatibilidad con todo el código existente que lee
-- req.user.rol como string único); esta tabla guarda el conjunto completo
-- de roles (principal + adicionales), usado para agregar permisos.

USE restaurante;

CREATE TABLE IF NOT EXISTS usuario_roles (
    user_id INT NOT NULL,
    rol_id  INT NOT NULL,
    PRIMARY KEY (user_id, rol_id),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT IGNORE INTO usuario_roles (user_id, rol_id)
SELECT id, rol_id FROM usuarios;
