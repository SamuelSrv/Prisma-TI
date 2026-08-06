import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('perfil');

        const user = authData.session.user;
        const metaData = user.user_metadata || {};

        // Busca os dados na tabela oficial ('perfis')
        const { data: perfil, error: dbError } = await supabase
            .from('perfis')
            .select('nome_completo, cpf, nivel_acesso')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Erro ao buscar perfil no banco:", dbError);
        }

        // Define os valores (prioriza o banco de dados)
        const nomeFinal = perfil?.nome_completo || metaData.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || 'Não informado';
        const nivelFinal = perfil?.nivel_acesso || 'Operador';

        // Elementos da tela
        const inputNome = document.getElementById('perfil-nome');
        const inputEmail = document.getElementById('perfil-email');
        const inputCpf = document.getElementById('perfil-cpf');
        const displayNome = document.getElementById('display-nome');
        const displayCargo = document.getElementById('display-cargo');
        const avatarIniciais = document.getElementById('avatar-iniciais');

        // Preenche os campos (que agora são readonly no HTML)
        if (inputNome) inputNome.value = nomeFinal;
        if (inputEmail) inputEmail.value = emailFinal;
        if (inputCpf) inputCpf.value = cpfFinal;
        
        if (displayNome) displayNome.textContent = nomeFinal;
        if (displayCargo) displayCargo.textContent = nivelFinal;

        // Atualiza a bolinha (avatar) com as iniciais do nome
        if (avatarIniciais && nomeFinal) {
            const iniciais = nomeFinal.split(' ')
                .filter(Boolean)
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            avatarIniciais.textContent = iniciais || 'US';
        }

    } catch (error) {
        console.error("Erro crítico ao carregar perfil:", error);
    }
});