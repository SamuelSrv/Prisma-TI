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

        // Remove qualquer atributo datepicker que possa ter sobrado no HTML,
        // pra garantir que o Flowbite não crie um auto-init em inglês
        // por conta própria, competindo com a nossa instância manual.
        [dateStartEl, dateEndEl].forEach(el => {
            if (el) {
                el.removeAttribute('datepicker');
                el.removeAttribute('datepicker-autohide');
                el.removeAttribute('datepicker-format');
            }
        });

        if (window.Datepicker) {
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

            // Se o Flowbite já tiver criado uma instância automática nesse
            // elemento, destrói ela antes de criar a nossa em português.
            if (dateStartEl?.datepicker) {
                dateStartEl.datepicker.destroy();
            }
            if (dateEndEl?.datepicker) {
                dateEndEl.datepicker.destroy();
            }

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
            btnGerar.addEventListener('click', async () => { // Função agora é assíncrona (async)
                const dataInicio = dateStartEl.value;
                const dataFim = dateEndEl.value;

                if (!dataInicio || !dataFim) {
                    alert('Por favor, selecione tanto a data inicial quanto a data final.');
                    return;
                }

                // Feedback visual de carregamento
                const textoOriginal = btnGerar.innerText;
                btnGerar.innerText = 'Buscando dados...';
                btnGerar.disabled = true;

                try {
                    // 1. Converter datas de DD/MM/YYYY para YYYY-MM-DD
                    const [diaI, mesI, anoI] = dataInicio.split('/');
                    const dataInicioISO = `${anoI}-${mesI}-${diaI} 00:00:00`; 

                    const [diaF, mesF, anoF] = dataFim.split('/');
                    const dataFimISO = `${anoF}-${mesF}-${diaF} 23:59:59`; 

                    // 2. Consulta ao Supabase
                    // ATENÇÃO: Substitua 'ura_volumetria_geral' pelo nome real da sua tabela,
                    // e 'data_atendimento' pelo nome correto da coluna onde está a data do registro.
                    const { data: relatorioData, error } = await supabase
                        .from('ura_volumetria_geral') 
                        .select('*')
                        .gte('data_atendimento', dataInicioISO) // Maior ou igual à data de início
                        .lte('data_atendimento', dataFimISO);   // Menor ou igual à data de fim

                    if (error) {
                        throw error;
                    }

                    // 3. Resultado no console
                    console.log("✅ Dados brutos recebidos do banco:", relatorioData);
                    
                    if (relatorioData.length === 0) {
                        alert(`Nenhum atendimento encontrado entre ${dataInicio} e ${dataFim}.`);
                    } else {
                        alert(`Sucesso! Foram encontrados ${relatorioData.length} registros. Abra o Console (F12) para ver os dados.`);
                    }

                } catch (error) {
                    console.error("Erro ao buscar relatórios no Supabase:", error);
                    alert("Erro ao buscar os dados. Verifique a conexão e o console.");
                } finally {
                    // Restaura o botão independentemente do resultado
                    btnGerar.innerText = textoOriginal;
                    btnGerar.disabled = false;
                }
            });
        }
    } catch (error) {
        console.error("Erro crítico ao inicializar a página de relatórios:", error);
    }
});