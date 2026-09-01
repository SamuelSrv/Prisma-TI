export function renderizarURA(dadosPeriodo, dtIni, dtFim, tipoPeriodo, subtituloCapa) {
    const totalChamados = dadosPeriodo.length;

    // --- FUNÇÕES AUXILIARES DE NEGÓCIO ---

    // Identifica se é Tradicional (1 a 166) ou Express (> 166)
    const getLojaInfo = (contatoStr) => {
        if (!contatoStr) return { nome: 'N/A', numero: 0, tipo: 'OUTROS' };
        const match = contatoStr.match(/\d+/);
        if (match) {
            const num = parseInt(match[0], 10);
            const tipo = (num >= 1 && num <= 166) ? 'TRADICIONAL' : 'EXPRESS';
            return { nome: contatoStr, numero: num, tipo: tipo };
        }
        return { nome: contatoStr, numero: 0, tipo: 'OUTROS' };
    };

    // Agrupamento genérico
    const agrupar = (arr, prop, limit = null) => {
        const counts = {};
        arr.forEach(item => {
            const key = item[prop] || 'Não Informado';
            counts[key] = (counts[key] || 0) + 1;
        });
        let result = Object.keys(counts).map(k => ({ nome: k, qtd: counts[k] })).sort((a, b) => b.qtd - a.qtd);
        if (limit) result = result.slice(0, limit);
        return result;
    };

    // Calcula % baseado num total
    const getPct = (valor, tot) => tot > 0 ? Math.round((valor / tot) * 100) : 0;

    // Gerador de Gráfico de Barras CSS (Evita bugs de Chart.js em slides)
    const gerarGraficoBarrasCSS = (arrFiltrado) => {
        let trad = 0;
        let exp = 0;
        arrFiltrado.forEach(d => {
            const info = getLojaInfo(d.contato);
            if (info.tipo === 'TRADICIONAL') trad++;
            if (info.tipo === 'EXPRESS') exp++;
        });
        const tot = trad + exp;
        const pTrad = getPct(trad, tot);
        const pExp = getPct(exp, tot);

        return `
            <div style="display: flex; height: 180px; align-items: flex-end; justify-content: space-around; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 40px; position: relative;">
                
                <!-- Eixo Y Simulado -->
                <div style="position: absolute; left: 0; top: -20px; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #94a3b8; padding-right: 5px;">
                    <span>70%</span><span>50%</span><span>30%</span><span>10%</span><span>0%</span>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; width: 60px;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #475569; margin-bottom: 5px;">${pTrad}%</span>
                    <div style="width: 50px; height: ${pTrad}%; max-height: 150px; background-color: #65a30d; border-radius: 2px 2px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px;"><span style="color: white; font-size: 0.7rem; font-weight: bold;">${trad}</span></div>
                    <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; margin-top: 8px;">Tradicional</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; width: 60px;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #475569; margin-bottom: 5px;">${pExp}%</span>
                    <div style="width: 50px; height: ${pExp}%; max-height: 150px; background-color: #65a30d; border-radius: 2px 2px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px;"><span style="color: white; font-size: 0.7rem; font-weight: bold;">${exp}</span></div>
                    <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; margin-top: 8px;">EXPRESS</span>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px; font-size: 0.75rem; font-weight: bold; color: #15803d;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #65a30d; margin-right: 5px;"></span> QUANTIDADE
            </div>
        `;
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO DE TABELAS E MATRIZES ---

    const gerarTabelaPadrao = (dados, totalGeral, bgHeader = '#15803d', header1 = 'CATEGORIA') => {
        let linhas = dados.map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <td style="padding: 4px 8px; font-size: 0.75rem; color: #334155;">${item.nome}</td>
                <td style="padding: 4px 8px; font-size: 0.75rem; text-align: center; font-weight: bold; color: #0f172a; background: #dcfce7;">${item.qtd}</td>
                <td style="padding: 4px 8px; font-size: 0.75rem; text-align: center; color: #475569;">${getPct(item.qtd, totalGeral)}%</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: ${bgHeader}; color: white; font-size: 0.7rem;">
                        <th style="padding: 6px; text-align: left;">${header1}</th>
                        <th style="padding: 6px; text-align: center; width: 60px;">QNT</th>
                        <th style="padding: 6px; text-align: center; width: 60px;">% MÊS</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `;
    };

    const gerarMatriz = (dadosBrutos, topLinhas, topColunas, propLinha, propColuna, tituloLinha) => {
        // topLinhas = ex: Lojas. topColunas = ex: Subcategorias.
        let thead = `<th style="padding: 4px; text-align: left; background: #e2e8f0; border: 1px solid #cbd5e1;">${tituloLinha}</th>`;
        topColunas.forEach(c => {
            thead += `<th style="padding: 4px; text-align: center; font-weight: normal; background: #e2e8f0; border: 1px solid #cbd5e1;">${c.nome}</th>`;
        });
        thead += `<th style="padding: 4px; text-align: center; background: #cbd5e1; border: 1px solid #94a3b8; font-weight: bold;">Total</th>`;

        let tbody = '';
        let totaisColunas = {};
        topColunas.forEach(c => totaisColunas[c.nome] = 0);
        let totalGeralMatriz = 0;

        topLinhas.forEach(linha => {
            let rowTotal = 0;
            let tds = `<td style="padding: 4px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">${linha.nome}</td>`;
            
            topColunas.forEach(coluna => {
                // Conta cruzamento
                const qtd = dadosBrutos.filter(d => (d[propLinha] || 'N/A') === linha.nome && (d[propColuna] || 'N/A') === colunas.nome).length; //Correção aqui abaixo!
                const qtdReal = dadosBrutos.filter(d => (d[propLinha] || 'N/A') === linha.nome && (d[propColuna] || 'N/A') === coluna.nome).length;

                rowTotal += qtdReal;
                totaisColunas[coluna.nome] += qtdReal;
                
                tds += `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1; ${qtdReal > 0 ? 'color: #0f172a;' : 'color: transparent;'}">${qtdReal || 0}</td>`;
            });
            totalGeralMatriz += rowTotal;
            tds += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #f1f5f9; font-weight: bold;">${rowTotal}</td>`;
            tbody += `<tr>${tds}</tr>`;
        });

        // Linha de Totais
        let rowTotais = `<td style="padding: 4px; border: 1px solid #94a3b8; background: #cbd5e1; font-weight: bold;">Total</td>`;
        topColunas.forEach(coluna => {
            rowTotais += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #e2e8f0; font-weight: bold;">${totaisColunas[coluna.nome] || ''}</td>`;
        });
        rowTotais += `<td style="padding: 4px; text-align: center; border: 1px solid #94a3b8; background: #94a3b8; color: white; font-weight: bold;">${totalGeralMatriz}</td>`;
        tbody += `<tr>${rowTotais}</tr>`;

        return `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.65rem; color: #334155;">
                    <thead><tr>${thead}</tr></thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        `;
    };


    const renderSlideContent = (conteudo) => `<div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #f4f9f5; padding: 25px 40px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">${conteudo}</div>`;

    // ==========================================
    // CAPA
    // ==========================================
    const htmlCapa = `<div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white;"><div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div><div><h1 style="font-size: 3rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase;">Apresentação URA</h1><p style="font-size: 1.4rem; font-weight: 600; opacity: 0.9; margin: 0;">${subtituloCapa}</p></div><div style="font-size: 0.9rem; opacity: 0.8;">Gerência de Tecnologia da Informação - Suporte Técnico</div></div>`;

    // ==========================================
    // SLIDE 1: APP RESOLVE
    // ==========================================
    const dadosAppResolve = dadosPeriodo.filter(d => (d.categoria || '').toUpperCase().includes('APP RESOLVE'));
    const totalAppResolve = dadosAppResolve.length;
    
    let htmlSlide1 = '';
    if (totalAppResolve > 0) {
        const topSubcatsApp = agrupar(dadosAppResolve, 'subcategoria', 10);
        const topContatosApp = agrupar(dadosAppResolve, 'contato', 10);
        
        htmlSlide1 = renderSlideContent(`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #64748b; font-size: 1.8rem; font-weight: 800; margin: 0;">APP RESOLVE <span style="font-size: 1.2rem; font-weight: 600;">CATEGORIAS & DEPARTAMENTOS</span></h2>
                <span style="font-size: 1.2rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
            </div>

            <!-- Tabela Principal App Resolve -->
            <div style="width: 40%; margin: 0 auto 20px auto;">
                ${gerarTabelaPadrao([{nome: 'App Resolve', qtd: totalAppResolve}], totalChamados, '#15803d', 'CATEGORIA')}
            </div>

            <div style="display: flex; gap: 30px; flex: 1;">
                <!-- Coluna Esquerda: Tabelas -->
                <div style="flex: 2; display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        ${gerarTabelaPadrao(topSubcatsApp, totalAppResolve, '#22c55e', 'SUB CATEGORIAS')}
                    </div>
                    <div style="flex: 1;">
                        ${gerarTabelaPadrao(topContatosApp, totalAppResolve, '#22c55e', 'CONTATO')}
                    </div>
                </div>

                <!-- Coluna Direita: Gráfico Tradicional x Express -->
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    ${gerarGraficoBarrasCSS(dadosAppResolve)}
                </div>
            </div>

            <!-- Matriz Inferior -->
            <div style="margin-top: 20px; background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${gerarMatriz(dadosAppResolve, topContatosApp, topSubcatsApp, 'contato', 'subcategoria', 'Contatos')}
            </div>
        `);
    } else {
        htmlSlide1 = renderSlideContent(`<div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:#94a3b8;"><h2>APP RESOLVE</h2><p>Nenhum dado de App Resolve neste período.</p></div>`);
    }

    // ==========================================
    // SLIDE 2: TOP 10 LOJAS
    // ==========================================
    const top10CatsGeral = agrupar(dadosPeriodo, 'categoria', 10);
    const top10ContatosGeral = agrupar(dadosPeriodo, 'contato', 10);
    
    // Pega a categoria #1 para fazer o drill-down (geralmente PDV)
    const catTop1Nome = top10CatsGeral.length > 0 ? top10CatsGeral[0].nome : 'N/A';
    const dadosCatTop1 = dadosPeriodo.filter(d => (d.categoria || '') === catTop1Nome);
    const topSubcatsTop1 = agrupar(dadosCatTop1, 'subcategoria', 7); // Pega top 7 subs para caber
    const topContatosTop1 = agrupar(dadosCatTop1, 'contato', 5); // Top 5 lojas que chamaram essa categoria

    const htmlSlide2 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #94a3b8; font-size: 2rem; font-weight: 800; margin: 0;">Top 10 <span style="font-size: 1.4rem; color: #334155;">LOJAS</span></h2>
            <span style="font-size: 1.2rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>

        <div style="display: flex; gap: 20px; height: 220px; margin-bottom: 15px;">
            <div style="flex: 1; overflow-y: auto;">
                ${gerarTabelaPadrao(top10CatsGeral, totalChamados, '#22c55e', 'URA – Categorias')}
            </div>
            <div style="flex: 1; overflow-y: auto;">
                ${gerarTabelaPadrao(top10ContatosGeral, totalChamados, '#22c55e', 'URA – Contatos')}
            </div>
        </div>

        <!-- Matriz 1: Contatos x Categorias -->
        <div style="margin-bottom: 15px; background: white; padding: 5px; border-radius: 6px;">
            ${gerarMatriz(dadosPeriodo, top10ContatosGeral, top10CatsGeral, 'contato', 'categoria', 'Contatos')}
        </div>

        <!-- Matriz 2: Drill down da categoria TOP 1 (Ex: PDV) -->
        <div style="display: flex; align-items: center; background: #e2e8f0; padding: 10px; border-radius: 8px;">
            <div style="font-weight: 900; font-size: 1.2rem; color: #0f172a; width: 120px; text-align: center;">
                ${catTop1Nome}<br><span style="color: #22c55e; font-size: 2rem;">⤵</span>
            </div>
            <div style="flex: 1; background: white; padding: 5px; border-radius: 6px;">
                ${gerarMatriz(dadosCatTop1, topContatosTop1, topSubcatsTop1, 'contato', 'subcategoria', 'Contatos')}
            </div>
        </div>
    `);

    // ==========================================
    // SLIDE 3: TOP 10 CATEGORIAS & DEPARTAMENTOS
    // ==========================================
    const top4Cats = agrupar(dadosPeriodo, 'categoria', 4);
    
    let htmlQuadrosCategorias = top4Cats.map(cat => {
        const dadosDestaCat = dadosPeriodo.filter(d => (d.categoria || '') === cat.nome);
        const topSubs = agrupar(dadosDestaCat, 'subcategoria', 10); // top 10 subs da categoria
        return `
            <div style="flex: 1; min-width: 45%;">
                ${gerarTabelaPadrao(topSubs, dadosDestaCat.length, '#15803d', cat.nome.toUpperCase())}
            </div>
        `;
    }).join('');

    const htmlSlide3 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #94a3b8; font-size: 2rem; font-weight: 800; margin: 0;">Top 10 <span style="font-size: 1.4rem; color: #334155;">CATEGORIAS & DEPARTAMENTOS</span></h2>
            <span style="font-size: 1.2rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>

        <div style="display: flex; gap: 30px; height: 100%;">
            <!-- 4 Quadros de Categorias -->
            <div style="flex: 2; display: flex; flex-wrap: wrap; gap: 15px; align-content: flex-start;">
                ${htmlQuadrosCategorias}
            </div>

            <!-- Gráfico Tradicional x Express Geral -->
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; background: white; border-radius: 8px; border: 1px solid #cbd5e1; padding: 20px;">
                <h3 style="text-align: center; color: #475569; font-size: 0.9rem; margin-top: 0;">Volume Total: Tradicional x Express</h3>
                ${gerarGraficoBarrasCSS(dadosPeriodo)}
            </div>
        </div>
    `);

    // ==========================================
    // SLIDE FINAL
    // ==========================================
    const htmlFim = `<div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white;"><div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div><div><h1 style="font-size: 4rem; font-weight: 900; margin: 0; text-transform: uppercase;">Obrigado!</h1></div><div style="font-size: 0.9rem; opacity: 0.8;">Suporte Técnico & URA - Grupo Lebes</div></div>`;

    return htmlCapa + htmlSlide1 + htmlSlide2 + htmlSlide3 + htmlFim;
}