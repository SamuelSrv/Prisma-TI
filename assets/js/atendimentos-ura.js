import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('gerar-relatorio');

        // Inicializa o calendário final
        const pickerEnd = window.flatpickr("#date-end", {
            dateFormat: "d/m/Y",
            locale: "pt",
            allowInput: false
        });

        // Inicializa o calendário inicial sincronizando com o final
        window.flatpickr("#date-start", {
            dateFormat: "d/m/Y",
            locale: "pt",
            allowInput: false,
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    pickerEnd.set("minDate", selectedDates[0]);
                }
            }
        });

        // Lógica do botão gerar relatório
        const btnGerar = document.getElementById('btn-gerar');
        if (btnGerar) {
            btnGerar.addEventListener('click', () => {
                const dataInicio = document.getElementById('date-start').value;
                const dataFim = document.getElementById('date-end').value;

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