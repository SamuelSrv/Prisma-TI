import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    const authData = await verificarAutenticacao();
    if (!authData || !authData.session) return;
    carregarMenu('avaliacoes');

    // Calendários
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

    // Listener Global para Salvar Edições Automaticamente
    document.getElementById('conteudo-relatorio-aval').addEventListener('focusout', (e) => {
        if (e.target.classList.contains('input-audit')) salvarAnotacao(e.target);
    });
    document.getElementById('conteudo-relatorio-aval').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('input-audit')) {
            e.preventDefault();
            e.target.blur(); // Dispara o focusout
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
        // Leitura via PapaParse (WhatsApp)
        Papa.parse(file, {
            header: true, skipEmptyLines: true, encoding: "ISO-8859-1",
            complete: function (results) {
                enviarDadosParaBanco(results.data, msgEl, btn, fileInput);
            }
        });
    } else if (extensao === 'xlsx' || extensao === 'xls') {
        // Leitura via SheetJS (Telefonia)
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // raw: false força o SheetJS a extrair a data formatada como texto "17/08/2026 09:24:44"
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
            enviarDadosParaBanco(json, msgEl, btn, fileInput);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Formato inválido. Por favor, use um arquivo .csv ou .xlsx");
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
        const agente = getVal(['Agente', 'Interlocutor']);
        let nota = getVal(['Resposta 1', 'Resposta1']);
        const dadosAssoc = getVal(['Dados Associados']);

        if (nota && nota.includes('NÃ£o')) nota = 'Não respondeu';

        const formatarDataISO = (dStr) => {
            if (!dStr) return null;
            const partes = dStr.split(' ');
            const data = partes[0]; // 17/08/2026
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
// 3. AUTO-SAVE DAS ANOTAÇÕES
// ==========================================
async function salvarAnotacao(inputEl) {
    const idRegistro = inputEl.dataset.id;
    const campo = inputEl.dataset.campo;
    const valor = inputEl.value;

    const iconeSalvo = inputEl.nextElementSibling;
    iconeSalvo.style.opacity = '0.5';
    iconeSalvo.className = "fa-solid fa-spinner fa-spin absolute right-2 top-3 text-slate-400 transition-opacity";

    const { error } = await supabase.from('avaliacoes').update({ [campo]: valor }).eq('id', idRegistro);

    if (!error) {
        iconeSalvo.className = "fa-solid fa-check absolute right-2 top-3 text-emerald-500 transition-opacity";
        setTimeout(() => { iconeSalvo.style.opacity = '0'; }, 2000);
    } else {
        iconeSalvo.className = "fa-solid fa-xmark absolute right-2 top-3 text-red-500";
    }
}

// ==========================================
// 4. LAYOUT DO DASHBOARD & TABELA
// ==========================================
function renderizarDashboard(dados, tipo, dataInicio, dataFim) {
    const formatarBr = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Indicadores Matemáticos
    let totalValidas = 0;
    let boas = 0; // 5 e 4
    let medias = 0; // 3
    let ruins = 0; // 2 e 1

    dados.forEach(d => {
        const n = parseInt(d.nota, 10);
        if (!isNaN(n)) {
            totalValidas++;
            if (n >= 4) boas++;
            else if (n === 3) medias++;
            else ruins++;
        }
    });

    const pctSatisfacao = totalValidas > 0 ? Math.round((boas / totalValidas) * 100) : 0;

    let html = `
        <div class="mb-8 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg flex justify-between items-center">
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

        <div class="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left text-slate-300">
                    <thead class="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-700">
                        <tr>
                            <th class="px-4 py-4">Data Inicial</th>
                            <th class="px-4 py-4">Agente</th>
                            ${tipo === 'Ligação' ? '<th class="px-4 py-4">Filial</th>' : ''}
                            <th class="px-4 py-4 text-center">Nota</th>
                            <th class="px-4 py-4 w-1/4">Descrição do Atendimento</th>
                            <th class="px-4 py-4 w-1/4">Ação do Analista</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    dados.forEach(d => {
        const corNota = ['1', '2'].includes(d.nota) ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            d.nota === '3' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                ['4', '5'].includes(d.nota) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300';

        html += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition">
                <td class="px-4 py-3 whitespace-nowrap">${formatarBr(d.data_inicial)}</td>
                <td class="px-4 py-3 font-semibold text-white uppercase">${d.agente}</td>
                ${tipo === 'Ligação' ? `<td class="px-4 py-3 font-mono text-emerald-400">${d.filial || '-'}</td>` : ''}
                <td class="px-4 py-3 text-center">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${corNota}">${d.nota}</span>
                </td>
                <td class="px-4 py-2 relative">
                    <textarea data-id="${d.id}" data-campo="descricao_atendimento" rows="2" class="input-audit w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition" placeholder="Anotações do atendimento...">${d.descricao_atendimento || ''}</textarea>
                    <i class="opacity-0"></i>
                </td>
                <td class="px-4 py-2 relative">
                    <textarea data-id="${d.id}" data-campo="acao_analista" rows="2" class="input-audit w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition" placeholder="Feedback/Ação...">${d.acao_analista || ''}</textarea>
                    <i class="opacity-0"></i>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    document.getElementById('conteudo-relatorio-aval').innerHTML = html;
}