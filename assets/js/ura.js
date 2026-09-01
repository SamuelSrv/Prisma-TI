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
    
    // Função de segurança para evitar XSS
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    const dadosSafe = Array.isArray(chamadosPeriodoAbertura) ? chamadosPeriodoAbertura : [];
    const totalChamados = dadosSafe.length;

    // --- FUNÇÕES AUXILIARES DE NEGÓCIO ---
    const getLojaInfo = (contatoStr) => {
        if (!contatoStr) return { nome: 'Não Informado', numero: 0, tipo: 'OUTROS' };
        const match = String(contatoStr).match(/\d+/);
        if (match) {
            const num = parseInt(match[0], 10);
            const tipo = num <= 166 ? 'TRADICIONAL' : 'EXPRESS';
            return { nome: escapeHtml(contatoStr).toUpperCase(), numero: num, tipo: tipo };
        }
        return { nome: escapeHtml(contatoStr).toUpperCase(), numero: 0, tipo: 'OUTROS' };
    };

    // --- PROCESSAMENTO E AGREGAÇÃO DE DADOS ---
    let qtdTradicional = 0;
    let qtdExpress = 0;
    const contagemCategorias = {};
    const contagemLojas = {};
    const matrizCruzamento = {}; // Para o slide de Lojas x Categorias
    const contagemMacroCategorias = {}; // Categoria 1 -> Categoria 2

    dadosSafe.forEach(chamado => {
        const loja = getLojaInfo(chamado.contato);
        
        if (loja.tipo === 'TRADICIONAL') qtdTradicional++;
        else if (loja.tipo === 'EXPRESS') qtdExpress++;

        const cat = escapeHtml(chamado.categoria || 'Sem Categoria');
        const subcat = escapeHtml(chamado.subcategoria || 'Geral');
        const lojaNome = loja.nome;

        // Contagem Top Categorias
        contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;

        // Contagem Top Lojas
        if (lojaNome !== 'Não Informado' && lojaNome !== 'NÃO INFORMADO') {
            contagemLojas[lojaNome] = (contagemLojas[lojaNome] || 0) + 1;
        }

        // Matriz Cruzamento (Loja vs Categoria)
        if (!matrizCruzamento[lojaNome]) matrizCruzamento[lojaNome] = { total: 0, categorias: {} };
        matrizCruzamento[lojaNome].total++;
        matrizCruzamento[lojaNome].categorias[cat] = (matrizCruzamento[lojaNome].categorias[cat] || 0) + 1;

        // Agrupamento para Departamentos (Cat 1 -> Cat 2)
        if (!contagemMacroCategorias[cat]) contagemMacroCategorias[cat] = { total: 0, subcategorias: {} };
        contagemMacroCategorias[cat].total++;
        contagemMacroCategorias[cat].subcategorias[subcat] = (contagemMacroCategorias[cat].subcategorias[subcat] || 0) + 1;
    });

    // Ordenações
    const topCategorias = Object.entries(contagemCategorias).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topLojas = Object.entries(contagemLojas).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    // Para a matriz (Top 10 Lojas e Top 8 Categorias)
    const top10LojasPivot = Object.entries(contagemLojas).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
    const top8CategoriasPivot = Object.entries(contagemCategorias).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);

    // Para Categorias & Departamentos (Top 4 Macro)
    const top4Macro = Object.entries(contagemMacroCategorias).sort((a, b) => b[1].total - a[1].total).slice(0, 4);

    // Cálculos de Porcentagem Base
    const pctTrad = totalChamados > 0 ? Math.round((qtdTradicional / totalChamados) * 100) : 0;
    const pctExp = totalChamados > 0 ? Math.round((qtdExpress / totalChamados) * 100) : 0;

    // Variável para formatar as páginas no tamanho A4 Paisagem exato
    const slideClass = "w-[1123px] h-[794px] bg-[#f8fafc] text-slate-800 p-10 flex flex-col relative shadow-xl shrink-0 border-b border-slate-300 overflow-hidden";
    const coverClass = "w-[1123px] h-[794px] bg-slate-900 justify-center items-center text-center flex flex-col relative shadow-xl shrink-0 border-b border-slate-300 overflow-hidden";

    // --- GERAÇÃO DOS SLIDES (HTML) ---
    let html = '';

    // ==========================================
    // Slide 1: Capa (Estilo Field)
    // ==========================================
    html += `
    <div class="${coverClass}">
        <div class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style="background-image: radial-gradient(#10b981 1px, transparent 1px); background-size: 30px 30px;"></div>
        <div class="z-10 p-10 bg-slate-800/80 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-2xl">
            <div class="w-20 h-20 bg-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <i class="fa-solid fa-headset text-4xl text-white"></i>
            </div>
            <h1 class="text-7xl font-black text-white mb-2 tracking-tight">URA <span class="text-emerald-400">Lebes</span></h1>
            <h2 class="text-3xl text-slate-300 font-light tracking-wide uppercase mt-4">${escapeHtml(subtituloCapa)}</h2>
            <div class="w-32 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 mx-auto my-10 rounded-full"></div>
            <div class="inline-block bg-slate-900/50 px-8 py-4 rounded-xl border border-slate-700">
                <p class="text-lg text-slate-400 font-medium uppercase tracking-widest mb-1">Período de Análise</p>
                <p class="text-3xl text-white font-bold">${escapeHtml(dataInicio)} <span class="text-emerald-500 mx-2"><i class="fa-solid fa-arrow-right"></i></span> ${escapeHtml(dataFim)}</p>
            </div>
        </div>
    </div>
    `;

    // ==========================================
    // Slide 2: Resumo Executivo
    // ==========================================
    html += `
    <div class="${slideClass}">
        <div class="flex items-center justify-between mb-8 pb-4 border-b-2 border-emerald-500/20">
            <div class="flex items-center gap-4">
                <div class="bg-emerald-100 p-3 rounded-lg text-emerald-600"><i class="fa-solid fa-chart-pie text-2xl"></i></div>
                <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Visão Geral</h2>
            </div>
            <img src="https://logodownload.org/wp-content/uploads/2019/09/lebes-logo.png" alt="Lebes" class="h-8 opacity-80 grayscale">
        </div>
        
        <div class="grid grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl border-l-4 border-slate-700 shadow-sm flex flex-col justify-center items-center">
                <p class="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Total de Atendimentos</p>
                <p class="text-6xl font-black text-slate-800">${totalChamados}</p>
            </div>
            <div class="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 text-8xl"><i class="fa-solid fa-store"></i></div>
                <p class="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Lojas Tradicionais</p>
                <p class="text-5xl font-black text-emerald-600 mb-1">${qtdTradicional}</p>
                <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">${pctTrad}% do total</span>
            </div>
            <div class="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-5 text-blue-500 text-8xl"><i class="fa-solid fa-bolt"></i></div>
                <p class="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Lojas Express</p>
                <p class="text-5xl font-black text-blue-600 mb-1">${qtdExpress}</p>
                <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">${pctExp}% do total</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-8 flex-1">
            <!-- Top Categorias (Sem Demanda) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 class="text-xl font-bold text-slate-700 mb-5 flex items-center gap-2 uppercase">
                    <i class="fa-solid fa-tags text-emerald-500"></i> Top 5 Categorias
                </h3>
                <div class="space-y-3 flex-1 flex flex-col justify-center">
                    ${topCategorias.length ? topCategorias.map((c, i) => `
                        <div class="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                            <span class="font-bold text-slate-600 flex items-center gap-3">
                                <span class="bg-emerald-500 text-white w-6 h-6 flex items-center justify-center rounded text-sm">${i + 1}</span> 
                                ${c[0]}
                            </span>
                            <span class="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm font-bold">${c[1]}</span>
                        </div>
                    `).join('') : '<p class="text-slate-400 italic text-center">Sem dados suficientes.</p>'}
                </div>
            </div>

            <!-- Top Lojas (Sem Ofensora) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 class="text-xl font-bold text-slate-700 mb-5 flex items-center gap-2 uppercase">
                    <i class="fa-solid fa-map-location-dot text-blue-500"></i> Top 5 Lojas
                </h3>
                <div class="space-y-3 flex-1 flex flex-col justify-center">
                    ${topLojas.length ? topLojas.map((l, i) => `
                        <div class="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                            <span class="font-bold text-slate-600 flex items-center gap-3">
                                <span class="bg-blue-500 text-white w-6 h-6 flex items-center justify-center rounded text-sm">${i + 1}</span> 
                                ${l[0]}
                            </span>
                            <span class="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm font-bold">${l[1]}</span>
                        </div>
                    `).join('') : '<p class="text-slate-400 italic text-center">Sem dados suficientes.</p>'}
                </div>
            </div>
        </div>
    </div>
    `;

    // ==========================================
    // Slide 3: Gráfico (Evolução Diária)
    // ==========================================
    html += `
    <div class="${slideClass}">
        <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-emerald-500/20">
            <div class="flex items-center gap-4">
                <div class="bg-emerald-100 p-3 rounded-lg text-emerald-600"><i class="fa-solid fa-chart-line text-2xl"></i></div>
                <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Evolução de Atendimentos</h2>
            </div>
            <div class="flex gap-4 text-xs font-bold">
                <div class="flex items-center gap-1"><span class="w-3 h-3 bg-[#94a3b8] rounded-sm"></span> Dias Anteriores</div>
                <div class="flex items-center gap-1"><span class="w-3 h-3 bg-[#10b981] rounded-sm"></span> Período Selecionado</div>
            </div>
        </div>
        <div class="flex-1 w-full relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <canvas id="chartEvolucaoURA"></canvas>
        </div>
    </div>
    `;

    // ==========================================
    // Slide 4: Categorias & Departamentos (Inspirado na Imagem)
    // ==========================================
    html += `
    <div class="${slideClass}">
        <div class="flex items-center justify-between mb-6 pb-2 border-b-2 border-emerald-500/20">
            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Categorias & Departamentos</h2>
        </div>
        
        <div class="flex gap-6 h-full">
            <!-- Esquerda: Tabelas de Subcategorias -->
            <div class="w-2/3 grid grid-cols-2 gap-4">
                ${top4Macro.map(macro => {
                    const nomeMacro = macro[0];
                    const totalMacro = macro[1].total;
                    const subcats = Object.entries(macro[1].subcategorias).sort((a, b) => b[1] - a[1]).slice(0, 6);
                    
                    return `
                    <div class="bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col h-[280px]">
                        <div class="bg-emerald-600 text-white font-black text-center py-2 text-sm uppercase tracking-wider">${nomeMacro}</div>
                        <div class="flex bg-emerald-50 border-b border-emerald-100 text-xs font-bold text-emerald-800 px-3 py-1">
                            <div class="flex-1">CATEGORIA</div>
                            <div class="w-12 text-center">QNT</div>
                            <div class="w-12 text-center">%</div>
                        </div>
                        <div class="flex-1 overflow-hidden bg-slate-50">
                            ${subcats.map((sub, idx) => {
                                const p = Math.round((sub[1] / totalMacro) * 100);
                                const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                                return `
                                <div class="flex ${bgClass} px-3 py-1.5 border-b border-slate-100 text-xs">
                                    <div class="flex-1 text-slate-600 truncate pr-2" title="${sub[0]}">${sub[0]}</div>
                                    <div class="w-12 text-center font-bold text-slate-700 bg-emerald-100/50 rounded">${sub[1]}</div>
                                    <div class="w-12 text-center font-bold text-slate-500">${p}%</div>
                                </div>
                                `
                            }).join('')}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <!-- Direita: Gráfico Tradicional vs Express (Via HTML/CSS para ser perfeito no PDF) -->
            <div class="w-1/3 bg-white border border-slate-200 rounded shadow-sm p-6 flex flex-col items-center justify-end relative h-[576px]">
                <h3 class="absolute top-6 w-full text-center font-black text-slate-700 uppercase tracking-widest text-sm border-b border-slate-100 pb-2">Comparativo de Perfil</h3>
                
                <div class="flex items-end justify-center gap-12 w-full h-[350px] mb-8 relative">
                    <!-- Tradicional -->
                    <div class="flex flex-col items-center w-24">
                        <span class="text-sm font-bold text-slate-500 mb-2">${pctTrad}%</span>
                        <div class="w-full bg-emerald-500 rounded-t-sm relative transition-all" style="height: ${Math.max(pctTrad * 3, 20)}px;">
                            <span class="absolute -bottom-6 w-full text-center text-xs font-bold text-slate-600 uppercase">Tradicional</span>
                            <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-black">${qtdTradicional}</span>
                        </div>
                    </div>

                    <!-- Express -->
                    <div class="flex flex-col items-center w-24">
                        <span class="text-sm font-bold text-slate-500 mb-2">${pctExp}%</span>
                        <div class="w-full bg-emerald-400 rounded-t-sm relative transition-all" style="height: ${Math.max(pctExp * 3, 20)}px;">
                            <span class="absolute -bottom-6 w-full text-center text-xs font-bold text-slate-600 uppercase">Express</span>
                            <span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-black">${qtdExpress}</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-4 text-xs font-bold border-t border-slate-200 pt-4 w-full justify-center">
                    <div class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-sm"></span> Quantidade</div>
                </div>
            </div>
        </div>
    </div>
    `;

    // ==========================================
    // Slide 5: Cruzamento Lojas x Categorias (Matriz)
    // ==========================================
    html += `
    <div class="${slideClass}">
        <div class="flex items-center justify-between mb-6 pb-2 border-b-2 border-emerald-500/20">
            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Matriz: Lojas x Categorias</h2>
        </div>
        
        <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-emerald-600 text-white">
                        <th class="p-3 border-r border-emerald-500/50 uppercase font-black w-32">LOJA</th>
                        ${top8CategoriasPivot.map(cat => `<th class="p-3 border-r border-emerald-500/50 uppercase font-bold text-center leading-tight"><div class="truncate w-[90px]" title="${cat}">${cat}</div></th>`).join('')}
                        <th class="p-3 uppercase font-black text-center bg-emerald-700 w-20">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${top10LojasPivot.map((loja, index) => {
                        const dadosLoja = matrizCruzamento[loja];
                        const trClass = index % 2 === 0 ? 'bg-slate-50' : 'bg-white';
                        
                        let colsHTML = '';
                        let somaLinha = 0;

                        top8CategoriasPivot.forEach(cat => {
                            const val = dadosLoja.categorias[cat] || 0;
                            somaLinha += val;
                            const valFormatado = val > 0 ? `<span class="font-bold text-slate-700">${val}</span>` : `<span class="text-slate-300">-</span>`;
                            colsHTML += `<td class="p-3 border-r border-b border-slate-200 text-center">${valFormatado}</td>`;
                        });

                        return `
                        <tr class="${trClass}">
                            <td class="p-3 border-r border-b border-slate-200 font-bold text-slate-700 uppercase bg-slate-100">${loja}</td>
                            ${colsHTML}
                            <td class="p-3 border-b border-slate-200 font-black text-center bg-emerald-50 text-emerald-700">${somaLinha}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="p-4 bg-slate-100 text-slate-500 text-xs italic mt-auto border-t border-slate-200">
                * Exibindo apenas o cruzamento das 10 lojas de maior volume contra as 8 categorias de maior volume no período selecionado.
            </div>
        </div>
    </div>
    `;

    // ==========================================
    // Slide 6: Encerramento (Estilo Field)
    // ==========================================
    html += `
    <div class="${coverClass}">
        <div class="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style="background-image: linear-gradient(45deg, #10b981 25%, transparent 25%, transparent 75%, #10b981 75%, #10b981), linear-gradient(45deg, #10b981 25%, transparent 25%, transparent 75%, #10b981 75%, #10b981); background-size: 60px 60px; background-position: 0 0, 30px 30px;"></div>
        
        <div class="z-10 flex flex-col items-center justify-center">
            <i class="fa-solid fa-circle-check text-7xl text-emerald-500 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"></i>
            <h1 class="text-7xl font-black text-white mb-4 tracking-tighter">MUITO OBRIGADO!</h1>
            <p class="text-2xl text-slate-400 font-light mb-12">Fim da Apresentação URA Lebes</p>
            
            <div class="w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mb-12 opacity-50"></div>
            
            <img src="https://logodownload.org/wp-content/uploads/2019/09/lebes-logo.png" alt="Lebes" class="h-10 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
        </div>
    </div>
    `;

    return html;
}

/**
 * Função responsável por injetar o Gráfico (Chart.js) no slide gerado
 */
export function renderizarGraficoURA(todosProcessados, dtIni, dtFim, tipoPeriodo) {
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
        const coresDia = [];

        // Voltar 3 dias no tempo para o gráfico
        let curr = new Date(dtIni);
        curr.setDate(curr.getDate() - 3); 

        while (curr <= dtFim) {
            const diaStr = String(curr.getDate()).padStart(2, '0') + '/' + String(curr.getMonth() + 1).padStart(2, '0');
            labelsDias.push(diaStr);

            // Contar chamados do dia
            const chamadosDoDia = todosProcessados.filter(d => isSameDay(parseDataBr(d.abertura), curr)).length;
            dadosDia.push(chamadosDoDia);

            // Se a data atual (curr) for menor que o início oficial (dtIni), pinta de cinza
            if (curr < dtIni) {
                coresDia.push('#94a3b8'); // Cinza (Dias Anteriores)
            } else {
                coresDia.push('#10b981'); // Esmeralda (Período Selecionado)
            }

            curr.setDate(curr.getDate() + 1);
        }

        // Plugin customizado para desenhar os números no topo das barras
        const pluginRotulosGerais = {
            id: 'rotulosTopBar',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (meta.hidden) return;

                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        if (value === 0) return; // Não desenha zero para manter limpo

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.fillStyle = '#334155'; // Cor do texto numérico

                        const model = element.getProps(['x', 'y'], true);
                        ctx.fillText(value, model.x, model.y - 8);
                        ctx.restore();
                    });
                });
            }
        };

        if (window.chartUraInstance) {
            window.chartUraInstance.destroy();
        }

        window.chartUraInstance = new Chart(canvasEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labelsDias,
                datasets: [{ 
                    label: 'Volume de Atendimentos', 
                    data: dadosDia, 
                    backgroundColor: coresDia, 
                    borderRadius: 4,
                    barThickness: 'flex',
                    maxBarThickness: 45
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 20 } // Espaço para os rótulos numéricos não cortarem
                },
                plugins: {
                    legend: { display: false }, // Oculto pois a legenda já foi feita em HTML
                    tooltip: {
                        callbacks: {
                            title: (context) => 'Dia ' + context[0].label,
                            label: (context) => context.raw + ' atendimentos'
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f1f5f9', borderDash: [5, 5] },
                        ticks: { font: { size: 11 }, color: '#94a3b8' },
                        border: { display: false }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: 'bold' }, color: '#64748b' },
                        border: { display: false }
                    }
                }
            },
            plugins: [pluginRotulosGerais]
        });
    }, 150);
}