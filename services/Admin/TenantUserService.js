const bcrypt = require('bcrypt');
const db = require('../../config/database');

class TenantUserService {
    static async getUsersByTenant(tenantId) {
        const [users] = await db.query(
            `
            SELECT u.id, u.username, u.email, u.nombre_completo, u.activo, r.nombre AS rol
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.tenant_id = ?
            ORDER BY u.username
        `,
            [tenantId]
        );

        if (users.length === 0) {
            return users;
        }

        const [rolesRows] = await db.query(
            `SELECT ur.user_id, r.nombre
             FROM usuario_roles ur
             INNER JOIN roles r ON r.id = ur.rol_id
             WHERE ur.user_id IN (?)`,
            [users.map(u => u.id)]
        );
        const rolesPorUsuario = {};
        (rolesRows || []).forEach(row => {
            (rolesPorUsuario[row.user_id] ??= []).push(row.nombre);
        });

        return users.map(u => ({
            ...u,
            // Roles adicionales (usuario_roles) pueden no incluir aún el principal
            // en instalaciones sin backfillear; se agrega por seguridad.
            roles: [...new Set([u.rol, ...(rolesPorUsuario[u.id] || [])])]
        }));
    }

    /**
     * Resuelve nombres de rol a ids, validando que existan.
     * @param {string[]} rolNombres
     * @returns {Promise<Array<{id:number, nombre:string}>>}
     */
    static async _resolveRoles(rolNombres) {
        if (!Array.isArray(rolNombres) || rolNombres.length === 0) {
            throw new Error('Debe asignar al menos un rol');
        }
        const nombresUnicos = [...new Set(rolNombres)];
        const [roles] = await db.query('SELECT id, nombre FROM roles WHERE nombre IN (?)', [nombresUnicos]);
        if (roles.length !== nombresUnicos.length) {
            throw new Error('Uno o más roles no son válidos');
        }
        return roles;
    }

    static async createTenantUser(tenantId, { username, password, email, nombre_completo, rol_nombres }) {
        if (!username || !password) {
            throw new Error('El username y la contraseña son obligatorios');
        }

        const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
        if (existing.length > 0) {
            throw new Error('Ya existe un usuario con ese usuario');
        }

        const roles = await TenantUserService._resolveRoles(rol_nombres);
        const rolPrincipal = roles[0];

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (username, password_hash, email, nombre_completo, rol_id, tenant_id, activo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [username, password_hash, email || null, nombre_completo || null, rolPrincipal.id, tenantId]
        );

        const values = roles.map(r => [result.insertId, r.id]);
        await db.query('INSERT INTO usuario_roles (user_id, rol_id) VALUES ?', [values]);

        return result.insertId;
    }

    static async assignRoles(userId, tenantId, rol_nombres) {
        const [users] = await db.query('SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        if (users.length === 0) {
            throw new Error('Usuario no encontrado en ese tenant');
        }

        const roles = await TenantUserService._resolveRoles(rol_nombres);
        const rolPrincipal = roles[0];

        const connection = await db.getConnection();
        try {
            await connection.query('UPDATE usuarios SET rol_id = ?, activo = TRUE WHERE id = ?', [
                rolPrincipal.id,
                userId
            ]);
            await connection.query('DELETE FROM usuario_roles WHERE user_id = ?', [userId]);
            const values = roles.map(r => [userId, r.id]);
            await connection.query('INSERT INTO usuario_roles (user_id, rol_id) VALUES ?', [values]);
        } finally {
            connection.release();
        }
    }

    static async changeTenantUserStatus(userId, tenantId, activo) {
        const [result] = await db.query('UPDATE usuarios SET activo = ? WHERE id = ? AND tenant_id = ?', [
            activo ? 1 : 0,
            userId,
            tenantId
        ]);
        return result;
    }

    /**
     * Set new password for a tenant user (superadmin only; no current password check).
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID (user must belong to this tenant)
     * @param {string} newPassword - New plain password
     */
    static async setPassword(userId, tenantId, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        const [users] = await db.query('SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        if (users.length === 0) {
            throw new Error('Usuario no encontrado en ese restaurante.');
        }
        const password_hash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ? AND tenant_id = ?', [
            password_hash,
            userId,
            tenantId
        ]);
    }

    static async deleteTenantUser(userId, tenantId) {
        // We first check if the user belongs to the tenant
        const [users] = await db.query('SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        if (users.length === 0) {
            throw new Error('Usuario no encontrado en ese restaurante.');
        }

        const [result] = await db.query('DELETE FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        return result;
    }

    static async updateEmail(userId, tenantId, email) {
        const [users] = await db.query('SELECT id FROM usuarios WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        if (users.length === 0) {
            throw new Error('Usuario no encontrado en ese restaurante.');
        }

        const [result] = await db.query('UPDATE usuarios SET email = ? WHERE id = ? AND tenant_id = ?', [
            email || null,
            userId,
            tenantId
        ]);
        return result;
    }
}

module.exports = TenantUserService;
