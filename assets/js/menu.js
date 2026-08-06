import { supabase } from './supabase.js';

export async function carregarMenu(paginaAtiva) {
    const sidebarElement = document.querySelector('.sidebar');
    if (!sidebarElement) return;

    try {
        // 1. Verifica quem está logado
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;

        // 2. Busca o nível de acesso do usuário no banco de dados
        let nivelAcesso = 'padrao';
        const { data: perfil, error } = await supabase
            .from('perfis')
            .select('nivel_acesso')
            .eq('id', userId)
            .maybeSingle();

        if (perfil && !error) {
            nivelAcesso = perfil.nivel_acesso;
        }

        // 3. Constrói o HTML base do menu (comum a todos)
        let menuHTML = `
            <div class="logo" style="display: flex; align-items: center; gap: 12px; margin-bottom: 30px; padding: 0 10px;">
                <img src="assets/img/logo.svg" alt="Logo" style="width: 35px; height: auto;">
                <span style="font-size: 1.4rem; font-weight: bold; color: #f8fafc;">Prisma TI</span>
            </div>
            
            <nav class="nav-menu">
                <!-- Dashboard Inicial - Acesso Livre -->
                <a href="dashboard.html" class="nav-item ${paginaAtiva === 'dashboard' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667"/></svg>
                    Dashboard Inicial
                </a>

                <!-- Relatórios - Acesso Livre -->
                <a href="atendimentos-ura.html" class="nav-item ${paginaAtiva === 'gerar-relatorio' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/></svg>
                    Gerar Relatório
                </a>
        `;

        // 4. MÁGICA DE AUTORIZAÇÃO: Adiciona itens exclusivos se for administrador ou ti
        if (nivelAcesso === 'administrador' || nivelAcesso === 'ti') {
            menuHTML += `
                <!-- Atualizar Dados - Restrito -->
                <a href="atualizar-dados.html" class="nav-item ${paginaAtiva === 'atualizar-dados' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v9m-5 0H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2M8 9l4-5 4 5m1 8h.01"/></svg>
                    Atualizar Dados
                </a>
            `;
        }

        // 5. Finaliza o HTML do menu (Meu Perfil e Logout)
        menuHTML += `
                <a href="perfil.html" class="nav-item ${paginaAtiva === 'perfil' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/></svg>
                    Meu Perfil
                </a>

                <div class="nav-item" id="btn-logout" style="cursor: pointer; color: #ef4444; margin-top: auto;">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H4m12 0-4 4m4-4-4-4m3-4h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-2"/></svg>
                    Sair
                </div>
            </nav>
        `;

        sidebarElement.innerHTML = menuHTML;

        // Adiciona a lógica de Logout
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

    } catch (error) {
        console.error("Erro ao montar o menu:", error);
    }
}