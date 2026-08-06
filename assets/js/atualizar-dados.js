import { supabase } from './supabase.js';
import { carregarMenu } from './menu.js';

// Carrega o menu lateral marcando a opção atual
carregarMenu('atualizar-dados');

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const btnProcessar = document.getElementById('btn-processar');

    if (!btnProcessar || !fileInput) {
        console.error("Elementos de upload não encontrados na tela.");
        return;
    }

    btnProcessar.addEventListener('click', async () => {
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Por favor, selecione um arquivo CSV da Dígitro para processar.');
            return;
        }

        // Feedback visual de carregamento
        const textoOriginal = btnProcessar.innerText;
        btnProcessar.innerText = 'Processando...';
        btnProcessar.disabled = true;

        // API nativa do navegador para leitura de arquivos
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const textoArquivo = e.target.result;
            
            try {
                // Função auxiliar para buscar números baseados no rótulo da linha
                const extrairNumero = (regex) => {
                    const match = textoArquivo.match(regex);
                    return match ? parseInt(match[1].replace(/\./g, ''), 10) : 0;
                };

                // 1. Extração do Período (Busca o padrão DD/MM/AAAA)
                const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}).*?até.*?(\d{2})\/(\d{2})\/(\d{4})/i;
                const dateMatch = textoArquivo.match(dateRegex);
                
                if (!dateMatch) {
                    throw new Error("Não foi possível localizar o período do relatório no arquivo.");
                }

                // Formatação para o padrão do Banco de Dados (YYYY-MM-DD)
                const dataInicio = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
                const dataFim = `${dateMatch[6]}-${dateMatch[5]}-${dateMatch[4]}`;

                // 2. Extração da Volumetria via Regex
                // \s+ garante que ele ignore todos os espaços em branco entre a palavra e o número
                const recebidas = extrairNumero(/Recebidas\s+(\d+)/);
                const atendidas = extrairNumero(/Atendidas\s+(\d+)/);
                const transbordadas = extrairNumero(/Transbordadas\s+(\d+)/);
                const foraHorario = extrairNumero(/Fora de horário\s+(\d+)/);
                const abandonadas = extrairNumero(/Abandonadas\s+(\d+)/);

                // Validação de segurança: se tudo vier zerado, o arquivo está em formato incorreto
                if (recebidas === 0 && atendidas === 0) {
                    throw new Error("Arquivo lido, mas nenhuma volumetria encontrada. Verifique se o formato do CSV está correto.");
                }

                // 3. Inserção direta no Supabase
                const { data, error } = await supabase
                    .from('ura_volumetria_geral')
                    .insert([
                        {
                            data_inicio: dataInicio,
                            data_fim: dataFim,
                            total_recebidas: recebidas,
                            atendidas: atendidas,
                            transbordadas: transbordadas,
                            fora_horario: foraHorario,
                            abandonadas: abandonadas
                        }
                    ]);

                if (error) {
                    throw error;
                }

                // Sucesso
                alert('Sucesso! Dados processados e gravados no banco com êxito.');
                fileInput.value = ''; // Limpa o campo de arquivo

            } catch (err) {
                console.error("Falha no processamento:", err);
                alert(`Erro ao processar: ${err.message}`);
            } finally {
                // Restaura o botão independente de sucesso ou erro
                btnProcessar.innerText = textoOriginal;
                btnProcessar.disabled = false;
            }
        };

        reader.onerror = () => {
            alert('Ocorreu um erro na leitura do arquivo pelo navegador.');
            btnProcessar.innerText = textoOriginal;
            btnProcessar.disabled = false;
        };

        // Lê o arquivo CSV ignorando problemas de codificação complexos (UTF-8 é o padrão mais seguro)
        reader.readAsText(file, 'UTF-8');
    });
});