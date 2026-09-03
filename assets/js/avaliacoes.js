import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    const authData = await verificarAutenticacao();
    if (!authData || !authData.session) return;
    carregarMenu('avaliacoes');

    const opts = { autohide: true, format: 'dd/mm/yyyy', language: 'pt-BR' };
    if (window.Datepicker) {
        new window.Datepicker(document.getElementById('date-start-aval'), opts);
        new window.Datepicker(document.getElementById('date-end-aval'), opts);
    }

    document.getElementById('btn-importar-aval').addEventListener('click', processarCSVAvaliacoes);
    document.getElementById('btn-gerar-aval').addEventListener('click', gerarRelatorioAvaliacoes);
    document.getElementById('btn-fechar-modal-aval').addEventListener('click', () => {
        document.getElementById('modal-relatorio-aval').classList.add('hidden');
    });

    // Listener para Salvar Textos e Inputs (Focusout e Enter)
    document.getElementById('conteudo-relatorio-aval').addEventListener('focusout', (e) => {
        if (e.target.classList.contains('input-audit')) salvarAnotacao(e.target);
    });
    document.getElementById('conteudo-relatorio-aval').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('input-audit') && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            e.target.blur(); 
        }
    });

    // Listener para Salvar o Select da Nota imediatamente ao trocar
    document.getElementById('conteudo-relatorio-aval').addEventListener('change', (e) => {
        if (e.target.classList.contains('input-audit') && e.target.tagName === 'SELECT') {
            salvarAnotacao(e.target);
        }
    });
});

// ==========================================
// 1. IMPORTAÇÃO HÍBRIDA (CSV e XLSX)
// ==========================================
function processarCSVAvaliacoes() {
    const fileInput = document.getElementById('arquivo-csv-aval');
    const msgEl = document.getElementById('msg-importacao-aval');
    const btn = document.getElementById('btn-importar-aval');

    if (!fileInput.files.length) { alert("Selecione um arquivo."); return; }

    const file = fileInput.files[0];
    const extensao = file.name.split('.').pop().toLowerCase();

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lendo arquivo...';
    msgEl.classList.remove('hidden');
    msgEl.innerText = "Lendo arquivo...";

    if (extensao === 'csv') {
        Papa.parse(file, {
            header: true, skipEmptyLines: true, encoding: "ISO-8859-1",
            complete: function (results) {
                enviarDadosParaBanco(results.data, msgEl, btn, fileInput);
            }
        });
    } else if (extensao === 'xlsx' || extensao === 'xls') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const json = XLSX.utils.sheet_to_json(worksheet, {raw: false, defval: ""});
            enviarDadosParaBanco(json, msgEl, btn, fileInput);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Formato inválido. Use .csv ou .xlsx");
        btn.disabled = false;
        btn.innerHTML = 'Processar Arquivo';
    }
}

