import { supabase } from './supabase.js';

const cadastroForm = document.getElementById('cadastro-form');
const btnCadastrar = document.getElementById('btn-cadastrar');
const cadastroError = document.getElementById('cadastro-error');

// ==========================================
// 1. ALGORITMO DE VALIDAÇÃO DE CPF MATEMÁTICO
// ==========================================
function validarCPFMatematico(cpfStr) {
    // Remove tudo que não for número
    const cpf = cpfStr.replace(/[^\d]+/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false; // Bloqueia 111.111.111-11
    
    let soma = 0;
    let resto;
    
    // Valida primeiro dígito
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    // Valida segundo dígito
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// ==========================================
// 2. LÓGICA DE CADASTRO E INSERÇÃO NO BANCO
// ==========================================
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value.trim();
        const cpfBruto = document.getElementById('cpf').value;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Limpa o CPF para mandar apenas números pro banco
        const cpfLimpo = cpfBruto.replace(/[^\d]+/g, '');

        // Trava 1: Validação do CPF
        if (!validarCPFMatematico(cpfLimpo)) {
            mostrarErro('O CPF informado é inválido.');
            return;
        }

        // Prepara a interface
        btnCadastrar.innerText = 'Validando e Criando Conta...';
        btnCadastrar.disabled = true;
        cadastroError.style.display = 'none';

        // Passo A: Cria o usuário no sistema de Autenticação (Cofre) do Supabase
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

        // Passo B: Se a conta foi criada, vincula o Nome e o CPF na nossa tabela 'perfis'
        const userId = authData.user.id;

        const { error: dbError } = await supabase.from('perfis').insert({
            id: userId,
            nome_completo: nome,
            cpf: cpfLimpo,
            nivel_acesso: 'padrao' // Força a segurança: Todo novo cadastro nasce como perfil básico
        });

        if (dbError) {
            // Se cair aqui, geralmente é porque o CPF já existe no banco (Unique constraint)
            if (dbError.code === '23505') { 
                mostrarErro('Este CPF já possui um usuário cadastrado no sistema.');
            } else {
                mostrarErro('Erro ao salvar perfil: ' + dbError.message);
            }
            restaurarBotao();
            return;
        }

        // Sucesso Total! Redireciona para dentro do sistema
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