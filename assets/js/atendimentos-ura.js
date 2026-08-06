import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        // 1. Aguarda o menu lateral carregar completamente
        await carregarMenu('gerar-relatorio');

        // 2. Inicializa manualmente os Datepickers do Flowbite após o DOM estar pronto
        const elemStart = document.getElementById('date-start');
        const elemEnd = document.getElementById('date-end');

        if (elemStart && elemEnd && typeof window.Datepicker !== 'undefined') {
            new window.Datepicker(elemStart, {
                format: 'dd/mm/yyyy',
                autohide: true
            });
            new window.Datepicker(elemEnd, {
                format: 'dd/mm/yyyy',
                autohide: true
            });
        }

        // 3. Lógica do botão gerar relatório
        const btnGerar = document.getElementById('btn-gerar');
        if (btnGerar) {
            btnGerar.addEventListener('click', () => {
                const dataInicio = elemStart.value;
                const dataFim = elemEnd.value;

                if (!dataInicio || !dataFim) {
                    alert('Por favor, selecione tanto a data inicial quanto a data final.');
                    return;
                }

                alert(`Gerando relatório para o período de ${dataInicio} até ${dataFim}`);
            });
        }
    } catch (error) {
        console.error("Erro crítico ao inicializar a página de relatórios:", error);
    }
});