import { supabase } from './supabase.js';

const cadastroForm = document.getElementById('cadastro-form');
const btnCadastrar = document.getElementById('btn-cadastrar');
const cadastroError = document.getElementById('cadastro-error');
const inputCpf = document.getElementById('cpf');

// ==========================================
// 1. MÁSCARA DINÂMICA DE CPF (100% À PROVA DE FALHAS)
// ==========================================
if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
        
        if (valor.length > 11) {
            valor = valor.slice(0, 11); // Trava estritamente em 11 dígitos
        }

        // Formatação limpa baseada no tamanho atual
        if (valor.length > 9) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
        } else if (valor.length > 6) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
        } else if (valor.length > 3) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3)}`;
        }

        e.target.value = valor;
    });
}

// ==========================================
// 2. ALGORITMO DE VALIDAÇÃO MATEMÁTICA DE CPF
// ==========================================
function validarCPFMatematico(cpfStr) {
    const cpf = cpfStr.replace(/[^\d]+/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    
    let soma = 0;
    let resto;
    
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

// ==========================================
// 3. LÓGICA DE CADASTRO E INSERÇÃO NO BANCO
// ==========================================
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value.trim();
        const cpfBruto = document.getElementById('cpf').value;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Limpa a máscara para salvar estritamente apenas os 11 números no banco
        const cpfLimpo = cpfBruto.replace(/[^\d]+/g, '');

        if (!validarCPFMatematico(cpfLimpo)) {
            mostrarErro('O CPF informado é inválido.');
            return;
        }

        btnCadastrar.innerText = 'Criando Conta...';
        btnCadastrar.disabled = true;
        cadastroError.style.display = 'none';

        // Cria o usuário no Auth do Supabase
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

        const userId = authData.user?.id;

        if (!userId) {
            mostrarErro('Erro crítico: ID de usuário não retornado pelo servidor.');
            restaurarBotao();
            return;
        }

        // Insere os dados complementares na tabela 'perfis'
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