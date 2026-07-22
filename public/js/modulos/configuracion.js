// Extraída del click de vista previa (S3776): convierte 7 ifs anidados en 7
// llamadas planas (las llamadas a función no suman complejidad cognitiva).
function agregarParamSiExiste(params, form, selector, key) {
    const el = form.querySelector(selector);
    if (el?.value) params.set(key, el.value);
}

let logoBlobUrl = null;
let qrBlobUrl = null;

// Reemplaza en el iframe (mismo origen) las imágenes ya guardadas por las que el
// usuario acaba de seleccionar en el formulario pero todavía no ha subido.
function inyectarImagenesSinGuardar(iframePreview, form) {
    const doc = iframePreview.contentDocument;
    if (!doc) return;

    const logoFile = form.querySelector('[name="logo"]')?.files?.[0];
    if (logoFile) {
        if (logoBlobUrl) URL.revokeObjectURL(logoBlobUrl);
        logoBlobUrl = URL.createObjectURL(logoFile);
        const img = doc.getElementById('previewLogoImg');
        if (img) {
            img.src = logoBlobUrl;
            img.style.display = '';
        }
    }

    const qrFile = form.querySelector('[name="qr"]')?.files?.[0];
    if (qrFile) {
        if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
        qrBlobUrl = URL.createObjectURL(qrFile);
        const img = doc.getElementById('previewQrImg');
        const container = doc.getElementById('previewQrContainer');
        if (img) img.src = qrBlobUrl;
        if (container) container.style.display = '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const btnPreview = document.getElementById('btnPreviewFactura');
    const modalPreview = new bootstrap.Modal(document.getElementById('modalPreviewFactura'));
    const iframePreview = document.getElementById('iframePreview');

    if (btnPreview) {
        btnPreview.addEventListener('click', function () {
            const form = document.querySelector('form[action="/configuracion"]');
            const params = new URLSearchParams();
            if (form) {
                agregarParamSiExiste(params, form, '[name="nombre_negocio"]', 'nombre_negocio');
                agregarParamSiExiste(params, form, '[name="direccion"]', 'direccion');
                agregarParamSiExiste(params, form, '[name="telefono"]', 'telefono');
                agregarParamSiExiste(params, form, '[name="nit"]', 'nit');
                agregarParamSiExiste(params, form, '[name="pie_pagina"]', 'pie_pagina');
                agregarParamSiExiste(params, form, '[name="ancho_papel"]', 'ancho_papel');
                agregarParamSiExiste(params, form, '[name="font_size"]', 'font_size');
            }
            if (form) {
                iframePreview.addEventListener('load', function onLoad() {
                    iframePreview.removeEventListener('load', onLoad);
                    inyectarImagenesSinGuardar(iframePreview, form);
                });
            }
            iframePreview.src = '/configuracion/preview' + (params.toString() ? '?' + params.toString() : '');
            modalPreview.show();
        });
    }
});
