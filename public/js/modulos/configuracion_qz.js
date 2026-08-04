// Configuración > Impresora / QZ Tray — detección de impresoras y prueba de
// impresión/cajón. Usa el mismo puente window.POS_QZ que el módulo POS
// (pos_qz.js no se carga en esta página; esta es una versión mínima propia
// porque aquí no hay carrito/factura, solo pruebas directas contra QZ Tray).

document.addEventListener('DOMContentLoaded', () => {
    const selectImpresora = document.getElementById('qzImpresoraSelect');
    const inputImpresora = document.getElementById('qzImpresoraNombre');
    const btnDetectar = document.getElementById('qzBtnDetectar');
    const btnProbar = document.getElementById('qzBtnProbar');

    if (!selectImpresora || typeof qz === 'undefined') return;

    if (inputImpresora?.value) {
        const opt = document.createElement('option');
        opt.value = inputImpresora.value;
        opt.textContent = inputImpresora.value;
        selectImpresora.appendChild(opt);
    }

    selectImpresora.addEventListener('change', () => {
        if (inputImpresora) inputImpresora.value = selectImpresora.value;
    });

    btnDetectar?.addEventListener('click', async () => {
        btnDetectar.disabled = true;
        btnDetectar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        try {
            if (!qz.websocket.isActive()) {
                await qz.websocket.connect({ retries: 2, delay: 1 });
            }
            const impresoras = await qz.printers.find();
            const lista = Array.isArray(impresoras) ? impresoras : [impresoras];
            selectImpresora.innerHTML = '';
            lista.forEach(nombre => {
                const opt = document.createElement('option');
                opt.value = nombre;
                opt.textContent = nombre;
                selectImpresora.appendChild(opt);
            });
            if (lista[0]) inputImpresora.value = lista[0];
        } catch (err) {
            console.warn('QZ: no se pudieron detectar impresoras', err);
            Swal?.fire('QZ Tray no disponible', 'Verifica que QZ Tray esté instalado y corriendo en esta PC.', 'warning')
                ?? alert('QZ Tray no disponible en esta PC.');
        } finally {
            btnDetectar.disabled = false;
            btnDetectar.innerHTML = '<i class="bi bi-search me-1"></i>Detectar impresoras';
        }
    });

    btnProbar?.addEventListener('click', async () => {
        const nombre = inputImpresora?.value || null;
        try {
            if (!qz.websocket.isActive()) {
                await qz.websocket.connect({ retries: 2, delay: 1 });
            }
            const printer = nombre ? await qz.printers.find(nombre) : await qz.printers.getDefault();
            const cfg = qz.configs.create(printer);
            await qz.print(cfg, [
                { type: 'raw', format: 'plain', data: 'Prueba de impresión GastroFlow\n\n\n' },
                { type: 'raw', format: 'hex', data: '1b700019fa' }
            ]);
        } catch (err) {
            console.warn('QZ: prueba fallida', err);
            Swal?.fire('Prueba fallida', 'No se pudo imprimir/abrir el cajón. Revisa la conexión con QZ Tray.', 'error')
                ?? alert('Prueba fallida: revisa la conexión con QZ Tray.');
        }
    });
});
