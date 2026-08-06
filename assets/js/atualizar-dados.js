import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('atualizar-dados');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    document.getElementById('btn-processar')?.addEventListener('click', async () => {
        const dataReferencia = document.getElementById('import-data').value;
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];

        if (!dataReferencia) return alert('Selecione a data de referência.');
        if (!file) return alert('Selecione um arquivo CSV válido.');

        alert('Arquivo pronto para processamento e ingestão no Supabase!');
        fileInput.value = '';
    });
});