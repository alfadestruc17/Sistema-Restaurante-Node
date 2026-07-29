const base = '/modificadores';

// Plantillas rápidas: para no empezar de cero, el usuario elige una y ajusta
// nombres/precios a su gusto antes de guardar.
const PLANTILLAS = {
    salsas: {
        nombre: 'Elige tu salsa',
        tipo_seleccion: 'unica',
        obligatorio: false,
        opciones: [
            { nombre: 'BBQ', precio_adicional: 0 },
            { nombre: 'Piña', precio_adicional: 0 },
            { nombre: 'Miel mostaza', precio_adicional: 0 },
            { nombre: 'Picante', precio_adicional: 0 }
        ]
    },
    tamanos: {
        nombre: 'Elige el tamaño',
        tipo_seleccion: 'unica',
        obligatorio: true,
        opciones: [
            { nombre: 'Pequeño', precio_adicional: 0 },
            { nombre: 'Mediano', precio_adicional: 2000 },
            { nombre: 'Grande', precio_adicional: 4000 }
        ]
    },
    extras: {
        nombre: 'Toppings extra',
        tipo_seleccion: 'multiple',
        obligatorio: false,
        opciones: [
            { nombre: 'Queso extra', precio_adicional: 2000 },
            { nombre: 'Tocineta', precio_adicional: 3000 },
            { nombre: 'Guacamole', precio_adicional: 2500 },
            { nombre: 'Champiñones', precio_adicional: 2000 }
        ]
    },
    picante: {
        nombre: 'Nivel de picante',
        tipo_seleccion: 'unica',
        obligatorio: false,
        opciones: [
            { nombre: 'Suave', precio_adicional: 0 },
            { nombre: 'Medio', precio_adicional: 0 },
            { nombre: 'Picante', precio_adicional: 0 },
            { nombre: 'Extra picante', precio_adicional: 0 }
        ]
    }
};

