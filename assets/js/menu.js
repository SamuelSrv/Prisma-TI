export function carregarMenu(paginaAtiva) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Injeta o HTML do Menu
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <a href="dashboard.html" class="sidebar-brand">
                <img src="assets/img/logo.svg" alt="Logo" class="logo-sidebar">
                <h2 class="menu-text">Prisma TI</h2>
            </a>
            <button id="toggle-sidebar" class="btn-icon">☰</button>
        </div>
        
        <nav class="sidebar-nav">
            <a href="dashboard.html" class="${paginaAtiva === 'dashboard' ? 'active' : ''}" title="Dashboard Inicial">
                <span class="icon">📊</span>
                <span class="menu-text">Dashboard Inicial</span>
            </a>
            
            <div class="menu-group">
                <div class="menu-group-title toggle-submenu" title="Relatórios">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="icon">📁</span>
                        <span class="menu-text">Relatórios</span>
                    </div>
                    <span class="chevron menu-text">▼</span>
                </div>
                <div class="submenu" style="display: ${['gerar-relatorio', 'atualizar-dados'].includes(paginaAtiva) ? 'flex' : 'none'};">
                    <a href="atendimentos-ura.html" class="submenu-item ${paginaAtiva === 'gerar-relatorio' ? 'active' : ''}">Gerar Relatório</a>
                    <a href="atualizar-dados.html" class="submenu-item ${paginaAtiva === 'atualizar-dados' ? 'active' : ''}">Atualizar Dados</a>
                </div>
            </div>

            <a href="perfil.html" class="${paginaAtiva === 'perfil' ? 'active' : ''}" title="Perfil">
                <span class="icon">👤</span>
                <span class="menu-text">Perfil</span>
            </a>
        </nav>
        
        <button id="btn-logout" class="logout-btn" title="Sair do Sistema">
            <span class="icon" style="color:var(--danger)">🚪</span>
            <span class="menu-text">Sair do Sistema</span>
        </button>
    `;

    // Lógica do Menu "Sanfona" (Accordion)
    const toggleSubmenu = sidebar.querySelector('.toggle-submenu');
    const submenu = sidebar.querySelector('.submenu');
    toggleSubmenu.addEventListener('click', () => {
        const isClosed = submenu.style.display === 'none';
        submenu.style.display = isClosed ? 'flex' : 'none';
        toggleSubmenu.querySelector('.chevron').textContent = isClosed ? '▲' : '▼';
    });

    // Lógica de Recolher a Sidebar inteira
    const toggleSidebar = sidebar.querySelector('#toggle-sidebar');
    toggleSidebar.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });
}