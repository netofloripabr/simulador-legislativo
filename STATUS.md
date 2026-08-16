# Status de orientações — redesenho visual

Espelho local do documento de orientações do usuário (Google Docs,
formato Imagem / Orientações / Retorno). Existe porque a integração de
Google Drive que tenho só lê o texto do documento — não vejo as imagens
coladas nele, e não tenho permissão de escrever de volta no Doc, só de
ler. Este arquivo é onde eu escrevo o retorno de verdade; o Doc continua
sendo a fonte das orientações.

**Como usar**: cada item abaixo tem a orientação (copiada do Doc), o que
falta de mim (imagem de referência, decisão, etc.) e o status. Eu atualizo
este arquivo a cada avanço e aviso no chat — não preciso copiar nada de
volta pro Doc.

Legenda: 🔴 bloqueado (esperando algo) · 🟡 em andamento · 🟢 concluído e
publicado (site + repositório) · ⚪ ainda não iniciado

---

## 1. Botão de login: "Acessar com o Google"

**Orientação**: trocar o texto do botão de "Cadastrar com o Google" para
"Acessar com o Google".

**Status**: 🟢 concluído — [interface/prospeccao.js](interface/prospeccao.js)
(botão da tela "Criar conta").

**Retorno**: não precisava de imagem, mudança direta de texto. Reparei
que a tela de *login* (não a de cadastro) tem um botão parecido, "Entrar
com Google" — como o Google OAuth já lida com criar-ou-entrar
automaticamente, os dois textos hoje descrevem a mesma ação com palavras
diferentes. Não mexi nele porque a orientação falava só do de cadastro —
me avisa se quiser que eu unifique os dois pra "Acessar com o Google"
também.

---

## 2. Lobby com cara de app (referência Nubank/BYD)

**Orientação**: versão do painel principal que pareça mais com um lobby
intuitivo, dinâmico e visual — referência de organização: Nubank e BYD.

**Status**: 🔴 bloqueado — preciso das imagens de referência (Nubank/BYD)
pra saber especificamente o que você gostou nelas (cards grandes? cores
por categoria? hierarquia diferente?).

**Retorno**: já existe um protótipo anterior desse mesmo painel (feito
antes deste documento existir, sem as referências Nubank/BYD) — não sei
se é a mesma direção que você tem em mente agora ou se as referências
pedem algo diferente. Vou esperar a imagem antes de mexer, pra não refazer
errado.

---

## 3. Notificações com destaque laranja

**Orientação**: notificações precisam de identificação visual diferente
pra chamar atenção — borda laranja no mesmo padrão do card atual, com
brilho/iluminação suave.

**Status**: 🔴 bloqueado — preciso da imagem de referência pra bater a cor
exata e a intensidade do brilho que você imaginou.

**Retorno**: nada implementado ainda.

---

## 4. Tela pós-depósito: lista completa + card de compartilhamento

**Orientação**: depois de depositar a lista, gerar algo visual com a
lista completa e um card de publicação/compartilhamento.

**Status**: 🔴 bloqueado — a orientação no Doc não veio com imagem (célula
"IMAGEM" apareceu vazia); preciso entender melhor o que esse "algo
visual" deveria mostrar (a lista inteira em forma de cartão? um resumo?).

**Retorno**: relacionado ao item 6 (card-convite "Meu palpite") — pode
ser a mesma peça ou uma diferente, confirma pra mim.

---

## 5. "Quadro de médias" → "Mediana"

**Orientação**: renomear "Quadro de médias" para "Mediana". Mudar a
lógica: não usar mais dado da eleição de 2022 — calcular a mediana dos
palpites que os próprios usuários deram no sistema (incluindo os 155
usuários fictícios/bots).

**Status**: ⚪ ainda não iniciado — não bloqueado por imagem, mas é uma
mudança de cálculo (não só nome), quero confirmar o critério antes de
programar.

**Retorno**: preciso confirmar: "mediana dos palpites" é a mediana de
votos por candidato entre todas as listas depositadas? Ou mediana de
vagas por partido? E isso deve rodar mesmo com poucos depósitos reais
(hoje, antes dos 155 bots existirem de verdade no sistema), ou só faz
sentido mostrar depois que os bots estiverem rodando?

---

## 6. Card-convite "Meu palpite - eleições 2026"

**Orientação**: card de convite compartilhável, com esse nome. Colunas
por cargo (Estadual/Federal/Senador), mostrando os 7 primeiros de cada
cargo de deputado + o primeiro colocado do Senado, com o resto da lista
"apagado/escondido" como chamativo pra pessoa conhecer a lista completa.
Usuário pediu explicitamente para prototipar antes de programar.

**Status**: ⚪ ainda não iniciado — não bloqueado por imagem (a orientação
já é bem específica), mas vou seguir o pedido: protótipo primeiro, só
programo depois de aprovado.

**Retorno**: nada feito ainda — é o próximo que consigo atacar sem
esperar imagem, se a ordem de prioridade permitir.
