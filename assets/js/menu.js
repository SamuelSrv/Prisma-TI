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

        // 3. Constrói o HTML base do menu com Categorias e Flexbox
        let menuHTML = `
            <div class="logo" style="display: flex; align-items: center; gap: 12px; margin-bottom: 30px; padding: 0 10px;">
                <img src="assets/img/logo.svg" alt="Logo" style="width: 35px; height: auto;">
                <span style="font-size: 1.4rem; font-weight: bold; color: #f8fafc;">Prisma TI</span>
            </div>
            
            <nav class="nav-menu" style="display: flex; flex-direction: column; flex: 1; height: 100%;">
                
                <!-- Dashboard Inicial - Acesso Livre -->
                <a href="dashboard.html" class="nav-item ${paginaAtiva === 'dashboard' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v15a1 1 0 0 0 1 1h15M8 16l2.5-5.5 3 3L17.273 7 20 9.667"/></svg>
                    Dashboard Inicial
                </a>

                <!-- CATEGORIA: RELATÓRIOS -->
                <div style="margin-top: 25px; margin-bottom: 8px; padding-left: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Relatórios
                </div>

                <a href="atendimentos-ura.html" class="nav-item ${paginaAtiva === 'gerar-relatorio' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/></svg>
                    Gerar Relatório
                </a>
                
                <a href="avaliacoes.html" class="nav-item ${paginaAtiva === 'avaliacoes' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" d="M11.083 5.104c.35-.8 1.485-.8 1.834 0l1.752 4.022a1 1 0 0 0 .84.597l4.463.342c.9.069 1.255 1.2.556 1.771l-3.33 2.723a1 1 0 0 0-.337 1.016l1.03 4.119c.214.858-.71 1.552-1.474 1.106l-3.913-2.281a1 1 0 0 0-1.008 0L7.583 20.8c-.764.446-1.688-.248-1.474-1.106l1.03-4.119A1 1 0 0 0 6.8 14.56l-3.33-2.723c-.698-.571-.342-1.702.557-1.771l4.462-.342a1 1 0 0 0 .84-.597l1.753-4.022Z"/></svg>
                    Relatório de Avaliações
                </a>

                <!-- CATEGORIA: QUALITOR -->
                <div style="margin-top: 25px; margin-bottom: 8px; padding-left: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Qualitor
                </div>

                <a href="chamados.html" class="nav-item ${paginaAtiva === 'chamados' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-3 5h3m-6 0h.01M12 16h3m-6 0h.01M10 3v4h4V3h-4Z"/></svg>
                    Relatório de Chamados
                </a>
        `;

        // 4. MÁGICA DE AUTORIZAÇÃO: Adiciona menu de ADMIN/TI se o usuário tiver acesso
        if (nivelAcesso === 'administrador' || nivelAcesso === 'ti') {
            menuHTML += `
                <!-- CATEGORIA: ADMINISTRAÇÃO -->
                <div style="margin-top: 25px; margin-bottom: 8px; padding-left: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Administração
                </div>

                <!-- Gerenciar Usuários - Restrito -->
                <a href="usuarios.html" class="nav-item ${paginaAtiva === 'usuarios' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="2" d="M10 19H5a1 1 0 0 1-1-1v-1a3 3 0 0 1 3-3h2m10 1a3 3 0 0 1-3 3m3-3a3 3 0 0 0-3-3m3 3h1m-4 3a3 3 0 0 1-3-3m3 3v1m-3-4a3 3 0 0 1 3-3m-3 3h-1m4-3v-1m-2.121 1.879-.707-.707m5.656 5.656-.707-.707m-4.242 0-.707.707m5.656-5.656-.707.707M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                    Gerenciar Usuários
                </a>

                <!-- Inserir Dados - Restrito -->
                <a href="atualizar-dados.html" class="nav-item ${paginaAtiva === 'atualizar-dados' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v9m-5 0H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2M8 9l4-5 4 5m1 8h.01"/></svg>
                    Inserir Dados
                </a>
            `;
        }

        // 5. Finaliza o HTML do menu (Meu Perfil e Logout)
        menuHTML += `
                <!-- CATEGORIA: CONTA -->
                <div style="margin-top: 25px; margin-bottom: 8px; padding-left: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Conta
                </div>

                <a href="perfil.html" class="nav-item ${paginaAtiva === 'perfil' ? 'active' : ''}">
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/></svg>
                    Meu Perfil
                </a>

                <!-- Espaçador mágico: Empurra o que vem abaixo dele para o final da tela -->
                <div style="flex-grow: 1;"></div>

                <!-- Botão de Sair no Rodapé -->
                <div class="nav-item" id="btn-logout" style="cursor: pointer; color: #ef4444; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 15px;">
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