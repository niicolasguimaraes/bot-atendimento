const fs = require('fs');
const http = require('http');
const wppconnect = require('@wppconnect-team/wppconnect');

// --- ⚙️ CONFIGURAÇÕES ---
const PORT = process.env.PORT || 8080; 
const NOME_EMPRESA = "Guimarães Sign";
const HORARIO_ABERTURA = 7; 
const HORARIO_FECHAMENTO = 17; 
const WEBHOOK_URL = "https://discordapp.com/api/webhooks/1461009453410291826/deimejV9KMK2QuAcYn33OlS_i_yZy0RUZfJifI7MBtWh6-5y349NLNkX3S3MQikSTTOg"; 

// --- VARIÁVEIS GLOBAIS ---
let qrCodeImagem = ''; 
let statusBot = 'Iniciando Sistema...';
let logsRecentes = [];

// Função de Logs
function addLog(texto) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    logsRecentes.push(`[${hora}] ${texto}`);
    if (logsRecentes.length > 5) logsRecentes.shift(); 
    console.log(texto);
}

// --- 🌐 SITE (WEB VIEW) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const logsHtml = logsRecentes.map(l => `<div style="font-size:12px; color:#888;">${l}</div>`).join('');

    let htmlContent = '';
    if (statusBot.includes('Conectado')) {
        htmlContent = `<h2 style="color:#00ff88">✅ ${statusBot}</h2><p>Bot online! Digite <b>#bot</b> no WhatsApp para ativar manualmente.</p>`;
    } else {
        htmlContent = `
            ${qrCodeImagem ? `<img src="${qrCodeImagem}" style="border: 5px solid white; border-radius: 10px; width: 250px;" />` : '<div style="padding:30px; border:2px dashed #555; color: #aaa;">⏳ Gerando novo QR Code...<br>Aguarde...</div>'}
            <div style="margin-top: 20px; text-align: left; background: #000; padding: 10px; border-radius: 5px;">
                <b>Últimos Passos:</b><br>${logsHtml}
            </div>
            <p style="color: #ffcc00; font-size: 13px; margin-top: 15px;">⚠️ Se travar em "Conectando" no celular, aguarde 3 minutos sem fechar a tela.</p>
        `;
    }

    let html = `<html><head><meta http-equiv="refresh" content="5"><style>body{font-family:monospace;text-align:center;padding:20px;background:#1a1a1a;color:white;}h1{margin-bottom:10px;}.status{color:#00d2ff;font-weight:bold;}</style></head><body><h1>🤖 ${NOME_EMPRESA}</h1><p>Status: <span class="status">${statusBot}</span></p>${htmlContent}</body></html>`;
    res.end(html);
});
server.listen(PORT, () => { console.log(`[SERVIDOR] Painel Web rodando na porta ${PORT}.`); });

