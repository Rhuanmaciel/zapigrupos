import fs from 'fs/promises';
import fetch from 'node-fetch';
import readline from 'readline';

const INSTANCE_ID = '3D8351DB9BF2100E1079B2D4EBC7E202';
const TOKEN = '71F4EAB463D13B6836F9B96F';
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;
const GROUP_NAME_PREFIX = 'OnlyPublic - ';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Função para perguntar ao usuário
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// Função para fazer uma solicitação HTTP com logs
const makeRequest = async (url, method, body) => {
  const headers = { 'Content-Type': 'application/json', 'client-token': 'F79a0ddd1ab0e4606b574ed1c8194a3eaS' };
  console.log(`\n[LOG] Fazendo requisição:
    URL: ${url}
    Método: ${method}
    Headers: ${JSON.stringify(headers)}
    Body: ${body ? JSON.stringify(body, null, 2) : 'N/A'}
  `);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseBody = await response.text();
  console.log(`[LOG] Resposta da API:
    Status: ${response.status}
    Body: ${responseBody}
  `);

  if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);

  return JSON.parse(responseBody);
};

(async () => {
  try {
    // Perguntas ao usuário
    const numGroups = parseInt(await askQuestion('Quantos grupos deseja criar? '), 10);
    const startFrom = parseInt(await askQuestion('A partir de que número deseja criar? '), 10);

    rl.close();

    const groups = [];

    // Carrega participantes do arquivo admins.txt
    const admins = (await fs.readFile('src/admins.txt', 'utf-8'))
      .split('\n')
      .map((num) => num.trim())
      .filter(Boolean);

    if (admins.length === 0) {
      console.error('[ERRO] Nenhum participante encontrado no arquivo admins.txt');
      return;
    }

    console.log(`[LOG] Participantes carregados: ${admins.join(', ')}`);

    // Verifica se o arquivo grupos.json já existe
    let existingGroups = [];
    try {
      const existingData = await fs.readFile('src/grupos.json', 'utf-8');
      existingGroups = JSON.parse(existingData).grupos || [];
    } catch {
      console.log('[LOG] Nenhum arquivo grupos.json encontrado. Um novo será criado.');
    }

    // Criação dos grupos
    for (let i = startFrom; i < startFrom + numGroups; i++) {
      const groupName = `${GROUP_NAME_PREFIX}${String(i).padStart(3, '0')}`;

      // Criação do grupo
      const groupResponse = await makeRequest(`${BASE_URL}/create-group`, 'POST', {
        autoInvite: true, // Campo obrigatório para contornar a validação de números salvos
        groupName,
        phones: admins, // Adiciona os participantes aqui
      });

      if (!groupResponse.phone) {
        console.error(`[ERRO] Falha ao criar o grupo ${groupName}`);
        continue;
      }

      const groupId = groupResponse.phone;
      const invitationLink = groupResponse.invitationLink;
      groups.push({ groupId, groupName, invitationLink });

      console.log(`Grupo criado: ${groupName}, ID: ${groupId}`);
      console.log(`Link de convite: ${invitationLink}`);

      // Atualiza a foto do grupo
      await makeRequest(`${BASE_URL}/update-group-photo`, 'POST', {
        groupId,
        groupPhoto: 'https://upload.wikimedia.org/wikipedia/commons/6/66/CNN_International_logo.svg',
      });

      // Define a descrição do grupo
      const description = await fs.readFile('src/description.txt', 'utf-8');
      await makeRequest(`${BASE_URL}/update-group-description`, 'POST', {
        groupId,
        groupDescription: description.trim(),
      });

      // Promove os participantes a administradores
      await makeRequest(`${BASE_URL}/add-admin`, 'POST', {
        groupId,
        phones: admins,
      });

      // Define as configurações do grupo
      await makeRequest(`${BASE_URL}/update-group-settings`, 'POST', {
        phone: groupId,
        adminOnlyMessage: true,
        adminOnlySettings: true,
        requireAdminApproval: false,
        adminOnlyAddMember: false,
      });
    }

    // Adiciona os novos grupos aos grupos existentes
    const updatedGroups = [...existingGroups, ...groups];

    // Salva todos os grupos no arquivo grupos.json
    await fs.writeFile('src/grupos.json', JSON.stringify({ grupos: updatedGroups }, null, 2), 'utf-8');
    console.log('Metadados dos grupos salvos em grupos.json');
  } catch (error) {
    console.error('Erro:', error.message);
  }
})();