// ==========================================
// TRATAMENTO E ENVIO PARA O SUPABASE
// ==========================================
async function enviarDadosParaBanco(dadosBrutos, msgEl, btn, fileInput) {
    msgEl.innerText = "Tratando e enviando dados ao banco...";
    const registrosLimpados = [];

    dadosBrutos.forEach(row => {
        const getVal = (keys) => {
            const key = Object.keys(row).find(k => keys.some(pk => k.includes(pk)));
            return key ? String(row[key]).trim() : null;
        };

        const dataInic = getVal(['Data Inicial da Chamada']);
        const dataAtend = getVal(['Data de Atendimento']);
        
        // Separação correta de Agente e Interlocutor (quem ligou)
        const agente = getVal(['Agente']); 
        const interlocutor = getVal(['Interlocutor', 'Origem']); 

        let nota = getVal(['Resposta 1', 'Resposta1']);
        const dadosAssoc = getVal(['Dados Associados']);

        if (nota && nota.includes('NÃ£o')) nota = 'Não respondeu';

        const formatarDataISO = (dStr) => {
            if (!dStr) return null;
            const partes = dStr.split(' ');
            const data = partes[0]; 
            const hora = partes[1] || '00:00:00'; 
            const dataPartes = data.split('/');
            if (dataPartes.length !== 3) return null;
            return `${dataPartes[2]}-${dataPartes[1]}-${dataPartes[0]}T${hora}`;
        };

        const extrairFilial = (str) => {
            if (!str) return null;
            const m = str.match(/Filial\s*=\s*(\d+)/i);
            return m ? parseInt(m[1], 10) : null;
        };

        if (dataInic && agente) {
            const tipo = dadosAssoc ? 'Ligação' : 'WhatsApp';
            const dataIso = formatarDataISO(dataInic);
            
            if (dataIso) {
                const hashId = `${tipo}_${agente}_${dataIso.replace(/[\-T:]/g, '')}`;

                registrosLimpados.push({
                    id: hashId,
                    tipo_atendimento: tipo,
                    data_inicial: dataIso,
                    data_atendimento: formatarDataISO(dataAtend) || dataIso,
                    agente: agente,
                    interlocutor: interlocutor, // Coluna nova salva aqui
                    nota: nota,
                    filial: extrairFilial(dadosAssoc)
                });
            }
        }
    });

    try {
        const batchSize = 300;
        for (let i = 0; i < registrosLimpados.length; i += batchSize) {
            const lote = registrosLimpados.slice(i, i + batchSize);
            const { error } = await supabase.from('avaliacoes').upsert(lote, { onConflict: 'id' });
            if (error) throw error;
        }
        msgEl.className = "text-sm mt-3 text-emerald-400";
        msgEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Sucesso! ${registrosLimpados.length} avaliações sincronizadas.`;
    } catch (error) {
        console.error(error);
        msgEl.className = "text-sm mt-3 text-red-500";
        msgEl.innerText = `Erro ao salvar: ${error.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Processar Arquivo';
        fileInput.value = '';
    }
}

// ==========================================
// 2. BUSCA E RENDERIZAÇÃO DO RELATÓRIO
// ==========================================
async function gerarRelatorioAvaliacoes() {
    const tipo = document.getElementById('select-tipo-aval').value;
    const dataInicio = document.getElementById('date-start-aval').value;
    const dataFim = document.getElementById('date-end-aval').value;
    const btn = document.getElementById('btn-gerar-aval');

    if (!dataInicio || !dataFim) { alert('Selecione o período.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    const [dI, mI, aI] = dataInicio.split('/');
    const [dF, mF, aF] = dataFim.split('/');
    const isoInicio = `${aI}-${mI}-${dI}T00:00:00`;
    const isoFim = `${aF}-${mF}-${dF}T23:59:59`;

    try {
        const { data, error } = await supabase
            .from('avaliacoes')
            .select('*')
            .eq('tipo_atendimento', tipo)
            .gte('data_inicial', isoInicio)
            .lte('data_inicial', isoFim)
            .order('data_inicial', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) { alert("Nenhum dado encontrado."); return; }

        renderizarDashboard(data, tipo, dataInicio, dataFim);
        document.getElementById('modal-relatorio-aval').classList.remove('hidden');
        document.getElementById('modal-relatorio-aval').classList.add('flex');

    } catch (err) {
        console.error(err);
        alert('Erro ao buscar relatórios.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Gerar Relatório';
    }
}

// ==========================================
// 3. AUTO-SAVE DAS ANOTAÇÕES E NOTA
// ==========================================
async function salvarAnotacao(inputEl) {
    const idRegistro = inputEl.dataset.id;
    const campo = inputEl.dataset.campo;
    const valor = inputEl.value; // Aceita strings vazias normalmente

    const iconeSalvo = inputEl.parentElement.querySelector('i');
    if (iconeSalvo) {
        iconeSalvo.style.opacity = '0.5';
        iconeSalvo.className = "fa-solid fa-spinner fa-spin absolute right-2 top-3 text-slate-400 transition-opacity";
    }

    const { error } = await supabase.from('avaliacoes').update({ [campo]: valor }).eq('id', idRegistro);

    if (iconeSalvo) {
        if (!error) {
            iconeSalvo.className = "fa-solid fa-check absolute right-2 top-3 text-emerald-500 transition-opacity";
            setTimeout(() => { iconeSalvo.style.opacity = '0'; }, 2000);
            
            // Muda a cor do select se for uma troca de Nota
            if (campo === 'nota') {
                const corAtualizada = ['1','2'].includes(valor) ? 'text-red-400 bg-red-500/10 border-red-500/30' : 
                                    valor === '3' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 
                                    ['4','5'].includes(valor) ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-300 bg-slate-800 border-slate-700';
                inputEl.className = `input-audit w-full rounded p-1 text-center font-bold text-sm outline-none focus:border-emerald-500 border transition ${corAtualizada}`;
            }

        } else {
            iconeSalvo.className = "fa-solid fa-xmark absolute right-2 top-3 text-red-500";
        }
    }
}

// ==========================================
// 4. LAYOUT DO DASHBOARD & TABELA
// ==========================================
function renderizarDashboard(dados, tipo, dataInicio, dataFim) {
    const formatarBr = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    };

    let totalValidas = 0;
    let boas = 0; 
    let medias = 0; 
    let ruins = 0; 

    // Agrupamento por Agente
    const analistas = {};

    dados.forEach(d => {
        const ag = (d.agente || 'Desconhecido').toUpperCase();
        if (!analistas[ag]) analistas[ag] = { total: 0, soma: 0, qtdValidas: 0 };
        analistas[ag].total++;

        const n = parseInt(d.nota, 10);
        if (!isNaN(n)) {
            totalValidas++;
            analistas[ag].soma += n;
            analistas[ag].qtdValidas++;

            if (n >= 4) boas++;
            else if (n === 3) medias++;
            else ruins++;
        }
    });

    const pctSatisfacao = totalValidas > 0 ? Math.round((boas / totalValidas) * 100) : 0;

    // Constrói os Cards de Analistas
    const analistasHtml = Object.keys(analistas).sort().map(ag => {
        const stats = analistas[ag];
        const mediaFinal = stats.qtdValidas > 0 ? (stats.soma / stats.qtdValidas).toFixed(2) : '-';
        return `
            <div class="bg-slate-800 border border-slate-700 p-3 rounded-lg flex flex-col min-w-[140px] shadow-sm">
                <span class="text-xs font-bold text-slate-400 truncate w-full mb-2" title="${ag}">${ag}</span>
                <div class="flex justify-between items-end mt-auto">
                    <div class="flex flex-col">
                        <span class="text-[10px] uppercase text-slate-500">Média</span>
                        <span class="text-lg font-black text-emerald-400">${mediaFinal}</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="text-[10px] uppercase text-slate-500">Avaliações</span>
                        <span class="text-sm font-bold text-white">${stats.qtdValidas}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    let html = `
        <div class="mb-6 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-white uppercase tracking-wide">Auditoria: ${tipo}</h2>
                <p class="text-slate-400 text-sm mt-1">Período auditado: ${dataInicio} a ${dataFim}</p>
            </div>
            <div class="flex gap-4">
                <div class="bg-slate-800 border border-slate-700 px-6 py-3 rounded-lg text-center">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Satisfação</p>
                    <p class="text-3xl font-black text-emerald-400">${pctSatisfacao}%</p>
                </div>
                <div class="bg-slate-800 border border-emerald-900 px-4 py-3 rounded-lg text-center border-l-4 border-l-emerald-500">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Notas Boas (4-5)</p>
                    <p class="text-xl font-bold text-white">${boas}</p>
                </div>
                <div class="bg-slate-800 border border-yellow-900 px-4 py-3 rounded-lg text-center border-l-4 border-l-yellow-400">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Médias (3)</p>
                    <p class="text-xl font-bold text-white">${medias}</p>
                </div>
                <div class="bg-slate-800 border border-red-900 px-4 py-3 rounded-lg text-center border-l-4 border-l-red-500">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Ruins (1-2)</p>
                    <p class="text-xl font-bold text-white">${ruins}</p>
                </div>
            </div>
        </div>

        <!-- QUADRO DE ANALISTAS -->
        <div class="mb-8 bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><i class="fa-solid fa-users mr-2"></i>Desempenho por Analista</h3>
            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
                ${analistasHtml}
            </div>
        </div>

        <div class="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left text-slate-300">
                    <thead class="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950 border-b border-slate-700">
                        <tr>
                            <th class="px-3 py-3 w-[140px]">Data Inicial</th>
                            <th class="px-3 py-3">Agente</th>
                            <th class="px-3 py-3 w-[130px]">Interlocutor</th>
                            ${tipo === 'Ligação' ? '<th class="px-3 py-3 w-[80px]">Filial</th>' : ''}
                            <th class="px-3 py-3 text-center w-[120px]">Nota</th>
                            <th class="px-3 py-3 w-[30%]">Descrição do Atendimento</th>
                            <th class="px-3 py-3 w-[30%]">Ação do Analista</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    const selectOptions = ['1','2','3','4','5','Não respondeu'];

    dados.forEach(d => {
        const corNota = ['1','2'].includes(d.nota) ? 'text-red-400 bg-red-500/10 border-red-500/30' : 
                        d.nota === '3' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 
                        ['4','5'].includes(d.nota) ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-300 bg-slate-800 border-slate-700';

        const optHtml = selectOptions.map(opt => `<option value="${opt}" ${d.nota === opt ? 'selected' : ''}>${opt}</option>`).join('');

        html += `
            <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                <td class="px-3 py-2 text-xs">${formatarBr(d.data_inicial)}</td>
                <td class="px-3 py-2 font-semibold text-white uppercase text-xs">${d.agente}</td>
                <td class="px-3 py-2 font-mono text-slate-400 text-xs">${d.interlocutor || '-'}</td>
                ${tipo === 'Ligação' ? `<td class="px-3 py-2 font-mono text-emerald-400 font-bold">${d.filial || '-'}</td>` : ''}
                <td class="px-3 py-2 text-center relative">
                    <select data-id="${d.id}" data-campo="nota" class="input-audit w-full rounded p-1 text-center font-bold text-sm outline-none focus:border-emerald-500 border transition cursor-pointer ${corNota}">
                        ${optHtml}
                    </select>
                    <i class="opacity-0"></i>
                </td>
                <td class="px-3 py-2 relative">
                    <textarea data-id="${d.id}" data-campo="descricao_atendimento" rows="2" class="input-audit w-full bg-slate-950/50 border border-slate-700/50 rounded p-2 text-xs text-slate-300 focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition" placeholder="Anotações do atendimento...">${d.descricao_atendimento || ''}</textarea>
                    <i class="opacity-0"></i>
                </td>
                <td class="px-3 py-2 relative">
                    <textarea data-id="${d.id}" data-campo="acao_analista" rows="2" class="input-audit w-full bg-slate-950/50 border border-slate-700/50 rounded p-2 text-xs text-slate-300 focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition" placeholder="Feedback/Ação...">${d.acao_analista || ''}</textarea>
                    <i class="opacity-0"></i>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    document.getElementById('conteudo-relatorio-aval').innerHTML = html;
}