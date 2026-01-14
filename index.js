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

// --- VARIÁVEIS GLOBAIS ---
let pastaSessaoAtual = 'sessao_inicial'; // Começa com um nome padrão
let qrCodeDataURL = ''; 
let statusBot = 'Iniciando...';
let logsRecentes = [];

function addLog(texto) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    logsRecentes.push(`[${hora}] ${texto}`);
    if (logsRecentes.length > 10) logsRecentes.shift(); 
    console.log(texto);
    if(texto.includes('Erro') || texto.includes('Conectado')) sendToDiscord('INFO', 'Log Sistema', texto);
}

// --- 🌐 SITE ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const logsHtml = logsRecentes.map(l => `<div style="font-size:12px; color:#aaa; border-bottom:1px solid #333; padding:2px;">${l}</div>`).join('');

    let conteudoPrincipal = '';
    if (statusBot.includes('Conectado')) {
        conteudoPrincipal = `<h2 style="color:#00ff88">✅ ${statusBot}</h2><p>Bot Online! 🚀<br>Use <b>#bot</b> no WhatsApp para testar.</p>`;
    } else {
        conteudoPrincipal = `
            ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" style="border: 5px solid white; border-radius: 10px; width: 250px;" />` : '<div style="padding:30px; border:2px dashed #555; color: #aaa;">⏳ Gerando QR Code...<br>(Se demorar, aguarde o reinício automático)</div>'}
            <p style="color: #ffcc00; font-size: 13px; margin-top: 15px;">Tentativa atual: ${pastaSessaoAtual}</p>
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
    // 👇 A MÁGICA: Gera um nome novo TODA VEZ que tenta conectar
    // Se a conexão falhar, na próxima tentativa ele cria uma pasta limpa do zero.
    const novaSessao = 'sessao_' + Math.floor(Math.random() * 100000);
    pastaSessaoAtual = novaSessao;
    
    addLog(`🔄 Iniciando nova tentativa de conexão na pasta: ${pastaSessaoAtual}`);
    
    const { state, saveCreds } = await useMultiFileAuthState(pastaSessaoAtual);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        // 👇 Mudei para Ubuntu/Chrome para parecer mais "confiável" pro WhatsApp
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
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
            
            addLog(`Conexão fechada (Erro: ${erroCodigo}). Tentando nova sessão...`);
            
            // 👇 LIMPEZA: Apaga a pasta que deu erro para não encher o disco
            try { fs.rmSync(pastaSessaoAtual, { recursive: true, force: true }); } catch(e){}

            if (shouldReconnect) {
                statusBot = 'Trocando Sessão...';
                // Espera 3 segundos e tenta de novo com UMA NOVA PASTA
                setTimeout(connectToWhatsApp, 3000);
            } else {
                statusBot = 'Desconectado permanentemente.';
                addLog('Fim da linha.');
            }
        } else if (connection === 'open') {
            statusBot = '✅ Conectado e Online!';
            qrCodeDataURL = ''; 
            addLog('SUCESSO! Bot conectado.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (isGroup) return;

        const userId = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const textoLower = texto.toLowerCase();

        if (msg.key.fromMe && textoLower === '#bot') {
            addLog(`Comando #bot para ${userId}`);
            await enviarMenu(sock, userId, "Cliente");
            return;
        }
        if (msg.key.fromMe) return;

        addLog(`Msg de ${userId}: ${texto}`);
        
        const estagio = userStages[userId] || 'INICIO';

        if (estagio === 'INICIO') {
            await enviarMenu(sock, userId, msg.pushName || 'Cliente');
            userStages[userId] = 'MENU';
        } 
        else if (estagio === 'MENU') {
            if (texto === '1') { await sock.sendMessage(userId, { text: '✅ Vendedor solicitado!' }); userStages[userId] = 'FIM'; }
            else if (texto === '2') { await sock.sendMessage(userId, { text: '💰 Pix: 51.175.474/0001-05' }); userStages[userId] = 'FIM'; }
            else if (texto === '3') { await sock.sendMessage(userId, { text: '📍 Endereço: R. Neuza Fransisca, 610' }); userStages[userId] = 'FIM'; }
            else { await sock.sendMessage(userId, { text: 'Opção inválida. Digite 1, 2 ou 3.' }); }
        }
    });
}

async function enviarMenu(sock, jid, nome) {
    const texto = `👋 Olá, *${nome}*! Bem-vindo à ${NOME_EMPRESA}.\n\n1️⃣ Vendedor\n2️⃣ Financeiro\n3️⃣ Endereço`;
    await sock.sendMessage(jid, { text: texto });
}

async function sendToDiscord(tipo, titulo, detalhe) {
    if (!WEBHOOK_URL.startsWith('http')) return;
    try { await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [{ title: `${tipo} - ${titulo}`, description: detalhe, color: 5763719 }] }) }); } catch (e) {}
}

connectToWhatsApp();