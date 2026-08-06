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

        // 3. Instancia o calendário final guardando a referência do objeto Flatpickr
        const pickerEnd = flatpickr("#date-end", {
            dateFormat: "d/m/Y",
            locale: "pt",
            monthSelectorType: "dropdown",
            yearSelectorType: "dropdown"
        });

        // 4. Instancia o calendário inicial com tratamento inteligente de intervalo
        const pickerStart = flatpickr("#date-start", {
            dateFormat: "d/m/Y",
            locale: "pt",
            monthSelectorType: "dropdown",
            yearSelectorType: "dropdown",
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    const dataInicial = selectedDates[0];
                    
                    // Define o limite mínimo na data final
                    pickerEnd.set("minDate", dataInicial);
                    
                    // Se a data final já preenchida for anterior à nova inicial, limpa a final para evitar conflito
                    const dataFinalAtual = pickerEnd.selectedDates[0];
                    if (dataFinalAtual && dataFinalAtual < dataInicial) {
                        pickerEnd.clear();
                    }
                } else {
                    // Se o usuário limpar a data inicial, remove a restrição da data final
                    pickerEnd.set("minDate", null);
                }
            }
        });

        // 5. Lógica do botão gerar relatório
        const btnGerar = document.getElementById('btn-gerar');
        if (btnGerar) {
            btnGerar.addEventListener('click', () => {
                const dataInicio = document.getElementById('date-start').value;
                const dataFim = document.getElementById('date-end').value;

                if (!dataInicio || !dataFim) {
                    alert('Por favor, selecione tanto a data inicial quanto a data final.');
                    return;
                }

                // Aqui entra a próxima etapa: disparar a consulta filtrada no Supabase
                console.log(`Período válido selecionado: ${dataInicio} até ${dataFim}`);
                alert(`Gerando relatório para o período de ${dataInicio} até ${dataFim}`);
            });
        }

    } catch (error) {
        console.error("Erro crítico ao inicializar a página de relatórios:", error);
    }
});