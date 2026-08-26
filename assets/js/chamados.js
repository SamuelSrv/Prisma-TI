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
        
        // Ajuste de z-index para garantir que o modal fique ACIMA do menu lateral
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
                        descricao: linha['Descrição'] || ''
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    const [diaI, mesI, anoI] = dataInicio.split('/');
    const [diaF, mesF, anoF] = dataFim.split('/');
    const startISO = `${anoI}-${mesI}-${diaI} 00:00:00`;
    const endISO = `${anoF}-${mesF}-${diaF} 23:59:59`;

    try {
        let registros = [];
        let inicioBusca = 0;
        let buscando = true;

        while (buscando) {
            const { data, error } = await supabase
                .from('chamados_qualitor')
                .select('*')
                .gte('data_abertura', startISO)
                .lte('data_abertura', endISO)
                .range(inicioBusca, inicioBusca + 999);

            if (error) throw error;
            registros = registros.concat(data);
            if (data.length < 1000) buscando = false;
            else inicioBusca += 1000;
        }

        if (registros.length === 0) {
            alert("Nenhum chamado encontrado neste período.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
            return;
        }

        // Processa os dados antes de enviar para o slide
        const chamadosProcessados = processarDadosQualitor(registros);
        renderizarSlides(chamadosProcessados, dataInicio, dataFim);

    } catch (error) {
        console.error(error);
        alert("Erro ao buscar chamados.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
    }
}

// ==========================================
// 3. INTELIGÊNCIA: EXTRAINDO DADOS OCULTOS
// ==========================================
function processarDadosQualitor(dados) {
    return dados.map(d => {
        // 1. Tenta extrair a Filial da descrição (Ex: [Filial: 160])
        const filialMatch = d.descricao ? d.descricao.match(/\[Filial:\s*(\d+)\]/i) : null;
        const filial = filialMatch ? filialMatch[1] : 'Matriz/Outros';

        // 2. Extrai a Categoria do título (Ex: "App Resolve / Descontos" -> "App Resolve")
        const tituloParts = d.titulo ? d.titulo.split(/[\/\-]/) : ['Diversos'];
        let categoria = tituloParts[0].replace('( I )', '').trim();
        if(categoria === '') categoria = 'Diversos';

        // 3. Verifica Status Simplificado
        const fechado = d.situacao.toLowerCase().includes('encerrado') || d.situacao.toLowerCase().includes('fechado') || d.situacao.toLowerCase().includes('resolvido');

        return { ...d, filial, categoria, fechado };
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
function renderizarSlides(dados, pInicio, pFim) {
    const container = document.getElementById('modal-slides-content');
    const modal = document.getElementById('modal-apresentacao');
    
    // Totalizadores
    const total = dados.length;
    const totalFechados = dados.filter(d => d.fechado).length;
    const taxaFechamento = total > 0 ? ((totalFechados / total) * 100).toFixed(1) : 0;

    // Rankings
    const topFiliais = agruparEContar(dados, 'filial').filter(f => f.nome !== 'Matriz/Outros').slice(0, 5);
    const topCategorias = agruparEContar(dados, 'categoria').slice(0, 3);
    const topOperadores = agruparEContar(dados, 'operador').slice(0, 3);

    // Template Base de Página
    const renderPagina = (conteudo, titulo) => `
        <div style="width: 1180px; min-width: 1180px; height: 664px; min-height: 664px; background-color: #ebf5ee; padding: 30px 45px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; display: flex; flex-direction: column; position: relative; margin-bottom: 30px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="color: #115e59; font-size: 1.3rem; font-weight: 800; margin: 0;">${titulo}</h2>
                    <span style="font-size: 0.8rem; color: #475569; font-weight: 600;">Período Analisado: ${pInicio} até ${pFim}</span>
                </div>
                <span style="font-size: 1.1rem; font-weight: 800; color: #115e59;">Prisma TI - Qualitor</span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column;">
                ${conteudo}
            </div>
        </div>
    `;

    // ----------------------------------------------------
    // SLIDE 1: PANORAMA E GRÁFICO (Corrigido)
    // ----------------------------------------------------
    const htmlSlide1 = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; border-left: 5px solid #3b82f6; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Total de Chamados Abertos</span>
                <span style="font-size: 2.2rem; font-weight: 900; color: #1e293b;">${total}</span>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; border-left: 5px solid #10b981; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Chamados Encerrados</span>
                <span style="font-size: 2.2rem; font-weight: 900; color: #1e293b;">${totalFechados}</span>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; border-left: 5px solid #8b5cf6; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Taxa de Resolução</span>
                <span style="font-size: 2.2rem; font-weight: 900; color: #1e293b;">${taxaFechamento}%</span>
            </div>
        </div>
        <div style="flex: 1; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative;">
            <canvas id="chartEvolucaoChamados"></canvas>
        </div>
    `;

    // ----------------------------------------------------
    // SLIDE 2: RANKINGS E DETALHAMENTO (O que você pediu!)
    // ----------------------------------------------------
    const gerarLinhasTabela = (arr) => arr.map(item => `<tr><td style="font-weight: 600;">${item.nome}</td><td style="text-align: center; font-weight: 800;">${item.qtd}</td><td style="text-align: center; color: #64748b;">${((item.qtd / total) * 100).toFixed(1)}%</td></tr>`).join('');

    const htmlSlide2 = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 100%;">
            
            <!-- Coluna Esquerda: Top Filiais -->
            <div style="display: flex; flex-direction: column;">
                <div style="background: #115e59; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                    <i class="fa-solid fa-store mr-2"></i> TOP 5 FILIAIS DEMANDANTES
                </div>
                <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; flex: 1; padding: 15px;">
                    <table class="lebes-table" style="width: 100%; font-size: 0.85rem;">
                        <thead><tr style="background: #f1f5f9;"><th style="padding: 10px;">Filial</th><th style="text-align: center;">Chamados</th><th style="text-align: center;">Impacto</th></tr></thead>
                        <tbody>${gerarLinhasTabela(topFiliais)}</tbody>
                    </table>
                </div>
            </div>

            <!-- Coluna Direita: Categorias e Operadores -->
            <div style="display: flex; flex-direction: column; gap: 30px;">
                
                <div>
                    <div style="background: #0f766e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                        <i class="fa-solid fa-tags mr-2"></i> TOP 3 CATEGORIAS (MOTIVOS)
                    </div>
                    <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; padding: 15px;">
                        <table class="lebes-table" style="width: 100%; font-size: 0.85rem;">
                            <thead><tr style="background: #f1f5f9;"><th style="padding: 10px;">Categoria Identificada</th><th style="text-align: center;">Vol.</th><th style="text-align: center;">%</th></tr></thead>
                            <tbody>${gerarLinhasTabela(topCategorias)}</tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div style="background: #0d9488; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.9rem;">
                        <i class="fa-solid fa-headset mr-2"></i> TOP 3 OPERADORES (ATENDIMENTOS)
                    </div>
                    <div style="background: white; border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 8px 8px; padding: 15px;">
                        <table class="lebes-table" style="width: 100%; font-size: 0.85rem;">
                            <thead><tr style="background: #f1f5f9;"><th style="padding: 10px;">Nome do Analista</th><th style="text-align: center;">Tickets</th><th style="text-align: center;">%</th></tr></thead>
                            <tbody>${gerarLinhasTabela(topOperadores)}</tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    `;

    container.innerHTML = renderPagina(htmlSlide1, 'Visão Geral & Volumetria') + renderPagina(htmlSlide2, 'Análise de Origem e Esforço (Top Ofensores)');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // ==========================================
    // GRÁFICO CORRIGIDO E CALIBRADO
    // ==========================================
    const labelsMeses = [...new Set(dados.map(d => {
        return new Date(d.data_abertura).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/');
    }))].sort();

    const chamadosAbertos = [];
    const chamadosFechados = [];
    const pctFechados = [];

    labelsMeses.forEach(mesLabel => {
        const chamadosDoMes = dados.filter(d => new Date(d.data_abertura).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/') === mesLabel);
        const abertos = chamadosDoMes.length;
        const fechados = chamadosDoMes.filter(d => d.fechado).length;

        chamadosAbertos.push(abertos);
        chamadosFechados.push(fechados);
        pctFechados.push(((fechados / (abertos || 1)) * 100).toFixed(0));
    });

    if (chartChamados) chartChamados.destroy();
    
    chartChamados = new Chart(document.getElementById('chartEvolucaoChamados').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [
                {
                    label: '% Encerrados',
                    data: pctFechados,
                    type: 'line',
                    borderColor: '#10b981', 
                    backgroundColor: '#10b981',
                    yAxisID: 'y1',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 6
                },
                {
                    label: 'Chamados Abertos (Total)',
                    data: chamadosAbertos,
                    backgroundColor: '#475569',
                    yAxisID: 'y',
                    borderRadius: 4
                },
                {
                    label: 'Chamados Encerrados',
                    data: chamadosFechados,
                    backgroundColor: '#3b82f6',
                    yAxisID: 'y',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Volume de Chamados' },
                    grid: { color: '#e2e8f0' },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: 'Taxa de Encerramento (%)' },
                    min: 0, max: 110,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}