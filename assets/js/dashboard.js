import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

// Roda a blindagem ANTES de carregar a tela
await verificarAutenticacao();

carregarMenu('dashboard');

document.addEventListener('DOMContentLoaded', () => {
    const ctxVolumetria = document.getElementById('chartVolumetria').getContext('2d');
    let chartVolumetria = new Chart(ctxVolumetria, {
        type: 'bar',
        data: {
            labels: ['Atendidas', 'Transbordadas', 'Fora de Horário', 'Abandonadas'],
            datasets: [{ label: 'Chamadas', data: [0, 0, 0, 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderRadius: 6 }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#f8fafc', anchor: 'end', align: 'top', font: { weight: 'bold' },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '0%';
                        return ((value * 100) / sum).toFixed(1) + '%';
                    }
                }
            },
            scales: { x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } }
        }
    });

    const ctxMidia = document.getElementById('chartMidia').getContext('2d');
    let chartMidia = new Chart(ctxMidia, {
        type: 'doughnut',
        data: { labels: ['Chat / WhatsApp', 'Telefonia / Voz'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#3b82f6'], borderWidth: 0 }] },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc', font: { size: 12 } } },
                datalabels: {
                    color: '#fff', font: { weight: 'bold', size: 13 },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '0%';
                        return ((value * 100) / sum).toFixed(1) + '%';
                    }
                }
            }
        }
    });

    const atualizarDashboard = () => { console.log('Filtro alterado, buscando dados do banco...'); };
    document.getElementById('select-mes')?.addEventListener('change', atualizarDashboard);
    document.getElementById('select-ano')?.addEventListener('change', atualizarDashboard);
});