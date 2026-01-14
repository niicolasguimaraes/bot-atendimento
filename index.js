const wppconnect = require('@wppconnect-team/wppconnect');
const http = require('http');

// --- ⚙️ CONFIGURAÇÕES ---
const PORT = process.env.PORT || 8080;
const NOME_EMPRESA = "Guimarães Sign";

// --- VARIÁVEIS ---
let qrCodeParaSite = '';
let statusBot = 'Iniciando...';

// --- 🌐 SITE (Para ver o QR Code na SquareCloud) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    let html = `
    <html>
        <head>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #f0f2f5; padding: 50px; }
                .card { background: white; padding: 20px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                h1 { color: #008069; }
                img { border: 5px solid #ddd; border-radius: 10px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 ${NOME_EMPRESA}</h1>
                <p>Status: <b>${statusBot}</b></p>
                ${qrCodeParaSite ? `<img src="${qrCodeParaSite}" width="250">` : '<p>⏳ Carregando QR Code...</p>'}
            </div>
        </body>
    </html>`;
    res.end(html);
});
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// --- 🤖 INICIANDO O WPPCONNECT ---
wppconnect.create({
    session: 'sessao-guimaraes',
    headless: true, // Importante para rodar na nuvem
    logQR: false,
    catchQR: (base64Qr, asciiQR) => {
        qrCodeParaSite = base64Qr;
        statusBot = 'Aguardando Leitura...';
        console.log('QR Code gerado!');
    },
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
})
.then((client) => start(client))
.catch((error) => console.log(error));

function start(client) {
    statusBot = '✅ Conectado e Operando!';
    qrCodeParaSite = ''; 
    console.log('Bot conectado com sucesso!');

    client.onMessage(async (message) => {
        if (message.isGroupMsg || message.from === 'status@broadcast') return;
        
        // Comando manual #bot
        if (message.fromMe && message.body === '#bot') {
             await enviarMenu(client, message.to);
             return;
        }
        if (message.fromMe) return;

        // Responde qualquer mensagem com o menu
        await enviarMenu(client, message.from);
    });
}

async function enviarMenu(client, numero) {
    // Tenta enviar MENU DE LISTA (Bonito)
    try {
        await client.sendListMessage(numero, {
            buttonText: 'ABRIR MENU',
            description: 'Selecione uma opção abaixo:',
            title: `Olá! Bem-vindo à ${NOME_EMPRESA}`,
            sections: [
                {
                    title: 'Como podemos ajudar?',
                    rows: [
                        { rowId: '1', title: 'Falar com Vendedor', description: 'Orçamentos e Projetos' },
                        { rowId: '2', title: 'Financeiro', description: 'PIX e Boletos' },
                        { rowId: '3', title: 'Endereço', description: 'Localização' }
                    ]
                }
            ]
        });
    } catch (e) {
        // Se der erro (iPhone antigo ou web), manda texto normal
        await client.sendText(numero, `Bem-vindo à ${NOME_EMPRESA}!\n\n1. Vendedor\n2. Financeiro\n3. Endereço`);
    }
}