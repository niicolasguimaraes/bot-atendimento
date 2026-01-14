const wppconnect = require('@wppconnect-team/wppconnect');
const http = require('http'); // Servidor para enganar o Render

// --- ⚙️ CONFIGURAÇÕES GERAIS ---
const PORT = process.env.PORT || 8080; 
const NOME_EMPRESA = "Guimarães Sign";
const HORARIO_ABERTURA = 7; 
const HORARIO_FECHAMENTO = 17; 
const WEBHOOK_URL = "https://discordapp.com/api/webhooks/1461009453410291826/deimejV9KMK2QuAcYn33OlS_i_yZy0RUZfJifI7MBtWh6-5y349NLNkX3S3MQikSTTOg"; // <--- COLE SUA URL DO DISCORD AQUI

// --- 🚑 SERVIDOR FALSO (MANTÉM O RENDER ACORDADO) ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Guimaraes Sign esta ONLINE!');
});
server.listen(PORT, () => {
    console.log(`[SERVIDOR] Fake server rodando na porta ${PORT} para o Render.`);
});

// --- 🎨 SISTEMA DE LOGS (CONSOLE + DISCORD) ---
const C = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", gray: "\x1b[90m" };

const DiscordColors = {
    ONLINE: 5763719,   // Verde
    RECEBIDO: 3447003, // Azul
    ENVIADO: 16776960, // Amarelo
    ERRO: 15548997,    // Vermelho
    INFO: 9807270      // Cinza
};

async function sendToDiscord(tipo, titulo, detalhe) {
    if (!WEBHOOK_URL || WEBHOOK_URL.includes("SUA_URL")) return;

    const cor = DiscordColors[tipo] || DiscordColors.INFO;
    const hora = new Date().toLocaleTimeString('pt-BR');

    const payload = {
        embeds: [{
            title: `${iconePorTipo(tipo)} ${titulo}`,
            description: detalhe ? `\`\`\`${detalhe}\`\`\`` : undefined,
            color: cor,
            footer: { text: `Horário: ${hora} • Bot Guimarães Sign` }
        }]
    };

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.log(`${C.red}[ERRO DISCORD]${C.reset} ${err.message}`);
    }
}

function iconePorTipo(tipo) {
    if (tipo === 'ONLINE') return '🟢';
    if (tipo === 'RECEBIDO') return '📩';
    if (tipo === 'ENVIADO') return '🤖';
    if (tipo === 'ERRO') return '❌';
    return '⚠️';
}

function logSystem(tipo, titulo, detalhe = '') {
    const hora = new Date().toLocaleTimeString('pt-BR');
    let cor = C.reset;
    if (tipo === 'ONLINE') cor = C.green;
    if (tipo === 'RECEBIDO') cor = C.cyan;
    if (tipo === 'ENVIADO') cor = C.yellow;
    if (tipo === 'ERRO') cor = C.red;
    if (tipo === 'INFO') cor = C.gray;

    console.log(`${C.gray}[${hora}]${C.reset} ${iconePorTipo(tipo)} ${cor}${titulo}${C.reset} ${detalhe ? '| ' + detalhe : ''}`);
    sendToDiscord(tipo, titulo, detalhe);
}

// --- VARIÁVEIS E DADOS ---
const userStages = {}; 
const botIniciadoEm = Math.floor(Date.now() / 1000);

const LISTA_VENDEDORES = [
    { title: 'Nicolas Guimarães', description: 'Especialista em Comunicação Visual' },
    { title: 'Gustavo Rocha', description: 'Especialista em Adesivos' },
    { title: 'Isaque Panullo', description: 'Atendimento Geral' }
];

const CHAVE_PIX = "51.175.474/0001-05 (CNPJ)"; 
const BANCO_NOME = "Nubank";
const ENDERECO = "R. Neuza Fransisca dos Santos, 610 - Sumaré - SP";
const HORARIO_TEXTO = "Segunda a Sexta das 07h às 17h";

// --- INICIANDO O WPPCONNECT (CONFIGURAÇÃO BLINDADA) ---
wppconnect
  .create({
    session: 'meu-bot-visual',
    headless: true,
    logQR: false, // <--- DESLIGAMOS O QR CODE QUEBRADO
    catchQR: (base64Qr, asciiQR) => {
        console.log('\n👇 COPIE O TEXTO GIGANTE ABAIXO E COLE EM: https://base64-image.de/ 👇\n');
        console.log(base64Qr);
        console.log('\n👆 FIM DO CÓDIGO 👆\n');
    },
    autoClose: 0,
    browserArgs: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', 
        '--disable-gpu'
    ],
  })
  .then((client) => start(client))
  .catch((error) => logSystem('ERRO', 'Falha ao iniciar Chrome', error.message));

