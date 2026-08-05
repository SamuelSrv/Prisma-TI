import { supabase } from './supabase.js';

const cadastroForm = document.getElementById('cadastro-form');
const btnCadastrar = document.getElementById('btn-cadastrar');
const cadastroError = document.getElementById('cadastro-error');
const successBanner = document.getElementById('success-banner');
const inputCpf = document.getElementById('cpf');

// Elementos de erro específicos por campo
const errorCpf = document.getElementById('error-cpf');
const errorEmail = document.getElementById('error-email');
const errorPassword = document.getElementById('error-password');

// ==========================================
// 1. MÁSCARA DINÂMICA DE CPF
// ==========================================
if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        
        if (valor.length > 11) {
            valor = valor.slice(0, 11);
        }

        if (valor.length > 9) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
        } else if (valor.length > 6) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
        } else if (valor.length > 3) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3)}`;
        }

        e.target.value = valor;
        errorCpf.innerText = ''; // Limpa o erro do CPF ao digitar
    });
}

// Limpa mensagens de erro específicas ao digitar nos campos
document.getElementById('email').addEventListener('input', () => errorEmail.innerText = '');
document.getElementById('password').addEventListener('input', () => errorPassword.innerText = '');

// ==========================================
// 2. VALIDAÇÃO MATEMÁTICA DE CPF
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
// 3. LÓGICA DE CADASTRO
// ==========================================
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpa todos os erros anteriores
        errorCpf.innerText = '';
        errorEmail.innerText = '';
        errorPassword.innerText = '';
        cadastroError.style.display = 'none';

        const nome = document.getElementById('nome').value.trim();
        const cpfBruto = document.getElementById('cpf').value;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validação de senha
        if (password.length < 6) {
            errorPassword.innerText = 'A senha deve ter pelo menos 6 caracteres.';
            return;
        }

        const cpfLimpo = cpfBruto.replace(/[^\d]+/g, '');

        // Validação de CPF
        if (!validarCPFMatematico(cpfLimpo)) {
            errorCpf.innerText = 'O CPF informado é inválido.';
            return;
        }

        btnCadastrar.innerText = 'Criando Conta...';
        btnCadastrar.disabled = true;

        // Criação no Auth do Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                errorEmail.innerText = 'Este E-mail já está cadastrado no sistema.';
            } else {
                cadastroError.innerText = 'Erro ao criar conta: ' + authError.message;
                cadastroError.style.display = 'block';
            }
            restaurarBotao();
            return;
        }

        const userId = authData.user?.id;

        if (!userId) {
            cadastroError.innerText = 'Erro crítico: ID de usuário não retornado.';
            cadastroError.style.display = 'block';
            restaurarBotao();
            return;
        }

        // Inserção na tabela perfis
        const { error: dbError } = await supabase.from('perfis').insert({
            id: userId,
            nome_completo: nome,
            cpf: cpfLimpo,
            nivel_acesso: 'padrao'
        });

        if (dbError) {
            if (dbError.code === '23505') { 
                errorCpf.innerText = 'Este CPF já possui um usuário cadastrado.';
            } else {
                cadastroError.innerText = 'Erro ao salvar perfil: ' + dbError.message;
                cadastroError.style.display = 'block';
            }
            restaurarBotao();
            return;
        }

        // Sucesso visual sem popup nativo
        btnCadastrar.style.display = 'none';
        successBanner.innerText = 'Conta criada com sucesso! Redirecionando...';
        successBanner.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    });
}

function restaurarBotao() {
    btnCadastrar.innerText = 'Criar Minha Conta';
    btnCadastrar.disabled = false;
}