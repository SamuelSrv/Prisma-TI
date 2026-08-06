import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('gerar-relatorio');

        const dateStartEl = document.getElementById('date-start');
        const dateEndEl = document.getElementById('date-end');

        if (window.Datepicker) {
            // Garante que o objeto de locales exista antes de escrever nele
            // (nessa versão do bundle ele não vem pré-criado)
            if (!window.Datepicker.locales) {
                window.Datepicker.locales = {};
            }

            window.Datepicker.locales['pt-BR'] = {
                days: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
                daysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                daysMin: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'],
                months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                today: 'Hoje',
                clear: 'Limpar',
                titleFormat: 'MM y',
                format: 'dd/mm/yyyy',
                weekStart: 0
            };

            const options = {
                autohide: true,
                format: 'dd/mm/yyyy',
                language: 'pt-BR',
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