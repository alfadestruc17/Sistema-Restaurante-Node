// POS Modificadores — modal de selección de toppings/modificadores al agregar un producto

window.POS_MODIFICADORES = {
    _cache: new Map(), // producto_id -> grupos[] (o [] si no tiene)
    _productoActual: null,
    // Índice en POS.state.cart de la línea que se está corrigiendo (ver editar()), o
    // null si el modal está agregando un producto nuevo al carrito.
    _editandoIdx: null,

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

        this._editandoIdx = null;
        this._productoActual = producto;
        this._render(grupos);
        new bootstrap.Modal(document.getElementById('posModificadoresModal')).show();
    },

    // Reabre el modal para corregir los toppings de una línea ya en el carrito (botón de
    // lápiz en pos_ui.renderCart). Pre-marca la selección actual de esa línea.
    async editar(idx) {
        const item = POS.state.cart[idx];
        const producto = item && POS.state.productosMap?.get(item.producto_id);
        if (!item || !producto) return;

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
            Swal.fire({
                icon: 'info',
                title: 'Sin toppings configurables',
                text: 'Este producto no tiene toppings/modificadores para elegir.',
                timer: 1800,
                showConfirmButton: false
            });
            return;
        }

        this._editandoIdx = idx;
        this._productoActual = producto;
        this._render(grupos, item.modificadores_seleccion || []);
        new bootstrap.Modal(document.getElementById('posModificadoresModal')).show();
    },

    _render(grupos, seleccionActual = []) {
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
            // Los navegadores restauran el "checked" de inputs previos cuando el nuevo
            // innerHTML reutiliza el mismo name+type (grupos de modificadores compartidos
            // entre productos): forzamos el estado a no marcado para partir siempre limpio.
            inp.checked = false;
            inp.addEventListener('change', () => this._actualizarTotal());
        });

        // Al editar una línea ya en el carrito, pre-marcar lo que ya tenía elegido.
        seleccionActual.forEach(s => {
            (s.opciones || []).forEach(optId => {
                const inp = body.querySelector(`input[name="pos-mod-grupo-${s.grupo_id}"][value="${optId}"]`);
                if (inp) inp.checked = true;
            });
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

        if (this._editandoIdx !== null) {
            POS.actualizarModificadoresCarrito(this._editandoIdx, seleccion, preview, totalAdicional);
            this._editandoIdx = null;
        } else {
            POS.addToCartConModificadores(this._productoActual, seleccion, preview, totalAdicional);
        }
        bootstrap.Modal.getInstance(document.getElementById('posModificadoresModal'))?.hide();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnPosModificadoresAgregar')?.addEventListener('click', () => POS_MODIFICADORES.confirmar());
});
