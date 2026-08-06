import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('perfil');

document.addEventListener('DOMContentLoaded', async () => {
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    try {
        // Pega a sessão atual do usuário logado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            window.location.href = 'index.html';
            return;
        }

        const user = session.user;
        
        // Preenche o e-mail imediatamente com o dado da autenticação
        document.getElementById('perfil-email').value = user.email || '';

        // Busca o perfil correspondente ao auth_id do usuário usando maybeSingle() para evitar erro 406
        const { data: perfil, error } = await supabase
            .from('perfis_usuarios')
            .select('*')
            .eq('auth_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar perfil no Supabase:', error.message);
        }

        if (perfil) {
            document.getElementById('perfil-nome').value = perfil.nome_completo || 'Não cadastrado';
            document.getElementById('perfil-cpf').value = perfil.cpf || 'Não cadastrado';
            document.getElementById('perfil-cargo').value = perfil.perfil_funcao || 'Suporte TI';
        } else {
            // Caso o registro na tabela perfis_usuarios ainda não exista para esse ID
            document.getElementById('perfil-nome').value = 'Perfil não vinculado';
            document.getElementById('perfil-cpf').value = '---';
            document.getElementById('perfil-cargo').value = 'Colaborador';
        }

    } catch (err) {
        console.error('Erro crítico ao carregar dados do perfil:', err);
    }
});