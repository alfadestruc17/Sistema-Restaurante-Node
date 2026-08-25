/**
 * OnboardingReviewService - Backoffice del superadmin para revisar el
 * auto-registro: usuarios pendientes (sin local todavía) y locales pendientes
 * de aprobación (creados por el propio dueño vía /onboarding/crear-local).
 * Related to: Admin/OnboardingController, RegistroService, OnboardingService
 */

const db = require('../../config/database');
const MailerService = require('../Shared/MailerService');
const RegistroService = require('../Shared/RegistroService');
const TenantAuditService = require('./TenantAuditService');
const logger = require('../../utils/logger');

class OnboardingReviewService {
    static async getUsuariosPendientes() {
        const [rows] = await db.query(
            `SELECT u.id, u.username, u.email, u.nombre_completo, u.email_verificado_at, u.created_at
             FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE u.tenant_id IS NULL AND r.nombre = 'propietario_pendiente'
             ORDER BY u.created_at DESC`
        );
        return rows;
    }

    static async getLocalesPendientes() {
        const [rows] = await db.query(
            `SELECT t.id, t.nombre, t.slug, t.email, t.ciudad, t.telefono, t.created_at,
                    u.id AS creador_id, u.username AS creador_username, u.email AS creador_email,
                    u.nombre_completo AS creador_nombre
             FROM tenants t
             LEFT JOIN usuarios u ON u.id = t.creado_por_usuario_id
             WHERE t.estado_aprobacion = 'pendiente'
             ORDER BY t.created_at DESC`
        );
        return rows;
    }

    static async getStats() {
        const [[registrados30]] = await db.query(
            `SELECT COUNT(*) AS c FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE r.nombre = 'propietario_pendiente' AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const [[verificados30]] = await db.query(
            `SELECT COUNT(*) AS c FROM usuarios
             WHERE email_verificado_at IS NOT NULL AND email_verificado_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const [[localesCreados30]] = await db.query(
            `SELECT COUNT(*) AS c FROM tenants
             WHERE creado_por_usuario_id IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const [[aprobados30]] = await db.query(
            `SELECT COUNT(*) AS c FROM tenants
             WHERE estado_aprobacion = 'aprobado' AND aprobado_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        const [[usuariosPendientesTotal]] = await db.query(
            `SELECT COUNT(*) AS c FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE u.tenant_id IS NULL AND r.nombre = 'propietario_pendiente'`
        );
        const [[localesPendientesTotal]] = await db.query(
            `SELECT COUNT(*) AS c FROM tenants WHERE estado_aprobacion = 'pendiente'`
        );
        const [[localesRechazadosTotal]] = await db.query(
            `SELECT COUNT(*) AS c FROM tenants WHERE estado_aprobacion = 'rechazado'`
        );

        return {
            usuariosPendientesTotal: usuariosPendientesTotal.c,
            localesPendientesTotal: localesPendientesTotal.c,
            localesRechazadosTotal: localesRechazadosTotal.c,
            ultimos30dias: {
                registrados: registrados30.c,
                verificados: verificados30.c,
                localesCreados: localesCreados30.c,
                aprobados: aprobados30.c
            }
        };
    }

    static async aprobarTenant(tenantId, superadminId) {
        const [tenants] = await db.query('SELECT id, nombre, email FROM tenants WHERE id = ?', [tenantId]);
        const tenant = tenants[0];
        if (!tenant) {
            throw new Error('Local no encontrado');
        }
        await db.query(
            `UPDATE tenants SET estado_aprobacion = 'aprobado', activo = TRUE, aprobado_at = NOW(), aprobado_por = ? WHERE id = ?`,
            [superadminId, tenantId]
        );
        await TenantAuditService.log({
            tenantId,
            userId: superadminId,
            accion: 'aprobar_tenant_autoregistro',
            detalles: null
        });
        await OnboardingReviewService._notificar(
            tenant.email,
            `¡Tu local "${tenant.nombre}" fue aprobado!`,
            `
            <p>Buenas noticias: tu local <strong>${tenant.nombre}</strong> ya fue aprobado.</p>
            <p>Ya puedes ingresar y empezar a usar GastroFlow.</p>
        `
        );
    }

    static async rechazarTenant(tenantId, motivo, superadminId) {
        const [tenants] = await db.query('SELECT id, nombre, email FROM tenants WHERE id = ?', [tenantId]);
        const tenant = tenants[0];
        if (!tenant) {
            throw new Error('Local no encontrado');
        }
        await db.query(`UPDATE tenants SET estado_aprobacion = 'rechazado', motivo_rechazo = ? WHERE id = ?`, [
            motivo || null,
            tenantId
        ]);
        await TenantAuditService.log({
            tenantId,
            userId: superadminId,
            accion: 'rechazar_tenant_autoregistro',
            detalles: motivo || null
        });
        await OnboardingReviewService._notificar(
            tenant.email,
            `Tu solicitud para "${tenant.nombre}" no fue aprobada`,
            `
            <p>Tu solicitud para crear <strong>${tenant.nombre}</strong> en GastroFlow no fue aprobada.</p>
            ${motivo ? `<p>Motivo: ${motivo}</p>` : ''}
            <p>Si crees que esto es un error, contáctanos para más información.</p>
        `
        );
    }

    static async _notificar(email, subject, html) {
        if (!email) {
            return;
        }
        try {
            await MailerService.sendMail({
                to: email,
                subject,
                html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">${html}</div>`
            });
        } catch (error) {
            logger.error('Error al enviar notificación de onboarding', { error: error.message, email });
        }
    }

    static async reenviarVerificacion(usuarioId) {
        const [rows] = await db.query('SELECT email FROM usuarios WHERE id = ? AND tenant_id IS NULL', [usuarioId]);
        if (rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        await RegistroService.reenviarVerificacion(rows[0].email);
    }

    static async eliminarUsuarioPendiente(usuarioId) {
        const [result] = await db.query('DELETE FROM usuarios WHERE id = ? AND tenant_id IS NULL', [usuarioId]);
        if (result.affectedRows === 0) {
            throw new Error('Usuario no encontrado o ya tiene un local asignado');
        }
    }
}

module.exports = OnboardingReviewService;
