document.addEventListener('DOMContentLoaded', () => {
    // Abrir Caja
    const formAbrir = document.getElementById('formAbrirCaja');
    if (formAbrir) {
        formAbrir.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(formAbrir));

            try {
                const res = await fetch('/caja/abrir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    Swal.fire('Éxito', 'Turno abierto correctamente', 'success').then(() => location.reload());
                } else {
                    const err = await res.json();
                    Swal.fire('Error', err.error || 'No se pudo abrir caja', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error de conexión', 'error');
            }
        });
    }

    // Cerrar Caja
    const formCerrar = document.getElementById('formCerrarCaja');
    if (formCerrar) {
        formCerrar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = formCerrar.dataset.id;
            const formData = Object.fromEntries(new FormData(formCerrar));

            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "Una vez cerrada la caja, no podrás registrar más movimientos en este turno.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, cerrar turno'
            });

            if (result.isConfirmed) {
                try {
                    const res = await fetch(`/caja/${id}/cerrar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    if (res.ok) {
                        Swal.fire('Turno Cerrado', 'Arqueo guardado exitosamente', 'success').then(() => location.reload());
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'Error de conexión', 'error');
                }
            }
        });
    }

    // Registrar Movimiento
    const formMov = document.getElementById('formMovimiento');
    if (formMov) {
        formMov.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = formMov.dataset.id;
            const formData = Object.fromEntries(new FormData(formMov));

            try {
                const res = await fetch(`/caja/${id}/movimiento`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    $('#modalMovimiento').modal('hide');
                    Swal.fire('Éxito', 'Movimiento registrado', 'success').then(() => location.reload());
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error al registrar', 'error');
            }
        });
    }
});

function setTipoMov(tipo) {
    document.getElementById('tipoMov').value = tipo;
    document.getElementById('titleMov').innerText = tipo === 'entrada' ? 'Registrar Ingreso de Efectivo' : 'Registrar Gasto / Salida';
    const btn = document.querySelector('#formMovimiento button[type="submit"]');
    btn.className = tipo === 'entrada' ? 'btn btn-success px-4' : 'btn btn-danger px-4';
}
