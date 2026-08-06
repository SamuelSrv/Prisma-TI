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
            <a href="atendimentos-ura.html" class="${paginaAtiva === 'relatorios' ? 'active' : ''}">Gerar Relatórios</a>
            <a href="perfil.html" class="${paginaAtiva === 'perfil' ? 'active' : ''}">Perfil</a>
        </nav>
        <button id="btn-logout" class="logout-btn">Sair do Sistema</button>
    `;
}