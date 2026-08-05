import { supabase } from './supabase.js';

async function verificarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = 'index.html';
}
verificarSessao();

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});