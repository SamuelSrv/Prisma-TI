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

                    // Preenche e abre a subjanela modal
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
// FUNÇÃO MESTRA: CONSTRÓI AS PÁGINAS DENTRO DA SUBJANELA MODAL
// ==============================================================
function renderizarApresentacaoModal(dados) {
    const modalSlidesContent = document.getElementById('modal-slides-content');
    
    const renderPaginaRelatorio = (htmlConteudo, tituloPagina) => `
        <div style="width: 100%; max-width: 1200px; background-color: #ebf5ee; padding: 50px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.2); box-sizing: border-box;">
            
            <!-- Cabeçalho Institucional Lebes por Página -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 30px;">
                <h2 style="color: #115e59; font-size: 1.4rem; font-weight: 700; margin: 0;">${tituloPagina}</h2>
                <span style="font-size: 1.3rem; font-weight: 700; color: #115e59;">Grupo Lebes</span>
            </div>

            ${htmlConteudo}
        </div>
    `;

    // ---------------------------------------------------------
    // PÁGINA 1: TOP 10 CATEGORIAS & DEPARTAMENTOS
    // ---------------------------------------------------------
    const motivosPDV = agruparCategoria(dados, 'PDV');
    const motivosAcesso = agruparCategoria(dados, 'Acessos');
    const motivosOperacoes = agruparCategoria(dados, 'Operações/Serviços');

    const htmlPagina1 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <table class="lebes-table" style="font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">PDV</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr></thead>
                    <tbody>${gerarLinhas(motivosPDV)}</tbody>
                </table>
                <table class="lebes-table" style="margin-top: 25px; font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">ACESSOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr></thead>
                    <tbody>${gerarLinhas(motivosAcesso)}</tbody>
                </table>
            </div>
            <div>
                <table class="lebes-table" style="font-size: 0.95rem;">
                    <thead><tr><th colspan="3" style="text-align: center;">OPERAÇÕES/SERVIÇOS</th></tr>
                    <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr></thead>
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
    // PÁGINA 2: TOP 10 LOJAS
    // ---------------------------------------------------------
    const htmlPagina2 = `
        <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 25px;">
            <table class="lebes-table" style="width: 48%; font-size: 0.95rem;">
                <thead><tr><th colspan="3">URA - Categorias</th></tr>
                <tr style="background:#22c55e; color:white;"><th>Categoria</th><th>Quantidade</th><th>% Mês</th></tr></thead>
                <tbody>
                    <tr><td>(I) - PDV</td><td class="highlight">124</td><td class="highlight">22%</td></tr>
                    <tr><td>(I) - Operações/Serviços</td><td class="highlight">62</td><td class="highlight">11%</td></tr>
                </tbody>
            </table>
            <table class="lebes-table" style="width: 48%; font-size: 0.95rem;">
                <thead><tr><th colspan="3">URA - Contatos</th></tr>
                <tr style="background:#22c55e; color:white;"><th>Contatos</th><th>Quantidade</th><th>% Mês</th></tr></thead>
                <tbody>
                    <tr><td>FL 266</td><td class="highlight">10</td><td class="highlight">2%</td></tr>
                    <tr><td>FL 08</td><td class="highlight">8</td><td class="highlight">1%</td></tr>
                </tbody>
            </table>
        </div>
        <table class="lebes-table" style="font-size: 0.95rem;">
            <thead>
                <tr style="background: #94a3b8; color: white;">
                    <th>Contatos</th><th>(I) Equipamentos</th><th>(I) PDV</th><th>(S) Acessos</th><th>Total</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>FL 266</td><td>1</td><td>8</td><td>1</td><td class="highlight">10</td></tr>
                <tr><td>FL 08</td><td>0</td><td>6</td><td>2</td><td class="highlight">8</td></tr>
            </tbody>
        </table>
    `;

    // ---------------------------------------------------------
    // PÁGINA 3: FECHAMENTO EVOLUTIVO
    // ---------------------------------------------------------
    const htmlPagina3 = `
        <table class="lebes-table" style="text-align: center; font-size: 0.95rem;">
            <thead>
                <tr style="background: #1e293b; color: white;">
                    <th>LIGAÇÕES RECEBIDAS</th><th>LIGAÇÕES ATENDIDAS</th><th>LIGAÇÕES PERDIDAS</th><th>TME</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Jul: 2170</td><td>Jul: 1989</td><td>Jul: 181</td><td>Jul: 00:02:12</td></tr>
                <tr style="background: #f1f5f9;"><td>Jun: 2321</td><td>Jun: 2093</td><td>Jun: 228</td><td>Jun: 00:02:08</td></tr>
            </tbody>
        </table>
        <div style="display: flex; gap: 20px; margin-top: 25px;">
            <div style="flex: 2; background: white; padding: 20px; border-radius: 8px;">
                <h4 style="text-align: center; color: #475569; margin-bottom: 15px;">Volumetria Ligações URA</h4>
                <div style="height: 220px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px dashed #cbd5e1; color: #94a3b8;">[ Gráfico de Barras Evolutivo ]</div>
            </div>
            <div style="flex: 1; background: white; padding: 20px; border-radius: 8px;">
                <h4 style="text-align: center; color: #475569; margin-bottom: 15px;">Geral Tipo de Loja</h4>
                <div style="height: 220px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px dashed #cbd5e1; color: #94a3b8;">[ Gráfico de Pizza ]</div>
            </div>
        </div>
    `;

    // ---------------------------------------------------------
    // PÁGINA 4: TMAX & TME POR DIA
    // ---------------------------------------------------------
    const htmlPagina4 = `
        <div style="display: flex; flex-direction: column; gap: 25px; align-items: center;">
            <table class="lebes-table" style="width: 100%; text-align: center; font-size: 0.9rem;">
                <thead>
                    <tr><th colspan="7">TMAX & TME POR DIA - LIGAÇÃO</th></tr>
                    <tr style="background:#22c55e; color:white;">
                        <th>Data</th><th>13/07/2026</th><th>14/07/2026</th><th>15/07/2026</th><th>16/07/2026</th><th>17/07/2026</th><th>18/07/2026</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">TMAX</td><td>00:31:25</td><td>00:42:42</td><td>00:30:44</td><td>00:36:26</td><td>00:33:30</td><td>00:15:51</td></tr>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">FL</td><td>111</td><td>113</td><td>397</td><td>10</td><td>90</td><td>214</td></tr>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">TME</td><td>00:01:42</td><td>00:02:37</td><td>00:01:33</td><td>00:01:23</td><td>00:01:20</td><td>00:01:45</td></tr>
                </tbody>
            </table>
            <table class="lebes-table" style="width: 100%; text-align: center; font-size: 0.9rem;">
                <thead>
                    <tr><th colspan="7">TMAX & TME POR DIA - CHAT</th></tr>
                    <tr style="background:#22c55e; color:white;">
                        <th>Data</th><th>20/07/2026</th><th>21/07/2026</th><th>22/07/2026</th><th>23/07/2026</th><th>24/07/2026</th><th>25/07/2026</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">TMAX</td><td>01:38:25</td><td>02:11:02</td><td>01:16:58</td><td>02:30:54</td><td>00:59:35</td><td>08:49:20</td></tr>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">FL</td><td>294</td><td>58</td><td>164</td><td>138</td><td>233</td><td>92</td></tr>
                    <tr><td style="font-weight: bold; background: #bbf7d0;">TME</td><td>00:01:42</td><td>00:03:59</td><td>00:04:35</td><td>00:04:51</td><td>00:03:28</td><td>00:02:02</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // INJETA AS PÁGINAS DENTRO DO MODAL
    modalSlidesContent.innerHTML = 
        renderPaginaRelatorio(htmlPagina1, 'Top 10 Categorias & Departamentos') + 
        renderPaginaRelatorio(htmlPagina2, 'Top 10 Lojas') + 
        renderPaginaRelatorio(htmlPagina3, 'Fechamento Evolutivo URA Suporte') + 
        renderPaginaRelatorio(htmlPagina4, 'TMAX & TME por Dia (Ligação vs Chat)');

    // Inicializa o Gráfico da Página 1
    const qtdTradicional = dados.filter(d => d.tipo_loja === 'Tradicional').length;
    const qtdExpress = dados.filter(d => d.tipo_loja === 'EXPRESS').length;
    
    if (chartAtual) chartAtual.destroy();
    const ctx = document.getElementById('chartTipoLoja').getContext('2d');
    chartAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Tradicional', 'EXPRESS'],
            datasets: [{ label: 'Quantidade', data: [qtdTradicional, qtdExpress], backgroundColor: ['#4ade80', '#16a34a'], borderWidth: 0, barThickness: 50 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

// Funções Auxiliares
function agruparCategoria(dados, categoriaDesejada) {
    const filtrados = dados.filter(d => d.categoria === categoriaDesejada);
    const contagem = {};
    filtrados.forEach(d => { contagem[d.motivo] = (contagem[d.motivo] || 0) + 1; });
    return Object.keys(contagem).map(motivo => ({ motivo, qtd: contagem[motivo], perc: ((contagem[motivo] / dados.length) * 100).toFixed(0) })).sort((a, b) => b.qtd - a.qtd);
}

function gerarLinhas(arrayMotivos) {
    if(arrayMotivos.length === 0) return `<tr><td colspan="3" style="text-align:center;">Sem dados no período</td></tr>`;
    return arrayMotivos.map(item => `<tr><td>${item.motivo}</td><td class="highlight" style="text-align:center;">${item.qtd}</td><td class="highlight" style="text-align:center;">${item.perc}%</td></tr>`).join('');
}