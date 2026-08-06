import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('relatorios');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    const modal = document.getElementById('modal-filtro');
    document.getElementById('btn-abrir-modal')?.addEventListener('click', () => { modal.style.display = 'flex'; });
    document.getElementById('btn-fechar-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });
    
    document.getElementById('btn-gerar-relatorio')?.addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('container-slides').style.display = 'block';
    });
});