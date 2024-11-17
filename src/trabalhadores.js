import fs from 'fs';
import request from 'request';

// Lê o arquivo trabalhadores.txt
const trabalhadores = fs.readFileSync('src/trabalhadores.txt', 'utf8')
  .split('\n')
  .map(num => num.trim())
  .filter(num => num); // Remove linhas vazias

// Lê o arquivo grupos.json e faz o parse do JSON
const grupos = JSON.parse(fs.readFileSync('src/grupos.json', 'utf8')).grupos;

// Configuração base da requisição
const BASE_URL = 'https://api.z-api.io/instances/3D834E550B1F300CEAA7B2D4EBC7E202/token/56915AAF76C156136A4D0FED/add-participant';
const CLIENT_TOKEN = 'F082d22609ac34ecdb37fc2f80e8690acS';

// Função para adicionar participantes a um grupo
function adicionarParticipantes(groupId, phones) {
  const options = {
    method: 'POST',
    url: BASE_URL,
    headers: {
      'content-type': 'application/json',
      'client-token': CLIENT_TOKEN,
    },
    body: {
      groupId,
      phones,
    },
    json: true,
  };

  request(options, (error, response, body) => {
    if (error) {
      console.error(`Erro ao adicionar participantes no grupo ${groupId}:`, error);
    } else {
      console.log(`Resposta para o grupo ${groupId}:`, body);
    }
  });
}

// Itera sobre os grupos e adiciona os participantes
grupos.forEach(grupo => {
  console.log(`Adicionando participantes ao grupo ${grupo.groupName} (${grupo.groupId})...`);
  adicionarParticipantes(grupo.groupId, trabalhadores);
});
