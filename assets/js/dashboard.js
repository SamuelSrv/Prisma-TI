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
                alert('Selecione um arquivo HTML ou CSV para processar.');
                return;
            }

            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const conteudo = e.target.result;
                    const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    // Remove o cabeçalho se houver
                    const cabecalho = linhas[0];
                    const registros = linhas.slice(1);

                    let itensProcessados = [];

                    for (let linha of registros) {
                        const colunas = linha.split(',');
                        if (colunas.length >= 4) {
                            itensProcessados.push({
                                departamento: colunas[0],
                                categoria: colunas[1],
                                quantidade: parseInt(colunas[2]) || 0,
                                percentual: colunas[3]
                            });
                        }
                    }

                    // Salva o relatório consolidado com os dados reais parseados na tabela do Supabase
                    const { error: dbError } = await supabase
                        .from('ura_relatorios_consolidados')
                        .insert({
                            data_inicio: new Date().toISOString().slice(0, 10),
                            data_fim: new Date().toISOString().slice(0, 10),
                            tipo_comparacao: 'nenhum',
                            dados_json: {
                                arquivo: file.name,
                                total_linhas: itensProcessados.length,
                                itens: itensProcessados,
                                importado_em: new Date().toISOString()
                            }
                        });

                    if (dbError) throw dbError;

                    alert(`Sucesso! ${itensProcessados.length} registros do arquivo foram salvos no banco de dados.`);
                } catch (error) {
                    console.error('Erro ao salvar no banco:', error);
                    alert('Erro ao processar e salvar os dados no banco de dados.');
                } finally {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                }
            };
            reader.readAsText(file, 'ISO-8859-1');
        });
    }
});