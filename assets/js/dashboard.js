import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

let chartVolumetria = null;
let chartMidia = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;
        carregarMenu('dashboard');

        const filtroMesEl = document.getElementById('filtro-mes');
        
        // Define AUTOMATICAMENTE o mês atual do sistema (ex: 2026-08) ao entrar/atualizar a página
        const agora = new Date();
        const anoAtual = agora.getFullYear();
        const mesAtual = String(agora.getMonth() + 1).padStart(2, '0');
        filtroMesEl.value = `${anoAtual}-${mesAtual}`;

        // Atualiza os dados instantaneamente sempre que o usuário trocar o mês no seletor
        filtroMesEl.addEventListener('change', () => {
            carregarDadosDashboard();
        });

        // Carrega os dados iniciais do mês atual
        carregarDadosDashboard();

    } catch (error) {
        console.error("Erro crítico ao carregar o dashboard:", error);
    }
});

async function carregarDadosDashboard() {
    const filtroMesEl = document.getElementById('filtro-mes');
    const anoMes = filtroMesEl.value; // Ex: "2026-08"

    if (!anoMes) return;

    const [ano, mes] = anoMes.split('-');
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();

    const dataInicioISO = `${ano}-${mes}-01 00:00:00`;
    const dataFimISO = `${ano}-${mes}-${ultimoDiaDoMes} 23:59:59`;

    try {
        const { data: registros, error } = await supabase
            .from('atendimentos_detalhados')
            .select('*')
            .gte('data_hora', dataInicioISO)
            .lte('data_hora', dataFimISO);

        if (error) throw error;

        atualizarDashboard(registros || []);

    } catch (error) {
        console.error("Erro ao buscar dados do Supabase:", error);
    }
}

function atualizarDashboard(dados) {
    const total = dados.length;
    const atendidas = dados.filter(d => d.status === 'Atendida').length;
    const ligacoes = dados.filter(d => d.canal === 'Ligação').length;
    const chats = dados.filter(d => d.canal === 'Chat').length;
    const perdidos = dados.filter(d => d.status !== 'Atendida').length;

    // Atualiza os KPIs na tela
    document.getElementById('kpi-ligacoes-mes').innerText = total;
    document.getElementById('kpi-ligacoes-semana').innerText = atendidas;
    document.getElementById('kpi-atendimentos').innerText = `${chats} / ${ligacoes}`;
    document.getElementById('kpi-abandonos').innerText = perdidos;

    // Gráfico de Status (Volumetria)
    const statusLabels = [...new Set(dados.map(d => d.status))];
    const statusData = statusLabels.map(s => dados.filter(d => d.status === s).length);

    if (chartVolumetria) chartVolumetria.destroy();
    const ctxVol = document.getElementById('chartVolumetria').getContext('2d');
    chartVolumetria = new Chart(ctxVol, {
        type: 'doughnut',
        data: {
            labels: statusLabels.length > 0 ? statusLabels : ['Sem dados'],
            datasets: [{
                data: statusData.length > 0 ? statusData : [1],
                backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#94a3b8']
            }]
        },
        options: { 
            responsive: true, 
            plugins: { 
                legend: { position: 'bottom', labels: { color: '#cbd5e1' } } 
            } 
        }
    });

    // Gráfico de Mídia (Chat x Ligação)
    if (chartMidia) chartMidia.destroy();
    const ctxMidia = document.getElementById('chartMidia').getContext('2d');
    chartMidia = new Chart(ctxMidia, {
        type: 'bar',
        data: {
            labels: ['Ligação', 'Chat'],
            datasets: [{
                label: 'Quantidade',
                data: [ligacoes, chats],
                backgroundColor: ['#4ade80', '#16a34a'],
                borderWidth: 0,
                barThickness: 40
            }]
        },
        options: { 
            responsive: true, 
            plugins: { 
                legend: { display: false } 
            }, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            } 
        }
    });
}