/**
 * Renderiza o HTML da Apresentação da URA (Grupo Lebes) - Padrão Field Service
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
    // Helper de segurança para filtrar apenas a equipe da URA
    const isEquipeURA = (item) => {
        if (!item || !item.equipe) return false;
        const eq = String(item.equipe).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
        return eq === 'central telefonica';
    };

    // Função de segurança para evitar XSS
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    // Aplica o filtro de equipe na origem das listas
    const todosSafe = (Array.isArray(todosProcessados) ? todosProcessados : []).filter(isEquipeURA);
    const dadosSafe = (Array.isArray(chamadosPeriodoAbertura) ? chamadosPeriodoAbertura : []).filter(isEquipeURA);
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
    const matrizCruzamento = {};
    const contagemMacroCategorias = {};

    // Categorias de "ruído" que não devem poluir os rankings qualitativos
    const categoriasIgnoradas = [
        "( s ) - dúvidas/orientações - ti",
        "( i ) - whatsapp / atendimento encerrado por falta de retorno"
    ];

    dadosSafe.forEach(chamado => {
        const loja = getLojaInfo(chamado.contato);
        const lojaNome = loja.nome;

        // Contabiliza SEMPRE para as Lojas e Totais (Independente da categoria)
        if (loja.tipo === 'TRADICIONAL') qtdTradicional++;
        else if (loja.tipo === 'EXPRESS') qtdExpress++;

        if (lojaNome !== 'Não Informado' && lojaNome !== 'NÃO INFORMADO') {
            contagemLojas[lojaNome] = (contagemLojas[lojaNome] || 0) + 1;
        }

        // Tratamento de Categorias
        const cat = escapeHtml(chamado.categoria || 'Sem Categoria');
        const catNormalizada = cat.toLowerCase().trim();
        const isIgnorada = categoriasIgnoradas.includes(catNormalizada);

        // Busca restrita na coluna solicitada (com fallback explícito para vazio)
        const subcatRaw = chamado.categoria_2;
        const subcat = subcatRaw ? escapeHtml(subcatRaw) : 'Não Classificada';

        // Alimenta os rankings SOMENTE se não for uma categoria ignorada
        if (!isIgnorada) {
            contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;

            if (!contagemMacroCategorias[cat]) {
                contagemMacroCategorias[cat] = { total: 0, subcategorias: {} };
            }
            contagemMacroCategorias[cat].total++;
            contagemMacroCategorias[cat].subcategorias[subcat] = (contagemMacroCategorias[cat].subcategorias[subcat] || 0) + 1;

            if (lojaNome !== 'Não Informado' && lojaNome !== 'NÃO INFORMADO') {
                if (!matrizCruzamento[lojaNome]) matrizCruzamento[lojaNome] = { categorias: {} };
                matrizCruzamento[lojaNome].categorias[cat] = (matrizCruzamento[lojaNome].categorias[cat] || 0) + 1;
            }
        }
    });

    // --- ORDENAÇÕES DE TOP FIXO ---
    const preencherTopFixo = (obj, limite) => {
        const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
        const resultado = [];
        for (let i = 0; i < limite; i++) {
            if (sorted[i]) resultado.push({ nome: sorted[i][0], qtd: sorted[i][1] });
            else resultado.push({ nome: '-', qtd: '-' });
        }
        return resultado;
    };

    // Ajustado para capturar o TOP 10 conforme solicitado
    const topCategorias = preencherTopFixo(contagemCategorias, 10);
    const topLojas = preencherTopFixo(contagemLojas, 10);

    const top10LojasPivot = Object.entries(contagemLojas).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
    const top8CategoriasPivot = Object.entries(contagemCategorias).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
    const top4Macro = Object.entries(contagemMacroCategorias).sort((a, b) => b[1].total - a[1].total).slice(0, 4);

    const pctTrad = totalChamados > 0 ? Math.round((qtdTradicional / totalChamados) * 100) : 0;
    const pctExp = totalChamados > 0 ? Math.round((qtdExpress / totalChamados) * 100) : 0;

    // --- VARIÁVEIS DE ESTILO ---
    const coverStyle = `width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white;`;
    const slideStyle = `width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #ebf5ee; padding: 25px 40px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);`;
    const renderSlideContent = (conteudo) => `<div style="${slideStyle}">${conteudo}</div>`;
    const headerTitleStyle = `display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;`;

    const gerarLinhasTabelaFixo = (arr, totalBase) => arr.map((item, index) => {
        if (item.nome === '-') {
            return `<tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 10px; font-size: 0.75rem; color: #94a3b8;"><span style="display:inline-block; width:18px; text-align:center; margin-right:6px; color:#94a3b8; font-size:10px;">${index + 1}</span>-</td><td style="text-align: center; padding: 6px 10px; font-size: 0.75rem; color: #94a3b8;">-</td><td style="text-align: center; padding: 6px 10px; font-size: 0.75rem; color: #94a3b8;">-</td></tr>`;
        }
        const isTop3 = index < 3;
        const bgStyle = isTop3 ? 'background-color: #d1fae5; font-weight: 700;' : 'background-color: #ffffff;';
        const badge = isTop3 ? `<span style="display:inline-block; width:18px; height:18px; background:#047857; color:white; border-radius:50%; text-align:center; font-size:9px; line-height:18px; margin-right:6px;">${index + 1}</span>` : `<span style="display:inline-block; width:18px; text-align:center; margin-right:6px; color:#64748b; font-size:10px;">${index + 1}</span>`;
        return `<tr style="${bgStyle} border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px 10px; font-size: 0.75rem; color: #0f172a; display: flex; align-items: center;">${badge}${item.nome}</td><td style="text-align: center; font-weight: 800; padding: 6px 10px; font-size: 0.75rem; color: #0f172a;">${item.qtd}</td><td style="text-align: center; padding: 6px 10px; font-size: 0.75rem; color: #0f172a; font-weight: 700;">${totalBase > 0 ? ((item.qtd / totalBase) * 100).toFixed(0) : 0}%</td></tr>`;
    }).join('');

    const badgePeriodo = (dataInicio === dataFim) ? `Data: ${dataInicio}` : `Período: ${dataInicio} até ${dataFim}`;

    let html = `
    <style>
        .ura-zoom-active { transform: scale(0.70); transform-origin: top center; margin-bottom: -300px; }
        #ura-slides-wrapper { transition: transform 0.3s ease; }
        @media print { .btn-zoom-ura { display: none !important; } #ura-slides-wrapper { transform: scale(1) !important; margin-bottom: 0 !important; } }
    </style>
    
    <div style="position: fixed; bottom: 30px; right: 30px; z-index: 9999;" class="btn-zoom-ura">
        <button onclick="document.getElementById('ura-slides-wrapper').classList.toggle('ura-zoom-active')" 
                style="background-color: rgba(255, 255, 255, 0.9); color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
            <span style="font-size: 14px;">🔍</span> Zoom
        </button>
    </div>

    <div id="ura-slides-wrapper">
    `;

    // Slide 1: Capa
    html += `
    <div style="${coverStyle}">
        <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
        <div>
            <h1 style="font-size: 3rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase;">URA LEBES</h1>
            <p style="font-size: 1.4rem; font-weight: 600; opacity: 0.9; margin: 0;">${subtituloCapa}</p>
            <div style="margin-top: 15px; background: rgba(0,0,0,0.15); display: inline-block; padding: 10px 20px; border-radius: 8px;">
                <p style="font-size: 1.1rem; font-weight: 700; margin: 0;">${badgePeriodo}</p>
            </div>
        </div>
        <div style="font-size: 0.9rem; opacity: 0.8;">Gerência de Tecnologia da Informação - Suporte Técnico</div>
    </div>
    `;

    // Slide 2: Resumo Executivo
    html += renderSlideContent(`
        <div style="${headerTitleStyle}">
            <div><h2 style="color: #115e59; font-size: 1.1rem; font-weight: 800; margin: 0;">Visão Geral URA</h2><span style="font-size: 0.7rem; color: #475569; font-weight: 600;">${badgePeriodo}</span></div>
            <span style="font-size: 1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; background: white; border: 1px solid #cbd5e1; border-left: 4px solid #475569; border-radius: 6px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <p style="font-size: 0.75rem; color: #475569; font-weight: 700; text-transform: uppercase; margin: 0 0 5px 0;">Total de Atendimentos</p>
                <p style="font-size: 3rem; font-weight: 900; color: #1e293b; margin: 0;">${totalChamados}</p>
            </div>
            <div style="flex: 1; background: white; border: 1px solid #cbd5e1; border-left: 4px solid #10b981; border-radius: 6px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <p style="font-size: 0.75rem; color: #475569; font-weight: 700; text-transform: uppercase; margin: 0 0 5px 0;">Lojas Tradicionais</p>
                <p style="font-size: 2.5rem; font-weight: 900; color: #047857; margin: 0 0 5px 0;">${qtdTradicional}</p>
                <span style="background: #d1fae5; color: #065f46; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;">${pctTrad}% do total</span>
            </div>
            <div style="flex: 1; background: white; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; border-radius: 6px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <p style="font-size: 0.75rem; color: #475569; font-weight: 700; text-transform: uppercase; margin: 0 0 5px 0;">Lojas Express</p>
                <p style="font-size: 2.5rem; font-weight: 900; color: #0369a1; margin: 0 0 5px 0;">${qtdExpress}</p>
                <span style="background: #e0f2fe; color: #075985; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;">${pctExp}% do total</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1;">
            <div style="display: flex; flex-direction: column;">
                <div style="background: #115e59; color: white; padding: 8px 15px; border-radius: 6px 6px 0 0; font-weight: 700; font-size: 0.8rem; text-align: center;">TOP 10 CATEGORIAS</div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 6px 6px; flex: 1; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white; font-size: 0.7rem;"><th style="padding: 6px; text-align: left;">Categoria</th><th style="text-align: center;">Qtd</th><th style="text-align: center;">%</th></tr></thead>
                        <tbody>${gerarLinhasTabelaFixo(topCategorias, totalChamados)}</tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="background: #0f766e; color: white; padding: 8px 15px; border-radius: 6px 6px 0 0; font-weight: 700; font-size: 0.8rem; text-align: center;">TOP 10 LOJAS</div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 6px 6px; flex: 1; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white; font-size: 0.7rem;"><th style="padding: 6px; text-align: left;">Loja</th><th style="text-align: center;">Qtd</th><th style="text-align: center;">%</th></tr></thead>
                        <tbody>${gerarLinhasTabelaFixo(topLojas, totalChamados)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `);

    // Slide 3: Gráfico (Evolução Diária)
    html += renderSlideContent(`
        <div style="${headerTitleStyle}">
            <div><h2 style="color: #115e59; font-size: 1.1rem; font-weight: 800; margin: 0;">Evolução de Atendimentos</h2><span style="font-size: 0.7rem; color: #475569; font-weight: 600;">Comparativo com dias anteriores</span></div>
            <span style="font-size: 1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        <div style="flex: 1; background: white; padding: 10px 15px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; display: flex; flex-direction: column;">
            <div style="display: flex; gap: 15px; font-size: 0.75rem; font-weight: 700; color: #475569; justify-content: center; margin-bottom: 10px;">
                <span style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; background:#94a3b8; border-radius:2px;"></span> Dias Anteriores</span>
                <span style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; background:#10b981; border-radius:2px;"></span> Período Selecionado</span>
            </div>
            <div style="flex: 1; position: relative;"><canvas id="chartEvolucaoURA"></canvas></div>
        </div>
    `);

    // Slide 4: Categorias & Lojas
    const macroHtml = top4Macro.map(macro => {
        const nomeMacro = macro[0];
        const totalMacro = macro[1].total;
        const subcats = Object.entries(macro[1].subcategorias).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const linhasSubcats = subcats.map((sub, idx) => {
            const p = Math.round((sub[1] / totalMacro) * 100);
            const bgClass = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `<tr style="background-color: ${bgClass}; border-bottom: 1px solid #e2e8f0;"><td style="padding: 4px 8px; font-size: 0.7rem; color: #475569; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sub[0]}</td><td style="padding: 4px; font-size: 0.7rem; font-weight: 800; text-align: center; color: #0f172a;">${sub[1]}</td><td style="padding: 4px; font-size: 0.7rem; font-weight: 700; text-align: center; color: #64748b;">${p}%</td></tr>`;
        }).join('');

        return `<div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white;"><div style="background: #115e59; color: white; padding: 6px; font-size: 0.75rem; font-weight: 800; text-align: center; text-transform: uppercase;">${nomeMacro}</div><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #d1fae5; color: #065f46; font-size: 0.65rem;"><th style="padding: 4px 8px; text-align: left;">Subcategoria</th><th style="padding: 4px; text-align: center; width: 40px;">Qtd</th><th style="padding: 4px; text-align: center; width: 40px;">%</th></tr></thead><tbody>${linhasSubcats}</tbody></table></div>`;
    }).join('');

    html += renderSlideContent(`
        <div style="${headerTitleStyle}">
            <div><h2 style="color: #115e59; font-size: 1.1rem; font-weight: 800; margin: 0;">Categorias & Lojas</h2></div>
            <span style="font-size: 1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        <div style="display: flex; gap: 20px; flex: 1;">
            <div style="flex: 2; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px;">
                ${macroHtml}
            </div>
            <div style="flex: 1; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative;">
                <h3 style="position: absolute; top: 15px; width: 100%; text-align: center; font-size: 0.85rem; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Perfil de Atendimento</h3>
                <div style="display: flex; align-items: flex-end; justify-content: center; gap: 40px; width: 100%; height: 350px; margin-bottom: 20px; position: relative;">
                    <div style="display: flex; flex-direction: column; align-items: center; width: 80px;">
                        <span style="font-size: 0.85rem; font-weight: 800; color: #475569; margin-bottom: 5px;">${pctTrad}%</span>
                        <div style="width: 100%; background: #10b981; border-radius: 4px 4px 0 0; position: relative; height: ${Math.max(pctTrad * 3, 20)}px;">
                            <span style="position: absolute; bottom: -25px; width: 100%; text-align: center; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Tradicional</span>
                            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: 900; font-size: 1rem;">${qtdTradicional}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; width: 80px;">
                        <span style="font-size: 0.85rem; font-weight: 800; color: #475569; margin-bottom: 5px;">${pctExp}%</span>
                        <div style="width: 100%; background: #34d399; border-radius: 4px 4px 0 0; position: relative; height: ${Math.max(pctExp * 3, 20)}px;">
                            <span style="position: absolute; bottom: -25px; width: 100%; text-align: center; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Express</span>
                            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: 900; font-size: 1rem;">${qtdExpress}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Slide 5: Cruzamento Lojas x Categorias
    let matrizTrs = top10LojasPivot.map((loja, index) => {
        const dadosLoja = matrizCruzamento[loja];
        const trClass = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        let colsHTML = '';
        let somaLinha = 0;

        top8CategoriasPivot.forEach(cat => {
            const val = dadosLoja ? (dadosLoja.categorias[cat] || 0) : 0;
            somaLinha += val;
            const valFormatado = val > 0 ? `<span style="font-weight: 800; color: #0f172a;">${val}</span>` : `<span style="color: #cbd5e1;">-</span>`;
            colsHTML += `<td style="padding: 8px 4px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; text-align: center;">${valFormatado}</td>`;
        });

        return `
        <tr style="background-color: ${trClass}; font-size: 0.7rem;">
            <td style="padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #334155; text-transform: uppercase; background: #f1f5f9;">${loja}</td>
            ${colsHTML}
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 900; text-align: center; background: #d1fae5; color: #065f46;">${somaLinha}</td>
        </tr>
        `;
    }).join('');

    let matrizThs = top8CategoriasPivot.map(cat => `<th style="padding: 8px 4px; border-right: 1px solid rgba(255,255,255,0.2); text-transform: uppercase; text-align: center; font-weight: 700; width: 90px;"><div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px;" title="${cat}">${cat}</div></th>`).join('');

    html += renderSlideContent(`
        <div style="${headerTitleStyle}">
            <div><h2 style="color: #115e59; font-size: 1.1rem; font-weight: 800; margin: 0;">Matriz: Lojas x Categorias</h2></div>
            <span style="font-size: 1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; flex: 1; display: flex; flex-direction: column;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.7rem;">
                <thead>
                    <tr style="background: #10b981; color: white;">
                        <th style="padding: 8px; border-right: 1px solid rgba(255,255,255,0.2); text-transform: uppercase; font-weight: 900; width: 120px;">LOJA</th>
                        ${matrizThs}
                        <th style="padding: 8px; text-transform: uppercase; font-weight: 900; text-align: center; background: #047857; width: 60px;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${matrizTrs}
                </tbody>
            </table>
            <div style="padding: 10px; background: #f8fafc; color: #64748b; font-size: 0.7rem; font-style: italic; margin-top: auto; border-top: 1px solid #e2e8f0;">
                * Cruzamento restrito ao Top 10 Lojas vs Top 8 Categorias no período.
            </div>
        </div>
    `);

    // Slide 6: Encerramento
    html += `
    <div style="${coverStyle}">
        <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
        <div>
            <h1 style="font-size: 4rem; font-weight: 900; margin: 0; text-transform: uppercase;">Obrigado!</h1>
            <p style="font-size: 1.2rem; font-weight: 500; margin-top: 10px;">Fim da Apresentação URA Lebes</p>
        </div>
        <div style="font-size: 0.9rem; opacity: 0.8;">Gerência de Tecnologia da Informação - Suporte Técnico</div>
    </div>
    </div>
    `;

    return html;
}

export function renderizarGraficoURA(todosProcessados, dtIni, dtFim, tipoPeriodo) {
    setTimeout(() => {
        const canvasEl = document.getElementById('chartEvolucaoURA');
        if (!canvasEl) return;

        const isEquipeURA = (item) => {
            if (!item || !item.equipe) return false;
            const eq = String(item.equipe).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
            return eq === 'central telefonica';
        };

        const todosFiltrados = (Array.isArray(todosProcessados) ? todosProcessados : []).filter(isEquipeURA);

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

        let curr = new Date(dtIni);
        curr.setDate(curr.getDate() - 3);

        while (curr <= dtFim) {
            const diaStr = String(curr.getDate()).padStart(2, '0') + '/' + String(curr.getMonth() + 1).padStart(2, '0');
            labelsDias.push(diaStr);

            const chamadosDoDia = todosFiltrados.filter(d => isSameDay(parseDataBr(d.abertura), curr)).length;
            dadosDia.push(chamadosDoDia);

            if (curr < dtIni) {
                coresDia.push('#94a3b8');
            } else {
                coresDia.push('#10b981');
            }

            curr.setDate(curr.getDate() + 1);
        }

        const pluginRotulosGerais = {
            id: 'rotulosTopBar',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (meta.hidden) return;

                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        if (value === 0) return;

                        ctx.save();
                        ctx.textAlign = 'center';
                        // Adicione as lógicas de renderização de rótulos do ChartJS aqui, se necessário.
                    });
                });
            }
        };

        // Aqui deve ir o código de inicialização do seu ChartJS (ex: new Chart(canvasEl, {...}))
    }, 100);
}