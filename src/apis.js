import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'request'; // Certifique-se de ter instalado este pacote com npm install request

// Obtém o diretório do arquivo atual (substituto para __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fileName = path.join(__dirname, 'apis.json'); // Define o caminho para o arquivo JSON

// Função auxiliar para fazer perguntas ao usuário
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Função que lê o arquivo JSON (se existir) ou cria um novo array se não existir
function loadJsonFile() {
  if (fs.existsSync(fileName)) {
    const fileData = fs.readFileSync(fileName, 'utf8');
    try {
      const parsedData = JSON.parse(fileData);
      // Ajusta o formato caso o JSON seja apenas um array
      if (Array.isArray(parsedData)) {
        return { apis: parsedData };
      }
      // Se o JSON não contém a chave 'apis', inicializa corretamente
      if (!parsedData.apis) {
        parsedData.apis = [];
      }
      return parsedData;
    } catch (e) {
      console.log('Arquivo JSON está corrompido. Iniciando um novo.');
      return { apis: [] };
    }
  } else {
    return { apis: [] }; // Se o arquivo não existir, cria um novo objeto com a estrutura correta
  }
}

// Função para verificar o status da instância (usando a URL fornecida e adicionando o sufixo /status)
function checkInstanceStatus(url, clientToken) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      url: `${url}/status`, // Adiciona automaticamente o sufixo /status
      headers: {
        accept: 'application/json',
        'client-token': clientToken,
      },
    };

    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
}

// Função principal que coleta os dados do usuário e adiciona novas APIs
async function addApi() {
  let jsonData = loadJsonFile();

  // Gerar o próximo ID baseado no tamanho atual da lista de APIs
  let nextId = jsonData.apis.length ? jsonData.apis[jsonData.apis.length - 1].id + 1 : 1;

  try {
    // Perguntas para coletar informações
    const instanceId = await askQuestion('Digite o número da instância do WhatsApp: ');
    const url = await askQuestion('Digite a URL da API: ');
    const contentType = await askQuestion('Digite o Content-Type (padrão: application/json): ');
    const clientToken = await askQuestion('Digite o Client-Token: ');

    // Verifica o status da instância usando a URL fornecida
    console.log('Verificando o status da instância...');
    try {
      const status = await checkInstanceStatus(url, clientToken);
      console.log('Status da Instância:', status);

      // Se o status for verificado com sucesso, continua com a coleta de dados e salva
      jsonData.apis.push({
        id: nextId,
        url: url, // Salva a URL sem o sufixo /status
        headers: {
          'content-type': contentType || 'application/json', // Usa o valor padrão se o usuário não fornecer
          'client-token': clientToken,
        },
        whatsappNumber: instanceId, // Armazena o número da instância
      });

      // Salva o JSON no arquivo após adicionar a API
      const data = JSON.stringify(jsonData, null, 2);
      fs.writeFileSync(fileName, data);
      console.log(`API adicionada e salva no arquivo ${fileName}`);

      const another = await askQuestion('Deseja adicionar outra API? (s/n): ');

      if (another.toLowerCase() === 's') {
        await addApi();
      } else {
        console.log('Processo finalizado.');
        rl.close();
      }
    } catch (statusError) {
      console.error('Erro ao verificar o status da instância:', statusError);
      rl.close();
    }
  } catch (err) {
    console.error('Erro ao adicionar API:', err);
    rl.close();
  }
}

// Inicia o processo de adicionar APIs
addApi();
