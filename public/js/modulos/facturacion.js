/**
 * facturacion.js - Registro de método de pago (Widget de Checkout de Wompi)
 * y botón "Cobrar ahora" para la página /facturacion.
 *
 * El Widget de Checkout de Wompi (window.WidgetCheckout, cargado desde
 * https://checkout.wompi.co/widget.js) hace el primer cobro + "guardar
 * tarjeta" en un modal hospedado por Wompi -- este código nunca ve ni toca
 * datos de tarjeta cruda. Si Wompi devuelve un payment_source_id en la
 * transacción resultante, se envía al backend para guardarlo.
 */
(function () {
    const cfg = window.__FACTURACION__ || {};

    function abrirWidgetCheckout() {
        if (!cfg.wompiPublicKey || typeof WidgetCheckout === 'undefined') {
            Swal.fire('No disponible', 'El cobro automático no está disponible en este momento.', 'error');
            return;
        }
        if (!cfg.checkoutSetup) {
            Swal.fire('Sin plan asignado', 'Tu restaurante no tiene un plan con costo asignado todavía.', 'warning');
            return;
        }

        // reference/signature vienen del servidor (requieren el secreto de
        // integridad, que nunca se expone al navegador) -- ver FacturacionController.index.
        const checkout = new WidgetCheckout({
            currency: 'COP',
            amountInCents: cfg.checkoutSetup.amountInCents,
            reference: cfg.checkoutSetup.reference,
            publicKey: cfg.wompiPublicKey,
            signature: { integrity: cfg.checkoutSetup.signature },
            customerData: cfg.tenantEmail ? { email: cfg.tenantEmail } : undefined
        });

        checkout.open(function (result) {
            const transaction = result && result.transaction;
            if (!transaction || transaction.status !== 'APPROVED') {
                Swal.fire('No se completó el pago', 'No se activó el cobro automático.', 'info');
                return;
            }
            const paymentSourceId = transaction.payment_source_id;
            if (!paymentSourceId) {
                Swal.fire(
                    'Pago recibido, pero sin tarjeta guardada',
                    'El pago se procesó pero no se pudo activar el cobro automático. Contacta a soporte.',
                    'warning'
                );
                return;
            }
            fetch('/facturacion/metodo-pago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentSourceId })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.ok) {
                        Swal.fire('¡Listo!', 'Cobro automático activado.', 'success').then(() => location.reload());
                    } else {
                        Swal.fire('Error', data.error || 'No se pudo guardar el método de pago', 'error');
                    }
                })
                .catch(() => Swal.fire('Error', 'No se pudo guardar el método de pago', 'error'));
        });
    }

    function cobrarAhora() {
        Swal.fire({
            title: '¿Cobrar ahora?',
            text: 'Se intentará cobrar tu suscripción de inmediato.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cobrar'
        }).then(res => {
            if (!res.isConfirmed) {
                return;
            }
            fetch('/facturacion/cobrar-ahora', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.ok) {
                        Swal.fire('Cobro iniciado', data.mensaje || 'Te avisaremos por correo.', 'success');
                    } else {
                        Swal.fire('Error', data.error || 'No se pudo iniciar el cobro', 'error');
                    }
                })
                .catch(() => Swal.fire('Error', 'No se pudo iniciar el cobro', 'error'));
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        const btnActivar = document.getElementById('btnActivarCobroAutomatico');
        const btnActualizar = document.getElementById('btnActualizarTarjeta');
        const btnCobrar = document.getElementById('btnCobrarAhora');
        if (btnActivar) btnActivar.addEventListener('click', abrirWidgetCheckout);
        if (btnActualizar) btnActualizar.addEventListener('click', abrirWidgetCheckout);
        if (btnCobrar) btnCobrar.addEventListener('click', cobrarAhora);
    });
})();
