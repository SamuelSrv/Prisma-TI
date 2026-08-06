export function carregarMenu(paginaAtiva) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <img src="assets/img/logo.svg" alt="Logo" class="logo-sidebar">
            <h2>Prisma TI</h2>
        </div>
        <nav>
            <a href="dashboard.html" class="${paginaAtiva === 'dashboard' ? 'active' : ''}">Dashboard Inicial</a>
            
            <div class="menu-group">
                <span class="menu-group-title">Relatórios</span>
                <a href="atendimentos-ura.html" class="submenu-item ${paginaAtiva === 'gerar-relatorio' ? 'active' : ''}">Gerar Relatório</a>
                <a href="atualizar-dados.html" class="submenu-item ${paginaAtiva === 'atualizar-dados' ? 'active' : ''}">Atualizar Dados</a>
            </div>

            <a href="perfil.html" class="${paginaAtiva === 'perfil' ? 'active' : ''}">Perfil</a>
        </nav>
        <button id="btn-logout" class="logout-btn">Sair do Sistema</button>
    `;
}