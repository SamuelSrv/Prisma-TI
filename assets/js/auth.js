import { supabase } from './supabase.js';

export async function verificarAutenticacao(cargosPermitidos = []) {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.replace('index.html');
        return null;
    }

    // Busca o cargo atual do usuário na tabela de perfis
    const { data: perfil, error: perfilError } = await supabase
        .from('perfis_usuarios')
        .select('cargo')
        .eq('id', session.user.id)
        .maybeSingle();

    if (perfilError) {
        console.error("Erro ao verificar permissões:", perfilError);
    }

    const cargoUsuario = perfil?.cargo || 'Colaborador';

    // Se a página exige cargos específicos e o usuário não possui
    if (cargosPermitidos.length > 0 && !cargosPermitidos.includes(cargoUsuario)) {
        alert('Acesso negado: Seu perfil não possui permissão para acessar esta página.');
        window.location.replace('dashboard.html');
        return null;
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.replace('index.html');
        }
    });

    document.body.classList.add('auth-ok');
    
    // Retorna a sessão e o cargo para uso opcional na página
    return { session, cargo: cargoUsuario };
}

export function ativarBotaoLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();

            btnLogout.style.opacity = '0.5';
            btnLogout.disabled = true;
            btnLogout.innerHTML = '<span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg></span><span class="menu-text">Saindo...</span>';

            await supabase.auth.signOut();
            window.location.replace('index.html');
        });
    }
}