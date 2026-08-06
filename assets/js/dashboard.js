import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('dashboard');

async function verificarSessao() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) window.location.href = 'index.html';
    } catch (err) {
        window.location.href = 'index.html';
    }
}
verificarSessao();

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    // Evento de alteração do mês no cabeçalho
    document.getElementById('filtro-mes')?.addEventListener('change', (e) => {
        const novoMes = e.target.value;
        console.log('Mês alterado para:', novoMes);
        // Aqui você poderá recarregar os dados do Supabase baseados no mês selecionado
    });

    // Gráfico de Barras com Porcentagem em cima de cada barra
    const ctxVolumetria = document.getElementById('chartVolumetria').getContext('2d');
    new Chart(ctxVolumetria, {
        type: 'bar',
        data: {
            labels: ['Atendidas', 'Transbordadas', 'Fora de Horário', 'Abandonadas'],
            datasets: [{
                label: 'Chamadas',
                data: [1323, 116, 38, 1],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                borderRadius: 6
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#f8fafc',
                    anchor: 'end',
                    align: 'top',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let percentage = ((value * 100) / sum).toFixed(1) + '%';
                        return percentage;
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
            }
        }
    });

    // Gráfico de Rosca com Porcentagem nas fatias
    const ctxMidia = document.getElementById('chartMidia').getContext('2d');
    new Chart(ctxMidia, {
        type: 'doughnut',
        data: {
            labels: ['Chat / WhatsApp', 'Telefonia / Voz'],
            datasets: [{
                data: [1323, 155],
                backgroundColor: ['#10b981', '#3b82f6'],
                borderWidth: 0
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc', font: { size: 12 } }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let percentage = ((value * 100) / sum).toFixed(1) + '%';
                        return percentage;
                    }
                }
            }
        }
    });
});