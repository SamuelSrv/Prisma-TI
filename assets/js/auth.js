import { supabase } from './supabase.js';

// Injeta o Favicon dinamicamente
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'assets/img/logo.svg';
document.head.appendChild(favicon);

export async function verificarAutenticacao() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.replace('index.html');
        return null;
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.replace('index.html');
        }
    });

    document.body.classList.add('auth-ok');
    return session;
}

export function ativarBotaoLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();

            btnLogout.style.opacity = '0.5';
            btnLogout.disabled = true;
            btnLogout.innerHTML = '<span class="icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg></span><span class="menu-text">Saindo...</span>';

            await supabase.auth.signOut();
            window.location.replace('index.html');
        });
    }
}