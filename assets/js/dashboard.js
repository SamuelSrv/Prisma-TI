import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartCanal = null;
let chartStatus = null;

document.addEventListener('DOMContentLoaded', async () => {
    await verificarAutenticacao();
    carregarMenu('dashboard');

    // Inicializa Datepicker (mesmo código que usamos no relatório)
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    
    // Define hoje como padrão
    const hoje = new Date().toLocaleDateString('pt-BR');
    dateStartEl.value = hoje;
    dateEndEl.value = hoje;

    if (window.Datepicker) {
        new window.Datepicker(dateStartEl, { format: 'dd/mm/yyyy', language: 'pt-BR', autohide: true });
        new window.Datepicker(dateEndEl, { format: 'dd/mm/yyyy', language: 'pt-BR', autohide: true });
    }

    // Botão de filtrar
    document.getElementById('btn-filtrar').addEventListener('click', carregarDadosDashboard);

    // Carrega dados iniciais
    carregarDadosDashboard();
});

async function carregarDadosDashboard() {
    const dataInicio = document.getElementById('date-start').value;
    const dataFim = document.getElementById('date-end').value;

    const [diaI, mesI, anoI] = dataInicio.split('/');
    const [diaF, mesF, anoF] = dataFim.split('/');
    const dataInicioISO = `${anoI}-${mesI}-${diaI} 00:00:00`;
    const dataFimISO = `${anoF}-${mesF}-${diaF} 23:59:59`;

    const { data: registros, error } = await supabase
        .from('atendimentos_detalhados')
        .select('*')
        .gte('data_hora', dataInicioISO)
        .lte('data_hora', dataFimISO);

    if (error) return console.error(error);
    
    atualizarGraficos(registros);
}

function atualizarGraficos(dados) {
    // 1. Dados para Gráfico de Canal (Ligação vs Chat)
    const ligacoes = dados.filter(d => d.canal === 'Ligação').length;
    const chats = dados.filter(d => d.canal === 'Chat').length;

    // 2. Dados para Gráfico de Status (Atendida, Perdida, etc)
    const statusLabels = [...new Set(dados.map(d => d.status))];
    const statusData = statusLabels.map(s => dados.filter(d => d.status === s).length);

    // Destruir gráficos anteriores se existirem
    if (chartCanal) chartCanal.destroy();
    if (chartStatus) chartStatus.destroy();

    // Renderizar Gráfico de Canal
    chartCanal = new Chart(document.getElementById('chartCanal'), {
        type: 'pie',
        data: { labels: ['Ligação', 'Chat'], datasets: [{ data: [ligacoes, chats], backgroundColor: ['#3b82f6', '#10b981'] }] }
    });

    // Renderizar Gráfico de Status
    chartStatus = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'] }] }
    });
}