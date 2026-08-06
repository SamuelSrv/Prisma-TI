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

        // 1. Busca os dados na tabela NOVA que criamos ('perfis')
        const { data: perfil, error: dbError } = await supabase
            .from('perfis')
            .select('nome_completo, cpf, nivel_acesso')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Erro ao buscar perfil no banco:", dbError);
        }

        // Define os valores (mudamos 'nome' para 'nome_completo' e 'cargo' para 'nivel_acesso')
        const nomeFinal = perfil?.nome_completo || metaData.nome || '';
        const emailFinal = user.email;
        const cpfFinal = perfil?.cpf || '';
        const nivelFinal = perfil?.nivel_acesso || 'Operador';

        // Elementos da tela
        const inputNome = document.getElementById('perfil-nome');
        const inputEmail = document.getElementById('perfil-email');
        const inputCpf = document.getElementById('perfil-cpf');
        const displayNome = document.getElementById('display-nome');
        const displayCargo = document.getElementById('display-cargo');
        const avatarIniciais = document.getElementById('avatar-iniciais');

        // Preenche os campos
        if (inputNome) inputNome.value = nomeFinal;
        if (inputEmail) inputEmail.value = emailFinal;
        if (inputCpf) inputCpf.value = cpfFinal;
        
        if (displayNome) displayNome.textContent = nomeFinal || 'Usuário Sistema';
        if (displayCargo) displayCargo.textContent = nivelFinal;

        // Atualiza a bolinha com as iniciais do nome
        function atualizarAvatar(nome) {
            if (avatarIniciais && nome) {
                const iniciais = nome.split(' ')
                    .filter(Boolean)
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                avatarIniciais.textContent = iniciais || 'US';
            }
        }
        atualizarAvatar(nomeFinal);

        // 2. Lógica para SALVAR AS ALTERAÇÕES
        const btnSalvar = document.getElementById('btn-salvar');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', async () => {
                const novoNome = inputNome.value.trim();
                const novoCpf = inputCpf.value.trim();

                // Validação básica
                if (!novoNome) {
                    alert('O nome completo é obrigatório.');
                    return;
                }

                btnSalvar.textContent = 'Salvando...';
                btnSalvar.disabled = true;

                // Atualiza no Supabase
                const { error: updateError } = await supabase
                    .from('perfis')
                    .update({ 
                        nome_completo: novoNome, 
                        cpf: novoCpf || null // Salva como null se estiver vazio, para não bugar o UNIQUE
                    })
                    .eq('id', user.id);

                btnSalvar.disabled = false;
                btnSalvar.textContent = 'Salvar Alterações';

                if (updateError) {
                    console.error("Erro ao atualizar:", updateError);
                    // Aqui pegamos o erro de CPF duplicado (violação da regra UNIQUE que criamos)
                    if (updateError.code === '23505' && updateError.message.includes('cpf')) {
                        alert('Este CPF já está cadastrado em outra conta!');
                    } else {
                        alert('Erro ao salvar os dados. Tente novamente.');
                    }
                } else {
                    alert('Perfil atualizado com sucesso!');
                    displayNome.textContent = novoNome;
                    atualizarAvatar(novoNome);
                }
            });
        }

    } catch (error) {
        console.error("Erro crítico ao carregar perfil:", error);
    }
});