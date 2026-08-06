import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;
        carregarMenu('gerar-relatorio');

        // Configuração do Calendário (Datepicker)
        const dateStartEl = document.getElementById('date-start');
        const dateEndEl = document.getElementById('date-end');
        if (window.Datepicker) {
            if (!window.Datepicker.locales) {
                window.Datepicker.locales = {};
            }
            window.Datepicker.locales['pt-BR'] = {
                days: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                daysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                daysMin: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'],
                months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                today: 'Hoje', clear: 'Limpar', format: 'dd/mm/yyyy', weekStart: 0
            };
            const options = { autohide: true, format: 'dd/mm/yyyy', language: 'pt-BR', todayHighlight: true };
            if (dateStartEl) new window.Datepicker(dateStartEl, options);
            if (dateEndEl) new window.Datepicker(dateEndEl, options);
        }

        const btnGerar = document.getElementById('btn-gerar');
        const modalApresentacao = document.getElementById('modal-apresentacao');
        const btnFecharModal = document.getElementById('btn-fechar-modal');

        if (btnFecharModal) {
            btnFecharModal.addEventListener('click', () => {
                modalApresentacao.style.display = 'none';
            });
        }

        if (modalApresentacao) {
            modalApresentacao.addEventListener('click', (e) => {
                if (e.target === modalApresentacao) {
                    modalApresentacao.style.display = 'none';
                }
            });
        }

        if (btnGerar) {
            btnGerar.addEventListener('click', async () => {
                const dataInicio = dateStartEl.value;
                const dataFim = dateEndEl.value;

                if (!dataInicio || !dataFim) {
                    alert('Selecione o período completo.'); return;
                }

                btnGerar.innerText = 'Processando Relatório...';
                btnGerar.disabled = true;

                try {
                    const [diaI, mesI, anoI] = dataInicio.split('/');
                    const [diaF, mesF, anoF] = dataFim.split('/');
                    const dataInicioISO = `${anoI}-${mesI}-${diaI} 00:00:00`;
                    const dataFimISO = `${anoF}-${mesF}-${diaF} 23:59:59`;

                    const { data: registros, error } = await supabase
                        .from('atendimentos_detalhados')
                        .select('*')
                        .gte('data_hora', dataInicioISO)
                        .lte('data_hora', dataFimISO);

                    if (error) throw error;
                    if (registros.length === 0) {
                        alert(`Nenhum atendimento entre ${dataInicio} e ${dataFim}.`);
                        return;
                    }

                    renderizarApresentacaoModal(registros, dataInicio, dataFim);
                    modalApresentacao.style.display = 'flex';

                } catch (error) {
                    console.error("Erro:", error);
                    alert("Erro ao buscar os dados.");
                } finally {
                    btnGerar.innerText = 'Gerar e Visualizar Apresentação';
                    btnGerar.disabled = false;
                }
            });
        }
    } catch (error) {
        console.error("Erro crítico:", error);
    }
});

