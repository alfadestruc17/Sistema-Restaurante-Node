const OnboardingReviewService = require('../../../../services/Admin/OnboardingReviewService');

class OnboardingController {
    // GET /admin/onboarding
    static async index(req, res) {
        try {
            const [usuariosPendientes, localesPendientes, stats] = await Promise.all([
                OnboardingReviewService.getUsuariosPendientes(),
                OnboardingReviewService.getLocalesPendientes(),
                OnboardingReviewService.getStats()
            ]);
            res.render('admin/onboarding', {
                user: req.user,
                currentAdminPage: 'onboarding',
                usuariosPendientes,
                localesPendientes,
                stats
            });
        } catch (error) {
            console.error('Error al cargar onboarding:', error);
            res.status(500).render('errors/internal', { error });
        }
    }

    // POST /admin/onboarding/tenants/:id/aprobar
    static async aprobarTenant(req, res) {
        try {
            await OnboardingReviewService.aprobarTenant(req.params.id, req.user.id);
            res.status(200).json({ success: true, message: 'Local aprobado.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /admin/onboarding/tenants/:id/rechazar
    static async rechazarTenant(req, res) {
        try {
            await OnboardingReviewService.rechazarTenant(req.params.id, req.body.motivo, req.user.id);
            res.status(200).json({ success: true, message: 'Local rechazado.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /admin/onboarding/usuarios/:id/reenviar
    static async reenviarVerificacion(req, res) {
        try {
            await OnboardingReviewService.reenviarVerificacion(req.params.id);
            res.status(200).json({ success: true, message: 'Correo de verificación reenviado.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // DELETE /admin/onboarding/usuarios/:id
    static async eliminarUsuarioPendiente(req, res) {
        try {
            await OnboardingReviewService.eliminarUsuarioPendiente(req.params.id);
            res.status(200).json({ success: true, message: 'Usuario eliminado.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = OnboardingController;