function start(client) {
  logSystem('ONLINE', 'Sistema Iniciado', `Aguardando conexão...`);

  // Monitora o estado da conexão
  client.onStateChange((state) => {
      console.log('[ESTADO]', state);
      if (state === 'CONFLICT') client.useHere();
      if (state === 'CONNECTED') logSystem('ONLINE', 'Conectado ao WhatsApp!', 'Pronto para atender');
  });

  client.onMessage(async (message) => {
    
    // --- 🔒 TRAVAS ---
    if (!message || message.timestamp < botIniciadoEm) return;
    if (message.fromMe) return;
    if (message.isGroupMsg || message.from === 'status@broadcast' || (message.from && message.from.includes('@newsletter'))) return;

    const userId = message.from;
    const userStage = userStages[userId] || 'INICIO';
    const nomeCliente = message.sender.pushname || message.notifyName || 'Cliente';
    
    // Log de Recebimento
    const tipoMsg = message.type;
    const conteudo = tipoMsg === 'chat' ? message.body : `[Mídia: ${tipoMsg}]`;
    logSystem('RECEBIDO', `De: ${nomeCliente}`, conteudo);

    // --- ESTÁGIO 1: MENU PRINCIPAL ---
    if (userStage === 'INICIO') {
        const agora = new Date();
        const horaAtual = agora.getHours(); 
        const estaFechado = horaAtual < HORARIO_ABERTURA || horaAtual >= HORARIO_FECHAMENTO;

        if (estaFechado) {
            logSystem('INFO', 'Fora de Horário', `Avisando ${nomeCliente}`);
            await client.sendText(userId, 
                `Olá, ${nomeCliente}! 🌙\n\n` +
                `No momento nosso time já encerrou o expediente (Atendemos das 07:00 às 17:00).\n` +
                `Sua mensagem foi registrada, mas se precisar de algo urgente (PIX/Dúvidas) use o menu abaixo 👇`
            );
        }

        try {
            await client.sendListMessage(userId, {
                buttonText: 'ABRIR MENU',
                description: `Bem-vindo à ${NOME_EMPRESA}. Como posso te ajudar?`,
                title: 'Guimarães Sign',
                sections: [
                    {
                        title: 'Selecione uma opção:',
                        rows: [
                            { rowId: '1', title: 'Falar com Vendedor', description: 'Fazer Orçamento' },
                            { rowId: '2', title: 'Financeiro', description: 'Boletos, PIX e Faturas' },
                            { rowId: '3', title: 'Tirar Dúvida', description: 'Localização e Horários' },
                        ]
                    }
                ]
            });
            logSystem('ENVIADO', 'Menu Principal', `Para: ${nomeCliente}`);
            userStages[userId] = 'AGUARDANDO_OPCAO';
        } catch (error) {
            await client.sendText(userId, 'Digite o número:\n1. Vendedor\n2. Financeiro\n3. Dúvida');
            logSystem('ERRO', 'Falha Lista (iPhone/Render)', error.message);
            userStages[userId] = 'AGUARDANDO_OPCAO_TEXTO';
        }
    }

    // --- ESTÁGIO 2: TRATAR ESCOLHA ---
    else if (userStage === 'AGUARDANDO_OPCAO' || userStage === 'AGUARDANDO_OPCAO_TEXTO') {
        const msg = (message.body || '').toLowerCase(); 
        const rowId = message.selectedRowId || '';

        if (msg.includes('vendedor') || msg === '1' || rowId === '1') {
            await client.sendListMessage(userId, {
                buttonText: 'SELECIONAR VENDEDOR',
                description: 'Preferência de atendimento:',
                title: 'Guimarães Sign',
                sections: [{ title: 'Opções:', rows: [{ rowId: 'fila', title: 'Primeiro da Fila', description: 'Rápido' }, { rowId: 'escolher', title: 'Escolher Vendedor', description: 'Lista' }] }]
            });
            logSystem('ENVIADO', 'Menu Vendedores', userId);
            userStages[userId] = 'ESCOLHENDO_TIPO_VENDEDOR';
        }
        else if (msg.includes('financeiro') || msg === '2' || rowId === '2') {
            await client.sendListMessage(userId, {
                buttonText: 'OPÇÕES FINANCEIRAS',
                description: 'Serviços financeiros:',
                title: 'Guimarães Sign',
                sections: [{ title: 'Selecione:', rows: [{ rowId: 'fin_pix', title: 'Dados para Pagamento', description: 'PIX' }, { rowId: 'fin_boleto', title: '2ª Via de Boleto', description: 'Solicitar via' }, { rowId: 'fin_humano', title: 'Falar com Atendente', description: 'Outros' }] }]
            });
            logSystem('ENVIADO', 'Menu Financeiro', userId);
            userStages[userId] = 'TRATANDO_FINANCEIRO';
        }
        else if (msg.includes('dúvida') || msg.includes('duvida') || msg === '3' || rowId === '3') {
            await client.sendText(userId, '🤖 *IA:* Pode perguntar! (Ex: Endereço, Horário, Serviços...)');
            logSystem('ENVIADO', 'Modo IA Ativado', userId);
            userStages[userId] = 'FALANDO_COM_IA';
        }
    }

    // --- ESTÁGIO 3: FINALIZADORES ---
    else if (userStage === 'ESCOLHENDO_TIPO_VENDEDOR') {
        const msg = (message.body || '').toLowerCase();
        const rowId = message.selectedRowId;

        if (msg.includes('primeiro') || rowId === 'fila') {
            await client.sendText(userId, 
                `*⚡ ATENDIMENTO RÁPIDO*\n__________________________\n\n` + 
                `✅ Alerta de urgência enviado para a equipe! Aguarde.`
            );
            logSystem('ENVIADO', '🚨 Alerta de Urgência', `Cliente: ${nomeCliente}`);
            userStages[userId] = 'FINALIZADO';
        }
        else if (msg.includes('escolher') || rowId === 'escolher') {
            const linhas = LISTA_VENDEDORES.map((v, i) => ({ rowId: `vend_${i}`, title: v.title, description: v.description }));
            await client.sendListMessage(userId, { buttonText: 'VER EQUIPE', description: 'Quem deve te atender?', title: NOME_EMPRESA, sections: [{ title: 'Nossos Especialistas', rows: linhas }] });
            logSystem('ENVIADO', 'Lista de Nomes', userId);
            userStages[userId] = 'ESCOLHENDO_NOME';
        }
    }
    else if (userStage === 'ESCOLHENDO_NOME') {
        const nomeEscolhido = message.body || 'Vendedor'; 
        if (nomeEscolhido) {
            await client.sendText(userId, 
                `*${nomeEscolhido.toUpperCase()}*\n__________________________\n\n` +
                `👋 Olá! Já recebi sua notificação e em instantes vou realizar seu atendimento.`
            );
            logSystem('ENVIADO', 'Transbordo Direto', `Para: ${nomeEscolhido}`);
            userStages[userId] = 'FINALIZADO';
        }
    }
    else if (userStage === 'TRATANDO_FINANCEIRO') {
        const rowId = message.selectedRowId;
        if (rowId === 'fin_pix') {
            await client.sendText(userId, `🏦 *Banco:* ${BANCO_NOME}\n🔑 *PIX:* ${CHAVE_PIX}`);
            logSystem('ENVIADO', 'Dados PIX', userId);
        } else {
            await client.sendText(userId, 'Ok, equipe financeira notificada.');
            logSystem('ENVIADO', 'Notificação Financeira', userId);
        }
        userStages[userId] = 'FINALIZADO';
    }
    else if (userStage === 'FALANDO_COM_IA') {
        const msg = (message.body || '').toLowerCase();
        if (msg === 'menu' || msg === 'sair') {
            userStages[userId] = 'INICIO';
            await client.sendText(userId, '🔄 Voltando ao menu...');
            return;
        }
        
        let resposta = 'Vou chamar um humano!';
        if (msg.includes('onde') || msg.includes('endereço')) resposta = `📍 ${ENDERECO}`;
        else if (msg.includes('hora')) resposta = `🕒 ${HORARIO_TEXTO}`;
        
        await client.sendText(userId, resposta);
        logSystem('ENVIADO', 'Resposta IA', resposta);
        if (!msg.includes('onde') && !msg.includes('hora')) userStages[userId] = 'FINALIZADO';
    }
  });
}