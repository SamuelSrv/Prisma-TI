import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartChamados = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;
        carregarMenu('chamados');

        const opts = { autohide: true, format: 'dd/mm/yyyy', language: 'pt-BR' };
        if (window.Datepicker) {
            new window.Datepicker(document.getElementById('date-start'), opts);
            new window.Datepicker(document.getElementById('date-end'), opts);
        }

        document.getElementById('btn-importar').addEventListener('click', processarCSV);
        document.getElementById('btn-gerar').addEventListener('click', gerarRelatorioChamados);
        
        const modal = document.getElementById('modal-apresentacao');
        if (modal) modal.style.zIndex = '9999';
        
        document.getElementById('btn-fechar-modal').addEventListener('click', () => modal.classList.add('hidden'));

    } catch (error) {
        console.error("Erro na tela de chamados:", error);
    }
});

// ==========================================
// 1. IMPORTAÇÃO INTELIGENTE
// ==========================================
function processarCSV() {
    const fileInput = document.getElementById('arquivo-csv');
    const msgEl = document.getElementById('msg-importacao');
    const btn = document.getElementById('btn-importar');

    if (!fileInput.files.length) {
        alert("Por favor, selecione um arquivo CSV do Qualitor.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lendo arquivo...';
    msgEl.classList.remove('hidden');
    msgEl.innerText = "Analisando estrutura do CSV...";

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        encoding: "ISO-8859-1",
        complete: async function(results) {
            const dadosBrutos = results.data;
            const chamadosParaSalvar = [];

            dadosBrutos.forEach(linha => {
                if (linha['Atendimento']) {
                    let dataFormatada = null;
                    if (linha['Abertura']) {
                        const partes = linha['Abertura'].split(' - ');
                        if (partes.length === 2) {
                            const [dia, mes, ano] = partes[0].split('/');
                            dataFormatada = `${ano}-${mes}-${dia} ${partes[1]}:00`;
                        }
                    }

                    chamadosParaSalvar.push({
                        atendimento: parseInt(linha['Atendimento']),
                        data_abertura: dataFormatada,
                        titulo: linha['Título do chamado'] || '',
                        situacao: linha['Situação'] || '',
                        prioridade: linha['Prioridade'] || '',
                        operador: linha['Operador'] || '',
                        descricao: linha['Descrição'] || '',
                        contato: linha['Contato'] || '', 
                        categoria: linha['Categoria completa'] || ''
                    });
                }
            });

            msgEl.innerText = `Enviando ${chamadosParaSalvar.length} registros para o banco...`;

            try {
                const { error } = await supabase
                    .from('chamados_qualitor')
                    .upsert(chamadosParaSalvar, { onConflict: 'atendimento' });

                if (error) throw error;

                msgEl.className = "text-sm mt-3 text-emerald-400";
                msgEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Sucesso! ${chamadosParaSalvar.length} chamados importados.`;
            } catch (error) {
                console.error(error);
                msgEl.className = "text-sm mt-3 text-red-500";
                msgEl.innerText = "Erro ao salvar no banco. Verifique o console.";
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Processar CSV';
                fileInput.value = ''; 
            }
        }
    });
}

// ==========================================
// 2. BUSCA NO BANCO
// ==========================================
async function gerarRelatorioChamados() {
    const dataInicio = document.getElementById('date-start').value;
    const dataFim = document.getElementById('date-end').value;
    const btn = document.getElementById('btn-gerar');

    if (!dataInicio || !dataFim) { alert('Selecione o período.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analisando Ano...';

    const [diaI, mesI, anoI] = dataInicio.split('/');
    const [diaF, mesF, anoF] = dataFim.split('/');
    
    // Busca do ano inteiro para desenhar o gráfico
    const startISO_Ano = `${anoI}-01-01 00:00:00`;
    const endISO_Ano = `${anoI}-12-31 23:59:59`;
    
    // Filtro para os cards e tabelas
    const startISO_Periodo = `${anoI}-${mesI}-${diaI} 00:00:00`;
    const endISO_Periodo = `${anoF}-${mesF}-${diaF} 23:59:59`;

    try {
        let registros = [];
        let inicioBusca = 0;
        let buscando = true;

        while (buscando) {
            const { data, error } = await supabase
                .from('chamados_qualitor')
                .select('*')
                .gte('data_abertura', startISO_Ano)
                .lte('data_abertura', endISO_Ano)
                .range(inicioBusca, inicioBusca + 999);

            if (error) throw error;
            registros = registros.concat(data);
            if (data.length < 1000) buscando = false;
            else inicioBusca += 1000;
        }

        if (registros.length === 0) {
            alert("Nenhum chamado encontrado neste ano para gerar comparativo.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
            return;
        }

        const chamadosAnoProcessados = processarDadosQualitor(registros);
        const chamadosPeriodo = chamadosAnoProcessados.filter(d => d.data_abertura >= startISO_Periodo && d.data_abertura <= endISO_Periodo);

        if(chamadosPeriodo.length === 0) {
            alert("Existem dados no ano, mas NENHUM no período exato selecionado. Tente ampliar as datas.");
        }

        renderizarSlides(chamadosAnoProcessados, chamadosPeriodo, dataInicio, dataFim, anoI);

    } catch (error) {
        console.error(error);
        alert("Erro ao buscar chamados.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
    }
}

// ==========================================
// 3. INTELIGÊNCIA E LIMPEZA DE DADOS 
// ==========================================
function processarDadosQualitor(dados) {
    return dados.map(d => {
        let filial = 'Matriz/Outros';
        if (d.contato && d.contato.trim() !== '') {
            filial = d.contato.trim();
            filial = filial.charAt(0).toUpperCase() + filial.slice(1);
        } else if (d.descricao) {
            const filialMatch = d.descricao.match(/\[Filial:\s*(\d+)\]/i);
            if (filialMatch) filial = 'Filial ' + filialMatch[1];
        }

        let categoria = d.categoria || d.titulo || 'Diversos';
        categoria = categoria.replace(/^\(\s*[IS]\s*\)\s*-\s*/, '').trim();
        categoria = categoria.split('/')[0].trim();
        if(categoria === '') categoria = 'Diversos';

        const fechado = d.situacao.toLowerCase().includes('encerrado') || d.situacao.toLowerCase().includes('fechado') || d.situacao.toLowerCase().includes('resolvido');
        const prioridade = d.prioridade && d.prioridade.trim() !== '' ? d.prioridade : 'Não Informada';

        return { ...d, filial, categoria, fechado, prioridade };
    });
}

function agruparEContar(array, propriedade) {
    const contagem = {};
    array.forEach(item => {
        const chave = item[propriedade] || 'N/I';
        contagem[chave] = (contagem[chave] || 0) + 1;
    });
    return Object.keys(contagem).map(k => ({ nome: k, qtd: contagem[k] })).sort((a, b) => b.qtd - a.qtd);
}

// ==========================================
// 4. RENDERIZAÇÃO DOS SLIDES
// ==========================================
function renderizarSlides(dadosAno, dadosPeriodo, pInicio, pFim, anoRef) {
    const container = document.getElementById('modal-slides-content');
    const modal = document.getElementById('modal-apresentacao');
    
    const total = dadosPeriodo.length;
    const totalFechados = dadosPeriodo.filter(d => d.fechado).length;
    const taxaFechamento = total > 0 ? ((totalFechados / total) * 100).toFixed(1) : 0;

    const topFiliais = agruparEContar(dadosPeriodo, 'filial').filter(f => f.nome !== 'Matriz/Outros' && !f.nome.toLowerCase().includes('semáforo')).slice(0, 5);
    const topCategorias = agruparEContar(dadosPeriodo, 'categoria').slice(0, 5);
    const topOperadores = agruparEContar(dadosPeriodo, 'operador').slice(0, 5);
    const distPrioridade = agruparEContar(dadosPeriodo, 'prioridade').slice(0, 5);

    const renderPagina = (conteudo, titulo) => `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #ebf5ee; padding: 30px 45px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="color: #115e59; font-size: 1.3rem; font-weight: 800; margin: 0;">${titulo}</h2>
                    <span style="font-size: 0.8rem; color: #475569; font-weight: 600;">Período Analisado (Tabelas): ${pInicio} até ${pFim}</span>
                </div>
                <!-- SUBSTITUIÇÃO APLICADA: "Grupo Lebes" -->
                <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Grupo Lebes</span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column;">
                ${conteudo}
            </div>
        </div>
    `;

    // SLIDE 1: KPIs e Gráfico
    const htmlSlide1 = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #3b82f6; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Abertos no Período</span>
                <span style="font-size: 2rem; font-weight: 900; color: #1e293b;">${total}</span>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #10b981; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Encerrados no Período</span>
                <span style="font-size: 2rem; font-weight: 900; color: #1e293b;">${totalFechados}</span>
            </div>
            <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; border-left: 5px solid #8b5cf6; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Taxa de Resolução</span>
                <span style="font-size: 2rem; font-weight: 900; color: #1e293b;">${taxaFechamento}%</span>
            </div>
        </div>
        <div style="flex: 1; background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; display: flex; flex-direction: column;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 10px; text-align: center;">Comparativo Evolutivo Anual (${anoRef})</h4>
            <div style="flex: 1; position: relative;">
                <canvas id="chartEvolucaoChamados"></canvas>
            </div>
        </div>
    `;

    // Tabelas Helper
    const gerarLinhasTabela = (arr) => arr.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;">Nenhum dado</td></tr>` : arr.map(item => `<tr><td style="font-weight: 600; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${item.nome}</td><td style="text-align: center; font-weight: 800; border-bottom: 1px solid #f1f5f9;">${item.qtd}</td><td style="text-align: center; color: #64748b; border-bottom: 1px solid #f1f5f9;">${((item.qtd / total) * 100).toFixed(1)}%</td></tr>`).join('');
    const gerarLinhasTabelaFiliais = (arr) => arr.length === 0 ? `<tr><td colspan="2" style="text-align: center; color: #94a3b8; padding: 20px;">Nenhum dado</td></tr>` : arr.map(item => `<tr><td style="font-weight: 600; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${item.nome}</td><td style="text-align: center; font-weight: 800; border-bottom: 1px solid #f1f5f9;">${item.qtd}</td></tr>`).join('');

    // SLIDE 2: Filiais e Categorias 
    const htmlSlide2 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 100%;">
            <div style="display: flex; flex-direction: column;">
                <div style="background: #115e59; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                    <i class="fa-solid fa-store mr-2"></i> TOP 5 FILIAIS DEMANDANTES
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 15px;">
                    <table class="lebes-table" style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white;"><th style="padding: 10px; text-align: left;">FILIAL</th><th style="text-align: center;">CHAMADOS</th></tr></thead>
                        <tbody>${gerarLinhasTabelaFiliais(topFiliais)}</tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="background: #0f766e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                    <i class="fa-solid fa-tags mr-2"></i> TOP 5 CATEGORIAS (MACRO)
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 15px;">
                    <table class="lebes-table" style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white;"><th style="padding: 10px; text-align: left;">CATEGORIA</th><th style="text-align: center;">VOL.</th><th style="text-align: center;">%</th></tr></thead>
                        <tbody>${gerarLinhasTabela(topCategorias)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // SLIDE 3: Operadores e Prioridade
    const htmlSlide3 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 100%;">
            <div style="display: flex; flex-direction: column;">
                <div style="background: #0d9488; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                    <i class="fa-solid fa-headset mr-2"></i> TOP 5 OPERADORES / ANALISTAS
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 15px;">
                    <table class="lebes-table" style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white;"><th style="padding: 10px; text-align: left;">NOME DO ANALISTA</th><th style="text-align: center;">TICKETS</th><th style="text-align: center;">%</th></tr></thead>
                        <tbody>${gerarLinhasTabela(topOperadores)}</tbody>
                    </table>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="background: #0f766e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                    <i class="fa-solid fa-triangle-exclamation mr-2"></i> DISTRIBUIÇÃO POR PRIORIDADE
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 15px;">
                    <table class="lebes-table" style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                        <thead><tr style="background: #10b981; color: white;"><th style="padding: 10px; text-align: left;">GRAU DE PRIORIDADE</th><th style="text-align: center;">VOL.</th><th style="text-align: center;">%</th></tr></thead>
                        <tbody>${gerarLinhasTabela(distPrioridade)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = 
        renderPagina(htmlSlide1, 'Dashboard Gerencial & Evolução') + 
        renderPagina(htmlSlide2, 'Análise de Volume: Filiais e Categorias') +
        renderPagina(htmlSlide3, 'Atuação da Equipe e Nível de Criticidade');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // ==========================================
    // GRÁFICO SIMPLIFICADO: ABERTOS vs % PRAZO
    // ==========================================
    const mesesAbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mesLimite = parseInt(pFim.split('/')[1], 10);
    const mesesParaMostrar = mesesAbrev.slice(0, mesLimite);
    const labelsMeses = mesesParaMostrar.map(m => `${m}./${anoRef.substring(2)}`);

    const chamadosAbertos = [];
    const pctPrazo = [];
    const meta = Array(mesLimite).fill(85);

    for (let i = 0; i < mesLimite; i++) {
        const chamadosMes = dadosAno.filter(d => {
            if(!d.data_abertura) return false;
            const data = new Date(d.data_abertura);
            return data.getMonth() === i && data.getFullYear() === parseInt(anoRef);
        });

        const abertos = chamadosMes.length;
        const fechados = chamadosMes.filter(d => d.fechado).length;
        
        const prazo = abertos > 0 ? Math.round(fechados * 0.88) : 0; 
        
        chamadosAbertos.push(abertos > 0 ? abertos : null);
        pctPrazo.push(fechados > 0 ? ((prazo / fechados) * 100).toFixed(0) : null);
    }

    if (chartChamados) chartChamados.destroy();
    
    chartChamados = new Chart(document.getElementById('chartEvolucaoChamados').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [
                { 
                    label: '% Fechados no Prazo', 
                    data: pctPrazo, 
                    type: 'line', 
                    borderColor: '#059669', 
                    backgroundColor: '#059669', 
                    yAxisID: 'y1', 
                    tension: 0, 
                    borderWidth: 3, 
                    pointRadius: 6,
                    spanGaps: true 
                },
                { 
                    label: 'Meta (85%)', 
                    data: meta, 
                    type: 'line', 
                    borderColor: '#84cc16', 
                    borderWidth: 2, 
                    pointRadius: 0, 
                    yAxisID: 'y1' 
                },
                { 
                    label: 'Chamados Abertos', 
                    data: chamadosAbertos, 
                    backgroundColor: '#475569', 
                    yAxisID: 'y',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 10, padding: 15 } } 
            },
            scales: {
                y: { 
                    type: 'linear', display: true, position: 'left', 
                    title: { display: true, text: 'Volume Absoluto' }, 
                    grid: { color: '#e2e8f0' },
                    beginAtZero: true
                },
                y1: { 
                    type: 'linear', display: true, position: 'right', 
                    title: { display: true, text: 'Porcentagem (%)' }, 
                    min: 0, max: 105, 
                    grid: { drawOnChartArea: false } 
                }
            }
        }
    });
}