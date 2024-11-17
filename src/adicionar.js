import fs from 'fs';
import request from 'request';

// Função assíncrona para verificar o status de uma API
async function verificarStatusApi(api) {
    const options = {
        method: 'GET',
        url: `${api.url}/status`,
        headers: api.headers,
        json: true,
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                console.error(`Erro ao verificar o status da API ${api.url}:`, error);
                resolve(false);
            } else {
                if (body.connected && body.smartphoneConnected) {
                    console.log(`API ${api.url} está conectada.`);
                    resolve(true); // API está conectada
                } else {
                    console.log(`API ${api.url} está desconectada.`);
                    resolve(false); // API desconectada
                }
            }
        });
    });
}

// Função para enviar notificação de API desconectada
async function enviarNotificacao(apiDesconectada, apiAlerta, numeroNotificacao) {
    const options = {
        method: 'POST',
        url: `${apiAlerta.url}`,
        headers: {
            'Content-Type': 'application/json',
            'client-token': 'F79a0ddd1ab0e4606b574ed1c8194a3eaS',
        },
        body: {
            phone: numeroNotificacao,
            message: `A API (${apiDesconectada.whatsappNumber}) desconectou, favor verificar.`,
        },
        json: true,
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                console.error(`Erro ao enviar notificação de desconexão da API ${apiDesconectada.url}:`, error);
                reject(error);
            } else {
                console.log(`Notificação enviada para ${numeroNotificacao}: API ${apiDesconectada.whatsappNumber}.`);
                resolve(body);
            }
        });
    });
}

// Função para mover APIs desconectadas para o arquivo desconectado.json
function moverApiParaDesconectados(api) {
    const caminhoDesconectados = './src/desconectado.json';
    let desconectados = [];

    if (fs.existsSync(caminhoDesconectados)) {
        desconectados = JSON.parse(fs.readFileSync(caminhoDesconectados, 'utf8'));
    }

    desconectados.push(api);
    fs.writeFileSync(caminhoDesconectados, JSON.stringify(desconectados, null, 2), 'utf8');
    console.log(`API ${api.whatsappNumber} movida para desconectado.json.`);
}

async function verificarMetadadosGrupo(api, groupId, totalParticipants) {
    const options = {
        method: 'GET',
        url: `${api.url}/group-metadata/${groupId}`,
        headers: api.headers,
        json: true,
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                console.error(`Erro ao obter metadados do grupo ${groupId}:`, error);
                reject(error);
            } else {
                const participantes = body.participants || [];
                const numeroDeParticipantes = participantes.length;

                if (numeroDeParticipantes >= totalParticipants) {
                    console.log(`Grupo ${groupId} já atingiu o limite de participantes (${totalParticipants}).`);
                    resolve(true); // Já atingiu o limite
                } else {
                    console.log(`Grupo ${groupId} possui ${numeroDeParticipantes} participantes.`);
                    resolve(false); // Não atingiu o limite
                }
            }
        });
    });
}

// Função para remover números do arquivo TXT
function removerNumeroDoArquivo(filePath, numero) {
    const numeros = fs.readFileSync(filePath, 'utf8').split('\n').map(num => num.trim()).filter(num => num);
    const novosNumeros = numeros.filter(num => num !== numero);
    fs.writeFileSync(filePath, novosNumeros.join('\n'), 'utf8');
    console.log(`Número ${numero} removido do arquivo ${filePath}.`);
}

async function processarGrupo(grupo, apis, phones, apiAlerta, numeroNotificacao) {
    const filePath = './numeros/telefones.txt'; // Caminho do arquivo de números
    let phoneIndex = 0;
    const totalParticipants = 1000; // Limite de participantes por grupo

    while (phoneIndex < phones.length) {
        if (apis.length === 0) {
            console.log('Todas as APIs estão desconectadas. Encerrando processamento.');
            break;
        }

        // Adiciona participantes com todas as APIs simultaneamente
        const tarefas = apis.map(async (api) => {
            console.log(`Testando conexão da API: ${api.url}`);
            const conectado = await verificarStatusApi(api);

            if (!conectado) {
                await enviarNotificacao(api, apiAlerta, numeroNotificacao);
                moverApiParaDesconectados(api);

                // Remove API desconectada da lista de APIs em uso
                const index = apis.indexOf(api);
                if (index > -1) {
                    apis.splice(index, 1);
                }
                return; // Sai da função para esta API
            }

            try {
                const participantesNoGrupo = await verificarMetadadosGrupo(api, grupo.groupId, totalParticipants);
                if (participantesNoGrupo) {
                    console.log(`Grupo ${grupo.groupId} já atingiu o limite de participantes (${totalParticipants}).`);
                    return; // Não adiciona mais participantes
                }

                if (phoneIndex >= phones.length) {
                    console.log('Não há mais números para adicionar.');
                    return;
                }

                const phone = phones[phoneIndex];
                phoneIndex += 1;

                await adicionarParticipantes(api, grupo, [phone]);
                removerNumeroDoArquivo(filePath, phone); // Remove o número do arquivo após a adição

                // Espera após cada adição para evitar bloqueios
                console.log(`API ${api.url} esperando intervalo aleatório...`);
                await esperarAleatorio(60, 120); // Entre 60 e 120 segundos
            } catch (error) {
                console.error(`Erro ao processar grupo ${grupo.groupId} com a API ${api.url}:`, error);
            }
        });

        // Aguarda todas as APIs terminarem suas tarefas
        await Promise.all(tarefas);
    }
}

// Função para adicionar participantes a um grupo
async function adicionarParticipantes(api, grupo, phones) {
    const options = {
        method: 'POST',
        url: `${api.url}/add-participant`,
        headers: api.headers,
        body: {
            autoInvite: true,
            groupId: grupo.groupId,
            phones: phones,
        },
        json: true,
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                console.error('Erro ao adicionar participantes:', error);
                reject(error);
            } else {
                console.log(`Adicionados ${phones.length} participantes ao grupo ${grupo.groupId}. Resposta:`, body);
                resolve(body);
            }
        });
    });
}

// Função para esperar um tempo aleatório
async function esperarAleatorio(min, max) {
    const tempo = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Esperando por ${tempo} segundos...`);
    return new Promise(resolve => setTimeout(resolve, tempo * 1000)); // Convertendo segundos para milissegundos
}

// Função principal
async function main() {
    const apis = lerJson('./src/apis.json').apis;
    const grupos = lerJson('./src/grupos.json').grupos;
    const phones = lerNumerosDeTelefone('./numeros/telefones.txt');
    const apiAlerta = {
        url: 'https://api.z-api.io/instances/3D8351DB9BF2100E1079B2D4EBC7E202/token/71F4EAB463D13B6836F9B96F/send-text',
    };
    const numeroNotificacao = '5511977029253';

    for (const grupo of grupos) {
        console.log(`Processando grupo ${grupo.groupId}`);
        await processarGrupo(grupo, apis, phones, apiAlerta, numeroNotificacao);
        console.log(`Grupo ${grupo.groupId} processado.`);
    }

    console.log('Todos os números foram adicionados.');
}

// Funções utilitárias para ler arquivosdds
function lerNumerosDeTelefone(filePath) {
    return fs.readFileSync(filePath, 'utf8').split('\n').map(num => num.trim()).filter(num => num);
}

function lerJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

main();
