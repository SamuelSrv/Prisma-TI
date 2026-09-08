import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referências DOM
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const msgLogin = document.getElementById('msg-login');
    const msgCadastro = document.getElementById('msg-cadastro');
    
    // Alternar formulários
    document.getElementById('go-to-cadastro').addEventListener('click', (e) => {
        e.preventDefault();
        formLogin.style.display = 'none';
        formCadastro.style.display = 'block';
        limparErros();
    });

    document.getElementById('go-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        formCadastro.style.display = 'none';
        formLogin.style.display = 'block';
        limparErros();
    });

    // Função global de limpeza visual
    function limparErros() {
        msgLogin.style.display = 'none';
        msgCadastro.style.display = 'none';
        document.querySelectorAll('.field-error').forEach(el => { el.style.display = 'none'; el.textContent = ''; });
    }

    // Olhinho da Senha
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.getAttribute('data-target'));
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    });

    // Máscara e Validação de CPF
    const inputCpf = document.getElementById('cad-cpf');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = v;
        });
    }

    function validarCPF(cpfStr) {
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
    // FLUXO DE LOGIN
    // ==========================================
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErros();
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        btn.disabled = true; btn.textContent = 'Autenticando...';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.session) window.location.replace('dashboard.html');
        } catch (err) {
            msgLogin.className = 'global-msg msg-error';
            msgLogin.textContent = 'E-mail ou senha incorretos.';
            msgLogin.style.display = 'block';
        } finally {
            btn.disabled = false; btn.textContent = 'Entrar no Sistema';
        }
    });

    // ==========================================
    // FLUXO DE CADASTRO
    // ==========================================
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErros();

        const btn = document.getElementById('btn-cadastro');
        const nome = document.getElementById('cad-nome').value.trim();
        const email = document.getElementById('cad-email').value.trim();
        const cpf = document.getElementById('cad-cpf').value.trim();
        const password = document.getElementById('cad-password').value;

        let hasError = false;

        if (!validarCPF(cpf)) {
            document.getElementById('err-cpf').textContent = 'CPF inválido.';
            document.getElementById('err-cpf').style.display = 'block';
            hasError = true;
        }

        if (password.length < 6) {
            document.getElementById('err-password').textContent = 'A senha precisa ter no mínimo 6 caracteres.';
            document.getElementById('err-password').style.display = 'block';
            hasError = true;
        }

        if (hasError) return;

        btn.disabled = true; btn.textContent = 'Verificando...';
        const cpfLimpo = cpf.replace(/[^\d]+/g, '');

        try {
            // Verifica duplicidade direto na tabela principal
            const { data: cpfExistente } = await supabase
                .from('perfis')
                .select('cpf')
                .eq('cpf', cpfLimpo)
                .maybeSingle();

            if (cpfExistente) {
                document.getElementById('err-cpf').textContent = 'Este CPF já está cadastrado.';
                document.getElementById('err-cpf').style.display = 'block';
                btn.disabled = false; btn.textContent = 'Criar Conta';
                return;
            }

            btn.textContent = 'Registrando...';

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { nome: nome, cpf: cpfLimpo } }
            });

            if (error) throw error;

            msgCadastro.className = 'global-msg msg-success';
            msgCadastro.textContent = 'Conta criada! Redirecionando...';
            msgCadastro.style.display = 'block';

            setTimeout(() => { window.location.replace('dashboard.html'); }, 1500);

        } catch (err) {
            if (err.message.includes('already registered')) {
                document.getElementById('err-email').textContent = 'E-mail já está em uso.';
                document.getElementById('err-email').style.display = 'block';
            } else {
                msgCadastro.className = 'global-msg msg-error';
                msgCadastro.textContent = 'Erro no servidor: Verifique a conexão.';
                msgCadastro.style.display = 'block';
            }
            btn.disabled = false; btn.textContent = 'Criar Conta';
        }
    });
});