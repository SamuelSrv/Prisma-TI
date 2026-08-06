import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

// Valida a sessão de segurança
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

        // Prioriza o banco, se não achar, pega dos metadados da sessão ou define padrão
        const nomeFinal = perfil?.nome || metaData.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || metaData.cpf || 'Não informado';
        const cargoFinal = perfil?.cargo || 'Colaborador';

        // Preenche os campos na tela
        document.getElementById('perfil-nome').value = nomeFinal;
        document.getElementById('perfil-email').value = emailFinal;
        document.getElementById('perfil-cpf').value = cpfFinal;
        
        document.getElementById('display-nome').textContent = nomeFinal;
        document.getElementById('display-cargo').textContent = cargoFinal;

        // Gera as iniciais para o Avatar de forma segura
        const iniciais = nomeFinal
            .split(' ')
            .filter(Boolean)
            map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'US';
            
        document.getElementById('avatar-iniciais').textContent = iniciais;

    } catch (error) {
        console.error("Erro geral ao carregar perfil:", error);
    }
});