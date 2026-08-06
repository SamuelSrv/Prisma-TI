import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

const session = await verificarAutenticacao();
carregarMenu('perfil');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = session.user;
        const metaData = user.user_metadata || {};

        // Busca os dados na tabela do banco
        const { data: perfil, error: dbError } = await supabase
            .from('perfis_usuarios')
            .select('nome, cpf, cargo')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Erro ao buscar perfil no banco:", dbError);
        }

        // Define os valores finais priorizando o banco e os metadados
        const nomeFinal = perfil?.nome || metaData.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || metaData.cpf || 'Não informado';
        const cargoFinal = perfil?.cargo || 'Colaborador';

        // Preenche os inputs do formulário de perfil
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

        // Gera as iniciais para o Avatar de forma segura
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
        console.error("Erro geral ao carregar perfil:", error);
    }
});