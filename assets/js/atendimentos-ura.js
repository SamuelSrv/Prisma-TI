import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartAtual = null; // Variável global para guardar o gráfico e destruí-lo ao gerar um novo

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        carregarMenu('gerar-relatorio');

        // ==========================================
        // 1. CONFIGURAÇÃO DO CALENDÁRIO (DATEPICKER)
        // ==========================================
        const dateStartEl = document.getElementById('date-start');
        const dateEndEl = document.getElementById('date-end');

        [dateStartEl, dateEndEl].forEach(el => {
            if (el) {
                el.removeAttribute('datepicker');
                el.removeAttribute('datepicker-autohide');
                el.removeAttribute('datepicker-format');
            }
        });

        if (window.Datepicker) {
            window.Datepicker.locales['pt-BR'] = {
                days: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                daysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                daysMin: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'],
                months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                today: 'Hoje', clear: 'Limpar', titleFormat: 'MM y', format: 'dd/mm/yyyy', weekStart: 0
            };
            const options = { autohide: true, format: 'dd/mm/yyyy', language: 'pt-BR', todayHighlight: true };

            if (dateStartEl?.datepicker) dateStartEl.datepicker.destroy();
            if (dateEndEl?.datepicker) dateEndEl.datepicker.destroy();
            if (dateStartEl) new window.Datepicker(dateStartEl, options);
            if (dateEndEl) new window.Datepicker(dateEndEl, options);
        }

        // ==========================================
        // 2. LÓGICA DE GERAR O RELATÓRIO
        // ==========================================
        const btnGerar = document.getElementById('btn-gerar');
        const btnVoltar = document.getElementById('btn-voltar');
        const areaFiltros = document.getElementById('area-filtros');
        const containerSlides = document.getElementById('container-slides');
        const slideRender = document.getElementById('slide-render');

        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                containerSlides.style.display = 'none';
                areaFiltros.style.display = 'block';
            });
        }

        if (btnGerar) {
            btnGerar.addEventListener('click', async () => {
                const dataInicio = dateStartEl.value;
                const dataFim = dateEndEl.value;
                const tipoRelatorio = document.getElementById('tipo-relatorio').value;

                if (!dataInicio || !dataFim) {
                    alert('Por favor, selecione tanto a data inicial quanto a data final.');
                    return;
                }

                btnGerar.innerText = 'Buscando dados...';
                btnGerar.disabled = true;

                try {
                    const [diaI, mesI, anoI] = dataInicio.split('/');
                    const dataInicioISO = `${anoI}-${mesI}-${diaI} 00:00:00`;
                    const [diaF, mesF, anoF] = dataFim.split('/');
                    const dataFimISO = `${anoF}-${mesF}-${diaF} 23:59:59`;

                    // BUSCA NA NOVA TABELA DETALHADA
                    const { data: registros, error } = await supabase
                        .from('atendimentos_detalhados')
                        .select('*')
                        .gte('data_hora', dataInicioISO)
                        .lte('data_hora', dataFimISO);

                    if (error) throw error;

                    if (registros.length === 0) {
                        alert(`Nenhum atendimento encontrado entre ${dataInicio} e ${dataFim}.`);
                        return;
                    }

                    // Esconde filtros, mostra os slides
                    areaFiltros.style.display = 'none';
                    containerSlides.style.display = 'block';

                    // Roteamento dos relatórios
                    if (tipoRelatorio === 'categorias') {
                        renderizarCategoriasEPDV(registros);
                    } else {
                        slideRender.innerHTML = `
                            <h1 class="slide-title" style="margin-top: 300px;">Relatório em <span>Desenvolvimento</span></h1>
                            <p style="text-align:center; font-size:1.5rem; color:#64748b;">Este modelo será programado na próxima etapa.</p>
                        `;
                    }

                } catch (error) {
                    console.error("Erro ao gerar relatório:", error);
                    alert("Erro ao buscar os dados.");
                } finally {
                    btnGerar.innerText = 'Gerar Apresentação';
                    btnGerar.disabled = false;
                }
            });
        }

    } catch (error) {
        console.error("Erro crítico ao inicializar:", error);
    }
});

