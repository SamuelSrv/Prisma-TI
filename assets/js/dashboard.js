import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

carregarMenu('dashboard');

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização do Gráfico de Barras
    const ctxVolumetria = document.getElementById('chartVolumetria').getContext('2d');
    let chartVolumetria = new Chart(ctxVolumetria, {
        type: 'bar',
        data: {
            labels: ['Atendidas', 'Transbordadas', 'Fora de Horário', 'Abandonadas'],
            datasets: [{
                label: 'Chamadas',
                data: [1323, 116, 38, 1], // Dados Iniciais
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
                    color: '#f8fafc', anchor: 'end', align: 'top', font: { weight: 'bold' },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        return ((value * 100) / sum).toFixed(1) + '%';
                    }
                }
            }
        }
    });

    // Lógica para Atualizar o Gráfico ao mudar o mês
    const atualizarDashboard = () => {
        const mes = document.getElementById('select-mes').value;
        const ano = document.getElementById('select-ano').value;
        
        console.log(`Atualizando dashboard para: ${mes}/${ano}`);
        
        // Simulando a busca de novos dados do Banco baseada na data
        const novosDados = [
            Math.floor(Math.random() * 2000) + 1000, 
            Math.floor(Math.random() * 200) + 50, 
            Math.floor(Math.random() * 100), 
            Math.floor(Math.random() * 10)
        ];

        // Aplica os novos dados e atualiza visualmente com animação
        chartVolumetria.data.datasets[0].data = novosDados;
        chartVolumetria.update();

        // Atualização visual dos cards do topo
        document.querySelector('.kpi-card h2').textContent = (novosDados[0] + novosDados[1] + novosDados[2]).toLocaleString('pt-BR');
    };

    document.getElementById('select-mes')?.addEventListener('change', atualizarDashboard);
    document.getElementById('select-ano')?.addEventListener('change', atualizarDashboard);
});