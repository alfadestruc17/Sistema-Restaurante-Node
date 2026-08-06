// POS Modificadores — modal de selección de toppings/modificadores al agregar un producto

window.POS_MODIFICADORES = {
    _cache: new Map(), // producto_id -> grupos[] (o [] si no tiene)
    _productoActual: null,

    // Punto de entrada llamado desde POS.addToCart: si el producto no tiene
    // grupos configurados, agrega directo al carrito (sin fricción, comportamiento
    // de siempre); si tiene, abre el modal de selección.
    async abrir(producto) {
        let grupos = this._cache.get(producto.id);
        if (grupos === undefined) {
            try {
                grupos = await POS_API.getModificadoresProducto(producto.id);
            } catch (_) {
                grupos = [];
            }
            this._cache.set(producto.id, grupos);
        }

        if (!grupos || grupos.length === 0) {
            POS.agregarSimple(producto);
            return;
        }

        this._productoActual = producto;
        this._render(grupos);
        new bootstrap.Modal(document.getElementById('posModificadoresModal')).show();
    },

    _render(grupos) {
        document.getElementById('posModificadoresProductoNombre').textContent = this._productoActual.nombre;
        const body = document.getElementById('posModificadoresBody');
        body.innerHTML = grupos.map(g => {
            const inputType = g.tipo_seleccion === 'multiple' ? 'checkbox' : 'radio';
            const hint = g.obligatorio
                ? '<span class="badge bg-warning text-dark">Obligatorio</span>'
                : '<span class="badge bg-light text-dark">Opcional</span>';
            let subHint = 'Elige 1';
            if (g.tipo_seleccion === 'multiple') {
                subHint = g.maximo_selecciones
                    ? `Elige hasta ${g.maximo_selecciones}`
                    : 'Elige las que quieras';
            }
            const opcionesHtml = (g.opciones || []).map(o => `
                <label class="pos-mod-opcion">
                    <span>
                        <input type="${inputType}" name="pos-mod-grupo-${g.id}" value="${o.id}"
                            data-precio="${o.precio_adicional}" data-nombre="${o.nombre}" class="form-check-input me-2">
                        ${o.nombre}
                    </span>
                    <span class="text-muted small">${Number(o.precio_adicional) > 0 ? '+$' + Number(o.precio_adicional).toLocaleString('es-CO') : ''}</span>
                </label>`).join('');
            return `<div class="pos-mod-grupo mb-3" data-grupo-id="${g.id}" data-obligatorio="${g.obligatorio ? 1 : 0}" data-minimo="${g.minimo_selecciones || 0}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong>${g.nombre}</strong> ${hint}
                </div>
                <div class="text-muted small mb-2">${subHint}</div>
                ${opcionesHtml}
            </div>`;
        }).join('');

        body.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(inp => {
            inp.addEventListener('change', () => this._actualizarTotal());
        });

        this._actualizarTotal();
    },

    _actualizarTotal() {
        const body = document.getElementById('posModificadoresBody');
        let totalAdicional = 0;
        body.querySelectorAll('input:checked').forEach(inp => {
            totalAdicional += Number.parseFloat(inp.dataset.precio) || 0;
        });
        const base = Number.parseFloat(this._productoActual.precio_unidad) || 0;
        document.getElementById('posModificadoresTotal').textContent = '$ ' + (base + totalAdicional).toLocaleString('es-CO');

        let valido = true;
        body.querySelectorAll('.pos-mod-grupo').forEach(div => {
            if (div.dataset.obligatorio === '1') {
                const marcados = div.querySelectorAll('input:checked').length;
                const minimo = Math.max(1, Number.parseInt(div.dataset.minimo, 10) || 0);
                if (marcados < minimo) valido = false;
            }
        });
        document.getElementById('btnPosModificadoresAgregar').disabled = !valido;
    },

    confirmar() {
        const body = document.getElementById('posModificadoresBody');
        const seleccion = [];
        const preview = [];
        let totalAdicional = 0;

        body.querySelectorAll('.pos-mod-grupo').forEach(div => {
            const grupoId = Number.parseInt(div.dataset.grupoId, 10);
            const opciones = [];
            div.querySelectorAll('input:checked').forEach(inp => {
                opciones.push(Number.parseInt(inp.value, 10));
                const precio = Number.parseFloat(inp.dataset.precio) || 0;
                totalAdicional += precio;
                preview.push({ opcion_nombre: inp.dataset.nombre, precio_adicional: precio });
            });
            if (opciones.length > 0) {
                seleccion.push({ grupo_id: grupoId, opciones });
            }
        });

        POS.addToCartConModificadores(this._productoActual, seleccion, preview, totalAdicional);
        bootstrap.Modal.getInstance(document.getElementById('posModificadoresModal'))?.hide();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnPosModificadoresAgregar')?.addEventListener('click', () => POS_MODIFICADORES.confirmar());
});
