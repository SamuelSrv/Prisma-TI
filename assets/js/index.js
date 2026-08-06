import { supabase } from './supabase.js';

// Injeta o Favicon dinamicamente
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'assets/img/logo.svg';
document.head.appendChild(favicon);

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const linkToCadastro = document.getElementById('link-to-cadastro');
    const linkToLogin = document.getElementById('link-to-login');
    const globalError = document.getElementById('global-error');

    // Alternar entre Telas de Login e Cadastro
    linkToCadastro.addEventListener('click', (e) => {
        e.preventDefault();
        formLogin.style.display = 'none';
        formCadastro.style.display = 'block';
        limparErros();
    });

    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        formCadastro.style.display = 'none';
        formLogin.style.display = 'block';
        limparErros();
    });

    function limparErros() {
        globalError.style.display = 'none';
        globalError.textContent = '';
        document.querySelectorAll('.field-error').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
    }

    // Funcionalidade de Mostrar/Ocultar Senha (Olhinho)
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    // Altera o ícone para "olho cortado" (ocultar)
                    button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
                } else {
                    input.type = 'password';
                    // Retorna ao ícone de "olho normal" (mostrar)
                    button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                }
            }
        });
    });

    // Máscara automática de CPF: 000.000.000-00
    const inputCpf = document.getElementById('cad-cpf');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.substring(0, 11);
            
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            
            e.target.value = value;
        });
    }

    // Processamento do Login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-login-submit');

        globalError.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.session) window.location.replace('dashboard.html');
        } catch (err) {
            globalError.style.display = 'block';
            globalError.textContent = 'E-mail ou senha incorretos.';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar no Sistema';
        }
    });

    // Processamento do Cadastro Separado com Validações Corrigidas
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErros();

        const nome = document.getElementById('cad-nome').value.trim();
        const email = document.getElementById('cad-email').value.trim();
        const cpf = document.getElementById('cad-cpf').value.trim();
        const password = document.getElementById('cad-password').value;
        const btn = document.getElementById('btn-cad-submit');

        let temErro = false;

        // Validação de Senha Corrigida: Mínimo 8 caracteres, contendo letras e números (permite símbolos)
        const regexSenha = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!regexSenha.test(password)) {
            const errEl = document.getElementById('error-password');
            errEl.textContent = 'A senha deve ter no mínimo 8 caracteres, contendo letras e números.';
            errEl.style.display = 'block';
            temErro = true;
        }

        if (temErro) return;

        btn.disabled = true;
        btn.textContent = 'Verificando dados...';

        try {
            // Validação de CPF existente no banco
            const { data: cpfExistente } = await supabase
                .from('perfis_usuarios')
                .select('cpf')
                .eq('cpf', cpf)
                .maybeSingle();

            if (cpfExistente) {
                const errEl = document.getElementById('error-cpf');
                errEl.textContent = 'Este CPF já está cadastrado no sistema.';
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Criar Minha Conta';
                return;
            }

            btn.textContent = 'Criando conta...';

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nome: nome,
                        cpf: cpf
                    }
                }
            });

            if (error) throw error;

            alert('Conta criada com sucesso! Faça login para acessar o sistema.');
            formCadastro.reset();
            linkToLogin.click();

        } catch (err) {
            console.error('Erro no cadastro:', err.message);
            if (err.message.includes('already registered') || err.message.includes('User already registered')) {
                const errEl = document.getElementById('error-email');
                errEl.textContent = 'Este e-mail já possui uma conta cadastrada.';
                errEl.style.display = 'block';
            } else {
                globalError.style.display = 'block';
                globalError.textContent = 'Erro ao cadastrar: ' + err.message;
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Minha Conta';
        }
    });
});