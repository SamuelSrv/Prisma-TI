export function renderizarFieldService(dadosPeriodo, dadosAnterior, pInicio, pFim, tipoPeriodo, subtituloCapa) {
    const total = dadosPeriodo.length;
    const totalFechados = dadosPeriodo.filter(d => d.fechado).length;
    const taxaFechamento = total > 0 ? ((totalFechados / total) * 100).toFixed(0) : 0;

    const fechadosNoPrazo = dadosPeriodo.filter(d => d.fechado && (d.atraso_no_servico || 'nao').toLowerCase() !== 'sim').length;
    const pctPrazo = totalFechados > 0 ? Math.round((fechadosNoPrazo / totalFechados) * 100) : 0;
    const backlog = dadosPeriodo.filter(d => !d.fechado).length;

    const antTotal = dadosAnterior.length;
    const antFechados = dadosAnterior.filter(d => d.fechado).length;
    const antPrazo = dadosAnterior.filter(d => d.fechado && (d.atraso_no_servico || 'nao').toLowerCase() !== 'sim').length;
    const antPctPrazo = antFechados > 0 ? Math.round((antPrazo / antFechados) * 100) : 0;
    const antBacklog = dadosAnterior.filter(d => !d.fechado).length;

    const diffAbertos = total - antTotal;
    const diffFechados = totalFechados - antFechados;
    const diffPrazo = fechadosNoPrazo - antPrazo;
    const diffPctFechados = taxaFechamento - (antTotal > 0 ? Math.round((antFechados / antTotal) * 100) : 0);
    const diffPctPrazo = pctPrazo - antPctPrazo;
    const diffBacklog = backlog - antBacklog;

    const formatDiff = (val) => val > 0 ? `+${val}` : `${val}`;

    const agruparEContar = (array, prop) => {
        const contagem = {};
        array.forEach(item => {
            const chave = item[prop] || 'Não Informado';
            contagem[chave] = (contagem[chave] || 0) + 1;
        });
        return Object.keys(contagem).map(k => ({ nome: k, qtd: contagem[k] })).sort((a, b) => b.qtd - a.qtd);
    };

    // Garante exatamente 10 posições preenchendo com vazios se necessário
    const obterTop10Fixo = (array, prop) => {
        const agrupado = agruparEContar(array, prop);
        const resultado = [];
        for (let i = 0; i < 10; i++) {
            if (agrupado[i]) {
                resultado.push(agrupado[i]);
            } else {
                resultado.push({ nome: '-', qtd: '-' });
            }
        }
        return resultado;
    };

    const topCategorias = obterTop10Fixo(dadosPeriodo, 'categoria');
    const topContatos = obterTop10Fixo(dadosPeriodo, 'contato');

    const renderSlideContent = (conteudo) => `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #ebf5ee; padding: 25px 40px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            ${conteudo}
        </div>
    `;

    // 1. CAPA INICIAL
    const htmlCapa = `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white;">
            <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
            <div>
                <h1 style="font-size: 3rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase;">${tipoPeriodo === 'semanal' ? 'Semanal Field Service' : tipoPeriodo === 'mensal' ? 'Mensal Field Service' : 'Field Service'}</h1>
                <p style="font-size: 1.4rem; font-weight: 600; opacity: 0.9; margin: 0;">${subtituloCapa}</p>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Gerência de Tecnologia da Informação - Suporte Técnico</div>
        </div>
    `;

    // 2. SLIDE 1: EVOLUTIVO CHAMADOS
    const htmlSlide1 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px;">
            <div>
                <h2 style="color: #115e59; font-size: 1.2rem; font-weight: 800; margin: 0;">Evolutivo Chamados</h2>
                <span style="font-size: 0.75rem; color: #475569; font-weight: 600;">Em comparação com o período anterior | ${pInicio} até ${pFim}</span>
            </div>
            <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        
        <div style="background: white; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 15px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.8rem;">
                <thead>
                    <tr style="background: #334155; color: white; font-weight: 700;">
                        <th style="padding: 10px;">CHAMADOS ABERTOS</th>
                        <th style="padding: 10px;">CHAMADOS FECHADOS</th>
                        <th style="padding: 10px;">FECHADOS NO PRAZO</th>
                        <th style="padding: 10px;">% FECHADOS</th>
                        <th style="padding: 10px;">% FECHADOS NO PRAZO</th>
                        <th style="padding: 10px;">BACKLOG</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #f8fafc; font-weight: 800; font-size: 1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px;">${total}</td>
                        <td style="padding: 10px;">${totalFechados}</td>
                        <td style="padding: 10px;">${fechadosNoPrazo}</td>
                        <td style="padding: 10px;">${taxaFechamento}%</td>
                        <td style="padding: 10px;">${pctPrazo}%</td>
                        <td style="padding: 10px;">${backlog}</td>
                    </tr>
                    <tr style="background: white; font-weight: 600; font-size: 0.85rem; color: #64748b;">
                        <td style="padding: 8px;">${formatDiff(diffAbertos)}</td>
                        <td style="padding: 8px;">${formatDiff(diffFechados)}</td>
                        <td style="padding: 8px;">${formatDiff(diffPrazo)}</td>
                        <td style="padding: 8px;">${formatDiff(diffPctFechados)}%</td>
                        <td style="padding: 8px;">${formatDiff(diffPctPrazo)}%</td>
                        <td style="padding: 8px;">${formatDiff(diffBacklog)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="flex: 1; background: white; padding: 12px 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; display: flex; flex-direction: column;">
            <h4 style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-align: center;">Volumetria Diária de Atendimento</h4>
            <div style="flex: 1; position: relative;">
                <canvas id="chartEvolucaoField"></canvas>
            </div>
        </div>
    `);

    // 3. SLIDE 2: TOP 10 FIXO COM DESTAQUE NO TOP 3
    const gerarLinhasTabelaFixo = (arr) => arr.map((item, index) => {
        if (item.nome === '-') {
            return `<tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; font-size: 0.8rem; color: #94a3b8;"><span style="display:inline-block; width:18px; text-align:center; margin-right:6px; color:#94a3b8; font-size:11px;">${index+1}</span>-</td>
                <td style="text-align: center; padding: 8px 10px; font-size: 0.8rem; color: #94a3b8;">-</td>
                <td style="text-align: center; padding: 8px 10px; font-size: 0.8rem; color: #94a3b8;">-</td>
            </tr>`;
        }

        const isTop3 = index < 3;
        const bgStyle = isTop3 ? 'background-color: #d1fae5; font-weight: 700;' : 'background-color: #ffffff;';
        const badge = isTop3 ? `<span style="display:inline-block; width:18px; height:18px; background:#047857; color:white; border-radius:50%; text-align:center; font-size:10px; line-height:18px; margin-right:6px;">${index+1}</span>` : `<span style="display:inline-block; width:18px; text-align:center; margin-right:6px; color:#64748b; font-size:11px;">${index+1}</span>`;
        
        return `<tr style="${bgStyle} border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; font-size: 0.8rem; color: #0f172a; display: flex; align-items: center;">${badge}${item.nome}</td>
            <td style="text-align: center; font-weight: 800; padding: 8px 10px; font-size: 0.8rem; color: #0f172a;">${item.qtd}</td>
            <td style="text-align: center; padding: 8px 10px; font-size: 0.8rem; color: #0f172a; font-weight: 700;">${total > 0 ? ((item.qtd / total) * 100).toFixed(0) : 0}%</td>
        </tr>`;
    }).join('');

    const htmlSlide2 = renderSlideContent(`
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px;">
            <div>
                <h2 style="color: #115e59; font-size: 1.2rem; font-weight: 800; margin: 0;">Top 10 Categorias & Requerentes</h2>
                <span style="font-size: 0.75rem; color: #475569; font-weight: 600;">Período: ${pInicio} até ${pFim}</span>
            </div>
            <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; height: 100%;">
            <div style="display: flex; flex-direction: column;">
                <div style="background: #115e59; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.85rem; text-align: center;">
                    CATEGORIAS
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 10px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white; font-size: 0.75rem;"><th style="padding: 8px; text-align: left;">Categoria</th><th style="text-align: center;">Quantidade</th><th style="text-align: center;">% Mês</th></tr></thead>
                        <tbody>${gerarLinhasTabelaFixo(topCategorias)}</tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="background: #0f766e; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.85rem; text-align: center;">
                    CONTATOS
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 10px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white; font-size: 0.75rem;"><th style="padding: 8px; text-align: left;">Requerentes</th><th style="text-align: center;">Quantidade</th><th style="text-align: center;">% Mês</th></tr></thead>
                        <tbody>${gerarLinhasTabelaFixo(topContatos)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `);

    // 4. CAPA FINAL (OBRIGADO!)
    const htmlFim = `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); position: relative; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; box-sizing: border-box; margin-bottom: 30px; color: white;">
            <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;">Grupo Lebes</div>
            <div>
                <h1 style="font-size: 4rem; font-weight: 900; margin: 0; text-transform: uppercase;">Obrigado!</h1>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Suporte Técnico & Field Service - Grupo Lebes</div>
        </div>
    `;

    return htmlCapa + htmlSlide1 + htmlSlide2 + htmlFim;
}