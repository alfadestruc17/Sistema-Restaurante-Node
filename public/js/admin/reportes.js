(function () {
    var form = document.getElementById('exportForm');
    var btn = document.getElementById('exportSubmitBtn');
    var label = document.getElementById('exportSubmitLabel');
    var tenantSelect = document.getElementById('tenantId');
    var tenantsListPanel = document.getElementById('tenantsListPanel');
    if (!form) return;

    function syncActiveRow() {
        if (!tenantsListPanel) return;
        var rows = tenantsListPanel.querySelectorAll('.tenant-pick-row');
        rows.forEach(function (row) {
            row.classList.toggle('tenant-pick-row-active', row.dataset.tenantId === tenantSelect.value);
        });
    }

    if (tenantsListPanel && tenantSelect) {
        tenantsListPanel.addEventListener('click', function (evt) {
            var row = evt.target.closest('.tenant-pick-row');
            if (!row) return;
            tenantSelect.value = row.dataset.tenantId;
            syncActiveRow();
        });
        tenantSelect.addEventListener('change', syncActiveRow);
        syncActiveRow();
    }

    form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        var tenantId = tenantSelect.value;
        var mesDesde = document.getElementById('mesDesde').value;
        var anioDesde = document.getElementById('anioDesde').value;
        var mesHasta = document.getElementById('mesHasta').value;
        var anioHasta = document.getElementById('anioHasta').value;

        var params = new URLSearchParams({
            tenantId: tenantId,
            mesDesde: mesDesde,
            anioDesde: anioDesde,
            mesHasta: mesHasta,
            anioHasta: anioHasta
        });
        var url = '/admin/reportes/exportar-pdf?' + params.toString();

        pollJobAndDownload(url, {
            onStart: function () {
                btn.disabled = true;
                label.textContent = 'Generando reporte...';
            },
            onDone: function () {
                btn.disabled = false;
                label.textContent = 'Generar y Descargar PDF';
            }
        });
    });
})();
