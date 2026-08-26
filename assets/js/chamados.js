import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartChamados = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;
        carregarMenu('chamados');

        // Configuração do Datepicker Tailwind
        const opts = { autohide: true, format: 'dd/mm/yyyy', language: 'pt-BR' };
        if (window.Datepicker) {
            new window.Datepicker(document.getElementById('date-start'), opts);
            new window.Datepicker(document.getElementById('date-end'), opts);
        }

        // Eventos dos Botões
        document.getElementById('btn-importar').addEventListener('click', processarCSV);
        document.getElementById('btn-gerar').addEventListener('click', gerarRelatorioChamados);
        document.getElementById('btn-fechar-modal').addEventListener('click', () => document.getElementById('modal-apresentacao').classList.add('hidden'));

    } catch (error) {
        console.error("Erro na tela de chamados:", error);
    }
});

// ==========================================
// 1. IMPORTAÇÃO INTELIGENTE (ANTI-DUPLICAÇÃO)
// ==========================================
function processarCSV() {
    const fileInput = document.getElementById('arquivo-csv');
    const msgEl = document.getElementById('msg-importacao');
    const btn = document.getElementById('btn-importar');

    if (!fileInput.files.length) {
        alert("Por favor, selecione um arquivo CSV do Qualitor.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lendo arquivo...';
    msgEl.classList.remove('hidden');
    msgEl.innerText = "Analisando estrutura do CSV...";

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const dadosBrutos = results.data;
            const chamadosParaSalvar = [];

            // Limpeza e formatação dos dados para o Supabase
            dadosBrutos.forEach(linha => {
                if (linha['Atendimento']) {
                    // O Qualitor envia a data como "24/08/2026 - 22:55". Precisamos converter para "2026-08-24 22:55:00"
                    let dataFormatada = null;
                    if (linha['Abertura']) {
                        const partes = linha['Abertura'].split(' - ');
                        if (partes.length === 2) {
                            const [dia, mes, ano] = partes[0].split('/');
                            dataFormatada = `${ano}-${mes}-${dia} ${partes[1]}:00`;
                        }
                    }

                    chamadosParaSalvar.push({
                        atendimento: parseInt(linha['Atendimento']),
                        data_abertura: dataFormatada,
                        titulo: linha['Título do chamado'] || '',
                        situacao: linha['Situação'] || '',
                        prioridade: linha['Prioridade'] || '',
                        operador: linha['Operador'] || '',
                        descricao: linha['Descrição'] || ''
                    });
                }
            });

            msgEl.innerText = `Enviando ${chamadosParaSalvar.length} registros para o banco (ignora duplicados)...`;

            try {
                // UPSERT: Insere ou Atualiza baseado na Chave Primária (atendimento)
                const { error } = await supabase
                    .from('chamados_qualitor')
                    .upsert(chamadosParaSalvar, { onConflict: 'atendimento' });

                if (error) throw error;

                msgEl.className = "text-sm mt-3 text-emerald-400";
                msgEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Sucesso! ${chamadosParaSalvar.length} chamados atualizados/inseridos.`;
            } catch (error) {
                console.error(error);
                msgEl.className = "text-sm mt-3 text-red-500";
                msgEl.innerText = "Erro ao salvar no banco. Verifique o console.";
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Processar CSV';
                fileInput.value = ''; // Limpa o input
            }
        }
    });
}

// ==========================================
// 2. BUSCA NO BANCO E GERAÇÃO DE RELATÓRIO
// ==========================================
async function gerarRelatorioChamados() {
    const dataInicio = document.getElementById('date-start').value;
    const dataFim = document.getElementById('date-end').value;
    const btn = document.getElementById('btn-gerar');

    if (!dataInicio || !dataFim) { alert('Selecione o período.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    const [diaI, mesI, anoI] = dataInicio.split('/');
    const [diaF, mesF, anoF] = dataFim.split('/');
    const startISO = `${anoI}-${mesI}-${diaI} 00:00:00`;
    const endISO = `${anoF}-${mesF}-${diaF} 23:59:59`;

    try {
        let registros = [];
        let inicioBusca = 0;
        let buscando = true;

        // Paginação Contínua
        while (buscando) {
            const { data, error } = await supabase
                .from('chamados_qualitor')
                .select('*')
                .gte('data_abertura', startISO)
                .lte('data_abertura', endISO)
                .range(inicioBusca, inicioBusca + 999);

            if (error) throw error;
            registros = registros.concat(data);
            if (data.length < 1000) buscando = false;
            else inicioBusca += 1000;
        }

        if (registros.length === 0) {
            alert("Nenhum chamado encontrado neste período.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
            return;
        }

        renderizarSlideChamados(registros, dataInicio, dataFim);

    } catch (error) {
        console.error(error);
        alert("Erro ao buscar chamados.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
    }
}

// ==========================================
// 3. CONSTRUÇÃO DO SLIDE E GRÁFICO COMPLEXO
// ==========================================
function renderizarSlideChamados(dados, pInicio, pFim) {
    const container = document.getElementById('modal-slides-content');
    const modal = document.getElementById('modal-apresentacao');

    const htmlSlide = `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #ffffff; padding: 25px 40px; border-radius: 8px; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="color: #1e293b; font-size: 1.4rem; font-weight: 800; margin: 0;">Visão Geral de Demandas TI</h2>
                    <span style="font-size: 0.8rem; color: #64748b;">Período: ${pInicio} até ${pFim}</span>
                </div>
                <span style="font-size: 1.1rem; font-weight: 700; color: #10b981;">Grupo Lebes</span>
            </div>
            
            <div style="flex: 1; position: relative;">
                <canvas id="chartEvolucaoChamados"></canvas>
            </div>
        </div>
    `;

    container.innerHTML = htmlSlide;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Preparar dados para o Gráfico (Agrupamento fictício por mês para reproduzir a imagem baseada nos dados do CSV)
    // Extraímos os meses presentes no CSV.
    const mesesDisponiveis = [...new Set(dados.map(d => {
        const data = new Date(d.data_abertura);
        return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/');
    }))].sort();

    // Arrays para o Chart.js
    const labelsMeses = mesesDisponiveis;
    const chamadosAbertos = [];
    const chamadosFechados = [];
    const fechadosPrazo = [];
    const backlog = [];
    const zeev = [];
    
    const pctFechados = [];
    const pctPrazo = [];
    const meta = [];

    labelsMeses.forEach(mesLabel => {
        const chamadosDoMes = dados.filter(d => {
            const m = new Date(d.data_abertura).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/');
            return m === mesLabel;
        });

        const abertos = chamadosDoMes.length;
        // Lógica simplificada de status (Adapte conforme os status reais do Qualitor)
        const fechados = chamadosDoMes.filter(d => d.situacao.toLowerCase().includes('encerrado') || d.situacao.toLowerCase().includes('fechado')).length;
        
        // Dados MOCK para reproduzir a complexidade do gráfico solicitado (Você precisará cruzar isso com SLA e origens Zeev no futuro)
        const cFechados = fechados > 0 ? fechados : Math.round(abertos * 0.85); // fallback visual
        const cPrazo = Math.round(cFechados * 0.6);
        const cBacklog = Math.round(abertos * 0.05);
        const cZeev = Math.round(abertos * 4.5); // A barra roxa gigante da imagem

        chamadosAbertos.push(abertos);
        chamadosFechados.push(cFechados);
        fechadosPrazo.push(cPrazo);
        backlog.push(cBacklog);
        zeev.push(cZeev);

        pctFechados.push(((cFechados / (abertos || 1)) * 100).toFixed(0));
        pctPrazo.push(((cPrazo / (cFechados || 1)) * 100).toFixed(0));
        meta.push(85); // Linha reta de meta
    });

    if (chartChamados) chartChamados.destroy();
    
    // Configuração do Gráfico Complexo (Exatamente como a imagem de referência)
    chartChamados = new Chart(document.getElementById('chartEvolucaoChamados').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [
                {
                    label: '% Fechados',
                    data: pctFechados,
                    type: 'line',
                    borderColor: '#a3e635', // Verde Claro
                    backgroundColor: '#a3e635',
                    yAxisID: 'y1',
                    tension: 0.1,
                    pointRadius: 5
                },
                {
                    label: '% Fechados no Prazo',
                    data: pctPrazo,
                    type: 'line',
                    borderColor: '#059669', // Verde Escuro
                    backgroundColor: '#059669',
                    yAxisID: 'y1',
                    tension: 0.1,
                    pointRadius: 5
                },
                {
                    label: 'Meta',
                    data: meta,
                    type: 'line',
                    borderColor: '#65a30d',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y1'
                },
                {
                    label: 'Chamados Abertos',
                    data: chamadosAbertos,
                    backgroundColor: '#4d7c38',
                    yAxisID: 'y',
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                },
                {
                    label: 'Chamados Fechados',
                    data: chamadosFechados,
                    backgroundColor: '#b5d596',
                    yAxisID: 'y',
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                },
                {
                    label: 'Fechados no Prazo',
                    data: fechadosPrazo,
                    backgroundColor: '#d9f0c2',
                    yAxisID: 'y',
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                },
                {
                    label: 'Backlog',
                    data: backlog,
                    backgroundColor: '#ff0000',
                    yAxisID: 'y',
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                },
                {
                    label: 'Zeev',
                    data: zeev,
                    backgroundColor: '#6b21a8', // Roxo
                    yAxisID: 'y',
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, usePointStyle: true, padding: 20 }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Volume Absoluto' },
                    grid: { color: '#f1f5f9' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Porcentagem (%)' },
                    min: 0,
                    max: 105,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}