// Importa a conexão que criamos no passo anterior
import { supabase } from './supabase.js';

// 1. Barreira de Proteção: Redireciona quem já estiver logado
async function verificarSessaoAtiva() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Se já tem um token válido, manda direto para o painel
        window.location.href = 'dashboard.html';
    }
}
verificarSessaoAtiva();

// 2. Lógica de Submissão do Formulário
const loginForm = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que a página recarregue ao apertar Enter

        // Captura o que foi digitado
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Feedback visual: avisa o usuário que está carregando
        btnLogin.innerText = 'Autenticando...';
        btnLogin.disabled = true;
        loginError.style.display = 'none';

        // Dispara a requisição de login para o Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // Tratativa da resposta
        if (error) {
            loginError.innerText = 'E-mail ou senha incorretos.';
            loginError.style.display = 'block';
            btnLogin.innerText = 'Entrar no Sistema';
            btnLogin.disabled = false;
        } else {
            // Sucesso! Redireciona para o painel principal
            window.location.href = 'dashboard.html';
        }
    });
}