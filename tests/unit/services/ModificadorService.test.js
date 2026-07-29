/**
 * Tests unitarios para ModificadorService: validación de coherencia de grupos
 * y validarYCalcularSeleccion, la fuente de verdad del precio de toppings al vender.
 */

jest.mock('../../../repositories/Tenant/ModificadorRepository', () => ({
    findAllGrupos: jest.fn(),
    findGrupoById: jest.fn(),
    createGrupo: jest.fn(),
    updateGrupo: jest.fn(),
    deleteGrupo: jest.fn(),
    getOpciones: jest.fn(),
    setOpciones: jest.fn(),
    findGruposByProductoId: jest.fn(),
    getGruposIdsDeProducto: jest.fn(),
    setGruposDeProducto: jest.fn()
}));
jest.mock('../../../repositories/Tenant/ProductRepository', () => ({
    findById: jest.fn()
}));

const ModificadorService = require('../../../services/Tenant/ModificadorService');
const ModificadorRepository = require('../../../repositories/Tenant/ModificadorRepository');

describe('ModificadorService.validarDatosGrupo', () => {
    it('fuerza maximo_selecciones = 1 cuando tipo_seleccion es unica', () => {
        const resultado = ModificadorService.validarDatosGrupo({ nombre: 'Salsa', tipo_seleccion: 'unica' });
        expect(resultado.maximo_selecciones).toBe(1);
    });

    it('rechaza minimo mayor que maximo en selección múltiple', () => {
        expect(() =>
            ModificadorService.validarDatosGrupo({
                nombre: 'Toppings',
                tipo_seleccion: 'multiple',
                minimo_selecciones: 3,
                maximo_selecciones: 2
            })
        ).toThrow('mínimo de selecciones no puede ser mayor que el máximo');
    });

    it('exige nombre', () => {
        expect(() => ModificadorService.validarDatosGrupo({ nombre: '  ' })).toThrow('nombre del grupo es requerido');
    });

    it('si es obligatorio, sube el mínimo a 1 cuando estaba en 0', () => {
        const resultado = ModificadorService.validarDatosGrupo({
            nombre: 'Salsa',
            tipo_seleccion: 'multiple',
            obligatorio: true,
            minimo_selecciones: 0
        });
        expect(resultado.minimo_selecciones).toBe(1);
    });
});

describe('ModificadorService.validarYCalcularSeleccion', () => {
    const tenantId = 1;
    const productoId = 10;

    const grupoObligatorioUnico = {
        id: 100,
        nombre: 'Elige tu salsa',
        tipo_seleccion: 'unica',
        obligatorio: true,
        minimo_selecciones: 1,
        maximo_selecciones: 1,
        opciones: [
            { id: 1, nombre: 'BBQ', precio_adicional: 0, insumo_id: null },
            { id: 2, nombre: 'Piña', precio_adicional: 0, insumo_id: null }
        ]
    };
    const grupoOpcionalMultiple = {
        id: 200,
        nombre: 'Toppings extra',
        tipo_seleccion: 'multiple',
        obligatorio: false,
        minimo_selecciones: 0,
        maximo_selecciones: 2,
        opciones: [
            { id: 10, nombre: 'Queso extra', precio_adicional: 2000, insumo_id: null },
            { id: 11, nombre: 'Tocineta', precio_adicional: 3000, insumo_id: null },
            { id: 12, nombre: 'Guacamole', precio_adicional: 2500, insumo_id: null }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rechaza cuando no se cumple un grupo obligatorio', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoObligatorioUnico]);

        await expect(ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [])).rejects.toThrow(
            'Debes elegir al menos 1 opción'
        );
    });

    it('rechaza una opción que no pertenece al grupo indicado', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoObligatorioUnico]);

        await expect(
            ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [{ grupo_id: 100, opciones: [999] }])
        ).rejects.toThrow('no pertenece al grupo');
    });

    it('rechaza selección de un grupo no asignado al producto', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoObligatorioUnico]);

        await expect(
            ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [
                { grupo_id: 100, opciones: [1] },
                { grupo_id: 999, opciones: [1] }
            ])
        ).rejects.toThrow('no está disponible para este producto');
    });

    it('rechaza elegir más de 1 opción en un grupo de selección única', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoObligatorioUnico]);

        await expect(
            ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [{ grupo_id: 100, opciones: [1, 2] }])
        ).rejects.toThrow('Solo puedes elegir 1 opción');
    });

    it('rechaza exceder el máximo de un grupo múltiple', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoOpcionalMultiple]);

        await expect(
            ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [
                { grupo_id: 200, opciones: [10, 11, 12] }
            ])
        ).rejects.toThrow('máximo 2 opción');
    });

    it('calcula correctamente el total con opciones de varios grupos', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([grupoObligatorioUnico, grupoOpcionalMultiple]);

        const resultado = await ModificadorService.validarYCalcularSeleccion(tenantId, productoId, [
            { grupo_id: 100, opciones: [2] },
            { grupo_id: 200, opciones: [10, 11] }
        ]);

        expect(resultado.precioAdicionalTotal).toBe(5000);
        expect(resultado.lineasSnapshot).toHaveLength(3);
        expect(resultado.lineasSnapshot.map(l => l.opcion_nombre)).toEqual(
            expect.arrayContaining(['Piña', 'Queso extra', 'Tocineta'])
        );
        expect(resultado.modificadoresHash).toBe([2, 10, 11].sort((a, b) => a - b).join(','));
    });

    it('no exige nada y devuelve total 0 cuando el producto no tiene grupos asignados', async () => {
        ModificadorRepository.findGruposByProductoId.mockResolvedValue([]);

        const resultado = await ModificadorService.validarYCalcularSeleccion(tenantId, productoId, []);

        expect(resultado.precioAdicionalTotal).toBe(0);
        expect(resultado.lineasSnapshot).toEqual([]);
        expect(resultado.modificadoresHash).toBeNull();
    });
});
