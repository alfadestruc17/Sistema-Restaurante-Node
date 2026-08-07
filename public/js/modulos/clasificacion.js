// Clasificación — ranking de productos más vendidos con filtros de fecha y categoría

(function () {
    function money(n) {
        return '$ ' + Math.round(n || 0).toLocaleString('es-CO');
    }

    const $desde = document.getElementById('clasifDesde');
    const $hasta = document.getElementById('clasifHasta');
    const $categoria = document.getElementById('clasifCategoria');
    const $lista = document.getElementById('clasifLista');
    const $resumenProductos = document.getElementById('clasifResumenProductos');
    const $resumenUnidades = document.getElementById('clasifResumenUnidades');
    const $resumenTotal = document.getElementById('clasifResumenTotal');

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
    }

    function renderLista(productos) {
        if (!productos.length) {
            $lista.innerHTML = `
                <div class="clasif-empty">
                    <i class="bi bi-inbox" style="font-size:32px;"></i>
                    <p class="mt-2 mb-0">No hay ventas registradas para este filtro</p>
                </div>`;
            return;
        }

        const maxVal = Math.max(...productos.map(p => p.total_ventas || 0)) || 1;
        $lista.innerHTML = productos.map((p, idx) => {
            const pct = ((p.total_ventas || 0) / maxVal) * 100;
            const rankClass = idx < 3 ? 'clasif-rank top3' : 'clasif-rank';
            return `
                <div class="clasif-row">
                    <span class="${rankClass}">${idx + 1}</span>
                    <div class="clasif-info">
                        <div class="clasif-name-row">
                            <span class="clasif-name">${escapeHtml(p.nombre)}<span class="clasif-cat-badge">${escapeHtml(p.categoria_nombre)}</span></span>
                            <span class="clasif-total">${money(p.total_ventas)}</span>
                        </div>
                        <div class="clasif-bar-track">
                            <div class="clasif-bar-fill" style="width:${pct}%"></div>
                        </div>
                    </div>
                    <span class="clasif-units">${p.total_cantidad} u.</span>
                </div>`;
        }).join('');
    }

    function renderResumen(productos) {
        const totalUnidades = productos.reduce((s, p) => s + (p.total_cantidad || 0), 0);
        const totalVentas = productos.reduce((s, p) => s + (p.total_ventas || 0), 0);
        $resumenProductos.textContent = productos.length;
        $resumenUnidades.textContent = Math.round(totalUnidades).toLocaleString('es-CO');
        $resumenTotal.textContent = money(totalVentas);
    }

    async function cargar() {
        $lista.innerHTML = `
            <div class="clasif-empty">
                <div class="spinner-border spinner-border-sm text-secondary"></div>
            </div>`;

        const params = new URLSearchParams();
        if ($desde.value) params.append('desde', $desde.value);
        if ($hasta.value) params.append('hasta', $hasta.value);
        if ($categoria.value) params.append('categoria_id', $categoria.value);

        try {
            const resp = await fetch(`/clasificacion/ranking?${params.toString()}`);
            if (!resp.ok) throw new Error('Error al cargar el ranking');
            const productos = await resp.json();
            renderResumen(productos);
            renderLista(productos);
        } catch (err) {
            console.error(err);
            $lista.innerHTML = '<div class="clasif-empty text-danger">No se pudo cargar el ranking</div>';
        }
    }

    document.getElementById('clasifAplicar')?.addEventListener('click', cargar);
    document.getElementById('clasifLimpiar')?.addEventListener('click', () => {
        $desde.value = '';
        $hasta.value = '';
        $categoria.value = '';
        cargar();
    });

    document.addEventListener('DOMContentLoaded', cargar);
})();
