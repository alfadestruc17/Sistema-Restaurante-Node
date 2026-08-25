function removeRow(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.remove();
}

async function aprobarLocal(id, nombre) {
    const confirm = await Swal.fire({
        icon: 'question',
        title: `¿Aprobar "${nombre}"?`,
        text: 'El dueño podrá iniciar sesión de inmediato.',
        showCancelButton: true,
        confirmButtonText: 'Aprobar',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const r = await fetch(`/admin/onboarding/tenants/${id}/aprobar`, { method: 'POST', credentials: 'same-origin' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo aprobar');
        Swal.fire({ icon: 'success', title: 'Local aprobado', timer: 1500, showConfirmButton: false });
        removeRow(id);
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

async function rechazarLocal(id, nombre) {
    const { value: motivo, isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: `¿Rechazar "${nombre}"?`,
        input: 'text',
        inputLabel: 'Motivo (opcional, se lo enviamos al dueño)',
        inputPlaceholder: 'Ej: datos incompletos',
        showCancelButton: true,
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;

    try {
        const r = await fetch(`/admin/onboarding/tenants/${id}/rechazar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ motivo })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo rechazar');
        Swal.fire({ icon: 'success', title: 'Local rechazado', timer: 1500, showConfirmButton: false });
        removeRow(id);
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

async function reenviarVerificacion(id) {
    try {
        const r = await fetch(`/admin/onboarding/usuarios/${id}/reenviar`, { method: 'POST', credentials: 'same-origin' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo reenviar');
        Swal.fire({ icon: 'success', title: 'Correo reenviado', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

async function eliminarUsuarioPendiente(id, username) {
    const confirm = await Swal.fire({
        icon: 'warning',
        title: `¿Eliminar a "${username}"?`,
        text: 'Esta acción no se puede deshacer.',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
    });
    if (!confirm.isConfirmed) return;

    try {
        const r = await fetch(`/admin/onboarding/usuarios/${id}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo eliminar');
        Swal.fire({ icon: 'success', title: 'Usuario eliminado', timer: 1500, showConfirmButton: false });
        removeRow(id);
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}
