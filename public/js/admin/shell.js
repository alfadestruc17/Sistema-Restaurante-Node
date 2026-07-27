/**
 * Comportamiento del shell del panel superadmin: colapso de secciones,
 * sidebar en mobile (offcanvas) y filtro del buscador de navegación.
 * No depende de datos del servidor — archivo estático puro (cumple CSP script-src).
 */

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    const sections = Array.from(sidebar.querySelectorAll('.admin-nav-section.collapsible'));

    // ─── Colapsar / expandir secciones ─────────────────────────────────────
    sections.forEach(function (section) {
        const toggle = section.querySelector('.admin-nav-section-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', function () {
            section.classList.toggle('collapsed');
        });
    });

    // ─── Auto-expandir la sección de la página activa ──────────────────────
    const activeLink = sidebar.querySelector('.admin-nav-link.active');
    if (activeLink) {
        const parentSection = activeLink.closest('.admin-nav-section');
        if (parentSection) {
            parentSection.classList.remove('collapsed');
        }
    }

    // ─── Toggle mobile (offcanvas) ──────────────────────────────────────────
    const toggleBtn = document.getElementById('adminSidebarToggle');
    const closeBtn = document.getElementById('adminSidebarClose');
    const backdrop = document.getElementById('adminSidebarBackdrop');

    function openSidebar() {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // ─── Buscador: filtra los ítems del menú en vivo ───────────────────────
    const searchInput = document.getElementById('adminNavSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const term = searchInput.value.trim().toLowerCase();
            sections.concat(
                Array.from(sidebar.querySelectorAll('.admin-nav-section:not(.collapsible)'))
            ).forEach(function (section) {
                let sectionHasMatch = false;
                section.querySelectorAll('.admin-nav-list > li').forEach(function (li) {
                    const text = li.textContent.trim().toLowerCase();
                    const matches = !term || text.includes(term);
                    li.style.display = matches ? '' : 'none';
                    if (matches) sectionHasMatch = true;
                });
                section.style.display = sectionHasMatch ? '' : 'none';
                if (term && sectionHasMatch) {
                    section.classList.remove('collapsed');
                }
            });
        });
    }
});
