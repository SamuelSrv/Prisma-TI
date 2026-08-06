import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

// Retorna a sessão do usuário caso validado
const session = await verificarAutenticacao();
carregarMenu('perfil');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = session.user;

        const { data: perfil, error: dbError } = await supabase
            .from('perfis_usuarios')
            .select('nome, cpf, cargo')
            .eq('email', user.email)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error("Erro ao buscar dados do perfil:", dbError);
        }

        const nomeFinal = perfil?.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || 'Não informado';
        const cargoFinal = perfil?.cargo || 'Colaborador';

        document.getElementById('perfil-nome').value = nomeFinal;
        document.getElementById('perfil-email').value = emailFinal;
        document.getElementById('perfil-cpf').value = cpfFinal;
        document.getElementById('display-nome').textContent = nomeFinal;
        document.getElementById('display-cargo').textContent = cargoFinal;

        const iniciais = nomeFinal.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('avatar-iniciais').textContent = iniciais;

    } catch (error) {
        console.error("Erro geral ao carregar perfil:", error);
    }
});