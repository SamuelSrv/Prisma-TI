import { supabase } from './supabase.js';

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    errorMsg.style.display = 'none';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        if (data.session) {
            // Sucesso! Redireciona para o dashboard operacional
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        errorMsg.style.display = 'block';
    }
});