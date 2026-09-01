/**
 * Renderiza o HTML da Apresentação da URA (Grupo Lebes)
 * 
 * @param {Array<Object>} dadosPeriodo - Lista de chamados/atendimentos
 * @param {string} [dtIni] - Data inicial do filtro
 * @param {string} [dtFim] - Data final do filtro
 * @param {string} [tipoPeriodo] - Tipo/Descrição do período
 * @param {string} [subtituloCapa] - Subtítulo para o slide de capa
 * @returns {string} HTML concatenado de todos os slides
 */
export function renderizarURA(dadosPeriodo = [], dtIni = '', dtFim = '', tipoPeriodo = '', subtituloCapa = 'Relatório de Atendimentos') {
    
    // Escapa strings HTML contra caracteres especiais e quebras de layout
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const dadosSafe = Array.isArray(dadosPeriodo) ? dadosPeriodo : [];
    const totalChamados = dadosSafe.length;

    // --- FUNÇÕES AUXILIARES DE NEGÓCIO ---

    // Identifica se é Tradicional (1 a 166) ou Express (> 166)
    const getLojaInfo = (contatoStr) => {
        if (!contatoStr) return { nome: 'N/A', numero: 0, tipo: 'OUTROS' };
        const match = String(contatoStr).match(/\d+/);
        if (match) {
            const num = parseInt(match[0], 10);
            const tipo = (num >= 1 && num <= 166) ? 'TRADICIONAL' : (num > 166 ? 'EXPRESS' : 'OUTROS');
            return { nome: contatoStr, numero: num, tipo };
        }
        return { nome: contatoStr, numero: 0, tipo: 'OUTROS' };
    };

    // Agrupamento genérico com ordenação descendente
    const agrupar = (arr, prop, limit = null) => {
        const counts = new Map();
        arr.forEach(item => {
            const key = (item && item[prop]) ? String(item[prop]).trim() : 'Não Informado';
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        
        let result = Array.from(counts.entries())
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd);

        if (limit && Number.isInteger(limit) && limit > 0) {
            result = result.slice(0, limit);
        }
        return result;
    };

    // Calcula % baseado num total
    const getPct = (valor, tot) => tot > 0 ? Math.round((valor / tot) * 100) : 0;

    // Gerador de Gráfico de Barras CSS Ajustado
    const gerarGraficoBarrasCSS = (arrFiltrado) => {
        let trad = 0;
        let exp = 0;
        arrFiltrado.forEach(d => {
            const info = getLojaInfo(d.contato);
            if (info.tipo === 'TRADICIONAL') trad++;
            else if (info.tipo === 'EXPRESS') exp++;
        });
        const tot = trad + exp;
        const pTrad = getPct(trad, tot);
        const pExp = getPct(exp, tot);

        // Altura máxima da barra em pixels para precisão visual garantida
        const maxBarPx = 120;
        const hTradPx = Math.round((pTrad / 100) * maxBarPx);
        const hExpPx = Math.round((pExp / 100) * maxBarPx);

        return `
            <div style="display: flex; height: 170px; align-items: flex-end; justify-content: space-around; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 15px; position: relative;">
                
                <!-- Eixo Y Simulado -->
                <div style="position: absolute; left: 0; top: 0; bottom: 10px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #94a3b8; padding-right: 5px;">
                    <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; width: 70px;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #475569; margin-bottom: 5px;">${pTrad}%</span>
                    <div style="width: 45px; height: ${hTradPx}px; background-color: #16a34a; border-radius: 4px 4px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px;">
                        <span style="color: white; font-size: 0.7rem; font-weight: bold;">${trad}</span>
                    </div>
                    <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; margin-top: 8px;">Tradicional</span>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; width: 70px;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #475569; margin-bottom: 5px;">${pExp}%</span>
                    <div style="width: 45px; height: ${hExpPx}px; background-color: #2563eb; border-radius: 4px 4px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px;">
                        <span style="color: white; font-size: 0.7rem; font-weight: bold;">${exp}</span>
                    </div>
                    <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; margin-top: 8px;">EXPRESS</span>
                </div>
            </div>
            <div style="text-align: center; margin-top: 10px; font-size: 0.75rem; font-weight: bold; color: #15803d;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #16a34a; margin-right: 3px; border-radius: 2px;"></span> Tradicional
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #2563eb; margin-left: 10px; margin-right: 3px; border-radius: 2px;"></span> Express
            </div>
        `;
    };

    // --- RENDERIZAÇÃO DE TABELAS E MATRIZES ---

    const gerarTabelaPadrao = (dados, totalGeral, bgHeader = '#15803d', header1 = 'CATEGORIA') => {
        if (!dados || dados.length === 0) {
            return `
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                    <thead><tr style="background: ${bgHeader}; color: white; font-size: 0.7rem;"><th style="padding: 6px; text-align: left;">${escapeHtml(header1)}</th></tr></thead>
                    <tbody><tr><td style="padding: 8px; font-size: 0.75rem; text-align: center; color: #94a3b8;">Sem dados</td></tr></tbody>
                </table>
            `;
        }

        const linhas = dados.map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <td style="padding: 4px 8px; font-size: 0.75rem; color: #334155; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.nome)}">${escapeHtml(item.nome)}</td>
                <td style="padding: 4px 8px; font-size: 0.75rem; text-align: center; font-weight: bold; color: #0f172a; background: #dcfce7;">${item.qtd}</td>
                <td style="padding: 4px 8px; font-size: 0.75rem; text-align: center; color: #475569;">${getPct(item.qtd, totalGeral)}%</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: ${bgHeader}; color: white; font-size: 0.7rem;">
                        <th style="padding: 6px; text-align: left;">${escapeHtml(header1)}</th>
                        <th style="padding: 6px; text-align: center; width: 60px;">QNT</th>
                        <th style="padding: 6px; text-align: center; width: 60px;">% MÊS</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `;
    };

    // Matriz Otimizada O(N + L*C) via Hash Map
    const gerarMatriz = (dadosBrutos, topLinhas, topColunas, propLinha, propColuna, tituloLinha) => {
        if (!topLinhas || topLinhas.length === 0 || !topColunas || topColunas.length === 0) {
            return '<div style="font-size:0.75rem; color:#94a3b8; padding:10px; text-align:center;">Sem dados para a matriz.</div>';
        }

        // 1. Pré-agregação em Hash Map O(N) para alta performance
        const mapaCruzado = new Map();
        dadosBrutos.forEach(d => {
            const valLinha = (d && d[propLinha]) ? String(d[propLinha]).trim() : 'N/A';
            const valColuna = (d && d[propColuna]) ? String(d[propColuna]).trim() : 'N/A';
            const key = `${valLinha}|||${valColuna}`;
            mapaCruzado.set(key, (mapaCruzado.get(key) || 0) + 1);
        });

        // 2. Cabeçalho
        let thead = `<th style="padding: 4px; text-align: left; background: #e2e8f0; border: 1px solid #cbd5e1; min-width: 100px;">${escapeHtml(tituloLinha)}</th>`;
        topColunas.forEach(c => {
            thead += `<th style="padding: 4px; text-align: center; font-weight: normal; background: #e2e8f0; border: 1px solid #cbd5e1; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</th>`;
        });
        thead += `<th style="padding: 4px; text-align: center; background: #cbd5e1; border: 1px solid #94a3b8; font-weight: bold; width: 50px;">Total</th>`;

        // 3. Corpo
        let tbody = '';
        const totaisColunas = {};
        topColunas.forEach(c => totaisColunas[c.nome] = 0);
        let totalGeralMatriz = 0;

        topLinhas.forEach(linha => {
            let rowTotal = 0;
            let tds = `<td style="padding: 4px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(linha.nome)}">${escapeHtml(linha.nome)}</td>`;
            
            topColunas.forEach(coluna => {
                const key = `${linha.nome}|||${coluna.nome}`;
                const qtdReal = mapaCruzado.get(key) || 0;

                rowTotal += qtdReal;
                totaisColunas[coluna.nome] += qtdReal;
                
                tds += `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1; ${qtdReal > 0 ? 'color: #0f172a; font-weight: 600;' : 'color: #cbd5e1;'}">${qtdReal || 0}</td>`;
            });

            totalGeralMatriz += rowTotal;
            tds += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #f1f5f9; font-weight: bold;">${rowTotal}</td>`;
            tbody += `<tr>${tds}</tr>`;
        });

        // 4. Rodapé Totais
        let rowTotais = `<td style="padding: 4px; border: 1px solid #94a3b8; background: #cbd5e1; font-weight: bold;">Total</td>`;
        topColunas.forEach(coluna => {
            rowTotais += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #e2e8f0; font-weight: bold;">${totaisColunas[coluna.nome] || 0}</td>`;
        });
        rowTotais += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #15803d; color: white; font-weight: bold;">${totalGeralMatriz}</td>`;
        tbody += `<tr>${rowTotais}</tr>`;

        return `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.65rem; color: #334155; table-layout: fixed;">
                    <thead><tr>${thead}</tr></thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        `;
    };

    const renderSlideContent = (conteudo) => `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #f4f9f5; padding: 25px 40px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);">
            ${conteudo}
        </div>
    `;

    // Formatador de período para a capa
    const infoPeriodoStr = dtIni && dtFim 
        ? `Período: ${dtIni} até ${dtFim} ${tipoPeriodo ? `(${tipoPeriodo})` : ''}`
        : (tipoPeriodo ? `Período: ${tipoPeriodo}` : '');

    // ==========================================
    // CAPA
    // ==========================================
    const htmlCapa = `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
                <div style="font-size: 0.9rem; background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 20px; backdrop-filter: blur(4px);">${escapeHtml(infoPeriodoStr)}</div>
            </div>
            <div>
                <h1 style="font-size: 3rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase;">Apresentação URA</h1>
                <p style="font-size: 1.4rem; font-weight: 600; opacity: 0.9; margin: 0;">${escapeHtml(subtituloCapa)}</p>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; opacity: 0.85;">
                <span>Gerência de Tecnologia da Informação - Suporte Técnico</span>
                <span>Total de Registros: <strong>${totalChamados}</strong></span>
            </div>
        </div>
    `;

    // ==========================================
    // SLIDE 1: APP RESOLVE
    // ==========================================
    const dadosAppResolve = dadosSafe.filter(d => (d.categoria || '').toUpperCase().includes('APP RESOLVE'));
    const totalAppResolve = dadosAppResolve.length;
    
    let htmlSlide1 = '';
    if (totalAppResolve > 0) {
        const topSubcatsApp = agrupar(dadosAppResolve, 'subcategoria', 8);
        const topContatosApp = agrupar(dadosAppResolve, 'contato', 8);
        
        htmlSlide1 = renderSlideContent(`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2 style="color: #334155; font-size: 1.6rem; font-weight: 800; margin: 0;">APP RESOLVE <span style="font-size: 1.1rem; font-weight: 600; color: #64748b;">– CATEGORIAS & DEPARTAMENTOS</span></h2>
                <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
            </div>

            <!-- Tabela Principal App Resolve -->
            <div style="width: 38%; margin: 0 auto 15px auto;">
                ${gerarTabelaPadrao([{nome: 'App Resolve', qtd: totalAppResolve}], totalChamados, '#15803d', 'CATEGORIA')}
            </div>

            <div style="display: flex; gap: 20px; flex: 1; align-items: flex-start;">
                <!-- Coluna Esquerda: Tabelas -->
                <div style="flex: 2; display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        ${gerarTabelaPadrao(topSubcatsApp, totalAppResolve, '#22c55e', 'SUB CATEGORIAS')}
                    </div>
                    <div style="flex: 1;">
                        ${gerarTabelaPadrao(topContatosApp, totalAppResolve, '#22c55e', 'CONTATO')}
                    </div>
                </div>

                <!-- Coluna Direita: Gráfico Tradicional x Express -->
                <div style="flex: 1; background: white; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="text-align: center; color: #475569; font-size: 0.8rem; margin: 0 0 10px 0;">Distribuição por Tipo de Loja</h3>
                    ${gerarGraficoBarrasCSS(dadosAppResolve)}
                </div>
            </div>

            <!-- Matriz Inferior -->
            <div style="margin-top: 15px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                ${gerarMatriz(dadosAppResolve, topContatosApp, topSubcatsApp, 'contato', 'subcategoria', 'Contatos')}
            </div>
        `);
    } else {
        htmlSlide1 = renderSlideContent(`
            <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:#94a3b8;">
                <h2>APP RESOLVE</h2>
                <p>Nenhum dado de App Resolve encontrado para este período.</p>
            </div>
        `);
    }

    // ==========================================
    // SLIDE 2: TOP 10 LOJAS
    // ==========================================
    const top10CatsGeral = agrupar(dadosSafe, 'categoria', 8);
    const top10ContatosGeral = agrupar(dadosSafe, 'contato', 8);
    
    // Categoria TOP 1 para drill-down
    const catTop1Nome = top10CatsGeral.length > 0 ? top10CatsGeral[0].nome : 'N/A';
    const dadosCatTop1 = dadosSafe.filter(d => (d.categoria || '') === catTop1Nome);
    const topSubcatsTop1 = agrupar(dadosCatTop1, 'subcategoria', 6);
    const topContatosTop1 = agrupar(dadosCatTop1, 'contato', 5);

    const htmlSlide2 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="color: #334155; font-size: 1.6rem; font-weight: 800; margin: 0;">TOP 10 <span style="font-size: 1.1rem; color: #64748b; font-weight: 600;">– LOJAS & CATEGORIAS</span></h2>
            <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 15px;">
            <div style="flex: 1;">
                ${gerarTabelaPadrao(top10CatsGeral, totalChamados, '#22c55e', 'URA – Categorias')}
            </div>
            <div style="flex: 1;">
                ${gerarTabelaPadrao(top10ContatosGeral, totalChamados, '#22c55e', 'URA – Contatos')}
            </div>
        </div>

        <!-- Matriz 1: Contatos x Categorias -->
        <div style="margin-bottom: 15px; background: white; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
            ${gerarMatriz(dadosSafe, top10ContatosGeral, top10CatsGeral, 'contato', 'categoria', 'Contatos')}
        </div>

        <!-- Matriz 2: Drill down da categoria TOP 1 (Ex: PDV) -->
        <div style="display: flex; align-items: center; background: #e2e8f0; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1;">
            <div style="font-weight: 800; font-size: 0.9rem; color: #0f172a; width: 130px; text-align: center; line-height: 1.2;">
                ${escapeHtml(catTop1Nome)}<br><span style="color: #16a34a; font-size: 1.4rem;">⤵</span>
            </div>
            <div style="flex: 1; background: white; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
                ${gerarMatriz(dadosCatTop1, topContatosTop1, topSubcatsTop1, 'contato', 'subcategoria', 'Contatos')}
            </div>
        </div>
    `);

    // ==========================================
    // SLIDE 3: TOP 10 CATEGORIAS & DEPARTAMENTOS
    // ==========================================
    const top4Cats = agrupar(dadosSafe, 'categoria', 4);
    
    let htmlQuadrosCategorias = top4Cats.map(cat => {
        const dadosDestaCat = dadosSafe.filter(d => (d.categoria || '') === cat.nome);
        const topSubs = agrupar(dadosDestaCat, 'subcategoria', 5); // Limite de 5 itens para garantir ajuste visual na altura do slide
        return `
            <div style="flex: 1; min-width: 45%;">
                ${gerarTabelaPadrao(topSubs, dadosDestaCat.length, '#15803d', cat.nome.toUpperCase())}
            </div>
        `;
    }).join('');

    const htmlSlide3 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="color: #334155; font-size: 1.6rem; font-weight: 800; margin: 0;">TOP CATEGORIAS <span style="font-size: 1.1rem; color: #64748b; font-weight: 600;">– SUB-CATEGORIAS DESTAQUE</span></h2>
            <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>

        <div style="display: flex; gap: 20px; flex: 1; align-items: flex-start;">
            <!-- 4 Quadros de Categorias em Grid 2x2 -->
            <div style="flex: 2; display: flex; flex-wrap: wrap; gap: 12px; align-content: flex-start;">
                ${htmlQuadrosCategorias}
            </div>

            <!-- Gráfico Tradicional x Express Geral -->
            <div style="flex: 1; background: white; border-radius: 8px; border: 1px solid #cbd5e1; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h3 style="text-align: center; color: #475569; font-size: 0.85rem; margin-top: 0; font-weight: 700;">Volume Total: Tradicional x Express</h3>
                ${gerarGraficoBarrasCSS(dadosSafe)}
            </div>
        </div>
    `);

    // ==========================================
    // SLIDE FINAL
    // ==========================================
    const htmlFim = `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);">
            <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
            <div>
                <h1 style="font-size: 4rem; font-weight: 900; margin: 0; text-transform: uppercase;">Obrigado!</h1>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.85;">Suporte Técnico & URA – Grupo Lebes</div>
        </div>
    `;

    return htmlCapa + htmlSlide1 + htmlSlide2 + htmlSlide3 + htmlFim;
}