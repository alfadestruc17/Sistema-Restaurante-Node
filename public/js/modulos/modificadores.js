const base = '/modificadores';
let insumosList = [];

async function loadInsumos() {
    const r = await fetch(base + '/api/insumos', { credentials: 'same-origin' });
    insumosList = await r.json();
}

function addOpcionRow(nombre = '', precioAdicional = '', insumoId = '', cantidadInsumo = '', unidadInsumo = 'g') {
    const tbody = document.getElementById('grupoOpcionesContainer');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm opcion-nombre-input" placeholder="Ej: Queso extra" value="${nombre}"></td>
        <td><input type="number" step="0.01" min="0" class="form-control form-control-sm opcion-precio-input" placeholder="0.00" value="${precioAdicional}"></td>
        <td>
            <select class="form-select form-select-sm opcion-insumo-select">
                <option value="">-- Ninguno --</option>
                ${insumosList.map(i => `<option value="${i.id}" ${i.id == insumoId ? 'selected' : ''}>${i.nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="number" step="0.0001" class="form-control form-control-sm opcion-cantidad-input" placeholder="Cant." value="${cantidadInsumo}"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger quitar-opcion" title="Quitar"><i class="bi bi-trash"></i></button></td>
    `;
    tr.dataset.unidadInsumo = unidadInsumo || 'g';
    tr.querySelector('.quitar-opcion').onclick = () => tr.remove();
    tbody.appendChild(tr);
}
document.getElementById('btnAgregarOpcion').addEventListener('click', () => addOpcionRow());

function toggleMinMaxVisibility() {
    const esMultiple = document.getElementById('grupoTipoSeleccion').value === 'multiple';
    document.getElementById('grupoMinimoWrap').style.display = esMultiple ? '' : 'none';
    document.getElementById('grupoMaximoWrap').style.display = esMultiple ? '' : 'none';
}
document.getElementById('grupoTipoSeleccion').addEventListener('change', toggleMinMaxVisibility);

document.getElementById('btnGuardarGrupo').addEventListener('click', async () => {
    const id = document.getElementById('grupoId').value;
    const nombre = document.getElementById('grupoNombre').value.trim();
    const descripcion = document.getElementById('grupoDescripcion').value.trim();
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
            insumo_id: row.querySelector('.opcion-insumo-select').value ? Number.parseInt(row.querySelector('.opcion-insumo-select').value, 10) : null,
            cantidad_insumo: row.querySelector('.opcion-cantidad-input').value ? Number.parseFloat(row.querySelector('.opcion-cantidad-input').value) : null,
            unidad_insumo: row.dataset.unidadInsumo || 'g'
        });
    });

    if (!nombre) {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre del grupo es obligatorio.', timer: 2500, showConfirmButton: false });
        return;
    }

    const payload = { nombre, descripcion, tipo_seleccion, obligatorio, minimo_selecciones, maximo_selecciones, opciones };
    const url = id ? base + '/api/grupos/' + id : base + '/api/grupos';
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
    if (r.ok) { bootstrap.Modal.getInstance(document.getElementById('modalGrupo')).hide(); location.reload(); } else { const e = await r.json(); Swal.fire({ icon: 'error', title: 'Error', text: e.error || 'No se pudo guardar el grupo' }); }
});

document.getElementById('modalGrupo').addEventListener('show.bs.modal', async (e) => {
    const trigger = e.relatedTarget;
    const abrioNuevo = trigger?.id === 'btnNuevoGrupo' || trigger?.closest?.('#btnNuevoGrupo');
    const id = document.getElementById('grupoId').value;
    if (abrioNuevo || !id) {
        document.getElementById('grupoId').value = '';
        document.getElementById('grupoNombre').value = '';
        document.getElementById('grupoDescripcion').value = '';
        document.getElementById('grupoTipoSeleccion').value = 'unica';
        document.getElementById('grupoObligatorio').checked = false;
        document.getElementById('grupoMinimo').value = '0';
        document.getElementById('grupoMaximo').value = '';
        document.getElementById('grupoOpcionesContainer').innerHTML = '';
        document.getElementById('modalGrupoTitulo').textContent = 'Nuevo grupo de modificadores';
        toggleMinMaxVisibility();
        await loadInsumos();
        addOpcionRow();
    }
});

async function editarGrupo(grupoId) {
    await loadInsumos();
    const r = await fetch(base + '/api/grupos/' + grupoId, { credentials: 'same-origin' });
    const g = await r.json();
    if (!g) return;
    document.getElementById('grupoId').value = g.id;
    document.getElementById('modalGrupoTitulo').textContent = 'Editar grupo de modificadores';
    document.getElementById('grupoNombre').value = g.nombre || '';
    document.getElementById('grupoDescripcion').value = g.descripcion || '';
    document.getElementById('grupoTipoSeleccion').value = g.tipo_seleccion || 'unica';
    document.getElementById('grupoObligatorio').checked = !!g.obligatorio;
    document.getElementById('grupoMinimo').value = g.minimo_selecciones || 0;
    document.getElementById('grupoMaximo').value = g.maximo_selecciones ?? '';
    toggleMinMaxVisibility();
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
