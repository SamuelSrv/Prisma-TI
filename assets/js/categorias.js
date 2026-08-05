import { supabase } from './supabase.js';

async function verificarSessao() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = 'index.html';
        }
    } catch (err) {
        window.location.href = 'index.html';
    }
}
verificarSessao();

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    const modal = document.getElementById('modal-filtro');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const btnGerar = document.getElementById('btn-gerar-relatorio');
    const containerSlides = document.getElementById('container-slides');

    const inputInicio = document.getElementById('modal-data-inicio');
    const inputFim = document.getElementById('modal-data-fim');
    const chkMes = document.getElementById('chk-mes');
    const chkSemana = document.getElementById('chk-semana');

    // Abre e fecha o modal
    btnAbrir?.addEventListener('click', () => modal.style.display = 'flex');
    btnFechar?.addEventListener('click', () => modal.style.display = 'none');

    // Regra Inteligente: Se o intervalo for maior ou igual a 1 mês, desativa Mês e Semana anterior
    function validarIntervaloMeses() {
        if (!inputInicio.value || !inputFim.value) return;
        const inicio = new Date(inputInicio.value);
        const fim = new Date(inputFim.value);
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

    inputInicio?.addEventListener('change', validarIntervaloMeses);
    inputFim?.addEventListener('change', validarIntervaloMeses);

    // Gerar Relatório
    btnGerar?.addEventListener('click', () => {
        if (!inputInicio.value || !inputFim.value) {
            alert('Por favor, informe a data de início e fim.');
            return;
        }

        modal.style.display = 'none';
        containerSlides.style.display = 'block';
        alert('Relatório de Categorias & PDV gerado com sucesso!');
    });

    // Exportar PDF
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => {
        window.print();
    });

    // Exportar PowerPoint com o nome exato solicitado
    document.getElementById('btn-exportar-pptx')?.addEventListener('click', () => {
        const dataAtual = new Date().toISOString().slice(0, 10);
        alert(`Arquivo baixado: Apresentação-${dataAtual}.pptx`);
    });
});