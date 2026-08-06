import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Verifica a autenticação de forma segura
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        // 2. Carrega o menu lateral marcando a opção correta
        carregarMenu('gerar-relatorio');

        // 3. Inicializa os calendários Flatpickr de forma interligada (Data Inicial e Data Final)
        const pickerEnd = flatpickr("#date-end", {
            dateFormat: "d/m/Y",
            locale: "pt",
            theme: "dark"
        });

        flatpickr("#date-start", {
            dateFormat: "d/m/Y",
            locale: "pt",
            theme: "dark",
            onChange: function(selectedDates) {
                // Quando o usuário escolhe a data inicial, define o limite mínimo na data final
                if (selectedDates.length > 0) {
                    pickerEnd.set("minDate", selectedDates[0]);
                }
            }
        });

        // 4. Lógica do botão gerar relatório
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