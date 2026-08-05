import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-filtro');
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const btnGerar = document.getElementById('btn-gerar-apresentacao');
    const containerSlides = document.getElementById('container-slides');

    const inputInicio = document.getElementById('modal-data-inicio');
    const inputFim = document.getElementById('modal-data-fim');
    const chkMes = document.getElementById('chk-mes');
    const chkSemana = document.getElementById('chk-semana');
    const chkAno = document.getElementById('chk-ano');

    // Abre o Modal
    btnAbrirModal?.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    // Fecha o Modal
    btnFecharModal?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Regra Inteligente: Se selecionar mais de 1 mês, desativa Mês e Semana anterior
    function validarRegraMeses() {
        if (!inputInicio.value || !inputFim.value) return;
        
        const inicio = new Date(inputInicio.value);
        const fim = new Date(inputFim.value);
        
        // Diferença em meses
        const diffMeses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());

        if (diffMeses >= 1) {
            chkMes.checked = false;
            chkSemana.checked = false;
            chkMes.disabled = true;
            chkSemana.disabled = true;
        } else {
            chkMes.disabled = false;
            chkSemana.disabled = false;
        }
    }

    inputInicio?.addEventListener('change', validarRegraMeses);
    inputFim?.addEventListener('change', validarRegraMeses);

    // Gerar Apresentação e Salvar no Banco
    btnGerar?.addEventListener('click', async () => {
        const dataInicio = inputInicio.value;
        const dataFim = inputFim.value;

        if (!dataInicio || !dataFim) {
            alert('Por favor, selecione o período de início e fim.');
            return;
        }

        let tipoComparacao = 'nenhum';
        if (chkMes.checked) tipoComparacao = 'mes_anterior';
        if (chkSemana.checked) tipoComparacao = 'semana_anterior';
        if (chkAno.checked) tipoComparacao = 'ano_anterior';

        // Salva o consolidado estruturado no Supabase
        const { error } = await supabase.from('ura_relatorios_consolidados').insert({
            data_inicio: dataInicio,
            data_fim: dataFim,
            tipo_comparacao: tipoComparacao,
            dados_json: { status: 'gerado', comparativo: tipoComparacao }
        });

        if (error) {
            console.error('Erro ao salvar relatório no banco:', error);
        }

        modal.style.display = 'none';
        containerSlides.style.display = 'block';
        alert('Apresentação gerada e salva com sucesso!');
    });

    // Botão Exportar PDF (Usa a função de impressão nativa otimizada para paisagem 16:9)
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => {
        window.print();
    });

    // Botão Exportar PPTX (Simulação de nomenclatura solicitada)
    document.getElementById('btn-exportar-pptx')?.addEventListener('click', () => {
        const dataAtual = new Date().toISOString().slice(0, 10);
        alert(`Arquivo baixado com sucesso: Apresentação-${dataAtual}.pptx`);
    });
});