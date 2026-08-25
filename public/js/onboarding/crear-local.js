function showError(msg) {
    const box = document.getElementById('errorAlert');
    document.getElementById('errorMsg').textContent = msg;
    box.style.display = 'flex';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
    document.getElementById('errorAlert').style.display = 'none';
}

function setLoading(loading) {
    const btn = document.getElementById('btnCrearLocal');
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" style="width:1em;height:1em;border-width:2px;"></span> Creando...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Crear mi local';
    }
}

document.getElementById('crearLocalForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    const nombre = document.getElementById('nombre').value.trim();
    if (!nombre) {
        showError('El nombre del negocio es obligatorio.');
        return;
    }

    const payload = {
        nombre,
        tipo_negocio: document.getElementById('tipo_negocio').value,
        ciudad: document.getElementById('ciudad').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        nit: document.getElementById('nit').value.trim(),
        direccion: document.getElementById('direccion').value.trim()
    };

    setLoading(true);

    try {
        const response = await fetch('/onboarding/crear-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'No se pudo crear el local');
        }

        window.location.href = data.redirect || '/onboarding/pendiente';
    } catch (error) {
        showError(error.message);
        setLoading(false);
    }
});
