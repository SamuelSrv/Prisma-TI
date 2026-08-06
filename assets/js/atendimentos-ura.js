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

        // Elementos da Tela e da Modal
        const btnGerar = document.getElementById('btn-gerar');
        const modalApresentacao = document.getElementById('modal-apresentacao');
        const btnFecharModal = document.getElementById('btn-fechar-modal');

        // Fechar Modal ao clicar no X
        if (btnFecharModal) {
            btnFecharModal.addEventListener('click', () => {
                modalApresentacao.style.display = 'none';
            });
        }

        // Fechar ao clicar fora da caixa do modal
        if (modalApresentacao) {
            modalApresentacao.addEventListener('click', (e) => {
                if (e.target === modalApresentacao) {
                    modalApresentacao.style.display = 'none';
                }
            });
        }

        // Lógica Principal de Geração
        if (btnGerar) {
            btnGerar.addEventListener('click', async () => {
                const dataInicio = dateStartEl.value;
                const dataFim = dateEndEl.value;

                if (!dataInicio || !dataFim) {
                    alert('Selecione o período completo.'); return;
                }

                btnGerar.innerText = 'Buscando e Processando Dados...';
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

                    // Preenche e abre a subjanela modal de forma dinâmica
                    renderizarApresentacaoModal(registros);
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
// FUNÇÃO MESTRA: CONSTRÓI AS PÁGINAS DINAMICAMENTE COM OS DADOS
// ==============================================================
function renderizarApresentacaoModal(dados) {
    const modalSlidesContent = document.getElementById('modal-slides-content');
    
    const renderPaginaRelatorio = (htmlConteudo, tituloPagina) => `
        <div style="width: 100%; max-width: 1200px; background-color: #ebf5ee; padding: 50px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.2); box-sizing: border-box; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 30px;">
                <h2 style="color: #115e59; font-size: 1.4rem; font-weight: 700; margin: 0;">${tituloPagina}</h2>
                <span style="font-size: 1.3rem; font-weight: 700; color: #115e59;">Grupo Lebes</span>
            </div>
            ${htmlConteudo}
        </div>
    `;

    const totalAtendimentos = dados.length;

    // ---------------------------------------------------------
    // PÁGINA 1: TOP 10 CATEGORIAS & DEPARTAMENTOS (Dinâmico)
    // ---------------------------------------------------------
    const motivosPDV = agruparCategoria(dados, 'PDV');
    const motivosAcesso = agruparCategoria(dados, 'Acessos');
    const motivosOperacoes = agruparCategoria(dados, 'Operações/Serviços');

    const htmlPagina1 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <table class="lebes-table" style="font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">PDV</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosPDV)}</tbody>
                </table>
                <table class="lebes-table" style="margin-top: 25px; font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">ACESSOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosAcesso)}</tbody>
                </table>
            </div>
            <div>
                <table class="lebes-table" style="font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">OPERAÇÕES/SERVIÇOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>%</th></tr></thead>
                    <tbody>${gerarLinhas(motivosOperacoes)}</tbody>
                </table>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                    <h4 style="color: #334155; margin-bottom: 15px; font-size: 1.1rem; font-weight: 700;">Tradicional vs EXPRESS</h4>
                    <canvas id="chartTipoLoja" style="max-height: 200px;"></canvas>
                </div>
            </div>
        </div>
    `;

    // ---------------------------------------------------------
    // PÁGINA 2: TOP 10 LOJAS (Dinâmico baseado nas filiais do período)
    // ---------------------------------------------------------
    const filiaisUnicas = [...new Set(dados.map(d => d.filial))];
    const topLojas = filiaisUnicas.map(f => ({
        filial: f,
        qtd: dados.filter(d => d.filial === f).length
    })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    const htmlPagina2 = `
        <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 25px;">
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
        </div>
    `;

    // ---------------------------------------------------------
    // PÁGINA 3: FECHAMENTO EVOLUTIVO (Calculado do período)
    // ---------------------------------------------------------
    const totalRecebidas = totalAtendimentos;
    const totalAtendidas = dados.filter(d => d.status === 'Atendida').length;
    const totalPerdidas = dados.filter(d => d.status === 'Abandonada' || d.status === 'Perdida').length;
    const tmeMedioSeg = totalAtendimentos > 0 ? (dados.reduce((acc, d) => acc + d.tme_segundos, 0) / totalAtendimentos).toFixed(0) : 0;
    const tmeFormatado = `00:0${Math.floor(tmeMedioSeg / 60)}:${('0' + (tmeMedioSeg % 60)).slice(-2)}`;

    const htmlPagina3 = `
        <table class="lebes-table" style="text-align: center; font-size: 0.95rem;">
            <thead>
                <tr style="background: #1e293b; color: white;">
                    <th>TOTAL REGISTRADOS</th><th>ATENDIDOS</th><th>PERDIDOS / ABANDONADOS</th><th>TME MÉDIO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="highlight">${totalRecebidas}</td>
                    <td class="highlight">${totalAtendidas}</td>
                    <td class="highlight" style="color: #ef4444;">${totalPerdidas}</td>
                    <td class="highlight">${tmeFormatado}</td>
                </tr>
            </tbody>
        </table>
        <div style="background: white; padding: 30px; border-radius: 8px; margin-top: 25px; text-align: center; color: #64748b;">
            <p>Métrica consolidada com base no filtro de datas selecionado na central.</p>
        </div>
    `;

    // ---------------------------------------------------------
    // PÁGINA 4: TMAX & TME POR DIA (Dinâmico por data)
    // ---------------------------------------------------------
    const datasUnicas = [...new Set(dados.map(d => d.data_hora.split(' ')[0]))].sort();
    
    const linhasTabelaDatas = datasUnicas.map(dataIso => {
        const [ano, mes, dia] = dataIso.split('-');
        const dataBr = `${dia}/${mes}/${ano}`;
        const itensDia = dados.filter(d => d.data_hora.startsWith(dataIso));
        
        const maxTme = itensDia.length > 0 ? Math.max(...itensDia.map(d => d.tme_segundos)) : 0;
        const filialDestaque = itensDia.length > 0 ? itensDia[0].filial : '-';
        const tmeMedioDia = itensDia.length > 0 ? (itensDia.reduce((a, b) => a + b.tme_segundos, 0) / itensDia.length).toFixed(0) : 0;

        return `
            <tr>
                <td style="font-weight: bold; background: #bbf7d0;">${dataBr}</td>
                <td>00:${Math.floor(maxTme / 60)}:${('0' + (maxTme % 60)).slice(-2)}</td>
                <td>${filialDestaque}</td>
                <td>00:${Math.floor(tmeMedioDia / 60)}:${('0' + (tmeMedioDia % 60)).slice(-2)}</td>
            </tr>
        `;
    }).join('');

    const htmlPagina4 = `
        <div style="display: flex; flex-direction: column; gap: 25px; align-items: center;">
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

    // INJETA TODAS AS PÁGINAS DINÂMICAS DENTRO DO MODAL
    modalSlidesContent.innerHTML = 
        renderPaginaRelatorio(htmlPagina1, 'Top 10 Categorias & Departamentos') + 
        renderPaginaRelatorio(htmlPagina2, 'Top Lojas do Período') + 
        renderPaginaRelatorio(htmlPagina3, 'Fechamento Evolutivo URA Suporte') + 
        renderPaginaRelatorio(htmlPagina4, 'TMAX & TME por Dia');

    // Inicializa o Gráfico de Lojas da Página 1 com os dados filtrados
    const qtdTradicional = dados.filter(d => d.tipo_loja === 'Tradicional').length;
    const qtdExpress = dados.filter(d => d.tipo_loja === 'EXPRESS').length;
    
    if (chartAtual) chartAtual.destroy();
    const ctx = document.getElementById('chartTipoLoja').getContext('2d');
    chartAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Tradicional', 'EXPRESS'],
            datasets: [{ label: 'Quantidade', data: [qtdTradicional, qtdExpress], backgroundColor: ['#4ade80', '#16a34a'], borderWidth: 0, barThickness: 40 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

// Funções Auxiliares
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