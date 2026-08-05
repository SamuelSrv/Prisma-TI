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

    const btnProcessar = document.getElementById('btn-processar');
    const fileInput = document.getElementById('file-input');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (btnProcessar && fileInput) {
        btnProcessar.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                alert('Selecione um arquivo CSV para processar.');
                return;
            }

            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const conteudo = e.target.result;
                    const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    // Pula a linha de cabeçalho (índice 0)
                    const registros = linhas.slice(1);
                    let dadosParaInserir = [];
                    const dataHoje = new Date().toISOString().slice(0, 10);

                    for (let linha of registros) {
                        const colunas = linha.split(',').map(c => c.trim());
                        if (colunas.length >= 4) {
                            dadosParaInserir.push({
                                departamento: colunas[0],
                                categoria: colunas[1],
                                quantidade: parseInt(colunas[2]) || 0,
                                percentual: colunas[3],
                                data_referencia: dataHoje
                            });
                        }
                    }

                    if (dadosParaInserir.length === 0) {
                        alert('Nenhum registro válido encontrado no arquivo.');
                        return;
                    }

                    // Insere todas as linhas de forma estruturada na tabela relacional
                    const { error: dbError } = await supabase
                        .from('ura_itens_relatorio')
                        .insert(dadosParaInserir);

                    if (dbError) throw dbError;

                    alert(`Sucesso! ${dadosParaInserir.length} registros foram distribuídos e salvos individualmente no banco de dados.`);
                } catch (error) {
                    console.error('Erro ao salvar no banco:', error);
                    alert('Erro ao salvar os dados no banco de dados. Verifique o formato do arquivo.');
                } finally {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                }
            };
            reader.readAsText(file, 'ISO-8859-1');
        });
    }
});