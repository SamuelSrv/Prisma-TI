import { supabase } from './supabase.js';

const cadastroForm = document.getElementById('cadastro-form');
const btnCadastrar = document.getElementById('btn-cadastrar');
const cadastroError = document.getElementById('cadastro-error');

// Algoritmo de CPF (mantém o que você já tem)
function validarCPFMatematico(cpfStr) {
    const cpf = cpfStr.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value.trim();
        const cpfBruto = document.getElementById('cpf').value;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const cpfLimpo = cpfBruto.replace(/[^\d]+/g, '');

        if (!validarCPFMatematico(cpfLimpo)) {
            mostrarErro('O CPF informado é inválido.');
            return;
        }

        btnCadastrar.innerText = 'Criando Conta...';
        btnCadastrar.disabled = true;
        cadastroError.style.display = 'none';

        // 1. Cria o usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                mostrarErro('Este E-mail já está cadastrado no sistema.');
            } else {
                mostrarErro('Erro ao criar conta: ' + authError.message);
            }
            restaurarBotao();
            return;
        }

        // Garante que pegamos o ID gerado (seja via sessão direta ou via user)
        const userId = authData.user?.id;

        if (!userId) {
            mostrarErro('Erro crítico: ID de usuário não retornado pelo servidor.');
            restaurarBotao();
            return;
        }

        // 2. Insere os dados complementares na tabela 'perfis'
        const { error: dbError } = await supabase.from('perfis').insert({
            id: userId,
            nome_completo: nome,
            cpf: cpfLimpo,
            nivel_acesso: 'padrao'
        });

        if (dbError) {
            if (dbError.code === '23505') { 
                mostrarErro('Este CPF já possui um usuário cadastrado no sistema.');
            } else {
                mostrarErro('Erro ao salvar perfil: ' + dbError.message);
            }
            restaurarBotao();
            return;
        }

        // Sucesso absoluto!
        alert('Conta criada com sucesso! Redirecionando...');
        window.location.href = 'dashboard.html';
    });
}

function mostrarErro(mensagem) {
    cadastroError.innerText = mensagem;
    cadastroError.style.display = 'block';
}

function restaurarBotao() {
    btnCadastrar.innerText = 'Criar Minha Conta';
    btnCadastrar.disabled = false;
}