import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';
import { renderizarFieldService } from './field-service.js';

let chartField = null;

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
        document.getElementById('btn-gerar').addEventListener('click', gerarRelatorioPorEquipe);
        
        const modal = document.getElementById('modal-apresentacao');
        if (modal) modal.style.zIndex = '9999';
        
        document.getElementById('btn-fechar-modal').addEventListener('click', () => modal.classList.add('hidden'));

        // Exportação PDF
        const btnExportarPdf = document.getElementById('btn-exportar-pdf');
        if (btnExportarPdf) {
            btnExportarPdf.addEventListener('click', () => {
                const elementoModal = document.getElementById('modal-slides-content');
                if (!elementoModal) return;
                btnExportarPdf.innerText = 'Gerando PDF...';
                btnExportarPdf.disabled = true;

                const options = {
                    margin: 5, filename: 'relatorio_field_service_lebes.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };

                html2pdf().from(elementoModal).set(options).save().then(() => {
                    btnExportarPdf.innerText = 'Exportar PDF';
                    btnExportarPdf.disabled = false;
                });
            });
        }

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
                const getVal = (keys) => {
                    for (let k of keys) {
                        if (linha[k] !== undefined && linha[k] !== null) return String(linha[k]).trim();
                    }
                    return '';
                };

                const atendimentoStr = getVal(['Atendimento', 'atendimento']);
                if (atendimentoStr && !isNaN(parseInt(atendimentoStr, 10))) {
                    chamadosParaSalvar.push({
                        atendimento: parseInt(atendimentoStr, 10),
                        abertura: getVal(['Abertura', 'abertura']),
                        situacao: getVal(['Situação', 'Situacao', 'situação']),
                        atraso_no_servico: getVal(['Atraso no serviço', 'atraso no serviço']),
                        encerramento: getVal(['Encerramento', 'encerramento']),
                        contato: getVal(['Contato', 'contato']) || 'Não Informado',
                        categoria_1: getVal(['Categoria 1', 'categoria 1', 'Título do chamado', 'categoria completa']),
                        operador: getVal(['Operador', 'operador']),
                        descricao: getVal(['Descrição', 'descrição', 'Descricao'])
                    });
                }
            });

            msgEl.innerText = `Enviando ${chamadosParaSalvar.length} registros para o banco...`;

            try {
                const batchSize = 200;
                for (let i = 0; i < chamadosParaSalvar.length; i += batchSize) {
                    const lote = chamadosParaSalvar.slice(i, i + batchSize);
                    const { error } = await supabase
                        .from('chamados_qualitor')
                        .upsert(lote, { onConflict: 'atendimento' });

                    if (error) throw error;
                }

                msgEl.className = "text-sm mt-3 text-emerald-400";
                msgEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Sucesso! ${chamadosParaSalvar.length} registros salvos no banco.`;
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
// 2. ORQUESTRADOR DE RELATÓRIOS
// ==========================================
async function gerarRelatorioPorEquipe() {
    const equipeSelecionada = document.getElementById('select-equipe').value;
    const dataInicio = document.getElementById('date-start').value;
    const dataFim = document.getElementById('date-end').value;
    const btn = document.getElementById('btn-gerar');

    if (!dataInicio || !dataFim) { alert('Selecione o período.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Relatório...';

    const [diaI, mesI, anoI] = dataInicio.split('/');
    const [diaF, mesF, anoF] = dataFim.split('/');

    try {
        let registros = [];
        let inicioBusca = 0;
        let buscando = true;

        while (buscando) {
            const { data, error } = await supabase
                .from('chamados_qualitor')
                .select('*')
                .range(inicioBusca, inicioBusca + 999);

            if (error) throw error;
            if (!data || data.length === 0) break;
            registros = registros.concat(data);
            if (data.length < 1000) buscando = false;
            else inicioBusca += 1000;
        }

        if (registros.length === 0) {
            alert("Nenhum chamado encontrado no banco.");
            return;
        }

        const parseDataBr = (str) => {
            if (!str) return null;
            const partes = str.split(' - ');
            if (partes.length < 1) return null;
            const [d, m, a] = partes[0].split('/');
            if (!d || !m || !a) return null;
            const hora = partes[1] || '00:00';
            return new Date(`${a}-${m}-${d}T${hora}:00`);
        };

        const dtIni = new Date(`${anoI}-${mesI}-${diaI}T00:00:00`);
        dtIni.setHours(0,0,0,0);
        const dtFim = new Date(`${anoF}-${mesF}-${diaF}T23:59:59`);

        const chamadosProcessados = processarDadosQualitor(registros);
        
        // Período Atual
        const chamadosPeriodo = chamadosProcessados.filter(d => {
            const dataObj = parseDataBr(d.abertura);
            if (!dataObj) return false;
            return dataObj >= dtIni && dataObj <= dtFim;
        });

        // Cálculo do Período Anterior (para comparativo)
        const diffTime = Math.abs(dtFim - dtIni);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const antIni = new Date(dtIni);
        antIni.setDate(antIni.getDate() - diffDays);
        const antFim = new Date(dtFim);
        antFim.setDate(antFim.getDate() - diffDays);

        const chamadosAnterior = chamadosProcessados.filter(d => {
            const dataObj = parseDataBr(d.abertura);
            if (!dataObj) return false;
            return dataObj >= antIni && dataObj <= antFim;
        });

        // Regra da Capa Inteligente
        let tipoPeriodo = 'personalizado';
        let subtituloCapa = `${dataInicio} até ${dataFim}`;

        // Verifica se é Mensal (dia 1 até o último dia do mês)
        const ultimoDiaMes = new Date(parseInt(anoI), parseInt(mesI), 0).getDate();
        if (parseInt(diaI) === 1 && parseInt(diaF) === ultimoDiaMes && mesI === mesF) {
            tipoPeriodo = 'mensal';
            const mesesExtenso = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            subtituloCapa = `FECHAMENTO MENSAL ${mesesExtenso[parseInt(mesI)-1].toUpperCase()} ${anoI}`;
        } 
        // Verifica se é Semanal (Segunda a Domingo)
        else if (dtIni.getDay() === 1 && dtFim.getDay() === 0 && diffDays === 7) {
            tipoPeriodo = 'semanal';
            const mesesExtenso = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            subtituloCapa = `FECHAMENTO SEMANAL ${mesesExtenso[parseInt(mesI)-1].toUpperCase()} ${anoI}`;
        }

        const container = document.getElementById('modal-slides-content');
        const modal = document.getElementById('modal-apresentacao');

        if (equipeSelecionada === 'field') {
            container.innerHTML = renderizarFieldService(chamadosPeriodo, chamadosAnterior, dataInicio, dataFim, tipoPeriodo, subtituloCapa);
        } else {
            alert("Relatório desta equipe em desenvolvimento.");
            return;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Renderizar gráfico diário no Slide 1
        renderizarGraficoField(chamadosPeriodo, dtIni, dtFim);

    } catch (error) {
        console.error(error);
        alert("Erro ao gerar relatório.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar Apresentação';
    }
}

// ==========================================
// 3. PROCESSAMENTO DE DADOS
// ==========================================
function processarDadosQualitor(dados) {
    return dados.map(d => {
        let contato = 'Não Informado';
        if (d.contato && d.contato.trim() !== '') {
            contato = d.contato.trim();
            contato = contato.charAt(0).toUpperCase() + contato.slice(1);
        }

        let categoria = (d.categoria_1 && d.categoria_1.trim() !== '') ? d.categoria_1.trim() : 'Diversos';
        const fechado = (d.situacao || '').toLowerCase().includes('encerrado') || (d.situacao || '').toLowerCase().includes('aguardando confirmação');

        return { ...d, contato, categoria, fechado };
    });
}

// ==========================================
// 4. GRÁFICO DIÁRIO DO FIELD SERVICE
// ==========================================
function renderizarGraficoField(dadosPeriodo, dtIni, dtFim) {
    const canvasEl = document.getElementById('chartEvolucaoField');
    if (!canvasEl) return;

    // Gera os dias do período selecionado
    const labelsDias = [];
    const abertosDia = [];
    const fechadosDia = [];
    const prazoDia = [];
    const pctFechadosDia = [];
    const pctPrazoDia = [];
    const metaDia = [];

    let curr = new Date(dtIni);
    while (curr <= dtFim) {
        const diaStr = String(curr.getDate()).padStart(2, '0') + '/' + String(curr.getMonth() + 1).padStart(2, '0') + '/' + curr.getFullYear();
        labelsDias.push(diaStr);

        const chamadosDoDia = dadosPeriodo.filter(d => {
            if (!d.abertura) return false;
            return d.abertura.startsWith(diaStr);
        });

        const abertos = chamadosDoDia.length;
        const fechados = chamadosDoDia.filter(d => d.fechado).length;
        const prazo = chamadosDoDia.filter(d => d.fechado && (d.atraso_no_servico || 'nao').toLowerCase() !== 'sim').length;

        abertosDia.push(abertos);
        fechadosDia.push(fechados);
        prazoDia.push(prazo);

        pctFechadosDia.push(abertos > 0 ? Math.round((fechados / abertos) * 100) : 0);
        pctPrazoDia.push(fechados > 0 ? Math.round((prazo / fechados) * 100) : 0);
        metaDia.push(85);

        curr.setDate(curr.getDate() + 1);
    }

    if (chartField) chartField.destroy();

    chartField = new Chart(canvasEl.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsDias,
            datasets: [
                { label: 'Chamados Abertos', data: abertosDia, backgroundColor: '#334155', yAxisID: 'y', borderRadius: 4 },
                { label: 'Chamados Fechados', data: fechadosDia, backgroundColor: '#10b981', yAxisID: 'y', borderRadius: 4 },
                { label: 'Fechados no Prazo', data: prazoDia, backgroundColor: '#6ee7b7', yAxisID: 'y', borderRadius: 4 },
                { label: '% Fechados', data: pctFechadosDia, type: 'line', borderColor: '#10b981', backgroundColor: '#10b981', yAxisID: 'y1', borderWidth: 2, pointRadius: 4 },
                { label: '% Fechados no Prazo', data: pctPrazoDia, type: 'line', borderColor: '#047857', backgroundColor: '#047857', yAxisID: 'y1', borderWidth: 2, pointRadius: 4 },
                { label: 'Meta', data: metaDia, type: 'line', borderColor: '#84cc16', borderWidth: 1.5, pointRadius: 0, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } } },
            scales: {
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#e2e8f0' }, beginAtZero: true },
                y1: { type: 'linear', display: true, position: 'right', min: 0, max: 105, grid: { drawOnChartArea: false } }
            }
        }
    });
}