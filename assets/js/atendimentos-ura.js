import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

// 1. A CHAVE MESTRA: Verifica o login e destranca a opacidade da tela
await verificarAutenticacao();

// 2. Carrega o menu lateral marcando a opção correta
carregarMenu('gerar-relatorio');

// 3. Lógica da Página (Calendário)
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializa o calendário Flatpickr
    flatpickr("#date-range", {
        mode: "range",
        dateFormat: "d/m/Y",
        locale: "pt",
        showMonths: 2, // Mostra dois meses lado a lado
        theme: "dark"
    });

    // Lógica do botão gerar
    document.getElementById('btn-gerar')?.addEventListener('click', () => {
        const periodo = document.getElementById('date-range').value;
        if(!periodo.includes('até')) {
            alert('Por favor, selecione a data inicial e a data final.');
            return;
        }
        alert(`Gerando relatório para o período: ${periodo}`);
    });
});