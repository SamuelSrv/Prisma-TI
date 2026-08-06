import { supabase } from './supabase.js';

// Injeta o Favicon dinamicamente IMEDIATAMENTE
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'assets/img/logo.svg';
document.head.appendChild(favicon);

// Só depois o sistema espera o HTML carregar para armar o formulário
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const btnSubmit = document.getElementById('btn-submit');
    const linkToggle = document.getElementById('link-toggle');
    const toggleTextPre = document.getElementById('toggle-text-pre');
    const errorMsg = document.getElementById('login-error');

    let modoLogin = true;

    linkToggle.addEventListener('click', (e) => {
        e.preventDefault();
        modoLogin = !modoLogin;
        errorMsg.style.display = 'none';

        if (modoLogin) {
            btnSubmit.textContent = 'Entrar no Sistema';
            toggleTextPre.textContent = 'Não possui conta? ';
            linkToggle.textContent = 'Cadastre-se aqui';
        } else {
            btnSubmit.textContent = 'Criar Minha Conta';
            toggleTextPre.textContent = 'Já possui uma conta? ';
            linkToggle.textContent = 'Faça login';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorMsg.style.display = 'none';
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processando...';

        try {
            if (modoLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                if (data.session) window.location.replace('dashboard.html');
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                alert('Conta criada com sucesso! Agora você já pode fazer login no sistema.');
                document.getElementById('password').value = '';
                linkToggle.click();
            }
        } catch (error) {
            console.error('Erro:', error.message);
            errorMsg.style.display = 'block';
            if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
                errorMsg.textContent = 'E-mail ou senha incorretos.';
            } else if (error.message.includes('already registered')) {
                errorMsg.textContent = 'Este e-mail já possui uma conta cadastrada.';
            } else {
                errorMsg.textContent = 'Ocorreu um erro: ' + error.message;
            }
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = modoLogin ? 'Entrar no Sistema' : 'Criar Minha Conta';
        }
    });
});