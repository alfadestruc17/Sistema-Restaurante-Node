// Mesas Modificadores — modal de selección de toppings al agregar un producto al pedido

window.MESAS_MODIFICADORES = {
    _cache: new Map(), // producto_id -> grupos[] (o [] si no tiene)
    _productoActual: null,
    _resolverConfirmacion: null,

    async _obtenerGrupos(producto) {
        let grupos = this._cache.get(producto.id);
        if (grupos === undefined) {
            try {
                const r = await fetch(`/api/mesas/productos/${producto.id}/modificadores`);
                grupos = r.ok ? await r.json() : [];
            } catch (_) {
                grupos = [];
            }
            this._cache.set(producto.id, grupos);
        }
        return grupos;
    },

    // Si el producto tiene grupos de toppings configurados, abre el modal y devuelve una
    // Promise que resuelve con { seleccion, preview, total } al confirmar, o null si se
    // cancela. Si no tiene grupos, resuelve de inmediato sin abrir nada (sin fricción).
    async elegir(producto) {
        const grupos = await this._obtenerGrupos(producto);
        if (!grupos || grupos.length === 0) {
            return { seleccion: [], preview: [], total: 0 };
        }

        this._productoActual = producto;
        this._render(grupos);

        return new Promise(resolve => {
            this._resolverConfirmacion = resolve;
            const modalEl = document.getElementById('mesaModificadoresModal');
            new bootstrap.Modal(modalEl).show();
            modalEl.addEventListener('hidden.bs.modal', () => {
                if (this._resolverConfirmacion) {
                    this._resolverConfirmacion(null);
                    this._resolverConfirmacion = null;
                }
            }, { once: true });
        });
    },

    _render(grupos) {
        document.getElementById('mesaModificadoresProductoNombre').textContent = this._productoActual.nombre;
        const body = document.getElementById('mesaModificadoresBody');
        body.innerHTML = grupos.map(g => {
            const inputType = g.tipo_seleccion === 'multiple' ? 'checkbox' : 'radio';
            const hint = g.obligatorio
                ? '<span class="badge bg-warning text-dark">Obligatorio</span>'
                : '<span class="badge bg-light text-dark">Opcional</span>';
            const subHint = g.tipo_seleccion === 'multiple'
                ? (g.maximo_selecciones ? `Elige hasta ${g.maximo_selecciones}` : 'Elige las que quieras')
                : 'Elige 1';
            const opcionesHtml = (g.opciones || []).map(o => `
                <label class="pos-mod-opcion">
                    <span>
                        <input type="${inputType}" name="mesa-mod-grupo-${g.id}" value="${o.id}"
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

        this._actualizarTotal();
    },

    _actualizarTotal() {
        const body = document.getElementById('mesaModificadoresBody');
        let totalAdicional = 0;
        body.querySelectorAll('input:checked').forEach(inp => {
            totalAdicional += Number.parseFloat(inp.dataset.precio) || 0;
        });
        const p = this._productoActual;
        const base = Number(p.precio_unidad != null ? p.precio_unidad : (p.precio || 0));
        document.getElementById('mesaModificadoresTotal').textContent = '$ ' + (base + totalAdicional).toLocaleString('es-CO');

        let valido = true;
        body.querySelectorAll('.pos-mod-grupo').forEach(div => {
            if (div.dataset.obligatorio === '1') {
                const marcados = div.querySelectorAll('input:checked').length;
                const minimo = Math.max(1, Number.parseInt(div.dataset.minimo, 10) || 0);
                if (marcados < minimo) valido = false;
            }
        });
        document.getElementById('btnMesaModificadoresAgregar').disabled = !valido;
    },

    confirmar() {
        const body = document.getElementById('mesaModificadoresBody');
        const seleccion = [];
        const preview = [];
        let total = 0;

        body.querySelectorAll('.pos-mod-grupo').forEach(div => {
            const grupoId = Number.parseInt(div.dataset.grupoId, 10);
            const opciones = [];
            div.querySelectorAll('input:checked').forEach(inp => {
                opciones.push(Number.parseInt(inp.value, 10));
                const precio = Number.parseFloat(inp.dataset.precio) || 0;
                total += precio;
                preview.push({ opcion_nombre: inp.dataset.nombre, precio_adicional: precio });
            });
            if (opciones.length > 0) {
                seleccion.push({ grupo_id: grupoId, opciones });
            }
        });

        if (this._resolverConfirmacion) {
            this._resolverConfirmacion({ seleccion, preview, total });
            this._resolverConfirmacion = null;
        }
        bootstrap.Modal.getInstance(document.getElementById('mesaModificadoresModal'))?.hide();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnMesaModificadoresAgregar')?.addEventListener('click', () => MESAS_MODIFICADORES.confirmar());
});
