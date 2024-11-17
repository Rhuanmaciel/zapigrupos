Aqui esta o funcionamento desses codigos

# Adicionar.js

Ele funciona para a seguinte coisa, adicionar pessoas que vao ser futuros clientes nos grupos, ele pega as apis do apis.json para adicionar e numeros.txt da pasta numeros pra adicionar

# Criar.js

Ele é o codigo responsavel por criar e configurar os grupos, ele usa o admin.txt pra importar um numero para o grupo alem do criador para ser admin, esse numero sera responsavel por adicionar os trabalhadores que vou explicar abaixo como funciona, esse numero vai ser o responsavel por enviar midias nos grupos

# Trabalhadores.js

Esse codigo responsavel por importar os numeros responsaveis pelo adicionamento em massa dos numeros de clientes nos grupos, ele usa a api do numero admin que foi importado na criação do grupo e setado como admin (não criador do grupo), o codigo vai usar o admin como falamos anteriormente, vai usar o trabalhadores.txt para importar todos os numeros responsaveis pela adição de pessoas, nesse txt contem apenas os numeros que vai adicionar as pessoas, nao esta o numero do criador do grupo que esta no criar.js nem o do admin

# Apis.js

Esse codigo é responsavel por carregar todas as apis dentro do apis.json, esse sera usado pelo adicionar.js para adiconar pessoas nos grupos, como o trabalhadores.js e criar.js utilizam apis unicas ja que eles funcionam pra funções expecificas, o apis.json deve ser apenas usado pra adicionar as apis dos numeros do trabalhadores.txt, apenas numeros responsaveis pelo adicionamento de numeros de possiveis cliente, nada mais
