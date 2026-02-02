const wppconnect = require('@wppconnect-team/wppconnect');

// --- 🕒 CRONÔMETRO DE INICIALIZAÇÃO ---
const BOT_START_TIME = Math.floor(Date.now() / 1000);

// --- ⚙️ CONFIGURAÇÕES GERAIS ---
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
const lastInterventionDate = {}; // 🆕 NOVA VARIÁVEL: Guarda a data da intervenção humana

wppconnect.create({
    session: 'sessao-fixa-guimaraes',
    headless: true,
    logQR: true,
    browserArgs: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    autoClose: false,
})
.then((client) => start(client))
.catch((error) => console.log(error));

function start(client) {
    console.log(`${C.green}🟢 BOT ONLINE E INTEGRADO COM RESET DIÁRIO!${C.reset}`);

    client.onAnyMessage(async (message) => {
        // 🛑 1. BLOQUEIO DE MENSAGENS ANTIGAS
        if (message.timestamp < BOT_START_TIME) return;

        try {
            const bodyTexto = (message.body || '').trim();
            const msgTexto = bodyTexto.toLowerCase();
            const rowId = message.selectedRowId || message.listResponse?.singleSelectReply?.selectedRowId || '';
            
            // Define quem é o alvo da conversa
            const clienteId = message.fromMe ? message.to : message.from;
            
            // Pega a data de hoje (string simples, ex: "Fri Oct 20 2023")
            // Isso serve para saber se "virou o dia"
            const hoje = new Date().toDateString();

            // --- 🔄 LÓGICA DE RESET AUTOMÁTICO NA VIRADA DO DIA ---
            // Se o bot estava silenciado pelo humano, mas o dia mudou (hoje != data salva), reseta tudo.
            if (userStages[clienteId] === 'SILENCIOSO_HUMANO') {
                const dataSalva = lastInterventionDate[clienteId];
                
                if (dataSalva && dataSalva !== hoje) {
                    console.log(`${C.cyan}🌙 Novo dia detectado para ${clienteId}. Reativando bot automaticamente.${C.reset}`);
                    delete userStages[clienteId]; // Remove o silêncio
                    // O código vai continuar descendo e vai cair no 'INICIO' lá embaixo, enviando o menu.
                }
            }

            // Pega o estágio atual (pode ter acabado de ser resetado acima)
            let userStage = userStages[clienteId] || 'INICIO';

            // --- 🛑 DETECÇÃO DE INTERVENÇÃO HUMANA ---
            if (message.fromMe) {
                if (msgTexto === '#bot') {
                    // segue o fluxo para resetar manualmente
                } 
                else {
                    // Se VOCÊ mandou mensagem, salvamos a data de hoje e silenciamos
                    console.log(`${C.yellow}✋ Intervenção Humana para ${clienteId}. Bot silenciado até virar o dia.${C.reset}`);
                    userStages[clienteId] = 'SILENCIOSO_HUMANO';
                    lastInterventionDate[clienteId] = hoje; // 🆕 Salva a data de hoje
                    return;
                }
            }

            // Se ainda estiver em silêncio (e for o mesmo dia), ignora a mensagem do cliente
            if (userStage === 'SILENCIOSO_HUMANO') {
                if (msgTexto === '#bot') {
                    // deixa passar para resetar forçado
                } else {
                    return; // Cliente falou, mas você assumiu hoje. O bot fica quieto.
                }
            }

            const nomeCliente = message.sender.pushname || message.notifyName || 'Cliente';

            if (message.isGroupMsg || message.from === 'status@broadcast') return;

            // --- 👑 COMANDO #BOT (RESET MANUAL) ---
            if (msgTexto === '#bot') {
                delete userStages[clienteId];
                delete lastInterventionDate[clienteId]; // Limpa a data também
                await enviarMenuPrincipal(client, clienteId);
                userStages[clienteId] = 'AGUARDANDO_OPCAO';
                return;
            }

            // --- ETAPA: INICIO ---
            // Se o userStage era 'SILENCIOSO_HUMANO' e virou o dia, ele foi deletado lá em cima
            // e agora vai entrar aqui como 'INICIO', enviando o menu automaticamente.
            if (userStage === 'INICIO') {
                userStages[clienteId] = 'PROCESSANDO_INICIO'; 

                const agora = new Date();
                const horaAtual = agora.getHours();

                // 🌙 Verifica se está fora do expediente
                if (horaAtual < HORARIO_ABERTURA || horaAtual >= HORARIO_FECHAMENTO) {
                    await client.sendText(clienteId, `Olá, ${nomeCliente}! 🌙\n\nNo momento nosso time já encerrou o expediente (Atendemos das 07h às 17h).\n\nSua mensagem foi registrada, mas se precisar de algo urgente, use o menu abaixo 👇`);
                    await new Promise(res => setTimeout(res, 1000));
                }

                await enviarMenuPrincipal(client, clienteId);
                userStages[clienteId] = 'AGUARDANDO_OPCAO';
            }

            // --- ETAPA: MENU PRINCIPAL ---
            else if (userStage === 'AGUARDANDO_OPCAO') {
                if (rowId === '1' || msgTexto.includes('vendedor') || msgTexto.includes('orcamento')) {
                    await client.sendListMessage(clienteId, {
                        buttonText: 'VER OPÇÕES',
                        description: 'Como deseja ser atendido?',
                        title: 'Guimarães Sign',
                        sections: [{ title: 'Opções:', rows: [
                            { rowId: 'fila', title: 'O Primeiro da Fila', description: 'O Primeiro Vendedor Disponível.' },
                            { rowId: 'escolher', title: 'Escolher Vendedor', description: 'Ver Lista de Nomes' }
                        ]}]
                    });
                    userStages[clienteId] = 'ESCOLHENDO_TIPO_VENDEDOR';
                }
                else if (rowId === '2' || msgTexto.includes('financeiro')) {
                    await client.sendListMessage(clienteId, {
                        buttonText: 'OPÇÕES',
                        description: 'Qual serviço financeiro você precisa?',
                        title: 'Guimarães Sign',
                        sections: [{ title: 'Serviços:', rows: [
                            { rowId: 'fin_pix', title: 'Dados para Pagamento', description: 'PIX' }, 
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

            // --- ETAPA: VENDEDOR ---
            else if (userStage === 'ESCOLHENDO_TIPO_VENDEDOR') {
                if (rowId === 'fila') {
                    await client.sendText(clienteId, 'Perfeito! Em instantes, o nosso primeiro vendedor disponível irá realizar o seu atendimento!');
                    userStages[clienteId] = 'INICIO';
                } 
                else if (rowId === 'escolher' || msgTexto.includes('escolher')) {
                    const rowsVendedores = LISTA_VENDEDORES.map((v, i) => ({
                        rowId: `vend_${i}`,
                        title: v.title,
                        description: v.description
                    }));
                    await client.sendListMessage(clienteId, {
                        buttonText: 'VER EQUIPE',
                        description: 'Selecione o vendedor de sua preferência:',
                        title: 'Guimarães Sign',
                        sections: [{ title: 'Nossos Vendedores:', rows: rowsVendedores }]
                    });
                    userStages[clienteId] = 'ESCOLHENDO_NOME';
                }
            }

            // --- ETAPA: FINALIZAÇÃO VENDEDOR ---
            else if (userStage === 'ESCOLHENDO_NOME') {
                let nomeVendedor = bodyTexto;
                if (rowId.startsWith('vend_')) {
                    const index = rowId.split('_')[1];
                    nomeVendedor = LISTA_VENDEDORES[index].title;
                }
                await client.sendText(clienteId, `✅ *${nomeVendedor.toUpperCase()}* foi notificado e te chamará em instantes!`);
                userStages[clienteId] = 'INICIO';
            }

            // --- ETAPA: FINANCEIRO ---
            else if (userStage === 'TRATANDO_FINANCEIRO') {
                if (rowId === 'fin_pix') {
                    await client.sendText(clienteId, `🏦 *Banco:* ${BANCO_NOME}\n🔑 *PIX:* ${CHAVE_PIX}`);
                } else {
                    await client.sendText(clienteId, 'Nossa equipe financeira foi notificada e entrará em contato.');
                }
                userStages[clienteId] = 'INICIO';
            }

            // --- ETAPA: IA / DÚVIDAS ---
            else if (userStage === 'FALANDO_COM_IA') {
                let resposta = 'Vou chamar um atendente para te ajudar com isso!';
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
        description: `Bem-vindo à Guimarães Sign. Como podemos te ajudar hoje?`,
        title: 'Guimarães Sign',
        sections: [{ title: 'Selecione:', rows: [
            { rowId: '1', title: 'Falar com Vendedor', description: 'Orçamentos e Pedidos' },
            { rowId: '2', title: 'Financeiro', description: 'Boletos e Pix' },
            { rowId: '3', title: 'Tirar Dúvida', description: 'Suporte e Localização' }
        ]}]
    });
}