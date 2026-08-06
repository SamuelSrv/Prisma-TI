import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Valida a autenticação de forma segura dentro do evento
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        // 2. Carrega o menu lateral dinamicamente
        carregarMenu('perfil');

        const user = authData.session.user;
        const metaData = user.user_metadata || {};

        // 3. Busca os dados na tabela do banco
        const { data: perfil, error: dbError } = await supabase
            .from('perfis_usuarios')
            .select('nome, cpf, cargo')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Erro ao buscar perfil no banco:", dbError);
        }

        // Define os valores finais priorizando o banco, depois metadados, depois padrão
        const nomeFinal = perfil?.nome || metaData.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || metaData.cpf || 'Não informado';
        const cargoFinal = perfil?.cargo || 'Colaborador';

        // Preenche os inputs e textos da tela de forma segura
        const inputNome = document.getElementById('perfil-nome');
        const inputEmail = document.getElementById('perfil-email');
        const inputCpf = document.getElementById('perfil-cpf');
        const displayNome = document.getElementById('display-nome');
        const displayCargo = document.getElementById('display-cargo');
        const avatarIniciais = document.getElementById('avatar-iniciais');

        if (inputNome) inputNome.value = nomeFinal;
        if (inputEmail) inputEmail.value = emailFinal;
        if (inputCpf) inputCpf.value = cpfFinal;
        
        if (displayNome) displayNome.textContent = nomeFinal;
        if (displayCargo) displayCargo.textContent = cargoFinal;

        // Gera as iniciais para o Avatar
        if (avatarIniciais) {
            const iniciais = nomeFinal
                .split(' ')
                .filter(Boolean)
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'US';
                
            avatarIniciais.textContent = iniciais;
        }

    } catch (error) {
        console.error("Erro crítico ao carregar perfil:", error);
    }
});