function addOpcionRow(nombre = '', precioAdicional = '', insumoId = null, cantidadInsumo = null, unidadInsumo = null) {
    const tbody = document.getElementById('grupoOpcionesContainer');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm opcion-nombre-input" placeholder="Ej: Queso extra" value="${nombre}"></td>
        <td><input type="number" step="0.01" min="0" class="form-control form-control-sm opcion-precio-input" placeholder="0.00" value="${precioAdicional}"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger quitar-opcion" title="Quitar"><i class="bi bi-trash"></i></button></td>
    `;
    // No hay UI todavía para vincular insumo/inventario a una opción; si el grupo
    // ya tenía ese vínculo (creado por API u otra vía), se conserva tal cual al guardar.
    tr.dataset.insumoId = insumoId || '';
    tr.dataset.cantidadInsumo = cantidadInsumo ?? '';
    tr.dataset.unidadInsumo = unidadInsumo || '';
    tr.querySelector('.quitar-opcion').onclick = () => tr.remove();
    tbody.appendChild(tr);
}
document.getElementById('btnAgregarOpcion').addEventListener('click', () => addOpcionRow());

function setTipoSeleccion(valor) {
    document.getElementById('grupoTipoSeleccion').value = valor;
    document.querySelectorAll('.grupo-seleccion-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.valor === valor);
    });
    const esMultiple = valor === 'multiple';
    document.getElementById('grupoAvanzadoTrigger').style.display = esMultiple ? '' : 'none';
    if (!esMultiple) {
        document.getElementById('grupoMinimo').value = '0';
        document.getElementById('grupoMaximo').value = '';
    }
}
document.querySelectorAll('.grupo-seleccion-btn').forEach(btn => {
    btn.addEventListener('click', () => setTipoSeleccion(btn.dataset.valor));
});

function aplicarPlantilla(clave) {
    const plantilla = PLANTILLAS[clave];
    if (!plantilla) return;
    document.getElementById('grupoNombre').value = plantilla.nombre;
    setTipoSeleccion(plantilla.tipo_seleccion);
    document.getElementById('grupoObligatorio').checked = plantilla.obligatorio;
    document.getElementById('grupoOpcionesContainer').innerHTML = '';
    plantilla.opciones.forEach(o => addOpcionRow(o.nombre, o.precio_adicional));
}
document.querySelectorAll('.btn-plantilla').forEach(btn => {
    btn.addEventListener('click', () => aplicarPlantilla(btn.dataset.plantilla));
});

document.getElementById('btnGuardarGrupo').addEventListener('click', async () => {
    const id = document.getElementById('grupoId').value;
    const nombre = document.getElementById('grupoNombre').value.trim();
    const tipo_seleccion = document.getElementById('grupoTipoSeleccion').value;
    const obligatorio = document.getElementById('grupoObligatorio').checked;
    const minimo_selecciones = Number.parseInt(document.getElementById('grupoMinimo').value, 10) || 0;
    const maximoRaw = document.getElementById('grupoMaximo').value;
    const maximo_selecciones = maximoRaw ? Number.parseInt(maximoRaw, 10) : null;

    const rows = document.querySelectorAll('#grupoOpcionesContainer tr');
    const opciones = [];
    rows.forEach(row => {
        const opcionNombre = row.querySelector('.opcion-nombre-input').value.trim();
        if (!opcionNombre) return;
        opciones.push({
            nombre: opcionNombre,
            precio_adicional: Number.parseFloat(row.querySelector('.opcion-precio-input').value) || 0,
            insumo_id: row.dataset.insumoId ? Number.parseInt(row.dataset.insumoId, 10) : null,
            cantidad_insumo: row.dataset.cantidadInsumo ? Number.parseFloat(row.dataset.cantidadInsumo) : null,
            unidad_insumo: row.dataset.unidadInsumo || null
        });
    });

    if (!nombre) {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre del grupo es obligatorio.', timer: 2500, showConfirmButton: false });
        return;
    }
    if (opciones.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Agrega al menos una opción', text: 'Ej: si es "Elige tu salsa", agrega BBQ, Piña, etc.', timer: 3000, showConfirmButton: false });
        return;
    }

    const payload = { nombre, tipo_seleccion, obligatorio, minimo_selecciones, maximo_selecciones, opciones };
    const url = id ? base + '/api/grupos/' + id : base + '/api/grupos';
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
    if (r.ok) { bootstrap.Modal.getInstance(document.getElementById('modalGrupo')).hide(); location.reload(); } else { const e = await r.json(); Swal.fire({ icon: 'error', title: 'Error', text: e.error || 'No se pudo guardar el grupo' }); }
});

document.getElementById('modalGrupo').addEventListener('show.bs.modal', (e) => {
    const trigger = e.relatedTarget;
    const abrioNuevo = trigger?.id === 'btnNuevoGrupo' || trigger?.closest?.('#btnNuevoGrupo');
    const id = document.getElementById('grupoId').value;
    if (abrioNuevo || !id) {
        document.getElementById('grupoId').value = '';
        document.getElementById('grupoNombre').value = '';
        setTipoSeleccion('unica');
        document.getElementById('grupoObligatorio').checked = false;
        document.getElementById('grupoMinimo').value = '0';
        document.getElementById('grupoMaximo').value = '';
        document.getElementById('grupoOpcionesContainer').innerHTML = '';
        document.getElementById('modalGrupoTitulo').textContent = 'Nuevo grupo de toppings';
        document.getElementById('grupoPlantillasWrap').style.display = '';
        addOpcionRow();
    }
});

async function editarGrupo(grupoId) {
    const r = await fetch(base + '/api/grupos/' + grupoId, { credentials: 'same-origin' });
    const g = await r.json();
    if (!g) return;
    document.getElementById('grupoId').value = g.id;
    document.getElementById('modalGrupoTitulo').textContent = 'Editar grupo de toppings';
    document.getElementById('grupoPlantillasWrap').style.display = 'none';
    document.getElementById('grupoNombre').value = g.nombre || '';
    setTipoSeleccion(g.tipo_seleccion || 'unica');
    document.getElementById('grupoObligatorio').checked = !!g.obligatorio;
    document.getElementById('grupoMinimo').value = g.minimo_selecciones || 0;
    document.getElementById('grupoMaximo').value = g.maximo_selecciones ?? '';
    document.getElementById('grupoOpcionesContainer').innerHTML = '';
    (g.opciones || []).forEach(o => addOpcionRow(o.nombre, o.precio_adicional, o.insumo_id, o.cantidad_insumo, o.unidad_insumo));
    if (!g.opciones || g.opciones.length === 0) addOpcionRow();
    new bootstrap.Modal(document.getElementById('modalGrupo')).show();
}

function eliminarGrupo(idOrBtn, nombre) {
    let id, nom;
    if (typeof idOrBtn === 'object' && idOrBtn && idOrBtn.getAttribute) {
        id = idOrBtn.dataset.id;
        nom = (idOrBtn.dataset.nombre || '').replaceAll('&quot;', '"');
    } else {
        id = idOrBtn;
        nom = nombre || '';
    }
    if (!confirm('¿Eliminar el grupo "' + nom + '"? Se quitará de todos los productos que lo tengan asignado.')) return;
    fetch(base + '/api/grupos/' + id, { method: 'DELETE', credentials: 'same-origin' }).then(r => { if (r.ok) location.reload(); else r.json().then(e => alert(e.error)); });
}

document.addEventListener('click', function (e) {
    const btnEliminar = e.target.closest('.btn-eliminar-grupo');
    if (btnEliminar) {
        e.preventDefault();
        eliminarGrupo(btnEliminar);
        return;
    }
    const btnEditar = e.target.closest('.btn-editar-grupo');
    if (btnEditar) {
        e.preventDefault();
        const id = btnEditar.dataset.id;
        editarGrupo(id);
    }
});

(function () {
    const input = document.getElementById('buscarGrupo');
    if (!input) return;
    input.addEventListener('input', () => {
        const term = input.value.trim().toLowerCase();
        document.querySelectorAll('#tbodyGrupos .fila-grupo').forEach(row => {
            const nom = (row.querySelector('[data-field="nombre"]')?.innerText || '').toLowerCase();
            row.style.display = (!term || nom.includes(term)) ? '' : 'none';
        });
        document.querySelectorAll('#listaGruposMobile .grupo-card-item').forEach(card => {
            const nom = (card.dataset.nombre || '').toLowerCase();
            card.style.display = (!term || nom.includes(term)) ? '' : 'none';
        });
    });
})();