// --- 🎨 LOGS DISCORD ---
const C = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", gray: "\x1b[90m" };
const DiscordColors = { ONLINE: 5763719, RECEBIDO: 3447003, ENVIADO: 16776960, ERRO: 15548997, INFO: 9807270 };
async function sendToDiscord(tipo, titulo, detalhe) {
    if (!WEBHOOK_URL || WEBHOOK_URL.includes("SUA_URL")) return;
    const cor = DiscordColors[tipo] || DiscordColors.INFO;
    const hora = new Date().toLocaleTimeString('pt-BR');
    const payload = { embeds: [{ title: `${iconePorTipo(tipo)} ${titulo}`, description: detalhe ? `\`\`\`${detalhe}\`\`\`` : undefined, color: cor, footer: { text: `Horário: ${hora}` } }] };
    try { await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (err) { }
}
function iconePorTipo(tipo) { if (tipo === 'ONLINE') return '🟢'; if (tipo === 'RECEBIDO') return '📩'; if (tipo === 'ENVIADO') return '🤖'; if (tipo === 'ERRO') return '❌'; return '⚠️'; }
function logSystem(tipo, titulo, detalhe = '') { console.log(`${iconePorTipo(tipo)} ${titulo} | ${detalhe}`); sendToDiscord(tipo, titulo, detalhe); }

// --- DADOS ---
const userStages = {}; 
const botIniciadoEm = Math.floor(Date.now() / 1000);
const LISTA_VENDEDORES = [ { title: 'Nicolas Guimarães', description: 'Especialista em Comunicação Visual' }, { title: 'Gustavo Rocha', description: 'Especialista em Adesivos' }, { title: 'Isaque Panullo', description: 'Atendimento Geral' } ];
const CHAVE_PIX = "51.175.474/0001-05 (CNPJ)"; 
const BANCO_NOME = "Nubank";
const ENDERECO = "R. Neuza Fransisca dos Santos, 610 - Sumaré - SP";
const HORARIO_TEXTO = "Segunda a Sexta das 07h às 17h";

// --- INICIANDO O BOT ---
const sessaoNome = 'sessao-' + Math.floor(Math.random() * 10000);
addLog(`Criando nova sessão limpa: ${sessaoNome}`);

wppconnect.create({
    session: sessaoNome,
    headless: true,
    logQR: false,
    disableWelcome: true,
    updatesLog: false,
    autoClose: 0, 
    blockAssets: true, 
    catchQR: (base64Qr, asciiQR) => { qrCodeImagem = base64Qr; statusBot = 'Aguardando Leitura...'; addLog('QR Code gerado!'); },
    browserArgs: [ '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu', '--js-flags="--max-old-space-size=256"' ],
})
.then((client) => start(client))
.catch((error) => { statusBot = 'Erro Fatal (Reiniciando...)'; addLog('Erro: ' + error.message); });

function start(client) {
    statusBot = '✅ Conectado!'; qrCodeImagem = ''; addLog('Bot conectado!'); logSystem('ONLINE', 'Sistema Iniciado', `Aguardando conexão...`);
    client.onStateChange((state) => {
        addLog(`Estado mudou para: ${state}`);
        if (state === 'CONFLICT') client.useHere();
        if (state === 'CONNECTED') { statusBot = '✅ Conectado e Operando!'; logSystem('ONLINE', 'Conectado ao WhatsApp!', 'Pronto para atender'); }
    });

    client.onMessage(async (message) => {
        // 🔒 TRAVAS BÁSICAS
        if (!message || message.timestamp < botIniciadoEm) return;
        if (message.isGroupMsg || message.from === 'status@broadcast') return;

        // --- 🪄 COMANDO MÁGICO: #BOT ---
        // Se VOCÊ digitar #bot, ele ativa o menu para a pessoa que você está conversando
        if (message.fromMe && message.body.toLowerCase().trim() === '#bot') {
            const clienteAlvo = message.to; // O número para quem você mandou a mensagem
            logSystem('ENVIADO', '🪄 Ativação Manual (#bot)', `Para: ${clienteAlvo}`);
            
            // Força o envio do menu
            await enviarMenuPrincipal(client, clienteAlvo, 'Cliente (Manual)');
            return;
        }

        // Se for mensagem sua normal (não #bot), ignora
        if (message.fromMe) return;

        // --- LÓGICA PADRÃO PARA CLIENTES ---
        const userId = message.from;
        const userStage = userStages[userId] || 'INICIO';
        const nomeCliente = message.sender.pushname || message.notifyName || 'Cliente';
        logSystem('RECEBIDO', `De: ${nomeCliente}`, message.body);

        if (userStage === 'INICIO') {
            await enviarMenuPrincipal(client, userId, nomeCliente);
        }
        else if (userStage === 'AGUARDANDO_OPCAO' || userStage === 'AGUARDANDO_OPCAO_TEXTO') {
            const msg = (message.body || '').toLowerCase(); 
            const rowId = message.selectedRowId || '';
            if (msg.includes('vendedor') || msg === '1' || rowId === '1') {
                await client.sendListMessage(userId, { buttonText: 'SELECIONAR VENDEDOR', description: 'Preferência de atendimento:', title: 'Guimarães Sign', sections: [{ title: 'Opções:', rows: [{ rowId: 'fila', title: 'Primeiro da Fila', description: 'Rápido' }, { rowId: 'escolher', title: 'Escolher Vendedor', description: 'Lista' }] }] });
                userStages[userId] = 'ESCOLHENDO_TIPO_VENDEDOR';
            }
            else if (msg.includes('financeiro') || msg === '2' || rowId === '2') {
                await client.sendListMessage(userId, { buttonText: 'OPÇÕES FINANCEIRAS', description: 'Serviços financeiros:', title: 'Guimarães Sign', sections: [{ title: 'Selecione:', rows: [{ rowId: 'fin_pix', title: 'Dados para Pagamento', description: 'PIX' }, { rowId: 'fin_boleto', title: '2ª Via de Boleto', description: 'Solicitar via' }, { rowId: 'fin_humano', title: 'Falar com Atendente', description: 'Outros' }] }] });
                userStages[userId] = 'TRATANDO_FINANCEIRO';
            }
            else if (msg.includes('dúvida') || msg.includes('duvida') || msg === '3' || rowId === '3') {
                await client.sendText(userId, '🤖 *IA:* Pode perguntar! (Ex: Endereço, Horário, Serviços...)');
                userStages[userId] = 'FALANDO_COM_IA';
            }
        }
        // ... (Mantive o restante dos seus IFs aqui embaixo resumidos para caber) ...
        else if (userStage === 'ESCOLHENDO_TIPO_VENDEDOR') {
            if (message.body.includes('primeiro') || message.selectedRowId === 'fila') { await client.sendText(userId, `*⚡ URGÊNCIA*\n\n✅ Equipe notificada!`); logSystem('ENVIADO', '🚨 Urgência', nomeCliente); userStages[userId] = 'FINALIZADO'; }
            else { const rows = LISTA_VENDEDORES.map((v, i) => ({ rowId: `vend_${i}`, title: v.title, description: v.description })); await client.sendListMessage(userId, { buttonText: 'VER EQUIPE', description: 'Quem atende?', title: 'Guimarães Sign', sections: [{ title: 'Time', rows }] }); userStages[userId] = 'ESCOLHENDO_NOME'; }
        }
        else if (userStage === 'ESCOLHENDO_NOME') { await client.sendText(userId, `👋 Olá! Recebi sua notificação. Já venho te atender.`); userStages[userId] = 'FINALIZADO'; }
        else if (userStage === 'TRATANDO_FINANCEIRO') {
             if (message.selectedRowId === 'fin_pix') await client.sendText(userId, `🏦 *Banco:* ${BANCO_NOME}\n🔑 *PIX:* ${CHAVE_PIX}`);
             else await client.sendText(userId, 'Ok, financeiro notificado.');
             userStages[userId] = 'FINALIZADO';
        }
        else if (userStage === 'FALANDO_COM_IA') {
            const m = (message.body||'').toLowerCase();
            if(m==='sair'){ userStages[userId]='INICIO'; await client.sendText(userId, 'Menu reiniciado.'); return;}
            let r = 'Vou chamar alguém.';
            if(m.includes('onde')||m.includes('endereço')) r = ENDERECO;
            if(m.includes('hora')) r = HORARIO_TEXTO;
            await client.sendText(userId, r);
            if(!m.includes('onde') && !m.includes('hora')) userStages[userId] = 'FINALIZADO';
        }
    });

    // Função separada para enviar o menu (usada pelo cliente e por você no #bot)
    async function enviarMenuPrincipal(client, userId, nome) {
        const agora = new Date();
        const hora = agora.getHours();
        if (hora < HORARIO_ABERTURA || hora >= HORARIO_FECHAMENTO) {
            await client.sendText(userId, `Olá, ${nome}! 🌙\nEstamos fechados (07h às 17h), mas use o menu abaixo para urgências:`);
        }
        try {
            await client.sendListMessage(userId, {
                buttonText: 'ABRIR MENU', description: `Bem-vindo à ${NOME_EMPRESA}.`, title: 'Guimarães Sign',
                sections: [{ title: 'Opções:', rows: [{ rowId: '1', title: 'Vendedor', description: 'Orçamento' }, { rowId: '2', title: 'Financeiro', description: 'Boletos/PIX' }, { rowId: '3', title: 'Dúvida', description: 'Infos' }] }]
            });
            logSystem('ENVIADO', 'Menu Principal', `Para: ${nome}`);
            userStages[userId] = 'AGUARDANDO_OPCAO';
        } catch (e) {
            await client.sendText(userId, '1. Vendedor\n2. Financeiro\n3. Dúvida');
            userStages[userId] = 'AGUARDANDO_OPCAO_TEXTO';
        }
    }
}