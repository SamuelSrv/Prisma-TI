import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const btnSubmit = document.getElementById('btn-submit');
    const linkToggle = document.getElementById('link-toggle');
    const toggleTextPre = document.getElementById('toggle-text-pre');
    const errorMsg = document.getElementById('login-error');

    let modoLogin = true; // Controla se a tela está em modo Login ou Cadastro

    // Alterna entre tela de Login e tela de Cadastro visualmente
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

    // Submissão do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorMsg.style.display = 'none';
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processando...';

        try {
            if (modoLogin) {
                // 1. Lógica de Login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                if (data.session) {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // 2. Lógica de Cadastro de Conta
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                alert('Conta criada com sucesso! Agora você já pode fazer login no sistema.');
                
                // Limpa a senha e volta a tela para o modo de Login automaticamente
                document.getElementById('password').value = '';
                linkToggle.click(); 
            }
        } catch (error) {
            console.error('Erro de autenticação:', error.message);
            errorMsg.style.display = 'block';
            
            // Tratamento das mensagens de erro para o português
            if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
                errorMsg.textContent = 'E-mail ou senha incorretos.';
            } else if (error.message.includes('already registered')) {
                errorMsg.textContent = 'Este e-mail já possui uma conta cadastrada.';
            } else {
                errorMsg.textContent = 'Ocorreu um erro: ' + error.message;
            }
        } finally {
            // Restaura o botão após o processamento
            btnSubmit.disabled = false;
            if (modoLogin) {
                btnSubmit.textContent = 'Entrar no Sistema';
            } else {
                btnSubmit.textContent = 'Criar Minha Conta';
            }
        }
    });
});