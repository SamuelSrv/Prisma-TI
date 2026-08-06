import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('perfil');

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: perfil } = await supabase.from('perfis_usuarios').select('*').eq('auth_id', user.id).single();
            if (perfil) {
                document.getElementById('perfil-nome').value = perfil.nome_completo || '';
                document.getElementById('perfil-email').value = perfil.email || user.email;
                document.getElementById('perfil-cpf').value = perfil.cpf || '';
                document.getElementById('perfil-cargo').value = perfil.perfil_funcao || 'Suporte TI';
            } else {
                document.getElementById('perfil-email').value = user.email || '';
            }
        }
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
    }
});