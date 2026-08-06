/**
 * InsumoService - Business logic for ingredients (insumos)
 * Related to: InsumoRepository, routes/costeo.js
 */

const InsumoRepository = require('../../repositories/Tenant/InsumoRepository');
const { derivarTipoBase } = require('../../utils/unidadesCosteo');

/**
 * Normaliza rendimiento_pct a un rango válido (1-100). 100 = sin merma (default).
 */
function normalizarRendimiento(value, fallback = 100) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const n = Number.parseFloat(value);
    if (Number.isNaN(n)) {
        return fallback;
    }
    return Math.min(100, Math.max(1, n));
}

async function validarCodigoActualizacion(nuevoCodigo, codigoActual, tenantId, id) {
    if (!nuevoCodigo) {
        return;
    }
    const codigoTrimmed = nuevoCodigo.trim();
    if (codigoTrimmed === codigoActual) {
        return;
    }

    const exists = await InsumoRepository.findByCodigo(codigoTrimmed, tenantId, id);
    if (exists) {
        throw new Error('Ya existe un insumo con ese código');
    }
}

function determinarUnidadBase(data, insumo, unidadCompra) {
    if (data.unidad_base !== undefined) {
        return data.unidad_base;
    }
    if (data.unidad_compra !== undefined && data.unidad_compra !== insumo.unidad_compra) {
        return derivarTipoBase(unidadCompra);
    }
    return undefined;
}

function parseOptionalInt(value) {
    if (value === undefined) {
        return undefined;
    }
    return value ? Number.parseInt(value, 10) : null;
}

function parseOptionalFloat(value) {
    if (value === undefined) {
        return undefined;
    }
    return Number.parseFloat(value);
}

function construirDatosActualizacion(data, insumo) {
    const unidadCompra = data.unidad_compra || insumo.unidad_compra;
    const updateData = {
        codigo: (data.codigo || insumo.codigo).trim(),
        nombre: (data.nombre || insumo.nombre).trim(),
        unidad_compra: unidadCompra,
        cantidad_compra:
            data.cantidad_compra !== undefined ? Number.parseFloat(data.cantidad_compra) : insumo.cantidad_compra,
        precio_compra: data.precio_compra !== undefined ? Number.parseFloat(data.precio_compra) : insumo.precio_compra,
        precio_venta: data.precio_venta !== undefined ? Number.parseFloat(data.precio_venta) : insumo.precio_venta
    };

    const unidadBase = determinarUnidadBase(data, insumo, unidadCompra);
    if (unidadBase !== undefined) {
        updateData.unidad_base = unidadBase;
    }

    if (data.rendimiento_pct !== undefined) {
        updateData.rendimiento_pct = normalizarRendimiento(data.rendimiento_pct, insumo.rendimiento_pct ?? 100);
    }

    const stockMinimo = parseOptionalFloat(data.stock_minimo);
    if (stockMinimo !== undefined) {
        updateData.stock_minimo = stockMinimo;
    }

    const categoriaId = parseOptionalInt(data.categoria_id);
    if (categoriaId !== undefined) {
        updateData.categoria_id = categoriaId;
    }

    const unidadMedidaId = parseOptionalInt(data.unidad_medida_id);
    if (unidadMedidaId !== undefined) {
        updateData.unidad_medida_id = unidadMedidaId;
    }

    const proveedorId = parseOptionalInt(data.proveedor_id);
    if (proveedorId !== undefined) {
        updateData.proveedor_id = proveedorId;
    }

    return updateData;
}

function parseImportRow(r) {
    const cleanString = val => (val !== null && val !== undefined ? String(val).trim() : '');
    const codigo = cleanString(r.codigo);
    const nombre = cleanString(r.nombre);
    if (!codigo || !nombre) {
        return null;
    }
    return {
        codigo,
        nombre,
        unidad_compra: cleanString(r.unidad_compra) || 'UND',
        cantidad_compra: Number.parseFloat(r.cantidad_compra) || 1,
        precio_compra: Number.parseFloat(r.precio_compra) || 0
    };
}

async function processImportRow(tenantId, parsedRow) {
    const existente = await InsumoRepository.findByCodigo(parsedRow.codigo, tenantId);
    if (existente) {
        await InsumoRepository.update(existente.id, tenantId, parsedRow);
        return 'actualizado';
    }
    await InsumoRepository.create(tenantId, parsedRow);
    return 'creado';
}

