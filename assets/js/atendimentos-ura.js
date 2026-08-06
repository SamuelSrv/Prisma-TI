import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('gerar-relatorio');

        // Inicializa manualmente os datepickers (reforço caso o auto-init do
        // atributo `datepicker` falhe por timing de carregamento do script)
        const dateStartEl = document.getElementById('date-start');
        const dateEndEl = document.getElementById('date-end');

        if (window.Datepicker) {
            const options = {
                autohide: true,
                format: 'dd/mm/yyyy',
                todayHighlight: true
            };

            if (dateStartEl && !dateStartEl._datepicker) {
                dateStartEl._datepicker = new window.Datepicker(dateStartEl, options);
            }
            if (dateEndEl && !dateEndEl._datepicker) {
                dateEndEl._datepicker = new window.Datepicker(dateEndEl, options);
            }
        } else {
            console.warn('window.Datepicker não encontrado — verifique se o flowbite.min.js (v2.4.0+) foi carregado antes deste script.');
        }

        const btnGerar = document.getElementById('btn-gerar');
        if (btnGerar) {
            btnGerar.addEventListener('click', () => {
                const dataInicio = dateStartEl.value;
                const dataFim = dateEndEl.value;

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