// ==============================================================
// CONSTRUTOR DE SLIDES UNIFORMES COM FLUXO CORRETO DE ALTURA
// ==============================================================
function renderizarApresentacaoModal(dados, periodoInicio, periodoFim) {
    const modalSlidesContent = document.getElementById('modal-slides-content');
    
    // Layout corrigido: largura ampla padrão widescreen, altura fluida para nunca cortar dados
    const renderPaginaRelatorio = (htmlConteudo, tituloPagina) => `
        <div style="width: 100%; max-width: 1250px; background-color: #ebf5ee; padding: 40px 50px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.3); box-sizing: border-box; margin-bottom: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 25px;">
                <div>
                    <h2 style="color: #115e59; font-size: 1.35rem; font-weight: 700; margin: 0;">${tituloPagina}</h2>
                    <span style="font-size: 0.85rem; color: #475569; font-weight: 600;">Período Analisado: ${periodoInicio} até ${periodoFim}</span>
                </div>
                <span style="font-size: 1.25rem; font-weight: 700; color: #115e59;">Grupo Lebes</span>
            </div>
            <div>
                ${htmlConteudo}
            </div>
        </div>
    `;

    const totalAtendimentos = dados.length;

    // ---------------------------------------------------------
    // SLIDE 1: PANORAMA GERAL & VALIDAÇÃO
    // ---------------------------------------------------------
    const totalLigacoes = dados.filter(d => d.canal === 'Ligação').length;
    const totalChats = dados.filter(d => d.canal === 'Chat').length;
    const totalAtendidas = dados.filter(d => d.status === 'Atendida').length;
    const taxaSucesso = totalAtendimentos > 0 ? ((totalAtendidas / totalAtendimentos) * 100).toFixed(1) : 0;

    const htmlPanorama = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #16a34a;">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600; display: block;">TOTAL GERAL</span>
                <span style="font-size: 1.6rem; font-weight: 800; color: #1e293b;">${totalAtendimentos}</span>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6;">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600; display: block;">LIGAÇÕES / CHAT</span>
                <span style="font-size: 1.4rem; font-weight: 800; color: #1e293b;">${totalLigacoes} / ${totalChats}</span>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #10b981;">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600; display: block;">ATENDIDAS</span>
                <span style="font-size: 1.6rem; font-weight: 800; color: #1e293b;">${totalAtendidas}</span>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444;">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600; display: block;">TAXA DE SUCESSO</span>
                <span style="font-size: 1.6rem; font-weight: 800; color: #1e293b;">${taxaSucesso}%</span>
            </div>
        </div>
        <div style="background: white; padding: 22px; border-radius: 8px;">
            <h4 style="color: #334155; font-size: 1rem; font-weight: 700; margin-bottom: 8px;">Validação Executiva</h4>
            <p style="color: #475569; font-size: 0.92rem; line-height: 1.5;">
                Este panorama consolida os registros extraídos do banco de dados para o intervalo selecionado (${periodoInicio} a ${periodoFim}), garantindo conformidade para auditoria gerencial.
            </p>
        </div>
    `;

    // ---------------------------------------------------------
    // SLIDE 2: TOP 10 CATEGORIAS & DEPARTAMENTOS
    // ---------------------------------------------------------
    const motivosPDV = agruparCategoria(dados, 'PDV');
    const motivosAcesso = agruparCategoria(dados, 'Acessos');
    const motivosOperacoes = agruparCategoria(dados, 'Operações/Serviços');

    const htmlPagina1 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <table class="lebes-table" style="font-size: 0.9rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">PDV</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosPDV)}</tbody>
                </table>
                <table class="lebes-table" style="margin-top: 20px; font-size: 0.9rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">ACESSOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosAcesso)}</tbody>
                </table>
            </div>
            <div>
                <table class="lebes-table" style="font-size: 0.9rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">OPERAÇÕES/SERVIÇOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosOperacoes)}</tbody>
                </table>
                <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                    <h4 style="color: #334155; margin-bottom: 10px; font-size: 0.95rem; font-weight: 700;">Tradicional vs EXPRESS</h4>
                    <canvas id="chartTipoLoja" style="max-height: 180px;"></canvas>
                </div>
            </div>
        </div>
    `;

    // ---------------------------------------------------------
    // SLIDE 3: TOP LOJAS
    // ---------------------------------------------------------
    const filiaisUnicas = [...new Set(dados.map(d => d.filial))];
    const topLojas = filiaisUnicas.map(f => ({
        filial: f,
        qtd: dados.filter(d => d.filial === f).length
    })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    const htmlPagina2 = `
        <table class="lebes-table" style="width: 100%; font-size: 0.95rem;">
            <thead>
                <tr><th colspan="3" style="text-align: center;">Ranking de Lojas / Filiais no Período</th></tr>
                <tr style="background:#22c55e; color:white;"><th>Filial</th><th>Quantidade de Atendimentos</th><th>% do Período</th></tr>
            </thead>
            <tbody>
                ${topLojas.length > 0 ? topLojas.map(l => `
                    <tr>
                        <td>${l.filial}</td>
                        <td class="highlight" style="text-align:center;">${l.qtd}</td>
                        <td class="highlight" style="text-align:center;">${((l.qtd / totalAtendimentos) * 100).toFixed(0)}%</td>
                    </tr>
                `).join('') : '<tr><td colspan="3" style="text-align:center;">Nenhuma loja encontrada</td></tr>'}
            </tbody>
        </table>
    `;

    // ---------------------------------------------------------
    // SLIDE 4: FECHAMENTO EVOLUTIVO
    // ---------------------------------------------------------
    const totalAtendidasFechamento = dados.filter(d => d.status === 'Atendida').length;
    const totalPerdidas = dados.filter(d => d.status !== 'Atendida').length;
    const tmeMedioSeg = totalAtendimentos > 0 ? (dados.reduce((acc, d) => acc + d.tme_segundos, 0) / totalAtendimentos).toFixed(0) : 0;
    const tmeFormatado = formatarTempo(tmeMedioSeg);

    const htmlPagina3 = `
        <table class="lebes-table" style="text-align: center; font-size: 0.95rem;">
            <thead>
                <tr style="background: #1e293b; color: white;">
                    <th>TOTAL REGISTRADOS</th><th>ATENDIDOS</th><th>PERDIDOS / ABANDONADOS</th><th>TME MÉDIO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="highlight">${totalAtendimentos}</td>
                    <td class="highlight">${totalAtendidasFechamento}</td>
                    <td class="highlight" style="color: #ef4444;">${totalPerdidas}</td>
                    <td class="highlight">${tmeFormatado}</td>
                </tr>
            </tbody>
        </table>
        <div style="background: white; padding: 22px; border-radius: 8px; margin-top: 25px; text-align: center; color: #64748b; font-size: 0.92rem;">
            <p>Métrica consolidada e calculada em tempo real para o período de ${periodoInicio} a ${periodoFim}.</p>
        </div>
    `;

    // ---------------------------------------------------------
    // SLIDE 5: TMAX & TME POR DIA (LIMPO E FORMATADO)
    // ---------------------------------------------------------
    const datasUnicas = [...new Set(dados.map(d => {
        const str = String(d.data_hora);
        return str.includes('T') ? str.split('T')[0] : str.split(' ')[0];
    }))].sort();

    const linhasTabelaDatas = datasUnicas.slice(0, 8).map(dataIso => {
        const partes = dataIso.split('-');
        const dataBr = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataIso;
        
        const itensDia = dados.filter(d => {
            const s = String(d.data_hora);
            return s.startsWith(dataIso);
        });
        
        const maxTme = itensDia.length > 0 ? Math.max(...itensDia.map(d => d.tme_segundos)) : 0;
        const filialDestaque = itensDia.length > 0 ? itensDia[0].filial : '-';
        const tmeMedioDia = itensDia.length > 0 ? Math.round(itensDia.reduce((a, b) => a + b.tme_segundos, 0) / itensDia.length) : 0;

        return `
            <tr>
                <td style="font-weight: bold; background: #bbf7d0;">${dataBr}</td>
                <td>${formatarTempo(maxTme)}</td>
                <td>${filialDestaque}</td>
                <td>${formatarTempo(tmeMedioDia)}</td>
            </tr>
        `;
    }).join('');

    const htmlPagina4 = `
        <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
            <table class="lebes-table" style="width: 100%; text-align: center; font-size: 0.9rem;">
                <thead>
                    <tr><th colspan="4">RESUMO DIÁRIO DE ATENDIMENTOS (TMAX & TME)</th></tr>
                    <tr style="background:#22c55e; color:white;">
                        <th>Data</th><th>Pico (TMAX)</th><th>Filial Destaque</th><th>TME Médio</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabelaDatas.length > 0 ? linhasTabelaDatas : '<tr><td colspan="4">Nenhum registro no período</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    // INJETA AS 5 PÁGINAS DENTRO DO MODAL
    modalSlidesContent.innerHTML = 
        renderPaginaRelatorio(htmlPanorama, 'Panorama Geral & Validação') +
        renderPaginaRelatorio(htmlPagina1, 'Top 10 Categorias & Departamentos') + 
        renderPaginaRelatorio(htmlPagina2, 'Top Lojas do Período') + 
        renderPaginaRelatorio(htmlPagina3, 'Fechamento Evolutivo URA Suporte') + 
        renderPaginaRelatorio(htmlPagina4, 'TMAX & TME por Dia');

    // Inicializa o Gráfico de Lojas da Página 2 com valores em cima das barras
    const qtdTradicional = dados.filter(d => d.tipo_loja === 'Tradicional').length;
    const qtdExpress = dados.filter(d => d.tipo_loja === 'EXPRESS').length;
    
    if (chartAtual) chartAtual.destroy();
    const ctx = document.getElementById('chartTipoLoja').getContext('2d');
    
    chartAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Tradicional', 'EXPRESS'],
            datasets: [{ 
                label: 'Quantidade', 
                data: [qtdTradicional, qtdExpress], 
                backgroundColor: ['#4ade80', '#16a34a'], 
                borderWidth: 0, 
                barThickness: 45 
            }]
        },
        options: { 
            responsive: true, 
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            }, 
            scales: { 
                y: { beginAtZero: true } 
            } 
        },
        plugins: [{
            id: 'escreverValorAcimaDaBarra',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((bar, index) => {
                        const valor = dataset.data[index];
                        const porcentagem = totalAtendimentos > 0 ? ((valor / totalAtendimentos) * 100).toFixed(0) + '%' : '0%';
                        
                        ctx.fillStyle = '#1e293b';
                        ctx.font = 'bold 11px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(`${valor} (${porcentagem})`, bar.x, bar.y - 5);
                    });
                });
            }
        }]
    });
}

// Funções Auxiliares
function formatarTempo(segundos) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function agruparCategoria(dados, categoriaDesejada) {
    const filtrados = dados.filter(d => d.categoria === categoriaDesejada);
    const contagem = {};
    filtrados.forEach(d => { contagem[d.motivo] = (contagem[d.motivo] || 0) + 1; });
    const totalGeral = dados.length || 1;
    return Object.keys(contagem).map(motivo => ({ 
        motivo, 
        qtd: contagem[motivo], 
        perc: ((contagem[motivo] / totalGeral) * 100).toFixed(0) 
    })).sort((a, b) => b.qtd - a.qtd);
}

function gerarLinhas(arrayMotivos) {
    if(arrayMotivos.length === 0) return `<tr><td colspan="3" style="text-align:center;">Sem dados</td></tr>`;
    return arrayMotivos.map(item => `<tr><td>${item.motivo}</td><td class="highlight" style="text-align:center;">${item.qtd}</td><td class="highlight" style="text-align:center;">${item.perc}%</td></tr>`).join('');
}