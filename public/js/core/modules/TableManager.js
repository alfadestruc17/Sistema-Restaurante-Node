/**
 * TableManager - Manages table operations (CRUD actions, filtering, etc.)
 * Provides reusable table functionality
 * Related to: productos.js, clientes.js, ventas.js
 */

class TableManager {
    /**
     * Create a new TableManager instance
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        this.config = {
            tableBodyId: config.tableBodyId,
            onEdit: config.onEdit,
            onDelete: config.onDelete,
            onCosteo: config.onCosteo,
            onModificadores: config.onModificadores,
            deleteConfirmMessage: config.deleteConfirmMessage || '¿Está seguro de que desea eliminar este elemento?',
            ...config
        };

        this.tableBody = document.getElementById(this.config.tableBodyId);
        if (!this.tableBody) {
            console.error(`Table body not found: ${this.config.tableBodyId}`);
        }

        this.init();
    }

    /**
     * Initialize table manager
     */
    init() {
        if (!this.tableBody) return;

        // Delegate edit/delete actions
        this.tableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.getAttribute('data-action');
            const id = button.getAttribute('data-id') ||
                button.getAttribute('data-cliente-id') ||
                button.getAttribute('data-producto-id');

            if (!id) return;

            // Bloquear botón durante la acción para evitar doble click
            const originalHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" style="width:.8em;height:.8em;border-width:2px;" role="status"></span>';

            try {
                if (action === 'editar' && this.config.onEdit) {
                    await this.config.onEdit(id);
                } else if (action === 'eliminar' && this.config.onDelete) {
                    await this.config.onDelete(id);
                } else if (action === 'costeo' && this.config.onCosteo) {
                    await this.config.onCosteo(id);
                } else if (action === 'modificadores' && this.config.onModificadores) {
                    await this.config.onModificadores(id);
                }
            } finally {
                // Restaurar si el botón sigue en el DOM
                if (document.body.contains(button)) {
                    button.disabled = false;
                    button.innerHTML = originalHtml;
                }
            }
        });
    }

    /**
     * Filter table rows
     * @param {Function} matchFunction - Function that returns true if row matches
     */
    filterRows(matchFunction, selector = 'tr') {
        if (!this.tableBody) return;

        const items = this.tableBody.querySelectorAll(selector);
        items.forEach(item => {
            const matches = matchFunction(item);
            item.style.display = matches ? '' : 'none';
        });
    }

    /**
     * Clear all filters (show all rows)
     */
    clearFilters(selector = 'tr') {
        if (!this.tableBody) return;

        const items = this.tableBody.querySelectorAll(selector);
        items.forEach(item => {
            item.style.display = '';
        });
    }

}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableManager;
}

