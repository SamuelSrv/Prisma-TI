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

        // 3. Inicializa os calendários Flatpickr com seletores interativos de mês e ano (Estilo Microsoft)
        const pickerEnd = flatpickr("#date-end", {
            dateFormat: "d/m/Y",
            locale: "pt",
            monthSelectorType: "dropdown", // Permite clicar no mês e abrir o menu de meses
            yearSelectorType: "dropdown"   // Permite digitar ou alterar o ano rapidamente
        });

        flatpickr("#date-start", {
            dateFormat: "d/m/Y",
            locale: "pt",
            monthSelectorType: "dropdown",
            yearSelectorType: "dropdown",
            onChange: function(selectedDates) {
                // Sincroniza o limite mínimo da data final com base na data inicial escolhida
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