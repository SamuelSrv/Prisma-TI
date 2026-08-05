import { supabase } from './supabase.js';

// Barreira 1: Se já estiver logado, não precisa ver a tela de login
async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
}
verificarSessao();

const loginForm = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        btnLogin.innerText = 'Autenticando...';
        btnLogin.disabled = true;
        loginError.style.display = 'none';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            loginError.innerText = 'E-mail ou senha incorretos.';
            loginError.style.display = 'block';
            btnLogin.innerText = 'Entrar no Sistema';
            btnLogin.disabled = false;
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}