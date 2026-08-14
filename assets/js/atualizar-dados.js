import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

await verificarAutenticacao();
carregarMenu('atualizar-dados');

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const btnProcessar = document.getElementById('btn-processar');

    if (!btnProcessar || !fileInput) return;

    btnProcessar.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) { alert('Por favor, selecione um arquivo CSV.'); return; }

        const textoOriginal = btnProcessar.innerText;
        btnProcessar.innerText = 'Processando...';
        btnProcessar.disabled = true;

        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const textoArquivo = e.target.result;
            try {
                const extrairNumero = (regex) => {
                    const match = textoArquivo.match(regex);
                    return match ? parseInt(match[1].replace(/\./g, ''), 10) : 0;
                };

                const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}).*?até.*?(\d{2})\/(\d{2})\/(\d{4})/i;
                const dateMatch = textoArquivo.match(dateRegex);
                
                if (!dateMatch) throw new Error("Não foi possível localizar o período do relatório.");

                const dataInicio = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
                const dataFim = `${dateMatch[6]}-${dateMatch[5]}-${dateMatch[4]}`;

                const recebidas = extrairNumero(/Recebidas\s+(\d+)/);
                const atendidas = extrairNumero(/Atendidas\s+(\d+)/);
                const transbordadas = extrairNumero(/Transbordadas\s+(\d+)/);
                const foraHorario = extrairNumero(/Fora de horário\s+(\d+)/);
                const abandonadas = extrairNumero(/Abandonadas\s+(\d+)/);

                if (recebidas === 0 && atendidas === 0) throw new Error("Nenhuma volumetria encontrada.");

                const { data, error } = await supabase
                    .from('ura_volumetria_geral')
                    .insert([{
                        data_inicio: dataInicio, data_fim: dataFim,
                        total_recebidas: recebidas, atendidas: atendidas,
                        transbordadas: transbordadas, fora_horario: foraHorario, abandonadas: abandonadas
                    }]);

                if (error) throw error;

                alert('Dados processados e gravados no banco com êxito.');
                fileInput.value = ''; 
            } catch (err) {
                console.error("Falha no processamento:", err);
                alert(`Erro ao processar: ${err.message}`);
            } finally {
                btnProcessar.innerText = textoOriginal;
                btnProcessar.disabled = false;
            }
        };

        reader.onerror = () => {
            alert('Erro na leitura do arquivo.');
            btnProcessar.innerText = textoOriginal;
            btnProcessar.disabled = false;
        };

        reader.readAsText(file, 'UTF-8');
    });
});