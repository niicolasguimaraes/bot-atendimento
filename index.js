const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const app = express();
app.use(express.json());

// --- 🕒 CRONÔMETRO E CONFIGURAÇÕES ---
const BOT_START_TIME = Math.floor(Date.now() / 1000);
const NOME_EMPRESA = "Guimarães Sign";
const HORARIO_ABERTURA = 7;
const HORARIO_FECHAMENTO = 17;
const C = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m" };

// --- 📋 DADOS DA EMPRESA ---
const CHAVE_PIX = "51.175.474/0001-05 (CNPJ)";
const BANCO_NOME = "Nubank";
const ENDERECO = "R. Neuza Fransisca dos Santos, 610 - Sumaré - SP";
const HORARIO_TEXTO = "Segunda a Sexta das 07h às 17h";

const LISTA_VENDEDORES = [
    { title: 'Nicolas Guimarães', description: 'Especialista em Comunicação Visual' },
    { title: 'Gustavo Rocha', description: 'Especialista em Adesivos' },
    { title: 'Isaque Panullo', description: 'Atendimento Geral' }
];

const userStages = {};
const lastInterventionDate = {};

// --- 🚀 INICIALIZAÇÃO ---
wppconnect.create({
    session: 'sessao-fixa-guimaraes',
    headless: true,
    logQR: true,
    browserArgs: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    autoClose: false,
})
.then((client) => {
    configurarAPI(client);
    start(client);
})
.catch((error) => console.log(error));

// 🌐 --- ROTA DE INTEGRAÇÃO COM O SITE ---
function configurarAPI(client) {
    app.post('/enviar-mensagem', async (req, res) => {
        const { numero, mensagem, nomeAtendente } = req.body;
        try {
            const textoFinal = `👤 *Atendimento: ${nomeAtendente.toUpperCase()}*\n` +
                               `━━━━━━━━━━━━━━━\n\n` +
                               `${mensagem}`;

            const idWhatsApp = numero.includes('@c.us') ? numero : `${numero.replace(/\D/g, '')}@c.us`;
            
            await client.sendText(idWhatsApp, textoFinal);
            
            // Silencia o bot
            userStages[idWhatsApp] = 'SILENCIOSO_HUMANO';
            lastInterventionDate[idWhatsApp] = new Date().toDateString();

            res.status(200).json({ status: 'Sucesso' });
        } catch (error) {
            res.status(500).json({ status: 'Erro', msg: error.message });
        }
    });

    app.listen(3000, () => {
        console.log(`${C.green}🌐 API INTEGRADA: Ouvindo o site na porta 3000${C.reset}`);
    });
}

