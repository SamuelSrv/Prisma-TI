/**
 * Renderiza o HTML da Apresentação da URA (Grupo Lebes)
 */
export function renderizarURA(
    todosProcessados, 
    chamadosPeriodoAbertura, 
    chamadosAnteriorAbertura, 
    dtIni, dtFim, 
    antIni, antFim, 
    dataInicio, dataFim, 
    tipoPeriodo, subtituloCapa
) {
    
    // Função de segurança para evitar XSS ao injetar dados do CSV no HTML
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const dadosSafe = Array.isArray(chamadosPeriodoAbertura) ? chamadosPeriodoAbertura : [];
    const totalChamados = dadosSafe.length;

    // --- FUNÇÕES AUXILIARES DE NEGÓCIO ---

    // Identifica se é Tradicional (1 a 166) ou Express (> 166)
    const getLojaInfo = (contatoStr) => {
        if (!contatoStr) return { nome: 'Não Informado', numero: 0, tipo: 'OUTROS' };
        
        // Tenta extrair o número da loja
        const match = String(contatoStr).match(/\d+/);
        if (match) {
            const num = parseInt(match[0], 10);
            const tipo = num <= 166 ? 'TRADICIONAL' : 'EXPRESS';
            return { nome: escapeHtml(contatoStr), numero: num, tipo: tipo };
        }
        return { nome: escapeHtml(contatoStr), numero: 0, tipo: 'OUTROS' };
    };

    // --- PROCESSAMENTO E AGREGAÇÃO DE DADOS ---
    let qtdTradicional = 0;
    let qtdExpress = 0;
    const contagemCategorias = {};
    const contagemLojas = {};

    dadosSafe.forEach(chamado => {
        const loja = getLojaInfo(chamado.contato);
        
        if (loja.tipo === 'TRADICIONAL') qtdTradicional++;
        else if (loja.tipo === 'EXPRESS') qtdExpress++;

        // Contagem para Top Categorias
        const cat = escapeHtml(chamado.categoria || 'Sem Categoria');
        contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;

        // Contagem para Top Lojas Demandantes
        if (loja.nome !== 'Não Informado') {
            contagemLojas[loja.nome] = (contagemLojas[loja.nome] || 0) + 1;
        }
    });

    // Ordenação dos Tops (Pegando os 5 primeiros)
    const topCategorias = Object.entries(contagemCategorias).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topLojas = Object.entries(contagemLojas).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Variável para formatar as páginas no tamanho A4 Paisagem exato
    const slideClass = "w-[1123px] h-[794px] bg-white text-slate-800 p-12 flex flex-col relative shadow-xl shrink-0 border-b border-slate-300";

    // --- GERAÇÃO DOS SLIDES (HTML) ---
    let html = '';

    // Slide 1: Capa
    html += `
    <div class="${slideClass} bg-slate-900 justify-center items-center text-center">
        <div class="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
            <h1 class="text-6xl font-black text-white mb-4 tracking-tight"><span class="text-emerald-500">URA</span> Lebes</h1>
            <h2 class="text-3xl text-slate-300 font-light tracking-wide">${escapeHtml(subtituloCapa)}</h2>
            <div class="w-24 h-1 bg-emerald-500 mx-auto my-8 rounded-full"></div>
            <p class="text-xl text-slate-400 font-medium">Período de Análise</p>
            <p class="text-2xl text-emerald-400 font-bold mt-1">${escapeHtml(dataInicio)} a ${escapeHtml(dataFim)}</p>
        </div>
    </div>
    `;

    // Slide 2: Resumo Executivo
    html += `
    <div class="${slideClass}">
        <div class="flex items-center gap-4 mb-10 border-b-2 border-slate-100 pb-4">
            <i class="fa-solid fa-chart-pie text-3xl text-emerald-600"></i>
            <h2 class="text-3xl font-bold text-slate-800">Visão Geral - URA</h2>
        </div>
        
        <div class="grid grid-cols-3 gap-6 mb-10">
            <div class="bg-slate-50 p-6 rounded-xl border-l-4 border-slate-700 shadow-sm">
                <p class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Total de Atendimentos</p>
                <p class="text-5xl font-black text-slate-800">${totalChamados}</p>
            </div>
            <div class="bg-slate-50 p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                <p class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Lojas Tradicionais</p>
                <p class="text-5xl font-black text-emerald-700">${qtdTradicional}</p>
            </div>
            <div class="bg-slate-50 p-6 rounded-xl border-l-4 border-blue-500 shadow-sm">
                <p class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Lojas Express</p>
                <p class="text-5xl font-black text-blue-700">${qtdExpress}</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-10 flex-1">
            <!-- Top Categorias -->
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-tags text-emerald-500"></i> Top 5 Categorias (Demandas)
                </h3>
                <div class="space-y-4">
                    ${topCategorias.length ? topCategorias.map((c, i) => `
                        <div class="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                            <span class="font-semibold text-slate-700 text-lg flex items-center gap-3">
                                <span class="bg-slate-200 text-slate-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">${i + 1}</span> 
                                ${c[0]}
                            </span>
                            <span class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-sm">${c[1]}</span>
                        </div>
                    `).join('') : '<p class="text-slate-400 italic">Sem dados suficientes.</p>'}
                </div>
            </div>

            <!-- Top Lojas -->
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-store text-blue-500"></i> Top 5 Lojas Ofensoras
                </h3>
                <div class="space-y-4">
                    ${topLojas.length ? topLojas.map((l, i) => `
                        <div class="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                            <span class="font-semibold text-slate-700 text-lg flex items-center gap-3">
                                <span class="bg-slate-200 text-slate-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">${i + 1}</span> 
                                ${l[0]}
                            </span>
                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">${l[1]}</span>
                        </div>
                    `).join('') : '<p class="text-slate-400 italic">Sem dados suficientes.</p>'}
                </div>
            </div>
        </div>
    </div>
    `;

    // Slide 3: Gráfico (Evolução Diária)
    html += `
    <div class="${slideClass}">
        <div class="flex items-center gap-4 mb-8 border-b-2 border-slate-100 pb-4">
            <i class="fa-solid fa-chart-line text-3xl text-emerald-600"></i>
            <h2 class="text-3xl font-bold text-slate-800">Evolução de Atendimentos</h2>
        </div>
        <div class="flex-1 w-full relative">
            <canvas id="chartEvolucaoURA"></canvas>
        </div>
    </div>
    `;

    return html;
}

