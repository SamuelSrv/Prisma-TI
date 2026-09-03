// Função auxiliar para extrair a filial da string (ex: "#P:2026081700000030#Filial = 164")
function extrairFilial(dadosAssociados) {
    if (!dadosAssociados) return null;
    const match = dadosAssociados.match(/Filial\s*=\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
}

// Converte a data do formato BR com segundos (17/08/2026 09:24:44) para ISO nativo
function formatarDataAvaliacao(dataStr) {
    if (!dataStr) return null;
    const [data, hora] = dataStr.trim().split(' ');
    if (!data || !hora) return null;
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}T${hora}`;
}

// Normaliza o objeto processado pelo PapaParse, independente se é Ligação ou Chat
function mapearAvaliacao(row) {
    // Busca flexível de chaves para lidar com variações e quebras de caracteres
    const getVal = (possibleKeys) => {
        const key = Object.keys(row).find(k => possibleKeys.some(pk => k.includes(pk)));
        return key ? row[key]?.trim() : null;
    };

    const dataInic = getVal(['Data Inicial da Chamada']);
    const dataAtend = getVal(['Data de Atendimento']);
    const agente = getVal(['Agente']);
    
    // O Chat tem "Resposta 1", a Ligação tem "Resposta1". Pega o que existir.
    let nota = getVal(['Resposta 1', 'Resposta1']);
    if (nota && nota.includes('NÃ£o')) nota = 'Não respondeu';

    const dadosAssociados = getVal(['Dados Associados']);
    
    // Classifica automaticamente baseado na presença da coluna exclusiva de Telefonia
    const tipoAtendimento = dadosAssociados ? 'Ligação' : 'WhatsApp';
    const filial = extrairFilial(dadosAssociados);

    // Retorna nulo se a linha estiver em branco/inválida
    if (!dataInic || !agente) return null;

    return {
        tipo_atendimento: tipoAtendimento,
        data_inicial: formatarDataAvaliacao(dataInic),
        data_atendimento: formatarDataAvaliacao(dataAtend),
        agente: agente,
        nota: nota,
        filial: filial,
        descricao_atendimento: '',
        acao_analista: ''
    };
}