// 🤖 --- LÓGICA PRINCIPAL DO BOT ---
function start(client) {
    console.log(`${C.green}🟢 BOT ONLINE E PRONTO PARA ATENDIMENTO!${C.reset}`);

    client.onAnyMessage(async (message) => {
        if (message.timestamp < BOT_START_TIME) return;
        if (message.isGroupMsg || message.from === 'status@broadcast') return;

        try {
            const bodyTexto = (message.body || '').trim();
            const msgTexto = bodyTexto.toLowerCase();
            const rowId = message.selectedRowId || message.listResponse?.singleSelectReply?.selectedRowId || '';
            const clienteId = message.fromMe ? message.to : message.from;
            const hoje = new Date().toDateString();

            // --- 🔄 RESET DIÁRIO AUTOMÁTICO ---
            if (userStages[clienteId] === 'SILENCIOSO_HUMANO') {
                if (lastInterventionDate[clienteId] !== hoje) {
                    console.log(`${C.cyan}🌙 Novo dia para ${clienteId}. Bot reativado.${C.reset}`);
                    delete userStages[clienteId];
                }
            }

            // --- 🛑 MONITORAMENTO MANUAL (WHATSAPP DIRETO) ---
            if (message.fromMe) {
                if (msgTexto === '#bot') {
                    delete userStages[clienteId];
                    delete lastInterventionDate[clienteId];
                    return;
                }
                
                // Trava anti-loop para não processar mensagens do próprio sistema
                if (msgTexto.includes('atendente:') || msgTexto.includes('atendimento:') || message.type === 'list') return;

                // Se você digitou algo manual no celular/PC, o bot avisa o cliente e silencia
                let nomeNoCabecalho = (message.id.startsWith('3EB0') || message.id.length > 20) ? "NICOLAS (PC)" : "JÚLIA (CELULAR)";
                await client.sendText(clienteId, `👤 *Atendente: ${nomeNoCabecalho}*`);
                
                userStages[clienteId] = 'SILENCIOSO_HUMANO';
                lastInterventionDate[clienteId] = hoje;
                return;
            }

            // Se o bot estiver silenciado para este cliente hoje, ignora tudo
            if (userStages[clienteId] === 'SILENCIOSO_HUMANO' && msgTexto !== '#bot') return;

            let userStage = userStages[clienteId] || 'INICIO';

            // --- 👑 COMANDO RESET ---
            if (msgTexto === '#bot') {
                delete userStages[clienteId];
                delete lastInterventionDate[clienteId];
                await enviarMenuPrincipal(client, clienteId);
                userStages[clienteId] = 'AGUARDANDO_OPCAO';
                return;
            }

            // --- FLUXO DE ESTÁGIOS ---
            if (userStage === 'INICIO') {
                const agora = new Date();
                const horaAtual = agora.getHours();
                const nomeCliente = message.sender.pushname || 'Cliente';

                if (horaAtual < HORARIO_ABERTURA || horaAtual >= HORARIO_FECHAMENTO) {
                    await client.sendText(clienteId, `Olá, ${nomeCliente}! 🌙\n\nNo momento nosso time encerrou o expediente (07h às 17h).\n\nSua mensagem foi registrada!`);
                    await new Promise(res => setTimeout(res, 800));
                }

                await enviarMenuPrincipal(client, clienteId);
                userStages[clienteId] = 'AGUARDANDO_OPCAO';
            }

            else if (userStage === 'AGUARDANDO_OPCAO') {
                if (rowId === '1' || msgTexto.includes('vendedor')) {
                    await client.sendListMessage(clienteId, {
                        buttonText: 'VER OPÇÕES',
                        description: 'Como deseja ser atendido?',
                        title: NOME_EMPRESA,
                        sections: [{ title: 'Opções:', rows: [
                            { rowId: 'fila', title: 'O Primeiro da Fila', description: 'Vendedor disponível agora.' },
                            { rowId: 'escolher', title: 'Escolher Vendedor', description: 'Ver lista de nomes.' }
                        ]}]
                    });
                    userStages[clienteId] = 'ESCOLHENDO_TIPO_VENDEDOR';
                }
                else if (rowId === '2' || msgTexto.includes('financeiro')) {
                    await client.sendListMessage(clienteId, {
                        buttonText: 'OPÇÕES',
                        description: 'Qual serviço financeiro precisa?',
                        title: NOME_EMPRESA,
                        sections: [{ title: 'Serviços:', rows: [
                            { rowId: 'fin_pix', title: 'Dados para Pagamento', description: 'PIX e Banco' },
                            { rowId: 'fin_humano', title: 'Falar com Atendente', description: 'Outros assuntos' }
                        ]}]
                    });
                    userStages[clienteId] = 'TRATANDO_FINANCEIRO';
                }
                else if (rowId === '3' || msgTexto.includes('duvida')) {
                    await client.sendText(clienteId, '🤖 Pode perguntar sua dúvida (Endereço, Horário, etc...)!');
                    userStages[clienteId] = 'FALANDO_COM_IA';
                }
            }

            else if (userStage === 'ESCOLHENDO_TIPO_VENDEDOR') {
                if (rowId === 'fila') {
                    await client.sendText(clienteId, '✅ Perfeito! Um vendedor disponível falará com você em instantes.');
                    userStages[clienteId] = 'INICIO';
                } else if (rowId === 'escolher') {
                    const rowsVendedores = LISTA_VENDEDORES.map((v, i) => ({
                        rowId: `vend_${i}`,
                        title: v.title,
                        description: v.description
                    }));
                    await client.sendListMessage(clienteId, {
                        buttonText: 'VER EQUIPE',
                        description: 'Selecione o vendedor:',
                        title: NOME_EMPRESA,
                        sections: [{ title: 'Nossos Vendedores:', rows: rowsVendedores }]
                    });
                    userStages[clienteId] = 'ESCOLHENDO_NOME';
                }
            }

            else if (userStage === 'ESCOLHENDO_NOME') {
                let nomeVendedor = bodyTexto;
                if (rowId.startsWith('vend_')) {
                    nomeVendedor = LISTA_VENDEDORES[rowId.split('_')[1]].title;
                }
                await client.sendText(clienteId, `✅ Localizando *${nomeVendedor}*...`);
                await new Promise(res => setTimeout(res, 1500));
                
                const cabecalho = `━━━━━━━━━━━━━━━\n` +
                                  `👤 *ATENDIMENTO:* ${nomeVendedor.toUpperCase()}\n` +
                                  `━━━━━━━━━━━━━━━\n\n` +
                                  `Olá! Sou o(a) *${nomeVendedor.split(' ')[0]}*, como posso ajudar?`;

                await client.sendText(clienteId, cabecalho);
                userStages[clienteId] = 'INICIO';
            }

            else if (userStage === 'TRATANDO_FINANCEIRO') {
                if (rowId === 'fin_pix') {
                    await client.sendText(clienteId, `🏦 *Banco:* ${BANCO_NOME}\n🔑 *PIX:* ${CHAVE_PIX}`);
                } else {
                    await client.sendText(clienteId, '🔔 O financeiro foi notificado e já vai te chamar.');
                }
                userStages[clienteId] = 'INICIO';
            }

            else if (userStage === 'FALANDO_COM_IA') {
                let resposta = 'Vou chamar um atendente para te ajudar!';
                if (msgTexto.includes('endereco') || msgTexto.includes('onde')) resposta = `📍 *Endereço:* ${ENDERECO}`;
                if (msgTexto.includes('horario') || msgTexto.includes('hora')) resposta = `🕒 *Horário:* ${HORARIO_TEXTO}`;
                await client.sendText(clienteId, resposta);
                userStages[clienteId] = 'INICIO';
            }

        } catch (e) {
            console.log(`${C.red}ERRO: ${e}${C.reset}`);
        }
    });
}

async function enviarMenuPrincipal(client, userId) {
    await client.sendListMessage(userId, {
        buttonText: 'ABRIR MENU',
        description: `Bem-vindo à Guimarães Sign. Como podemos ajudar?`,
        title: NOME_EMPRESA,
        sections: [{ title: 'Selecione:', rows: [
            { rowId: '1', title: 'Falar com Vendedor', description: 'Orçamentos e Pedidos' },
            { rowId: '2', title: 'Financeiro', description: 'Boletos e Pix' },
            { rowId: '3', title: 'Tirar Dúvida', description: 'Suporte e Localização' }
        ]}]
    });
}