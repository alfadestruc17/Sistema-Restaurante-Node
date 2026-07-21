// Initializers, forms submit, and delegate events for Proveedores module

$(function () {
  const mod = window.ProveedoresModule;
  mod.initModals();

  const btnNuevo = document.getElementById('btnNuevoProveedor');
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      window.resetForm();
    });
  }

  const form = document.getElementById('proveedorForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('p_id').value;
      const data = {
        nombre: document.getElementById('p_nombre').value,
        nit: document.getElementById('p_nit').value,
        contacto: document.getElementById('p_contacto').value,
        telefono: document.getElementById('p_telefono').value,
        email: document.getElementById('p_email').value,
        direccion: document.getElementById('p_direccion').value,
        activo: document.getElementById('p_activo').value
      };

      try {
        const url = id ? `/proveedores/${id}` : '/proveedores';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: id ? 'Actualizado' : 'Creado',
            text: 'El proveedor ha sido guardado correctamente.',
            timer: 2000,
            showConfirmButton: false
          }).then(() => location.reload());
        } else {
          const err = await response.json();
          Swal.fire('Error', err.error || 'No se pudo guardar', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Error de conexión', 'error');
      }
    });
  }

  const container = document.getElementById('proveedoresContainer');
  if (container) {
    container.addEventListener('click', (e) => {
      const btnFacturas = e.target.closest('.btn-facturas');
      const btnHistorial = e.target.closest('.btn-historial');
      const btnEditar = e.target.closest('.btn-editar');
      const btnEliminar = e.target.closest('.btn-eliminar');

      if (btnFacturas) {
        const id = btnFacturas.dataset.id;
        const nombre = btnFacturas.dataset.nombre;
        window.abrirFacturas(id, nombre);
      } else if (btnHistorial) {
        const id = btnHistorial.dataset.id;
        const nombre = btnHistorial.dataset.nombre;
        window.abrirHistorial(id, nombre);
      } else if (btnEditar) {
        const id = btnEditar.dataset.id;
        window.editProveedor(id);
      } else if (btnEliminar) {
        const id = btnEliminar.dataset.id;
        window.deleteProveedor(id);
      }
    });
  }

  document.getElementById('formCargarFactura')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const proveedorId = document.getElementById('facturaProveedorId').value;
    const archivoInput = this.querySelector('input[name="archivo"]');
    const archivo = archivoInput?.files?.[0];
    if (archivo && archivo.size > 2 * 1024 * 1024) {
      Swal.fire('Archivo muy pesado', 'El archivo supera el tamaño máximo permitido (2MB)', 'warning');
      return;
    }
    const formData = new FormData(this);
    const btn = this.querySelector('button[type="submit"]');
    const originalHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';

    try {
      const res = await fetch(`/proveedores/${proveedorId}/facturas`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error del servidor (' + res.status + ')' }));
        throw new Error(errData.error || 'No se pudo subir el archivo');
      }

      const data = await res.json();
      Swal.fire({ icon: 'success', title: '¡Éxito!', text: data.message, timer: 1500, showConfirmButton: false });
      this.reset();
      await window.cargarFacturas(proveedorId);
    } catch (error) {
      Swal.fire('Error', error.message || 'Error de red o archivo demasiado grande', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });
});