class InsumoService {
    static async list(tenantId, filters = {}) {
        return InsumoRepository.findAll(tenantId, filters);
    }

    static async getById(id, tenantId) {
        return InsumoRepository.findById(id, tenantId);
    }

    static async create(tenantId, data) {
        if (!data.codigo || !data.nombre) {
            throw new Error('Código y nombre son requeridos');
        }
        const exists = await InsumoRepository.findByCodigo(data.codigo.trim(), tenantId);
        if (exists) {
            throw new Error('Ya existe un insumo con ese código');
        }
        const unidadCompra = data.unidad_compra || 'UND';
        return InsumoRepository.create(tenantId, {
            codigo: data.codigo.trim(),
            nombre: data.nombre.trim(),
            unidad_compra: unidadCompra,
            cantidad_compra: Number.parseFloat(data.cantidad_compra) || 1,
            precio_compra: Number.parseFloat(data.precio_compra) || 0,
            // unidad_base se deriva de unidad_compra salvo que venga explícita (no depender de que el frontend la envíe)
            unidad_base: data.unidad_base || derivarTipoBase(unidadCompra),
            rendimiento_pct: normalizarRendimiento(data.rendimiento_pct),
            stock_minimo: data.stock_minimo !== undefined ? Number.parseFloat(data.stock_minimo) : 0,
            categoria_id: data.categoria_id ? Number.parseInt(data.categoria_id, 10) : null,
            unidad_medida_id: data.unidad_medida_id ? Number.parseInt(data.unidad_medida_id, 10) : null,
            proveedor_id: data.proveedor_id ? Number.parseInt(data.proveedor_id, 10) : null,
            precio_venta: data.precio_venta !== undefined ? Number.parseFloat(data.precio_venta) : 0
        });
    }

    static async update(id, tenantId, data) {
        const insumo = await InsumoRepository.findById(id, tenantId);
        if (!insumo) {
            throw new Error('Insumo no encontrado');
        }
        await validarCodigoActualizacion(data.codigo, insumo.codigo, tenantId, id);

        const updateData = construirDatosActualizacion(data, insumo);
        await InsumoRepository.update(id, tenantId, updateData);
        return { message: 'Insumo actualizado' };
    }

    static async delete(id, tenantId) {
        const insumo = await InsumoRepository.findById(id, tenantId);
        if (!insumo) {
            throw new Error('Insumo no encontrado');
        }
        try {
            await InsumoRepository.delete(id, tenantId);
        } catch (e) {
            if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED') {
                throw new Error(
                    'No se puede eliminar este insumo porque ya tiene movimientos de inventario (compras/salidas) o está usado en una receta. Ajusta su stock a 0 y déjalo sin usar en recetas, o simplemente no lo uses más.',
                    { cause: e }
                );
            }
            throw e;
        }
        return { message: 'Insumo eliminado' };
    }

    /**
     * Import insumos from Excel rows. If codigo exists, update; otherwise create.
     * @param {number} tenantId
     * @param {Array<{codigo, nombre, unidad_compra?, cantidad_compra?, precio_compra?}>} rows
     * @returns {Promise<{ creados: number, actualizados: number, errores: Array<{fila: number, mensaje: string}> }>}
     */
    static async importFromExcel(tenantId, rows) {
        if (!rows || rows.length === 0) {
            throw new Error('No hay registros válidos para importar');
        }
        let creados = 0;
        let actualizados = 0;
        const errores = [];
        for (let i = 0; i < rows.length; i++) {
            const fila = i + 2; // 1-based + header
            const parsedRow = parseImportRow(rows[i]);
            if (!parsedRow) {
                errores.push({ fila, mensaje: 'Código y nombre son obligatorios' });
                continue;
            }
            try {
                const action = await processImportRow(tenantId, parsedRow);
                if (action === 'actualizado') {
                    actualizados++;
                } else {
                    creados++;
                }
            } catch (err) {
                errores.push({ fila, mensaje: err.message || 'Error al guardar' });
            }
        }
        return { creados, actualizados, errores };
    }
}

module.exports = InsumoService;
