import { supabase } from './supabase.js';

const cadastroForm = document.getElementById('cadastro-form');
const btnCadastrar = document.getElementById('btn-cadastrar');
const cadastroError = document.getElementById('cadastro-error');
const successBanner = document.getElementById('success-banner');
const inputCpf = document.getElementById('cpf');

const errorCpf = document.getElementById('error-cpf');
const errorEmail = document.getElementById('error-email');
const errorPassword = document.getElementById('error-password');

// ==========================================
// MÁSCARA DINÂMICA DE CPF
// ==========================================
if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length > 11) valor = valor.slice(0, 11);
        if (valor.length > 9) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
        } else if (valor.length > 6) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
        } else if (valor.length > 3) {
            valor = `${valor.slice(0, 3)}.${valor.slice(3)}`;
        }
        e.target.value = valor;
        errorCpf.innerText = ''; 
    });
}

document.getElementById('email')?.addEventListener('input', () => errorEmail.innerText = '');
document.getElementById('password')?.addEventListener('input', () => errorPassword.innerText = '');

// ==========================================
// VALIDAÇÃO MATEMÁTICA DE CPF
// ==========================================
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

// ==========================================
// LÓGICA DE CADASTRO
// ==========================================
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorCpf.innerText = '';
        errorEmail.innerText = '';
        errorPassword.innerText = '';
        cadastroError.style.display = 'none';

        const nome = document.getElementById('nome').value.trim();
        const cpfBruto = document.getElementById('cpf').value;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!nome || !cpfBruto || !email || !password) {
            cadastroError.innerText = 'Por favor, preencha todos os campos.';
            cadastroError.style.display = 'block';
            return;
        }

        if (password.length < 6) {
            errorPassword.innerText = 'A senha deve ter pelo menos 6 caracteres.';
            return;
        }

        const cpfLimpo = cpfBruto.replace(/[^\d]+/g, '');

        if (!validarCPFMatematico(cpfLimpo)) {
            errorCpf.innerText = 'O CPF informado é inválido.';
            return;
        }

        btnCadastrar.innerText = 'Criando Conta...';
        btnCadastrar.disabled = true;

        try {
            // VERIFICAÇÃO DE CPF (Agora protegida contra erros de RLS)
            const { data: cpfExistente, error: dbError } = await supabase
                .from('perfis')
                .select('cpf')
                .eq('cpf', cpfLimpo)
                .maybeSingle();

            if (cpfExistente) {
                errorCpf.innerText = 'Este CPF já possui um usuário cadastrado.';
                restaurarBotao();
                return;
            }

            // CRIAÇÃO DA CONTA
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nome: nome,
                        cpf: cpfLimpo
                    }
                }
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

            btnCadastrar.style.display = 'none';
            successBanner.innerText = 'Conta criada com sucesso! Redirecionando...';
            successBanner.style.display = 'block';

            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

        } catch (err) {
            cadastroError.innerText = 'Erro de conexão com o banco de dados.';
            cadastroError.style.display = 'block';
            restaurarBotao();
        }
    });
}

function restaurarBotao() {
    btnCadastrar.innerText = 'Criar Minha Conta';
    btnCadastrar.disabled = false;
}