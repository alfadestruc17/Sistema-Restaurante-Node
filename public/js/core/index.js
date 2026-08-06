$(document).ready(function() {
    // Configuración global de SweetAlert2
    const swalBootstrap = Swal.mixin({
        customClass: {
            container: 'my-swal',
            popup: 'shadow-sm border-0 rounded-4',
            header: 'border-bottom-0',
            title: 'fs-5 fw-semibold',
            htmlContainer: 'text-body-secondary',
            confirmButton: 'btn btn-primary px-4 py-2',
            cancelButton: 'btn btn-outline-secondary px-4 py-2 ms-2'
        },
        buttonsStyling: false,
        padding: '1.5rem',
        background: '#fff',
        backdrop: 'rgba(0,0,0,0.5)',
        showClass: {
            popup: 'animate__animated animate__fadeIn animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOut animate__faster'
        }
    });

    // Reemplazar todas las instancias de Swal.fire con swalBootstrap.fire
    const originalSwalFire = Swal.fire;
    Swal.fire = function(...args) {
        const options = args[0];
        const defaultOptions = {
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d'
        };
        return originalSwalFire({ ...defaultOptions, ...options });
    };

    // Inicialización de variables globales
    let pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    let productosFactura = [];
    let totalFactura = 0;

    // Función para actualizar localStorage
    function actualizarLocalStorage() {
        localStorage.setItem('pedidos', JSON.stringify(pedidosGuardados));
    }

    // Inicializar Select2 para búsqueda de clientes y productos con mejoras
    $('.select2').select2({
        width: '100%',
        language: {
            noResults: function() {
                return "No se encontraron resultados";
            },
            searching: function() {
                return "Buscando...";
            },
            inputTooShort: function() {
                return "Por favor ingrese más caracteres...";
            }
        },
        ajax: {
            url: function() {
                if ($(this).attr('id') === 'cliente') {
                    return '/clientes/buscar';
                } else {
                    return '/api/productos/buscar';
                }
            },
            dataType: 'json',
            delay: 250,
            data: function(params) {
                return {
                    q: params.term
                };
            },
            processResults: function(data) {
                return {
                    results: data.map(item => ({
                        id: item.id,
                        text: item.nombre,
                        ...item
                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 1,
        templateResult: function(item) {
            if (!item.id) return item.text;
            
            if (item.codigo) { // Es un producto
                return $(`
                    <div>
                        <strong>${item.codigo}</strong> - ${item.nombre}
                        <div class="small text-muted">
                            KG: $${item.precio_kg} | UND: $${item.precio_unidad} | LB: $${item.precio_libra}
                        </div>
                    </div>
                `);
            } else { // Es un cliente
                return $(`
                    <div>
                        <strong>${item.nombre}</strong>
                        ${item.telefono ? `<div class="small text-muted">Tel: ${item.telefono}</div>` : ''}
                    </div>
                `);
            }
        }
    }).on('select2:open', function() {
        const searchField = $('.select2-search__field:visible').last();
        if (searchField.length) {
            searchField.focus();
        }
    });

    // Función mejorada para abrir y enfocar Select2
    function openAndFocusSelect2(selector) {
        $(selector).select2('open');
        
        // Intentamos múltiples veces para asegurar que el campo esté disponible
        const maxAttempts = 5;
        let attempts = 0;
        
        const tryFocus = () => {
            const searchField = $('.select2-container--open .select2-search__field').first();
            console.log('Intento de focus:', attempts + 1, 'Campo encontrado:', searchField.length > 0);
            
            if (searchField.length > 0) {
                searchField[0].focus();
                // Forzar el focus
                setTimeout(() => {
                    searchField[0].focus();
                    if (document.activeElement === searchField[0]) {
                        console.log('Focus exitoso');
                    }
                }, 50);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryFocus, 100);
            }
        };

        // Iniciamos el proceso de focus
        setTimeout(tryFocus, 100);
    }

    // Teclas rápidas
    $(document).on('keydown', function(e) {
        // No capturar atajos si el foco está en un campo editable
        const target = e.target;
        const isEditable = (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.classList?.contains('swal2-input')
        );
        if (isEditable) return; // permitir copiar/pegar y escribir con normalidad
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b': // Ctrl/Cmd + B para buscar producto
                    e.preventDefault();
                    openAndFocusSelect2('#producto');
                    break;
                case 'f': // Ctrl/Cmd + F para buscar cliente
                    e.preventDefault();
                    openAndFocusSelect2('#cliente');
                    break;
                case 'g': // Ctrl/Cmd + G para generar factura
                    e.preventDefault();
                    $('#generarFactura').click();
                    break;
                case 'n': // Ctrl/Cmd + N para nuevo cliente
                    e.preventDefault();
                    $('#nuevoClienteModal').modal('show');
                    setTimeout(() => {
                        $('#nombreCliente').focus();
                    }, 500);
                    break;
            }
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            switch(e.key) {
                case '/': // Tecla '/' para buscar producto
                    e.preventDefault();
                    openAndFocusSelect2('#producto');
                    break;
                case '.': // Tecla '.' para buscar cliente
                    e.preventDefault();
                    openAndFocusSelect2('#cliente');
                    break;
            }
        }
    });

    // Función helper para mostrar alertas
    function mostrarAlerta(tipo, mensaje) {
        swalBootstrap.fire({
            icon: tipo,
            title: mensaje
        });
    }


    // Guardar nuevo cliente (facturación / venta para evento)
    $(document).on('click', '#guardarCliente', function(e) {
        e.preventDefault();
        const nombre = ($('#nombreCliente').val() || '').trim();
        const direccion = ($('#direccionNuevoCliente').val() || '').trim();
        const telefono = ($('#telefonoNuevoCliente').val() || '').trim().replace(/\D/g, '');
        if (!nombre) {
            mostrarAlerta('error', 'El nombre es requerido');
            return;
        }
        if (telefono && !/^\d+$/.test(telefono)) {
            mostrarAlerta('error', 'El teléfono solo puede contener números');
            return;
        }
        const $btn = $(this);
        $btn.prop('disabled', true);
        $.ajax({
            url: '/api/clientes',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ nombre: nombre, direccion: direccion || null, telefono: telefono || null }),
            success: function(response) {
                const id = response?.id ?? null;
                if (id != null && $('#cliente').length) {
                    const newOption = new Option(nombre, id, true, true);
                    $('#cliente').append(newOption).trigger('change');
                    $('#direccionCliente').text(direccion || 'No especificada');
                    $('#telefonoCliente').text(telefono || 'No especificado');
                    $('#infoCliente').show();
                }
                const modal = bootstrap.Modal.getInstance(document.getElementById('nuevoClienteModal'));
                if (modal) modal.hide();
                if (document.getElementById('formNuevoCliente')) document.getElementById('formNuevoCliente').reset();
                mostrarAlerta('success', 'Cliente guardado exitosamente');
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Error al guardar el cliente';
                mostrarAlerta('error', error);
            },
            complete: function() {
                $btn.prop('disabled', false);
            }
        });
    });

    // Remover el evento submit del formulario para evitar conflictos
    $('#formNuevoCliente').on('submit', function(e) {
        e.preventDefault();
    });

    // Enter en precio agrega producto
    $('#precio').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#agregarProducto').click();
        }
    });

    // Agregar tooltips para mostrar las teclas rápidas
    const tooltips = [
        { 
            element: '#cliente + .select2',
            title: 'Teclas rápidas: Ctrl+F o .'
        },
        {
            element: '#producto + .select2',
            title: 'Teclas rápidas: Ctrl+B o /'
        },
        {
            element: '#agregarProducto',
            title: 'Tecla rápida: Ctrl+Enter'
        },
        {
            element: '#generarFactura',
            title: 'Tecla rápida: Ctrl+G'
        }
    ];

    tooltips.forEach(({element, title}) => {
        $(element).attr('title', title);
        new bootstrap.Tooltip($(element)[0]);
    });

    // Manejar cambio de cliente seleccionado
    $('#cliente').on('select2:select', function(e) {
        const cliente = e.params.data;
        $('#direccionCliente').text(cliente.direccion || 'No especificada');
        $('#telefonoCliente').text(cliente.telefono || 'No especificado');
        $('#infoCliente').slideDown();
        updateStepIndicator(1, true);
        updateStepIndicator(2, false);
    });
    
    // Función para actualizar indicadores de pasos
    function updateStepIndicator(stepNum, completed) {
        const step = $(`#step${stepNum}`);
        step.removeClass('active completed');
        if (completed) {
            step.addClass('completed');
            step.find('.step-number').html('<i class="bi bi-check"></i>');
        } else if (stepNum === getCurrentStep()) {
            step.addClass('active');
        }
    }
    
    function getCurrentStep() {
        if (productosFactura.length > 0) return 3;
        if ($('#cliente').val()) return 2;
        return 1;
    }
    
    // Actualizar pasos al cargar
    $(document).ready(function() {
        updateStepIndicator(getCurrentStep(), false);
    });

    // Usar el input de producto que ya existe en el HTML
    const productoInput = $('#producto');

    // Manejar la búsqueda de productos
    let timeoutId;
    productoInput.on('input', function() {
        clearTimeout(timeoutId);
        const query = $(this).val();
        
        timeoutId = setTimeout(() => {
            $.ajax({
                url: '/api/productos/buscar',
                data: { q: query },
                success: function(data) {
                    // Mostrar resultados en un dropdown debajo del input
                    mostrarResultadosProductos(data);
                }
            });
        }, 300);
    });

    // Función para mostrar resultados
    function mostrarResultadosProductos(productos) {
        let resultsDiv = $('#resultadosProductos');
        if (!resultsDiv.length) {
            resultsDiv = $('<div id="resultadosProductos" class="dropdown-menu w-100"></div>')
                .insertAfter(productoInput);
        }

        if (productos.length === 0) {
            resultsDiv.html('<div class="dropdown-item text-muted">No se encontraron productos</div>');
        } else {
            resultsDiv.empty();
            productos.forEach(producto => {
                $(`<a class="dropdown-item">
                    <strong>${producto.codigo}</strong> - ${producto.nombre}
                    <div class="small text-muted">
                        KG: $${producto.precio_kg} | UND: $${producto.precio_unidad} | LB: $${producto.precio_libra}
                    </div>
                </a>`)
                .on('click', function() {
                    seleccionarProducto(producto);
                })
                .appendTo(resultsDiv);
            });
        }
        resultsDiv.show();
    }

    // Función para seleccionar un producto
    function seleccionarProducto(producto) {
        productoSeleccionado = producto;
        productoInput.val(producto.codigo + ' - ' + producto.nombre);
        $('#producto_id').val(producto.id);
        $('#resultadosProductos').hide();
        const unidadMedida = $('#unidadMedida').val();
        actualizarPrecioSegunUnidad(producto, unidadMedida);
        $('#precio').focus();
    }

    // Actualizar los manejadores de teclas rápidas
    $(document).on('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'b') {
                e.preventDefault();
                productoInput.focus();
            }
            // ... resto del código de teclas rápidas ...
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            if (e.key === '/') {
                e.preventDefault();
                productoInput.focus();
            }
        }
    });

    // Cerrar resultados al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#buscarProductoInput, #resultadosProductos').length) {
            $('#resultadosProductos').hide();
        }
    });

    // Actualizar el manejador del botón de búsqueda
    $('#buscarProducto').on('click', function(e) {
        e.preventDefault();
        productoInput.focus();
    });

    // Manejar cambio de unidad de medida
    $('#unidadMedida').on('change', function() {
        const producto = $('#producto').select2('data')[0];
        if (producto) {
            actualizarPrecioSegunUnidad(producto, $(this).val());
        }
    });

    // Función para actualizar precio según unidad de medida
    function actualizarPrecioSegunUnidad(producto, unidad) {
        let precio = 0;
        switch(unidad) {
            case 'KG':
                precio = producto.precio_kg;
                break;
            case 'UND':
                precio = producto.precio_unidad;
                break;
            case 'LB':
                precio = producto.precio_libra;
                break;
        }
        $('#precio').val(precio);
    }

    // Variable para almacenar producto seleccionado
    let productoSeleccionado = null;
    
    // Agregar producto a la factura
    $('#agregarProducto').click(function() {
        if (!productoSeleccionado) {
            swalBootstrap.fire({
                title: 'Producto Requerido',
                text: 'Por favor busque y seleccione un producto primero',
                icon: 'warning',
                confirmButtonText: 'Entendido',
                customClass: {
                    container: 'my-swal',
                    popup: 'rounded-3',
                    confirmButton: 'btn btn-primary px-4'
                },
                buttonsStyling: false
            });
            productoInput.focus();
            return;
        }

        const cantidad = 1;
        const unidadMedida = $('#unidadMedida').val();
        const precio = Number.parseFloat($('#precio').val()) || productoSeleccionado.precio_unidad || 0;
        
        if (!precio || precio <= 0) {
            mostrarAlerta('warning', 'Por favor ingrese un precio válido');
            $('#precio').focus();
            return;
        }
        
        const subtotal = cantidad * precio;

        productosFactura.push({
            id: productoSeleccionado.id,
            codigo: productoSeleccionado.codigo,
            nombre: productoSeleccionado.nombre,
            cantidad: cantidad,
            precio_unitario: precio,
            unidad_medida: unidadMedida,
            subtotal: subtotal
        });

        actualizarTablaProductos(true);
        limpiarFormularioProducto();
        
        // Feedback visual
        mostrarAlerta('success', `Producto "${productoSeleccionado.nombre}" agregado`);
        
        // Enfocar búsqueda para siguiente producto
        setTimeout(() => {
            productoInput.focus();
        }, 100);
    });

    // Función para actualizar la tabla de productos
    function actualizarTablaProductos(highlightNew = false) {
        const tbody = $('#productosTabla');
        
        if (productosFactura.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="bi bi-cart-x"></i>
                        <div>No hay productos agregados</div>
                        <small class="text-muted">Busca y agrega productos usando el formulario de arriba</small>
                    </td>
                </tr>
            `);
            $('#totalFactura').text('0.00');
            updateStepIndicator(2, false);
            updateStepIndicator(3, false);
            return;
        }
        
        tbody.empty();
        totalFactura = 0;
        
        productosFactura.forEach((item, index) => {
            totalFactura += item.subtotal;
            const rowClass = highlightNew && index === productosFactura.length - 1 ? 'new-item' : '';
            tbody.append(`
                <tr class="${rowClass}">
                    <td>
                        <strong>${item.codigo}</strong><br>
                        <small class="text-muted">${item.nombre}</small>
                    </td>
                    <td><span class="badge bg-secondary">${item.unidad_medida}</span></td>
                    <td class="text-end fw-bold">$${item.precio_unitario.toFixed(2)}</td>
                    <td class="text-end fw-bold text-success">$${item.subtotal.toFixed(2)}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-secondary btn-menos-cantidad" data-index="${index}" title="Quitar cantidad">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="btn btn-outline-secondary disabled px-3 fw-bold">${item.cantidad}</span>
                            <button type="button" class="btn btn-outline-secondary btn-mas-cantidad" data-index="${index}" title="Agregar cantidad">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarProductoFactura(${index})" title="Eliminar producto">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        $('#totalFactura').text(totalFactura.toFixed(2));
        updateStepIndicator(2, true);
        updateStepIndicator(3, false);
        
        // Animación del total
        $('.footer-total').addClass('animate__animated animate__pulse');
        setTimeout(() => {
            $('.footer-total').removeClass('animate__animated animate__pulse');
        }, 1000);
    }

    // Delegación: botones +/- cantidad en la tabla
    $(document).on('click', '.btn-mas-cantidad', function() {
        const index = Number.parseInt($(this).data('index'), 10);
        if (Number.isNaN(index) || index < 0 || index >= productosFactura.length) return;
        const item = productosFactura[index];
        item.cantidad = (item.cantidad || 1) + 1;
        item.subtotal = item.cantidad * item.precio_unitario;
        actualizarTablaProductos();
    });

    $(document).on('click', '.btn-menos-cantidad', function() {
        const index = Number.parseInt($(this).data('index'), 10);
        if (Number.isNaN(index) || index < 0 || index >= productosFactura.length) return;
        const item = productosFactura[index];
        if (item.cantidad <= 1) {
            productosFactura.splice(index, 1);
        } else {
            item.cantidad -= 1;
            item.subtotal = item.cantidad * item.precio_unitario;
        }
        actualizarTablaProductos();
    });

    // Función para limpiar el formulario de producto
    function limpiarFormularioProducto() {
        productoSeleccionado = null;
        productoInput.val('');
        $('#producto_id').val('');
        $('#precio').val('');
        $('#resultadosProductos').hide();
    }

    // Función para ver pedidos guardados
    $('#verPedidos').click(function() {
        const tbody = $('#pedidosGuardados');
        tbody.empty();

        if (pedidosGuardados.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="bi bi-inbox h3 d-block"></i>
                        No hay pedidos guardados
                    </td>
                </tr>
            `);
        } else {
            pedidosGuardados.forEach((pedido, index) => {
                const productosResumen = pedido.productos.map(p => p.nombre).join(', ');
                
                tbody.append(`
                    <tr>
                        <td>
                            <strong>${pedido.cliente_nombre}</strong><br>
                            <small class="text-muted">
                                ${pedido.telefono}<br>
                                ${pedido.direccion}
                            </small>
                        </td>
                        <td><small>${productosResumen}</small></td>
                        <td>$${pedido.total.toFixed(2)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-primary" onclick="cargarPedido(${index})" title="Cargar pedido">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                                <button class="btn btn-danger" onclick="eliminarPedido(${index})" title="Eliminar pedido">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
            });
        }

        $('#pedidosModal').modal('show');
    });

    // Función para eliminar pedido
    window.eliminarPedido = function(index) {
        console.log('Eliminando pedido, índice:', index);
        if (confirm('¿Está seguro de eliminar este pedido?')) {
            pedidosGuardados.splice(index, 1);
            actualizarLocalStorage();
            $('#verPedidos').click();
            mostrarAlerta('success', 'Pedido eliminado exitosamente');
        }
    };
}); 
