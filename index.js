const wppconnect = require('@wppconnect-team/wppconnect');
const http = require('http'); // Adicionado para criar o servidor falso

// --- ⚙️ CONFIGURAÇÕES ---
const PORT = process.env.PORT || 8080; // Pega a porta que o Render der ou usa 8080
const NOME_EMPRESA = "Guimarães Sign";
const HORARIO_ABERTURA = 7; 
const HORARIO_FECHAMENTO = 17; 
const WEBHOOK_URL = "SUA_URL_DO_WEBHOOK_AQUI"; 

// --- 🚑 SERVIDOR FALSO PARA O RENDER NÃO DERRUBAR ---
// Isso cria uma paginazinha web simples só para o Render ver que está tudo "ok"
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Guimaraes Sign esta ONLINE!');
});
server.listen(PORT, () => {
    console.log(`[SERVIDOR] Fake server rodando na porta ${PORT} para o Render.`);
});

// --- RESTO DAS CONFIGURAÇÕES ---
const userStages = {}; 
const botIniciadoEm = Math.floor(Date.now() / 1000);
const LISTA_VENDEDORES = [
    { title: 'Nicolas Guimarães', description: 'Especialista em Comunicação Visual' },
    { title: 'Gustavo Rocha', description: 'Especialista em Adesivos' },
    { title: 'Isaque Panullo', description: 'Atendimento Geral' }
];
const CHAVE_PIX = "00.000.000/0001-00 (CNPJ)"; 
const BANCO_NOME = "Banco Inter";
const ENDERECO = "Av. Principal, 100 - Centro";
const HORARIO_TEXTO = "Segunda a Sexta das 07h às 17h";

// --- INICIANDO O WPPCONNECT ---
wppconnect
  .create({
    session: 'meu-bot-visual',
    headless: true,
    logQR: true,
    autoClose: 0, // <--- IMPORTANTE: 0 significa "Nunca desligue esperando o QR Code"
    browserArgs: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
  })
  .then((client) => start(client))
  .catch((error) => console.log('[ERRO FATAL]', error));

function start(client) {
  console.log('[SISTEMA] Bot iniciado com sucesso!');
  
  // Força o envio da log para o terminal (importante para o Render ver)
  client.onStateChange((state) => {
      console.log('[ESTADO]', state);
      if (state === 'CONFLICT') client.useHere(); // Se abrir em outro lugar, força voltar pra cá
  });

  client.onMessage(async (message) => {
    // ... (MANTENHA TODO O SEU CÓDIGO DE LÓGICA DE ATENDIMENTO AQUI IGUALZINHO ANTES) ...
    // Vou resumir a lógica aqui para caber na resposta, mas você usa a mesma lógica do último código:
    
    if (message.timestamp < botIniciadoEm) return;
    if (message.fromMe) return;
    if (message.isGroupMsg || message.from === 'status@broadcast' || message.from.includes('@newsletter')) return;

    const userId = message.from;
    const userStage = userStages[userId] || 'INICIO';
    
    // ... COLE AQUI DENTRO O RESTO DAQUELA LÓGICA DE MENUS QUE JÁ FIZEMOS ...
    // (Se precisar que eu mande o bloco gigante inteiro de novo, me avisa, 
    // mas é só colar o conteúdo da função start anterior aqui)
  });
}