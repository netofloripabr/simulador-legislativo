# Status de orientações — redesenho visual

Espelho local do documento de orientações do usuário (Google Docs,
formato Imagem / Orientações / Retorno). Existe porque a integração de
Google Drive que tenho só lê o texto do documento por padrão — as imagens
coladas nele eu só consegui ver exportando o Doc como PDF e lendo com o
Read; e não tenho permissão de escrever de volta no corpo do Doc, só de
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

**Status**: 🟢 concluído e publicado ([`efa6ac5`](https://github.com/netofloripabr/simulador-legislativo/commit/efa6ac5) e commits anteriores).

**Retorno**: a tela de *login* (não a de cadastro) tem um botão parecido,
"Entrar com Google" — como o Google OAuth já lida com criar-ou-entrar
automaticamente, os dois textos hoje descrevem a mesma ação com palavras
diferentes. Não mexi nele porque a orientação falava só do de cadastro —
avisa se quiser que eu unifique os dois.

---

## 2. Lobby com cara de app (referência Nubank/BYD)

**Orientação**: "Eu quero uma versão que pareça mais com um lobby
bastante intuitivo e dinâmico e visual". Referência de organização:
Nubank (app "Nu Viagens" — faixa de ícones grandes por ação, banner
promocional, cards de destaque) e BYD (app do carro "Dolphin Mini" —
grade de ícones 2 colunas com ação clara em cada um, botão de destaque
largo, "Mais funções" expansível, aba fixa embaixo).

**Status**: 🟢 concluído e publicado.

**Retorno**: mockup aprovado em 3 rodadas (a primeira, depois "mais
destaque nos atalhos, mais suavidade no Mais funções", depois o meio-termo
final). `renderPainelPrincipal()` (interface/prospeccao.js) ganhou: banner
"Convide amigos" com brilho suave (leva pra Grupos), grade 2x2 de atalhos
com ícone em círculo + subtítulo com dado real (nº de listas, nº de
grupos — Mediana fica com texto fixo pra não pesar a tela com uma busca
cara só pra um número), e "Mais funções" discreto com Central de ajuda
(agora acessível pra convidado também, sem pedir cadastro, já que é
conteúdo fixo sem depender de conta — criei a rota `ajuda-convidado` pra
isso). Classes novas em css/estilo.css (`.pc-lobby-banner`, `.pc-lobby-
atalho`, `.pc-lobby-mais`), sem mexer no resto do app. Testado no
navegador: banner, atalhos e Central de ajuda funcionando pra convidado
e voltando pro lugar certo.

---

## 3. Notificações com destaque laranja

**Orientação**: notificações precisam de identificação visual diferente
pra chamar atenção — borda laranja no mesmo padrão do card atual, com
brilho/iluminação suave. Imagem de referência: o card "Ops..." (aviso de
limite de lista/grupo grátis atingido) em "Minhas listas".

**Status**: 🟢 concluído e publicado ([`efa6ac5`](https://github.com/netofloripabr/simulador-legislativo/commit/efa6ac5)).

**Retorno**: criada a classe `.pc-aviso-card` (css/estilo.css) — borda e
brilho suave em `var(--pc-warning)` (laranja que o projeto já usava,
nenhuma cor nova). Aplicada nos dois cards "Ops..." que já existiam
(limite de lista e de grupo grátis) — são as únicas "notificações" desse
tipo no app hoje; se você tiver outro card em mente me diz qual.

---

## 4. Tela pós-depósito: lista completa + card de compartilhamento

**Orientação**: depois de depositar a lista, gerar algo visual com a
lista completa e um card de publicação/compartilhamento. Imagem de
referência: a tela de uma lista já depositada em "Minhas listas" (nome,
data do depósito, abas Dep. Estadual/Federal/Senador).

**Status**: 🟢 concluído e publicado ([`efa6ac5`](https://github.com/netofloripabr/simulador-legislativo/commit/efa6ac5)).

**Retorno**: essa tela (detalhe de uma lista depositada) já mostrava a
lista completa por cargo — só faltava o card de compartilhamento
acessível ali mesmo. Adicionei um botão "Compartilhar" no topo dessa
tela, que abre o mesmo modal de cédula/imagem (código, WhatsApp,
Instagram, baixar imagem) que já existia na listagem geral — antes só
dava pra compartilhar voltando pra tela anterior.

---

## 5. "Quadro de médias" → "Mediana"

**Orientação**: renomear "Quadro de médias" para "Mediana". Não usar mais
dado da eleição de 2022 — calcular a mediana dos palpites que os próprios
usuários deram no sistema (incluindo os 155 usuários fictícios/bots).

**Status**: 🟢 concluído e publicado ([`efa6ac5`](https://github.com/netofloripabr/simulador-legislativo/commit/efa6ac5)).

**Retorno**: renomeado em todo texto visível (menu, aba fixa, cabeçalho,
Política de Privacidade). O cálculo já era mediana aparada dos palpites
reais (não média simples) desde 04/08/2026 — a única coisa de 2022 que
sobrava era um FALLBACK: candidato sem nenhum palpite ainda mostrava o
voto real de 2022 dele, disfarçado de "resultado". Removido — agora
mostra 0 e a etiqueta "sem palpite ainda" em vez de "sem palpite (usa
2022)". Os 155 bots contam normalmente assim que existirem palpites
deles no sistema — não precisei de nenhuma regra especial pra isso, é
só mais gente respondendo.

---

## 6. Card-convite "Meu palpite - eleições 2026"

**Orientação**: card de convite compartilhável, com esse nome. Colunas
por cargo (Estadual/Federal/Senador), mostrando os 7 primeiros de cada
cargo de deputado + o primeiro colocado do Senado, com o resto da lista
"apagado/escondido" como chamativo pra pessoa conhecer a lista completa.
Usuário pediu explicitamente para prototipar antes de programar. Imagem
de referência: o modal de compartilhamento atual (cédula com código,
abas por cargo, lista numerada, WhatsApp/Instagram/baixar imagem).

**Status**: 🟢 concluído e publicado.

**Retorno**: mockup ajustado em 2 rodadas (corte reduzido pra 4 deputados
+ 1 senador, mini-card por candidato com cotação, Estadual/Federal
paralelos e Senador embaixo, efeito de esconder de verdade). Implementado
como `gerarImagemCedulaResumo()` (interface/prospeccao.js) — desenha os 3
cargos juntos num canvas 1080×1920 (mesmo formato Stories da cédula
oficial que já existia), com os candidatos "escondidos" desenhados num
canvas separado, borrados de verdade (`ctx.filter = blur`) e recortados
com degradê de opacidade, não só uma cor sólida por cima. Não troquei a
cédula oficial por cargo que já existia (`gerarImagemCedula`, usada pra
conferir posição real no ranking) — são coisas diferentes, essa nova é
só pra divulgação. Adicionei o botão "Baixar 'Meu palpite' (3 cargos)"
no modal de Compartilhar que já existe, ao lado do que já tinha. Testado
gerando a imagem com dados reais de SC — bateu com o protótipo aprovado.