/**
 * Função responsável por injetar o Gráfico (Chart.js) no slide gerado pelo renderizarURA
 */
export function renderizarURA(todosProcessados, dtIni, dtFim, tipoPeriodo) {
    // Timeout para garantir que o modal foi injetado no DOM antes de buscar o Canvas
    setTimeout(() => {
        const canvasEl = document.getElementById('chartEvolucaoURA');
        if (!canvasEl) return;

        const parseDataBr = (str) => {
            if (!str) return null;
            const partes = str.split(' - ');
            if (partes.length < 1) return null;
            const [d, m, a] = partes[0].split('/');
            if (!d || !m || !a) return null;
            const hora = partes[1] || '00:00';
            return new Date(`${a}-${m}-${d}T${hora}:00`);
        };

        const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

        const labelsDias = [];
        const dadosDia = [];

        let curr = new Date(dtIni);
        while (curr <= dtFim) {
            const diaStr = String(curr.getDate()).padStart(2, '0') + '/' + String(curr.getMonth() + 1).padStart(2, '0');
            labelsDias.push(diaStr);

            // Filtra os chamados do dia específico
            const chamadosDoDia = todosProcessados.filter(d => isSameDay(parseDataBr(d.abertura), curr)).length;
            dadosDia.push(chamadosDoDia);

            curr.setDate(curr.getDate() + 1);
        }

        // Variável global atrelada à window (ou ao script atual) para não conflitar caso o usuário gere múltiplos relatórios sem recarregar a tela
        if (window.chartUraInstance) {
            window.chartUraInstance.destroy();
        }

        window.chartUraInstance = new Chart(canvasEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labelsDias,
                datasets: [
                    { 
                        label: 'Volume de Atendimentos (URA)', 
                        data: dadosDia, 
                        backgroundColor: '#10b981', 
                        borderRadius: 4,
                        barThickness: 'flex',
                        maxBarThickness: 50
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 14 } } }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#e2e8f0', borderDash: [5, 5] },
                        ticks: { font: { size: 12 } }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    }, 100);
}