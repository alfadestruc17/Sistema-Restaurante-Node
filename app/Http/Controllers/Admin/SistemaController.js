const TenantService = require('../../../../services/Admin/TenantService');
const TemaService = require('../../../../services/Shared/TemaService');
const ParametroService = require('../../../../services/Shared/ParametroService');

class SistemaController {
    static getTenantId(req) {
        const id = req.query.tenant_id || req.body.tenant_id;
        const num = id !== null && id !== undefined ? Number.parseInt(id, 10) : null;
        if (!num) {
            throw new Error('Seleccioná un restaurante (tenant_id requerido).');
        }
        return num;
    }

    // GET /admin/sistema
    static async index(req, res) {
        try {
            const tenants = await TenantService.getAllTenants();
            const tenantId = req.query.tenant_id ? Number.parseInt(req.query.tenant_id, 10) : tenants[0]?.id;
            const activeTenant = tenants.find(t => t.id === tenantId) || null;
            res.render('admin/sistema', {
                user: req.user,
                tenants: tenants || [],
                activeTenantId: tenantId || null,
                activeTenant
            });
        } catch (error) {
            console.error('Error al cargar Sistema:', error);
            res.status(500).render('errors/internal', { error: { message: error.message } });
        }
    }

    // --- API Temas ---
    static async listTemas(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const list = await TemaService.list(tenantId);
            res.json(list);
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async showTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            const tema = await TemaService.getById(id, tenantId);
            if (!tema) {
                return res.status(404).json({ error: 'Tema no encontrado' });
            }
            res.json(tema);
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async storeTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = await TemaService.create(tenantId, req.body);
            res.status(201).json({ id, message: 'Tema creado' });
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async updateTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            await TemaService.update(id, tenantId, req.body);
            res.json({ message: 'Tema actualizado' });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Tema no encontrado') {
                statusCode = 404;
            }
            res.status(statusCode).json({ error: error.message });
        }
    }

    static async destroyTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            await TemaService.delete(id, tenantId);
            res.json({ message: 'Tema eliminado' });
        } catch (error) {
            let statusCode = 500;
            if (error.message?.includes('tenant_id')) {
                statusCode = 400;
            } else if (error.message === 'Tema no encontrado') {
                statusCode = 404;
            }

            res.status(statusCode).json({ error: error.message });
        }
    }

    static async listParametrosTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const temaId = Number.parseInt(req.params.id, 10);
            const list = await ParametroService.getByTemaId(temaId, tenantId);
            res.json(list);
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async setParametrosTema(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const temaId = Number.parseInt(req.params.id, 10);
            await TemaService.setParametros(temaId, tenantId, req.body.parametro_ids || []);
            res.json({ message: 'Parámetros del tema actualizados' });
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    // --- API Parámetros ---
    static async listParametros(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const list = await ParametroService.list(tenantId);
            res.json(list);
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async showParametro(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            const param = await ParametroService.getById(id, tenantId);
            if (!param) {
                return res.status(404).json({ error: 'Parámetro no encontrado' });
            }
            res.json(param);
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async storeParametro(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = await ParametroService.create(tenantId, req.body);
            res.status(201).json({ id, message: 'Parámetro creado' });
        } catch (error) {
            res.status(error.message?.includes('tenant_id') ? 400 : 500).json({ error: error.message });
        }
    }

    static async updateParametro(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            await ParametroService.update(id, tenantId, req.body);
            res.json({ message: 'Parámetro actualizado' });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Parámetro no encontrado') {
                statusCode = 404;
            }
            res.status(statusCode).json({ error: error.message });
        }
    }

    static async destroyParametro(req, res) {
        try {
            const tenantId = SistemaController.getTenantId(req);
            const id = Number.parseInt(req.params.id, 10);
            await ParametroService.delete(id, tenantId);
            res.json({ message: 'Parámetro eliminado' });
        } catch (error) {
            let statusCode = 500;
            if (error.message?.includes('tenant_id')) {
                statusCode = 400;
            } else if (error.message === 'Parámetro no encontrado') {
                statusCode = 404;
            }

            res.status(statusCode).json({ error: error.message });
        }
    }
}

module.exports = SistemaController;
