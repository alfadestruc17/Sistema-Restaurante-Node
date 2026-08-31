const ejs = require('ejs');
const path = require('path');
const puppeteer = require('puppeteer');
const TenantService = require('./TenantService');
const StatsRepository = require('../../repositories/Tenant/StatsRepository');

function formatMoney(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

class ReporteConsolidadoService {
    /**
     * Generates a consolidated PDF report, either for a single tenant or for all
     * active tenants, over a month range (mesDesde/anioDesde a mesHasta/anioHasta).
     * @param {Object} options
     * @param {number|string} [options.tenantId] - Id del tenant a exportar, o 'all'/omitido para todos los activos.
     * @param {number} options.mesDesde - Mes inicial (1-12)
     * @param {number} options.anioDesde - Año inicial
     * @param {number} [options.mesHasta] - Mes final (1-12), por defecto igual a mesDesde
     * @param {number} [options.anioHasta] - Año final, por defecto igual a anioDesde
     * @returns {Promise<Buffer>} PDF Buffer
     */
    static async generarReporteConsolidado(options = {}) {
        const date = new Date();
        const targetMesDesde = options.mesDesde ? parseInt(options.mesDesde, 10) : date.getMonth() + 1;
        const targetAnioDesde = options.anioDesde ? parseInt(options.anioDesde, 10) : date.getFullYear();
        const targetMesHasta = options.mesHasta ? parseInt(options.mesHasta, 10) : targetMesDesde;
        const targetAnioHasta = options.anioHasta ? parseInt(options.anioHasta, 10) : targetAnioDesde;

        // Validar que no sea una fecha en el futuro
        const requestDate = new Date(targetAnioHasta, targetMesHasta - 1, 1);
        if (requestDate > date) {
            throw new Error('No se puede generar un reporte de un mes futuro.');
        }
        if (new Date(targetAnioDesde, targetMesDesde - 1, 1) > new Date(targetAnioHasta, targetMesHasta - 1, 1)) {
            throw new Error('El periodo inicial no puede ser posterior al periodo final.');
        }

        const firstDay = `${targetAnioDesde}-${targetMesDesde.toString().padStart(2, '0')}-01`;
        const lastDayStr = `${targetAnioHasta}-${targetMesHasta.toString().padStart(2, '0')}-${new Date(targetAnioHasta, targetMesHasta, 0).getDate()}`;

        // Nombre del periodo en español (un solo mes, o rango "Enero 2026 - Marzo 2026")
        const desdeNombre = new Date(targetAnioDesde, targetMesDesde - 1, 1).toLocaleString('es-CO', {
            month: 'long',
            year: 'numeric'
        });
        const mismoMes = targetMesDesde === targetMesHasta && targetAnioDesde === targetAnioHasta;
        const mesNombre = mismoMes
            ? desdeNombre
            : `${desdeNombre} - ${new Date(targetAnioHasta, targetMesHasta - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })}`;

        console.log(
            `[CONSOLIDADO]: Generando reporte consolidado para ${mesNombre.toUpperCase()} (Rango: ${firstDay} a ${lastDayStr}, tenant: ${options.tenantId || 'all'})`
        );

        // Obtener los tenants a incluir: uno específico, o todos los activos
        const allTenants = await TenantService.getAllTenants();
        let activeTenants;
        if (options.tenantId && options.tenantId !== 'all') {
            const tenant = (allTenants || []).find(t => Number(t.id) === Number(options.tenantId));
            if (!tenant) {
                throw new Error('Restaurante no encontrado.');
            }
            activeTenants = [tenant];
        } else {
            activeTenants = (allTenants || []).filter(t => t.activo);
        }

        // Un tenant es independiente de otro: se resuelven en paralelo en vez de
        // secuencial (antes eran 4 awaits × N tenants en serie).
        const activeTenantsData = await Promise.all(
            activeTenants.map(async tenant => {
                try {
                    const [totalMes, facturasMes, topProductos, porCategoria] = await Promise.all([
                        StatsRepository.getTotalSales(tenant.id, { desde: firstDay, hasta: lastDayStr }),
                        StatsRepository.getTotalInvoices(tenant.id, { desde: firstDay, hasta: lastDayStr }),
                        StatsRepository.getTopProducts(tenant.id, 5, { desde: firstDay, hasta: lastDayStr }),
                        StatsRepository.getSalesByCategory(tenant.id, { desde: firstDay, hasta: lastDayStr })
                    ]);

                    return { tenant, totalMes, facturasMes, topProductos, porCategoria };
                } catch (err) {
                    console.error(
                        `[CONSOLIDADO_ERROR] Error obteniendo estadísticas para tenant ${tenant.nombre}:`,
                        err.message
                    );
                    // Si falla un tenant individual, lo agregamos con datos vacíos para no romper todo el reporte consolidado
                    return {
                        tenant,
                        totalMes: 0,
                        facturasMes: 0,
                        topProductos: [],
                        porCategoria: [],
                        error: err.message
                    };
                }
            })
        );

        let globalTotalSales = 0;
        let globalTotalInvoices = 0;
        for (const tenantData of activeTenantsData) {
            globalTotalSales += tenantData.totalMes;
            globalTotalInvoices += tenantData.facturasMes;
        }

        const templatePath = path.join(__dirname, '../../views/admin/reportes/consolidado_pdf.ejs');
        const data = {
            mes: mesNombre.toUpperCase(),
            activeTenantsData,
            totals: {
                totalSales: globalTotalSales,
                totalInvoices: globalTotalInvoices
            },
            formatMoney
        };

        const html = await ejs.renderFile(templatePath, data);

        let browser = null;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
            });

            await browser.close();
            return pdfBuffer;
        } catch (puppeteerError) {
            console.error('[CONSOLIDADO_PDF_EXPORT_ERROR]:', puppeteerError);
            if (browser) {
                try {
                    await browser.close();
                } catch (_e) {
                    /* intentional */
                }
            }
            throw puppeteerError;
        }
    }
}

module.exports = ReporteConsolidadoService;
