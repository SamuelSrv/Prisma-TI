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
        const dtFimReal = new Date(`${anoF}-${mesF}-${diaF}T23:59:59`);

        const chamadosProcessados = processarDadosQualitor(registros);
        
        // Chamados Abertos no Período (baseados na Abertura)
        const chamadosPeriodo = chamadosProcessados.filter(d => {
            const dataObj = parseDataBr(d.abertura);
            if (!dataObj) return false;
            return dataObj >= dtIni && dataObj <= dtFimReal;
        });

        // Cálculo do Período Anterior
        const diffTime = Math.abs(dtFimReal - dtIni);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const antIni = new Date(dtIni);
        antIni.setDate(antIni.getDate() - diffDays);
        const antFim = new Date(dtFimReal);
        antFim.setDate(antFim.getDate() - diffDays);

        const chamadosAnterior = chamadosProcessados.filter(d => {
            const dataObj = parseDataBr(d.abertura);
            if (!dataObj) return false;
            return dataObj >= antIni && dataObj <= antFim;
        });

        // Regra da Capa Inteligente
        let tipoPeriodo = 'personalizado';
        let subtituloCapa = `${dataInicio} até ${dataFim}`;

        if (dataInicio === dataFim) {
            tipoPeriodo = 'diario';
            subtituloCapa = `FECHAMENTO DIÁRIO - ${dataInicio}`;
        } else {
            const ultimoDiaMes = new Date(parseInt(anoI, 10), parseInt(mesI, 10), 0).getDate();
            if (parseInt(diaI, 10) === 1 && parseInt(diaF, 10) === ultimoDiaMes && mesI === mesF) {
                tipoPeriodo = 'mensal';
                const mesesExtenso = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                subtituloCapa = `FECHAMENTO MENSAL ${mesesExtenso[parseInt(mesI, 10)-1].toUpperCase()} ${anoI}`;
            } 
            else if (dtIni.getDay() === 1 && dtFimReal.getDay() === 0 && diffDays === 7) {
                tipoPeriodo = 'semanal';
                const mesesExtenso = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                subtituloCapa = `FECHAMENTO SEMANAL ${mesesExtenso[parseInt(mesI, 10)-1].toUpperCase()} ${anoI}`;
            }
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

        if (tipoPeriodo === 'mensal') {
            renderizarGraficoMensal(chamadosProcessados, parseInt(mesI, 10), anoI);
        } else {
            renderizarGraficoField(chamadosPeriodo, dtIni, dtFimReal);
        }

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
        
        const sit = (d.situacao || '').toLowerCase();
        const statusEncerramentoValido = sit.includes('encerrado') || sit.includes('aguardando confirmação');

        let dataEncerramentoObj = null;
        if (d.encerramento && d.encerramento.trim() !== '') {
            const partesEncerramento = d.encerramento.split(' - ');
            if (partesEncerramento.length > 0) {
                const [dEnc, mEnc, aEnc] = partesEncerramento[0].split('/');
                if (dEnc && mEnc && aEnc) {
                    const horaEnc = partesEncerramento[1] || '00:00';
                    dataEncerramentoObj = new Date(`${aEnc}-${mEnc}-${dEnc}T${horaEnc}:00`);
                }
            }
        }

        const fechado = statusEncerramentoValido && dataEncerramentoObj !== null;

        return { ...d, contato, categoria, fechado, dataEncerramentoObj };
    });
}

// ==========================================
// 4A. GRÁFICO DIÁRIO
// ==========================================
function renderizarGraficoField(dadosPeriodo, dtIni, dtFim) {
    const canvasEl = document.getElementById('chartEvolucaoField');
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

        const abertosDoDia = dadosPeriodo.filter(d => {
            const dtAbe = parseDataBr(d.abertura);
            if (!dtAbe) return false;
            return dtAbe.toISOString().startsWith(`${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`);
        });

        const fechadosDoDia = dadosPeriodo.filter(d => {
            if (!d.fechado || !d.dataEncerramentoObj) return false;
            return d.dataEncerramentoObj.toISOString().startsWith(`${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`);
        });

        const prazoDoDia = fechadosDoDia.filter(d => (d.atraso_no_servico || 'nao').toLowerCase() !== 'sim');

        const abertos = abertosDoDia.length;
        const fechados = fechadosDoDia.length;
        const prazo = prazoDoDia.length;

        abertosDia.push(abertos);
        fechadosDia.push(fechados);
        prazoDia.push(prazo);

        const pFechados = abertos > 0 ? Math.round((fechados / abertos) * 100) : 0;
        const pPrazo = fechados > 0 ? Math.round((prazo / fechados) * 100) : 0;

        pctFechadosDia.push(pFechados);
        pctPrazoDia.push(pPrazo);
        metaDia.push(85);

        curr.setDate(curr.getDate() + 1);
    }

    const maxPctEncontrado = Math.max(...pctFechadosDia, ...pctPrazoDia, 100);
    const y1MaxDinamico = maxPctEncontrado <= 100 ? 105 : Math.ceil(maxPctEncontrado / 50) * 50 + 50;

    const pluginRotulosLinhas = {
        id: 'rotulosLinhasField',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (meta.hidden) return;
                
                if (dataset.type === 'line' && dataset.label !== 'Meta') {
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        if (value === null || value === undefined) return;

                        ctx.save();
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = dataset.borderColor;

                        const model = element.getProps(['x', 'y'], true);
                        ctx.fillText(value + '%', model.x, model.y - 10);
                        ctx.restore();
                    });
                }
            });
        }
    };

    if (chartField) chartField.destroy();

    chartField = new Chart(canvasEl.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsDias,
            datasets: [
                { label: 'Chamados Abertos', data: abertosDia, backgroundColor: '#334155', yAxisID: 'y', borderRadius: 4 },
                { label: 'Chamados Fechados', data: fechadosDia, backgroundColor: '#10b981', yAxisID: 'y', borderRadius: 4 },
                { label: 'Fechados no Prazo', data: prazoDia, backgroundColor: '#6ee7b7', yAxisID: 'y', borderRadius: 4 },
                { label: '% Fechados', data: pctFechadosDia, type: 'line', borderColor: '#10b981', backgroundColor: '#10b981', yAxisID: 'y1', borderWidth: 2.5, pointRadius: 4 },
                { label: '% Fechados no Prazo', data: pctPrazoDia, type: 'line', borderColor: '#047857', backgroundColor: '#047857', yAxisID: 'y1', borderWidth: 2.5, pointRadius: 4 },
                { label: 'Meta', data: metaDia, type: 'line', borderColor: '#84cc16', borderWidth: 1.5, pointRadius: 0, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } } 
            },
            scales: {
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#e2e8f0' }, beginAtZero: true },
                y1: { type: 'linear', display: true, position: 'right', min: 0, max: y1MaxDinamico, grid: { drawOnChartArea: false } }
            }
        },
        plugins: [pluginRotulosLinhas]
    });
}

