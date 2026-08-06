import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

// Carrega o menu marcando a página de Perfil como ativa
carregarMenu('perfil');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Pega o usuário logado atualmente na sessão de Autenticação do Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            window.location.href = 'index.html'; // Redireciona se não estiver logado
            return;
        }

        // 2. Busca os dados complementares na tabela 'perfis_usuarios'
        // Assumindo que a tabela tem uma coluna 'email' ou 'id' que relaciona com o usuário logado
        const { data: perfil, error: dbError } = await supabase
            .from('perfis_usuarios')
            .select('nome, cpf, cargo')
            .eq('email', user.email)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error("Erro ao buscar dados do perfil:", dbError);
        }

        // 3. Preenche os campos na tela
        const nomeFinal = perfil?.nome || 'Usuário Sistema';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || 'Não informado';
        const cargoFinal = perfil?.cargo || 'Colaborador';

        // Atualiza os inputs
        document.getElementById('perfil-nome').value = nomeFinal;
        document.getElementById('perfil-email').value = emailFinal;
        document.getElementById('perfil-cpf').value = cpfFinal;

        // Atualiza o cabeçalho do card
        document.getElementById('display-nome').textContent = nomeFinal;
        document.getElementById('display-cargo').textContent = cargoFinal;

        // Cria a sigla do Avatar (Ex: "Samuel Saraiva" -> "SS")
        const iniciais = nomeFinal.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('avatar-iniciais').textContent = iniciais;

    } catch (error) {
        console.error("Erro geral ao carregar perfil:", error);
    }
});