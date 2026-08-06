export function carregarMenu(paginaAtiva) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <!-- Botão Flutuante de Recolher/Expandir -->
        <button id="toggle-sidebar" class="toggle-float-btn" title="Recolher/Expandir Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>

        <!-- Cabeçalho Limpo (Apenas Logo) -->
        <div class="sidebar-header" style="display: flex; align-items: center; margin-bottom: 40px; width: 100%;">
            <a href="dashboard.html" class="sidebar-brand" style="display: flex; align-items: center; gap: 12px; text-decoration: none; overflow: hidden; width: 100%;">
                <img src="assets/img/logo.svg" alt="Logo" class="logo-sidebar" style="width: 36px; height: 36px; filter: brightness(0) invert(1); flex-shrink: 0;">
                <h2 class="menu-text" style="font-size: 1.3rem; color: var(--text-primary); font-weight: 700; white-space: nowrap; margin: 0;">Prisma TI</h2>
            </a>
        </div>
        
        <!-- Navegação do Menu -->
        <nav class="sidebar-nav" style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
            <a href="dashboard.html" class="${paginaAtiva === 'dashboard' ? 'active' : ''}">
                <span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span>
                <span class="menu-text">Dashboard Inicial</span>
            </a>
            
            <div class="menu-group">
                <div class="menu-group-title toggle-submenu" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; color: var(--text-secondary); cursor: pointer; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
                        <span class="menu-text" style="font-weight: 600;">Relatórios</span>
                    </div>
                    <span class="chevron menu-text" style="font-size: 0.8rem;">▼</span>
                </div>
                <div class="submenu" style="display: ${['gerar-relatorio', 'atualizar-dados'].includes(paginaAtiva) ? 'flex' : 'none'}; flex-direction: column; gap: 4px; margin-left: 20px; padding-left: 10px; border-left: 1px solid var(--border-color);">
                    <a href="atendimentos-ura.html" class="submenu-item ${paginaAtiva === 'gerar-relatorio' ? 'active' : ''}">Gerar Relatório</a>
                    <a href="atualizar-dados.html" class="submenu-item ${paginaAtiva === 'atualizar-dados' ? 'active' : ''}">Atualizar Dados</a>
                </div>
            </div>

            <a href="perfil.html" class="${paginaAtiva === 'perfil' ? 'active' : ''}">
                <span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                <span class="menu-text">Perfil</span>
            </a>
        </nav>
        
        <!-- Botão de Sair -->
        <button id="btn-logout" class="logout-btn" style="display: flex; align-items: center; gap: 12px; background: transparent; border: 1px solid var(--border-color); color: var(--danger); padding: 12px 16px; border-radius: 8px; cursor: pointer; width: 100%;">
            <span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
            <span class="menu-text" style="font-weight: 600;">Sair do Sistema</span>
        </button>
    `;

    // Acordeão dos Relatórios
    const toggleSubmenu = sidebar.querySelector('.toggle-submenu');
    const submenu = sidebar.querySelector('.submenu');
    toggleSubmenu.addEventListener('click', () => {
        if (document.body.classList.contains('sidebar-collapsed')) return;
        const isClosed = submenu.style.display === 'none';
        submenu.style.display = isClosed ? 'flex' : 'none';
        toggleSubmenu.querySelector('.chevron').textContent = isClosed ? '▲' : '▼';
    });

    // Lógica do botão flutuante
    const toggleSidebar = sidebar.querySelector('#toggle-sidebar');
    toggleSidebar.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
        if (document.body.classList.contains('sidebar-collapsed')) {
            submenu.style.display = 'none';
            toggleSubmenu.querySelector('.chevron').textContent = '▼';
        }
    });
}