// ==========================================
// 4B. GRÁFICO MENSAL
// ==========================================
function renderizarGraficoMensal(todosRegistrosProcessados, mesLimite, anoRef) {
    const canvasEl = document.getElementById('chartEvolucaoField');
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

    const mesesNomes = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const labelsMeses = [];
    const abertosMes = [];
    const fechadosMes = [];
    const prazoMes = [];
    const pctFechadosMes = [];
    const pctPrazoMes = [];
    const metaMes = [];

    for (let i = 0; i < mesLimite; i++) {
        labelsMeses.push(`${mesesNomes[i]}/${anoRef.substring(2)}`);

        const abertosDoMes = todosRegistrosProcessados.filter(d => {
            const dtAbe = parseDataBr(d.abertura);
            if (!dtAbe) return false;
            return dtAbe.getMonth() === i && dtAbe.getFullYear() === parseInt(anoRef, 10);
        });

        const fechadosDoMes = todosRegistrosProcessados.filter(d => {
            if (!d.fechado || !d.dataEncerramentoObj) return false;
            return d.dataEncerramentoObj.getMonth() === i && d.dataEncerramentoObj.getFullYear() === parseInt(anoRef, 10);
        });

        const prazoDoMes = fechadosDoMes.filter(d => (d.atraso_no_servico || 'nao').toLowerCase() !== 'sim');

        const abertos = abertosDoMes.length;
        const fechados = fechadosDoMes.length;
        const prazo = prazoDoMes.length;

        abertosMes.push(abertos);
        fechadosMes.push(fechados);
        prazoMes.push(prazo);

        const pFechados = abertos > 0 ? Math.round((fechados / abertos) * 100) : 0;
        const pPrazo = fechados > 0 ? Math.round((prazo / fechados) * 100) : 0;

        pctFechadosMes.push(pFechados);
        pctPrazoMes.push(pPrazo);
        metaMes.push(85);
    }

    const maxPctEncontrado = Math.max(...pctFechadosMes, ...pctPrazoMes, 100);
    const y1MaxDinamico = maxPctEncontrado <= 100 ? 105 : Math.ceil(maxPctEncontrado / 50) * 50 + 50;

    const pluginRotulosLinhas = {
        id: 'rotulosLinhasMensal',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (meta.hidden) return;
                
                if (dataset.type === 'line' && dataset.label !== 'Meta') {
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        if (value === null || value === undefined) return;

                        ctx.save();
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = dataset.borderColor;

                        const model = element.getProps(['x', 'y'], true);
                        ctx.fillText(value + '%', model.x, model.y - 10);
                        ctx.restore();
                    });
                }
            });
        }
    };

    if (chartField) chartField.destroy();

    chartField = new Chart(canvasEl.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [
                { label: 'Chamados Abertos', data: abertosMes, backgroundColor: '#334155', yAxisID: 'y', borderRadius: 4 },
                { label: 'Chamados Fechados', data: fechadosMes, backgroundColor: '#10b981', yAxisID: 'y', borderRadius: 4 },
                { label: 'Fechados no Prazo', data: prazoMes, backgroundColor: '#6ee7b7', yAxisID: 'y', borderRadius: 4 },
                { label: '% Fechados', data: pctFechadosMes, type: 'line', borderColor: '#10b981', backgroundColor: '#10b981', yAxisID: 'y1', borderWidth: 2.5, pointRadius: 4 },
                { label: '% Fechados no Prazo', data: pctPrazoMes, type: 'line', borderColor: '#047857', backgroundColor: '#047857', yAxisID: 'y1', borderWidth: 2.5, pointRadius: 4 },
                { label: 'Meta', data: metaMes, type: 'line', borderColor: '#84cc16', borderWidth: 1.5, pointRadius: 0, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } } 
            },
            scales: {
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#e2e8f0' }, beginAtZero: true },
                y1: { type: 'linear', display: true, position: 'right', min: 0, max: y1MaxDinamico, grid: { drawOnChartArea: false } }
            }
        },
        plugins: [pluginRotulosLinhas]
    });
}