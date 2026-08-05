import { supabase } from './supabase.js';

let dadosExtraidosGlobais = [];

// ==========================================
// 1. CONTROLE DE ACESSO E SESSÃO
// ==========================================
async function protegerRota() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Expulsa o usuário se tentar acessar a URL do dashboard direto
        window.location.href = 'index.html';
    }
}
protegerRota();

// Botão de Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================
// 2. MOTOR DE EXTRAÇÃO DE DADOS (DOMParser)
// ==========================================
document.getElementById('btn-processar').addEventListener('click', () => {
    const fileInput = document.getElementById('arquivo-ura');
    const arquivo = fileInput.files[0];

    if (!arquivo) {
        alert("Por favor, selecione um arquivo HTML da Dígitro.");
        return;
    }

    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    const leitor = new FileReader();

    leitor.onload = function(e) {
        try {
            const htmlString = e.target.result;
            dadosExtraidosGlobais = extrairDadosDigitro(htmlString);
            
            renderizarPreview(dadosExtraidosGlobais);
            document.getElementById('area-resultados').style.display = 'block';
            
        } catch (erro) {
            console.error(erro);
            alert("Falha ao extrair dados. O layout do arquivo da URA pode ter mudado.");
        } finally {
            overlay.style.display = 'none';
            fileInput.value = ''; // Limpa o input
        }
    };

    // Lê ignorando problemas de acentuação do sistema legado
    leitor.readAsText(arquivo, 'ISO-8859-1'); 
});

// Lógica de raspagem (Scraping) baseada no padrão visual da URA
function extrairDadosDigitro(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const agentes = [];

    // Busca o padrão de login (Arial 12pt negrito)
    const spansLogin = doc.querySelectorAll('span[style*="12.0pt"][style*="bold"]');

    spansLogin.forEach(span => {
        const login = span.textContent.trim();
        
        let nomeCompleto = "Não encontrado";
        const proximoSpan = span.nextElementSibling;
        if (proximoSpan) {
            nomeCompleto = proximoSpan.textContent.replace(/\u00A0/g, '').replace('- ', '').trim();
        }

        const dadosAgente = {
            login: login,
            nome_completo: nomeCompleto,
            notas: { "Não respondeu": 0, "Nota 1": 0, "Nota 5": 0 },
            total: 0
        };

        let linhaAtual = span.closest('tr');
        
        while (linhaAtual) {
            linhaAtual = linhaAtual.nextElementSibling;
            if (!linhaAtual) break;

            const textoLinha = linhaAtual.textContent;
            
            if (textoLinha.includes("Total por agente")) {
                const spansTotal = linhaAtual.querySelectorAll('span');
                if (spansTotal.length >= 2) {
                    dadosAgente.total = parseInt(spansTotal[1].textContent.trim(), 10) || 0;
                }
                break;
            }

            const spansDados = linhaAtual.querySelectorAll('span');
            if (spansDados.length >= 3) {
                const rotulo = spansDados[0].textContent.trim();
                const quantidadeStr = spansDados[1].textContent.trim();

                if (dadosAgente.notas.hasOwnProperty(rotulo)) {
                    dadosAgente.notas[rotulo] = parseInt(quantidadeStr, 10) || 0;
                }
            }
        }
        
        agentes.push(dadosAgente);
    });

    return agentes;
}

// ==========================================
// 3. RENDERIZAÇÃO DA INTERFACE
// ==========================================
function renderizarPreview(dados) {
    const container = document.getElementById('resultado-agentes');
    
    if (dados.length === 0) {
        container.innerHTML = "<p>Nenhum dado válido encontrado no arquivo.</p>";
        return;
    }

    let tabelaHTML = `
        <table class="table-preview">
            <thead>
                <tr>
                    <th>Login</th>
                    <th>Nome</th>
                    <th>Nota 5</th>
                    <th>Nota 1</th>
                    <th>Total Atendimentos</th>
                </tr>
            </thead>
            <tbody>
    `;

    dados.forEach(agente => {
        tabelaHTML += `
            <tr>
                <td><strong>${agente.login}</strong></td>
                <td>${agente.nome_completo}</td>
                <td style="color: green; font-weight: bold;">${agente.notas["Nota 5"]}</td>
                <td style="color: red; font-weight: bold;">${agente.notas["Nota 1"]}</td>
                <td>${agente.total}</td>
            </tr>
        `;
    });

    tabelaHTML += `</tbody></table>`;
    container.innerHTML = tabelaHTML;
}

// Preparação para a próxima fase (INSERT no banco)
document.getElementById('btn-salvar-banco').addEventListener('click', async () => {
    alert("Próxima etapa: Criar a tabela no Supabase e disparar o comando de INSERT aqui!");
    console.log("Dados prontos para envio:", dadosExtraidosGlobais);
});