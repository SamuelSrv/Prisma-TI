import { supabase } from './supabase.js';

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
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    // Processamento do CSV
    document.getElementById('btn-processar')?.addEventListener('click', async () => {
        const dataReferencia = document.getElementById('import-data').value;
        const tipoRelatorio = document.getElementById('import-tipo').value;
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        const loadingOverlay = document.getElementById('loading-overlay');

        // Travas de segurança
        if (!dataReferencia) return alert('Selecione a Data de Referência antes de importar.');
        if (!tipoRelatorio) return alert('Selecione o Destino dos Dados (Tabela).');
        if (!file) return alert('Selecione um arquivo CSV.');

        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                // Lê as linhas ignorando linhas vazias
                const linhas = e.target.result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const registros = linhas.slice(1); // Pula o cabeçalho
                let dadosParaInserir = [];

                for (let linha of registros) {
                    // Detecção automática de separador (vírgula ou ponto e vírgula)
                    const separador = linha.includes(';') ? ';' : ',';
                    const colunas = linha.split(separador).map(c => c.trim().replace(/^"|"$/g, ''));

                    // Roteamento: Monta o objeto de acordo com a tabela selecionada
                    if (tipoRelatorio === 'volumetria' && colunas.length >= 6) {
                        dadosParaInserir.push({
                            data_referencia: dataReferencia,
                            recebidas: parseInt(colunas[0]) || 0,
                            atendidas: parseInt(colunas[1]) || 0,
                            transbordadas: parseInt(colunas[2]) || 0,
                            fora_horario: parseInt(colunas[3]) || 0,
                            abandonadas: parseInt(colunas[4]) || 0,
                            tme: colunas[5]
                        });
                    } 
                    else if (tipoRelatorio === 'categorias' && colunas.length >= 4) {
                        dadosParaInserir.push({
                            data_referencia: dataReferencia,
                            departamento: colunas[0],
                            categoria: colunas[1],
                            quantidade: parseInt(colunas[2]) || 0,
                            percentual: colunas[3]
                        });
                    }
                    else if (tipoRelatorio === 'lojas' && colunas.length >= 4) {
                        dadosParaInserir.push({
                            data_referencia: dataReferencia,
                            filial: colunas[0],
                            modelo: colunas[1], // Tradicional ou Express
                            quantidade_contatos: parseInt(colunas[2]) || 0,
                            percentual: colunas[3]
                        });
                    }
                }

                if (dadosParaInserir.length === 0) {
                    alert('Nenhum dado extraído. O CSV pode estar vazio ou as colunas não correspondem ao formato exigido para esta tabela.');
                    return;
                }

                // Define a tabela do Supabase de destino
                const tabelaDestino = 
                    tipoRelatorio === 'volumetria' ? 'ura_volumetria_geral' :
                    tipoRelatorio === 'categorias' ? 'ura_categorias_pdv' : 
                    'ura_lojas';

                // Dispara o INSERT em massa no Supabase
                const { error } = await supabase.from(tabelaDestino).insert(dadosParaInserir);
                
                if (error) throw error;

                alert(`Sucesso! ${dadosParaInserir.length} registros inseridos na tabela "${tabelaDestino}".`);
                
                // Limpa os campos após o sucesso
                fileInput.value = ''; 
                document.getElementById('import-tipo').value = '';
                
            } catch (error) {
                console.error('Erro na importação:', error);
                alert('Falha ao inserir no banco. Verifique o console para mais detalhes.');
            } finally {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        };
        
        // Lê o arquivo forçando o padrão ISO-8859-1 para não quebrar os acentos em português
        reader.readAsText(file, 'ISO-8859-1');
    });
});