/**
 * Mensaje mostrado cuando el login/acceso de un tenant se bloquea. Diferencia
 * entre un local pendiente de aprobación (auto-registro), uno rechazado, y
 * uno desactivado manualmente por el superadmin (comportamiento original).
 * Related to: AuthController.login, middleware/tenant.js attachTenantContext
 */
function getTenantBlockedMessage(tenant) {
    const nombre = tenant?.nombre || '';
    if (tenant?.estado_aprobacion === 'pendiente') {
        return `Tu restaurante "${nombre}" está en revisión. Te avisaremos por correo apenas sea aprobado.`;
    }
    if (tenant?.estado_aprobacion === 'rechazado') {
        return `Tu solicitud para "${nombre}" no fue aprobada. ${tenant.motivo_rechazo || 'Contáctanos para más información.'}`;
    }
    return `Tu restaurante "${nombre}" está desactivado. Contacta al administrador.`;
}

module.exports = { getTenantBlockedMessage };
