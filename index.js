const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const http = require('http');
const QRCode = require('qrcode');

// --- ⚙️ CONFIGURAÇÕES ---
const PORT = process.env.PORT || 8080;
const NOME_EMPRESA = "Guimarães Sign";
const HORARIO_ABERTURA = 7;
const HORARIO_FECHAMENTO = 17;
const WEBHOOK_URL = "https://discordapp.com/api/webhooks/1461009453410291826/deimejV9KMK2QuAcYn33OlS_i_yZy0RUZfJifI7MBtWh6-5y349NLNkX3S3MQikSTTOg"; 
const PASTA_SESSAO = 'auth_info_baileys'; // Nome da pasta da sessão

// --- 🧹 LIMPEZA AUTOMÁTICA (A CORREÇÃO DO LOOP) ---
// Isso apaga a sessão velha/corrompida toda vez que o bot reinicia
try {
    if (fs.existsSync(PASTA_SESSAO)) {
        fs.rmSync(PASTA_SESSAO, { recursive: true, force: true });
        console.log('🗑️ Sessão antiga apagada com sucesso! Pronto para gerar novo QR.');
    }
} catch (e) {
    console.log('⚠️ Info: Nenhuma sessão para apagar ou erro ignorável.');
}

// --- VARIÁVEIS GLOBAIS ---
let qrCodeDataURL = ''; 
let statusBot = 'Iniciando e Limpando...';
let logsRecentes = [];

// Função de Logs
function addLog(texto) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    logsRecentes.push(`[${hora}] ${texto}`);
    if (logsRecentes.length > 7) logsRecentes.shift(); 
    console.log(texto);
    if(texto.includes('Erro') || texto.includes('Conectado')) sendToDiscord('INFO', 'Log Sistema', texto);
}