// ==========================================
// 3. FUNÇÃO QUE MONTA O SLIDE 1 (CATEGORIAS)
// ==========================================
function renderizarCategoriasEPDV(dados) {
    const slideRender = document.getElementById('slide-render');
    const totalAtendimentos = dados.length;

    // Função auxiliar para agrupar e contar motivos
    function agruparPorMotivo(categoriaDesejada) {
        const filtrados = dados.filter(d => d.categoria === categoriaDesejada);
        const contagem = {};
        filtrados.forEach(d => {
            contagem[d.motivo] = (contagem[d.motivo] || 0) + 1;
        });
        
        // Transforma em array e ordena do maior para o menor
        return Object.keys(contagem)
            .map(motivo => ({ motivo, qtd: contagem[motivo], perc: ((contagem[motivo] / totalAtendimentos) * 100).toFixed(0) }))
            .sort((a, b) => b.qtd - a.qtd);
    }

    const motivosPDV = agruparPorMotivo('PDV');
    const motivosAcesso = agruparPorMotivo('Acessos');
    const motivosOperacoes = agruparPorMotivo('Operações/Serviços');

    // Função auxiliar para gerar as linhas da tabela em HTML
    function gerarLinhasTabela(arrayMotivos) {
        if(arrayMotivos.length === 0) return `<tr><td colspan="3" style="text-align:center;">Sem dados no período</td></tr>`;
        return arrayMotivos.map(item => `
            <tr>
                <td>${item.motivo}</td>
                <td class="highlight" style="text-align:center;">${item.qtd}</td>
                <td class="highlight" style="text-align:center;">${item.perc}%</td>
            </tr>
        `).join('');
    }

    // MONTA O HTML DO SLIDE
    slideRender.innerHTML = `
        <h1 class="slide-title">Top 10 <span>Categorias & Departamentos</span></h1>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; position: relative; z-index: 10;">
            
            <div>
                <table class="lebes-table">
                    <thead>
                        <tr><th colspan="3" style="text-align: center;">PDV</th></tr>
                        <tr style="background:#22c55e; font-size:0.9rem;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr>
                    </thead>
                    <tbody>${gerarLinhasTabela(motivosPDV)}</tbody>
                </table>

                <table class="lebes-table" style="margin-top: 30px;">
                    <thead>
                        <tr><th colspan="3" style="text-align: center;">ACESSOS</th></tr>
                        <tr style="background:#22c55e; font-size:0.9rem;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr>
                    </thead>
                    <tbody>${gerarLinhasTabela(motivosAcesso)}</tbody>
                </table>
            </div>

            <div>
                <table class="lebes-table">
                    <thead>
                        <tr><th colspan="3" style="text-align: center;">OPERAÇÕES/SERVIÇOS</th></tr>
                        <tr style="background:#22c55e; font-size:0.9rem;"><th>Categoria</th><th>QNT</th><th>% MÊS</th></tr>
                    </thead>
                    <tbody>${gerarLinhasTabela(motivosOperacoes)}</tbody>
                </table>

                <div style="background: rgba(255,255,255,0.9); padding: 30px; border-radius: 12px; margin-top: 30px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center;">
                    <h4 style="color: #334155; margin-bottom: 20px; font-size: 1.4rem; font-weight: 800; text-transform: uppercase;">Tradicional vs EXPRESS</h4>
                    <canvas id="chartTipoLoja" width="600" height="300"></canvas>
                </div>
            </div>
        </div>
    `;

    // RENDERIZA O GRÁFICO CHART.JS
    const qtdTradicional = dados.filter(d => d.tipo_loja === 'Tradicional').length;
    const qtdExpress = dados.filter(d => d.tipo_loja === 'EXPRESS').length;

    if (chartAtual) { chartAtual.destroy(); } // Limpa o gráfico anterior

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
                barThickness: 80
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false } // Esconde a legenda para ficar igual sua imagem
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}