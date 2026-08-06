import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';
import Datepicker from 'https://esm.sh/vanilla-datepicker@1.3.4';
import 'https://esm.sh/vanilla-datepicker@1.3.4/dist/js/locales/pt-BR.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('gerar-relatorio');

        const elemStart = document.getElementById('date-start');
        const elemEnd = document.getElementById('date-end');

        const datepickerStart = new Datepicker(elemStart, {
            format: 'dd/mm/yyyy',
            language: 'pt-BR',
            autohide: true,
            todayButton: true,
            clearButton: true
        });

        const datepickerEnd = new Datepicker(elemEnd, {
            format: 'dd/mm/yyyy',
            language: 'pt-BR',
            autohide: true,
            todayButton: true,
            clearButton: true
        });

        // Lógica do botão gerar relatório
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