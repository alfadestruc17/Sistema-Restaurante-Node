/**
 * OnboardingService - Creación del local (tenant) por el propio usuario, tras
 * verificar su correo. El local queda pendiente de aprobación del superadmin
 * (estado_aprobacion='pendiente', activo=FALSE) hasta que se revise en
 * /admin/onboarding. Reutiliza el mismo flujo de creación de tenant que usa
 * TenantsController.store (categorías + parámetros por defecto).
 * Related to: OnboardingController, TenantCRUDService, Admin/OnboardingReviewService
 */

const db = require('../../config/database');
const TenantCRUDService = require('../Admin/Tenant/TenantCRUDService');
const CategoryService = require('../Admin/CategoryService');
const ParametroService = require('./ParametroService');
const TenantAuditService = require('../Admin/TenantAuditService');

const PLAN_BASICO_ID = 1;
const ROL_ADMIN = 'admin';

function slugify(nombre) {
    return (
        String(nombre || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) || 'local'
    );
}

async function generarSlugUnico(nombre) {
    const base = slugify(nombre);
    let slug = base;
    let intento = 1;
    while (true) {
        const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
        if (existing.length === 0) {
            return slug;
        }
        intento += 1;
        slug = `${base}-${intento}`;
    }
}

class OnboardingService {
    /**
     * Crea el local para un usuario ya verificado y sin tenant asignado.
     * @param {number} usuarioId
     * @param {{nombre:string, tipo_negocio:string, ciudad?:string, telefono?:string, nit?:string, direccion?:string}} data
     */
    static async crearLocal(usuarioId, data) {
        const [usuarios] = await db.query('SELECT id, email, tenant_id FROM usuarios WHERE id = ?', [usuarioId]);
        const usuario = usuarios[0];
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }
        if (usuario.tenant_id) {
            throw new Error('Ya tienes un local creado');
        }

        const { nombre, tipo_negocio, ciudad, telefono, nit, direccion } = data;
        if (!nombre || !nombre.trim()) {
            throw new Error('El nombre del local es obligatorio');
        }

        const slug = await generarSlugUnico(nombre);
        const tenant = await TenantCRUDService.createTenant({
            nombre: nombre.trim(),
            email: usuario.email,
            slug,
            config: { tipo_negocio: tipo_negocio || 'restaurante' },
            activo: false,
            plan_id: PLAN_BASICO_ID,
            nit,
            direccion,
            telefono,
            ciudad
        });
        const tenantId = tenant.id;

        await db.query(`UPDATE tenants SET estado_aprobacion = 'pendiente', creado_por_usuario_id = ? WHERE id = ?`, [
            usuarioId,
            tenantId
        ]);

        await CategoryService.seedDefaultCategories(tenantId, tipo_negocio || 'restaurante');
        await ParametroService.seedInventoryParams(tenantId);

        const [roles] = await db.query('SELECT id FROM roles WHERE nombre = ?', [ROL_ADMIN]);
        const adminRolId = roles[0]?.id;
        if (!adminRolId) {
            throw new Error('Rol admin no configurado');
        }

        await db.query('UPDATE usuarios SET rol_id = ?, tenant_id = ? WHERE id = ?', [adminRolId, tenantId, usuarioId]);
        await db.query('INSERT IGNORE INTO usuario_roles (user_id, rol_id) VALUES (?, ?)', [usuarioId, adminRolId]);

        await TenantAuditService.log({
            tenantId,
            userId: usuarioId,
            accion: 'crear_tenant_autoregistro',
            detalles: `slug=${slug}`
        });

        return { id: tenantId, slug };
    }
}

module.exports = OnboardingService;