// --- 🌐 SITE (WEB VIEW LEVE) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const logsHtml = logsRecentes.map(l => `<div style="font-size:12px; color:#aaa; border-bottom:1px solid #333; padding:2px;">${l}</div>`).join('');

    let conteudoPrincipal = '';
    if (statusBot.includes('Conectado')) {
        conteudoPrincipal = `<h2 style="color:#00ff88">✅ ${statusBot}</h2><p>Bot Online! 🚀<br>Use <b>#bot</b> no WhatsApp para testar.</p>`;
    } else {
        conteudoPrincipal = `
            ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" style="border: 5px solid white; border-radius: 10px; width: 250px;" />` : '<div style="padding:30px; border:2px dashed #555; color: #aaa;">⏳ Gerando QR Code...<br>(Aguarde uns segundos)</div>'}
            <p style="color: #ffcc00; font-size: 13px; margin-top: 15px;">DICA: Sessão limpa! Escaneie assim que aparecer.</p>
        `;
    }

    let html = `
    <html>
        <head>
            <meta http-equiv="refresh" content="3">
            <style>
                body { font-family: monospace; text-align: center; padding: 20px; background: #121212; color: white; }
                .box { background: #1e1e1e; padding: 20px; border-radius: 10px; display: inline-block; max-width: 600px; width: 90%; }
                .logs { margin-top: 20px; text-align: left; background: #000; padding: 10px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🤖 ${NOME_EMPRESA}</h1>
            <div class="box">
                <p>Status: <span style="font-weight:bold; color:#00d2ff">${statusBot}</span></p>
                ${conteudoPrincipal}
                <div class="logs"><b>Terminal:</b><br>${logsHtml}</div>
            </div>
        </body>
    </html>
    `;
    res.end(html);
});
server.listen(PORT, () => addLog(`Painel Web rodando na porta ${PORT}`));

// --- 🤖 LÓGICA DO BAILEYS ---
const userStages = {}; 

async function connectToWhatsApp() {
    // Usa a constante PASTA_SESSAO para garantir que estamos usando o mesmo nome
    const { state, saveCreds } = await useMultiFileAuthState(PASTA_SESSAO);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["Guimaraes Bot", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000, 
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            statusBot = 'Aguardando Leitura...';
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) qrCodeDataURL = url;
            });
            addLog('Novo QR Code gerado.');
        }

        if (connection === 'close') {
            const erroCodigo = (lastDisconnect.error)?.output?.statusCode;
            const shouldReconnect = erroCodigo !== DisconnectReason.loggedOut;
            
            addLog(`Conexão fechada (Erro: ${erroCodigo}). Reconectando? ${shouldReconnect}`);
            
            if (shouldReconnect) {
                statusBot = 'Reconectando em 5s...';
                // 👇 AQUI ESTÁ O FREIO: Espera 5 segundos antes de tentar de novo
                setTimeout(connectToWhatsApp, 5000);
            } else {
                statusBot = 'Desconectado (Sessão Encerrada)';
                addLog('Sessão encerrada manualmente. Bot vai limpar tudo no próximo reinício.');
            }
        } else if (connection === 'open') {
            statusBot = '✅ Conectado e Online!';
            qrCodeDataURL = ''; 
            addLog('Conexão aberta com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Monitora Mensagens
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        const isStatus = msg.key.remoteJid === 'status@broadcast';
        if (isGroup || isStatus) return;

        const userId = msg.key.remoteJid;
        const textoRecebido = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const textoLower = textoRecebido.toLowerCase();

        // --- COMANDO MÁGICO #BOT ---
        if (msg.key.fromMe) {
            if (textoLower === '#bot') {
                addLog(`Comando #bot ativado para ${userId}`);
                await enviarMenu(sock, userId, "Cliente (Manual)");
            }
            return; 
        }

        // --- LÓGICA DE ATENDIMENTO ---
        addLog(`Msg de ${userId}: ${textoRecebido}`);
        
        const estagio = userStages[userId] || 'INICIO';

        if (estagio === 'INICIO') {
            const hora = new Date().getHours();
            if (hora < HORARIO_ABERTURA || hora >= HORARIO_FECHAMENTO) {
                await sock.sendMessage(userId, { text: `🌙 *Olá!* Estamos fora do horário de atendimento (07h às 17h).\nSe for urgente, use o menu abaixo.` });
            }
            await enviarMenu(sock, userId, msg.pushName || 'Cliente');
            userStages[userId] = 'MENU';
        } 
        else if (estagio === 'MENU') {
            if (textoLower === '1' || textoLower.includes('vendedor')) {
                await sock.sendMessage(userId, { text: `*👨‍💼 Falar com Vendedor*\n\n1. Atendimento Rápido (Fila)\n2. Escolher Vendedor da Lista\n\n_Digite o número:_` });
                userStages[userId] = 'VENDEDOR';
            } 
            else if (textoLower === '2' || textoLower.includes('financeiro')) {
                await sock.sendMessage(userId, { text: `*💰 Financeiro*\n\n1. Dados do PIX\n2. 2ª Via de Boleto\n3. Falar com Humano\n\n_Digite o número:_` });
                userStages[userId] = 'FINANCEIRO';
            } 
            else if (textoLower === '3' || textoLower.includes('duvida')) {
                await sock.sendMessage(userId, { text: `🤖 *IA:* Pode perguntar! (Ex: "Qual o endereço?", "Horário de funcionamento?")\n\nDigite *sair* para voltar.` });
                userStages[userId] = 'IA';
            } else {
                await sock.sendMessage(userId, { text: '❌ Opção inválida. Digite 1, 2 ou 3.' });
            }
        }
        else if (estagio === 'VENDEDOR') {
            if (textoLower === '1') {
                await sock.sendMessage(userId, { text: `✅ *Urgência Solicitada!*\nNossa equipe foi notificada e já vai te chamar.` });
                sendToDiscord('ENVIADO', '🚨 Urgência', userId);
                userStages[userId] = 'FIM';
            } else {
                await sock.sendMessage(userId, { text: `*Nossa Equipe:*\n\n👤 Nicolas Guimarães\n👤 Gustavo Rocha\n👤 Isaque Panullo\n\n_Aguarde um momento, vou transferir._` });
                userStages[userId] = 'FIM';
            }
        }
        else if (estagio === 'FINANCEIRO') {
            if (textoLower === '1') {
                await sock.sendMessage(userId, { text: `🏦 *Nubank*\n🔑 PIX (CNPJ): 51.175.474/0001-05` });
            } else {
                await sock.sendMessage(userId, { text: `Ok! O financeiro já vai analisar sua solicitação.` });
            }
            userStages[userId] = 'FIM';
        }
        else if (estagio === 'IA') {
            if (textoLower === 'sair') {
                userStages[userId] = 'INICIO';
                await sock.sendMessage(userId, { text: '🔄 Reiniciando...' });
                return;
            }
            let resposta = 'Vou chamar um humano para responder isso.';
            if (textoLower.includes('onde') || textoLower.includes('endereço')) resposta = '📍 R. Neuza Fransisca dos Santos, 610 - Sumaré - SP';
            if (textoLower.includes('hora')) resposta = '🕒 Seg a Sex, das 07h às 17h';
            
            await sock.sendMessage(userId, { text: resposta });
            if (!textoLower.includes('onde') && !textoLower.includes('hora')) userStages[userId] = 'FIM';
        }

    });
}

// Helper para enviar menu
async function enviarMenu(sock, jid, nome) {
    const textoMenu = `👋 Olá, *${nome}*! Bem-vindo à ${NOME_EMPRESA}.\n\nDigite o número da opção:\n\n1️⃣ *Falar com Vendedor* (Orçamento)\n2️⃣ *Financeiro* (PIX/Boletos)\n3️⃣ *Tirar Dúvida* (Endereço/Horário)`;
    await sock.sendMessage(jid, { text: textoMenu });
}

// Discord Helper (Simples)
async function sendToDiscord(tipo, titulo, detalhe) {
    if (!WEBHOOK_URL.startsWith('http')) return;
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [{ title: `${tipo} - ${titulo}`, description: detalhe, color: 5763719 }] })
        });
    } catch (e) {}
}

// Inicia
connectToWhatsApp();