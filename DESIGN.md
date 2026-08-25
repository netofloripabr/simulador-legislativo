# Padrões de Design — Simulador Eleitoral 2026

Documento de **consulta**, não de decisão (as decisões e o histórico de como
se chegou nelas ficam em `PROJETO.md` §8.1/§8.2). Este arquivo existe pra
responder uma pergunta prática: *"estou construindo uma tela nova, o que eu
uso?"* — sem precisar reler o log de protótipos inteiro.

Regra de ouro do documento: todo valor aqui foi conferido direto em
`css/estilo.css` / `interface/prospeccao.js` no momento em que foi escrito
(18/08/2026). Se o código mudar e este arquivo não acompanhar, **o código
manda** — abra uma tarefa pra atualizar aqui, não confie cegamente nisto.

---

## 0. O que é "identidade 2.0 — Fader" em uma frase

Console de estúdio: monocromático (cinzas escuros em camadas), uma família
tipográfica só, e **uma única cor viva** (`#34E84A`) reservada pra coisas que
realmente aconteceram ou pedem atenção agora. Nunca decoração — se o verde
está em todo canto, ele parou de significar algo.

Hoje aplicado em: Senador, Deputado Estadual, Deputado Federal, Capa. Tudo
que não está nessa lista ainda é candidato à migração (ver `PROJETO.md`
"Páginas que faltam no roteiro").

---

## 1. Tokens

### 1.1 Cor

| Papel | Valor | Onde |
|---|---|---|
| Fundo da tela | `radial-gradient(ellipse 120% 60% at 50% -5%, #1B1E22 0%, #101214 48%, #0C0E10 100%)` | body do modo colaborativo |
| Card padrão | `rgba(29,32,35,.85)`, raio 12px | qualquer cartão de conteúdo |
| Card de eleito | mesma base + borda `rgba(242,244,245,.18)` | **nunca borda verde** aqui — é destaque neutro, não conquista |
| Material "console" | fundo `#2C3239`, borda `#4D545C`, raio 14px | cabeçalhos fixos, botões físicos, plenário |
| Filete/borda padrão | `#23262A` · `#26292D` · `#2B2F33` (do mais escuro ao mais claro, use o mais próximo do fundo local) | divisórias, contornos |
| Texto principal | `#F2F4F5` | nomes, valores, títulos |
| Texto secundário | `#8A9096` | subtítulos, legendas |
| Texto apagado | `#5C6268` | desabilitado, itens travados |
| **Verde vivo (estratégico)** | `#34E84A` | ver regra de uso abaixo — nunca de graça |
| Texto sobre verde vivo | `#07230C` | selo ELEITO e afins |
| Verde-lima (aviso) | `#C6E62A` | sobra, candidato provisório/RRC, alerta não-crítico (atualizado 18/08/2026, era âmbar `#FFB020`). **Só semântica de aviso/status** — nunca como destaque estrutural (pílula de seção, linha vencedora, botão): pra destacar um FATO, use o realce neutro do card de eleito (borda `rgba(242,244,245,.18)` + texto branco); correção do usuário em 18/08/2026, painel Disputa de Sobra |
| Vermelho-alaranjado (erro) | `#E8432A` | erro de validação, "fora hoje", excluir conta (atualizado 18/08/2026, era coral `#FF5A48`, referência trazida pelo usuário) |

**Regra do verde vivo** — só aparece em: selo ELEITO, preenchimento da barra
de progresso coletivo, halo enquanto uma alça está sendo arrastada, foco de
campo de edição, botão de ação primária (CTA). Nunca em fundo, texto
corrido, ícone em repouso ou card não-selecionado. A escassez é a função —
some o verde de um lugar e pergunte "isso realmente aconteceu ou precisa de
atenção agora?" antes de pôr de volta.

### 1.2 Tipografia

**Uma família só, no app inteiro — literalmente, não só na Prospecção
Coletiva.** `var(--sans)` → `'Inter', -apple-system, BlinkMacSystemFont,
'Segoe UI', sans-serif`. **Desde 19/08/2026 a Inter é REAL em qualquer
aparelho**: hospedada no próprio repositório
(`fontes/InterVariable.woff2`, variável 100–900, licença OFL junto) via
`@font-face` no topo do `css/estilo.css` — antes ela era só a primeira
opção da pilha sem nunca ser carregada, e cada visitante via a fonte do
sistema (SF Pro/Roboto/Segoe), inclusive no wordmark do cartão de
divulgação. O canvas do cartão-desafio também pede `Inter, sans-serif`
explicitamente. Fonte variável de propósito: cobre os pesos 650/750 da
escala abaixo, que arquivos estáticos arredondariam. Achado ao conferir o código pra este documento:
existe uma segunda variável, `var(--mono)`, usada em ~26 lugares do
Simulador individual "estilo terminal" — mas ela foi **redefinida pra
apontar pro mesmo stack de `--sans`** (ver `css/estilo.css` linhas 14–20,
mudança feita antes deste documento existir, pra não precisar trocar cada
uma das ~26 ocorrências uma por uma). Ou seja: **não existe mais fonte
monoespaçada real em nenhuma tela hoje** — o nome "mono" ficou só como
etiqueta histórica. Se um dia quiserem uma monoespaçada de verdade só no
Simulador individual, o ponto único de troca é essa variável, não sair
caçando as ~26 ocorrências.

Nunca trocar de família pra dar ênfase — só tamanho e peso variam. Números
sempre com `font-variant-numeric: tabular-nums` (impede o valor "dançar" de
largura quando muda, ex.: contador de votos ao vivo).

Escala de referência (card de candidato, o caso mais denso hoje):
- Nome: 14.5px / peso 650
- Número-herói (%): 22px / peso 750 (sufixo "%" menor, em tom apagado)
- Sublinha: 10.5px / `#8A9096`
- Rótulo dentro de barra: 9px / peso 700

**Pesos em uso hoje** (contagem real em `css/estilo.css` +
`interface/prospeccao.js`, do mais raro ao mais comum):

| Peso | Frequência | Uso típico |
|---|---|---|
| 400 | rara | corpo de texto solto |
| 600 | comum | subtítulo/rótulo com alguma ênfase |
| 650 | pontual | nome do candidato no card fader (ênfase específica, ver acima) |
| **700** | **a mais comum de longe** | padrão pra quase todo texto em destaque — botão, número, título de linha |
| 750 | pontual | número-herói (%), maior ênfase individual de um card |
| 800 | pontual | texto sobre pílula de cor sólida (selo ELEITO, "Rodada N") |
| 900 | **1 único lugar** (`.pc-stepper-count`, contador do stepper do fluxo 1.0) | exceção legada — não faz parte da escala oficial, não replicar em tela nova |

Regra prática: em dúvida entre pesos, comece em **700**. É o peso-padrão do
projeto — os outros são desvios pontuais e intencionais, não alternativas
neutras.

**Escala revisada e mantida de propósito (20/08/2026)**: foi prototipada
uma versão com dados ampliados (piso 15px, alvos 38-44px — artifact
"Acessibilidade visual") e o usuário decidiu MANTER a escala atual após
comparar lado a lado. Não repropor aumento de escala sem pedido novo.

### 1.3 Espaçamento e forma

- Raio padrão de card: 12px. Raio de material console: 14px.
- Cápsula/pílula (selo, aba ativa): raio total (`border-radius:999px` ou
  circular quando quadrado).
- `box-sizing: border-box` sempre em qualquer componente com padding +
  largura fixa/percentual — regra aprendida na dor (3 rodadas de protótipo
  perdidas com o painel de comandos por esquecer isso, ver
  `alesc_painel_comandos_responsivo.md`).

### 1.4 Degradês

Nenhum degradê do app é decorativo à toa — cada família tem um papel
específico. Hoje existem exatamente 6:

1. **Fundo da tela (vinheta + grão)** — o principal, o que dá o "clima" de
   toda a Prospecção Coletiva: `radial-gradient(ellipse 120% 60% at 50%
   -5%, #1B1E22 0%, #101214 48%, #0C0E10 100%)`, com uma segunda camada por
   cima — um ruído SVG (`feTurbulence`, opacidade 0.035, ladrilhado) só pra
   tirar a sensação de fundo "100% liso e digital demais". Quase
   imperceptível de propósito.
   - **Achado ao revisar pra este documento**: existe uma versão antiga
     (verde, da identidade 1.0) ainda presente no CSS (`css/estilo.css`
     linha 265) — mas a regra do tema Fader (linha 973) tem mais
     especificidade e sempre ganha, porque a classe `pc-tema-fader` hoje é
     global. Na prática, a versão verde está morta (nunca aparece), só não
     foi apagada do arquivo. Isso é seguro (zero efeito visual), mas é bom
     eu saber que ela existe pra não confundir com bug se alguém for ler o
     CSS direto.
2. **Metal das alças** (faders e grips de vagas) — degradês verticais
   escuros simulando metal escovado. 3 variações próximas (alça principal
   11×27px, mini-alça mestra 9×20px, grip do box de vagas em Deputados) —
   sempre cinza, nunca cor.
3. **Preenchimento do fader individual** — degradê horizontal cinza
   (`rgba(42,46,50,.75) → rgba(60,65,70,.97)`), o "sulco preenchido" de
   voto. Nunca colorido — o verde não mora aqui.
4. **Barra coletiva de progresso** — o **único** degradê que carrega a cor
   estratégica: `#34E84A 0% → #14602A 55% → #1D8038 100%`. Mede avanço
   real (quanto do total de votos válidos já foi distribuído) — por isso o
   verde aqui é literal, não decoração.
5. **Barra "meta" compacta** (nível partido, telas de Deputados) — cinza
   mais claro (`#C2C8CE → #4A5056 → #5F666D`), deliberadamente mais claro
   que o preenchimento do fader individual — a intenção é ler como
   indicador resumido/secundário, nunca como controle principal.
6. **Réguas e marcações (ticks)** — tecnicamente não são degradês de cor:
   são padrões repetidos (`repeating-linear-gradient`) simulando marcação
   física de régua, mais uma máscara em degradê (opaco → transparente →
   opaco) nas pontas, pra dar efeito de perspectiva — a régua "esmaece" nas
   bordas em vez de cortar seco.

Regra prática pra tela nova: se o degradê que você precisa não se encaixa
em nenhuma das 6 famílias acima, pare e pergunte por quê — é bem provável
que o problema já tenha solução em um desses padrões, e criar um sétimo
sem necessidade é o tipo de inconsistência que este documento existe pra
evitar.

---

## 2. Ícones

**Nunca** ícone de emoji, nem biblioteca genérica de IA (☰ 📊 👥 — já
usado por engano num protótipo de Lobby e rejeitado pelo usuário). Sempre
`iconeSvg(nome, tamanho)`, função em `interface/prospeccao.js`, biblioteca
de traço único (`currentColor`, então herda a cor do texto ao redor).

Nomes disponíveis hoje (`PC_ICONES`, mesmo arquivo): `ballot`, `send`,
`grupos`, `chart`, `ranking`, `reset`, `desfazer`, `borracha`, `alerta`,
`completar`, `ano2022`, `lista22`, `relogio22`, `refazer`, `mais`, `chave`,
`editar`, `ajuda`, `lista`, `calendario`, `convidar`, `compartilhar`,
`checkCirculo`, `home`, `perfil`, `impressora`, `setaEsquerda`,
`setaDireita`, `copiar`, `baixar`, `buscar`, `salvar`, `instagram`.

Se a tela nova precisa de um conceito que não tem ícone ainda: desenhar um
novo no mesmo traço (viewBox 16×16, `stroke-width` entre 1.2–1.4,
`fill="none"` quando possível) e adicionar em `PC_ICONES` — não importar de
fora, não usar emoji como ponte "provisória" (vira definitivo).

**Regra explícita contra o "estilo IA"**: nunca importar de uma biblioteca
de ícones reconhecível — Feather, Lucide, Heroicons, Material Symbols,
Font Awesome, Phosphor, Tabler etc. É exatamente esse glifo genérico e
"limpo demais" que faz uma tela parecer gerada por IA, mesmo quando o
resto do design é original. A biblioteca do projeto existe justamente pra
evitar isso: 32 ícones desenhados à mão, com a mesma personalidade de
traço entre si (levemente arredondados, `currentColor`, nunca preenchidos
de sólido a não ser em detalhes pequenos como um ponto). Ícone novo nasce
copiando essa personalidade — nunca colado de outro lugar, nem "só dessa
vez, depois eu troco".

**Escala de tamanho em uso hoje** (contagem real de todas as chamadas de
`iconeSvg()` no código):

| Faixa | Contexto |
|---|---|
| 11–13px | ícone inline dentro de texto pequeno (rótulo, badge, dica) |
| 14–17px | padrão geral — a maioria dos ícones do app está aqui |
| 18–19px | destaque de linha (item de menu, alerta que precisa chamar atenção) |
| 26–32px | hero — capa, estado vazio, ícone de tela inteira (usado raramente, de propósito) |

---

## 3. Componentes

### 3.1 Console (`.pc-console`)
Material de referência pra qualquer superfície de controle "física":
cabeçalho fixo de cargo, painel de comandos, cápsulas do plenário.
`background:#2C3239; border:1px solid #4D545C; border-radius:14px;`.
Textos dentro do console usam os tons mais claros da escala (`#AEB5BB`),
não o `#F2F4F5` do resto da tela — é uma superfície "de equipamento", leve
contraste a menos.

### 3.2 Case de cápsulas (plenário — `.pc-case-grade` / `.pc-case-cap`)
Substitui hemiciclo pra todo estado/cargo exceto **Assembleia SC**, que
mantém o arco (`desenharHemiciclo`) por decisão explícita do usuário.
Cápsula = círculo no mesmo material do botão de console:
`background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4)`,
monocromático (a sigla do partido dentro da cápsula já basta — legenda não
usa cor). Tamanho responsivo: até 26px por cápsula em grade normal, cai
pra 14px mínimo em bancadas grandes; bancadas pequenas (`.poucos`) usam
34px fixo em `flex`, não `grid`. Sempre agrupamento centralizado, sempre o
melhor aproveitamento de linha possível — nunca um número fixo de colunas
hardcoded pro cargo (o total de vagas varia por estado/cargo).

### 3.3 Fader — barra + alça (controle individual de voto)
- Trilho: 13px de altura, fundo no tom mais escuro do degradê local
  (`#0C0E10`), borda `#23262A` — efeito "sulco cavado". Régua de marcação
  a cada 10% (`rgba(138,144,150,.28)`), visível só na parte vazia.
- Preenchimento: degradê de cinzas (`rgba(42,46,50,.75) →
  rgba(60,65,70,.97)`) — **nunca claro/branco**, o verde não mora aqui, mora
  na barra coletiva. Número de votos escrito dentro do preenchimento
  (foge pra fora, na parte vazia, se a fatia for estreita).
- Alça: pílula 11×27px, metal escuro (`#5B6168 → #3A3F45 → #22262A →
  #3C4147`), borda `rgba(242,244,245,.18)`, halo verde só **durante** o
  arrasto.
- Barra coletiva (progresso do total): trilho de 5px, preenchimento
  **verde** (`#34E84A 0% → #14602A 52% → #1D8038 100%`), régua externa
  acima com ticks e máscara em degradê nas pontas.

### 3.4 Badge de proveniência do candidato (`.pc-dep-provisorio`)
Verde-lima `#C6E62A`, 10px/600, uma linha acima da linha de votos 2022. Dois
textos possíveis hoje:
- `fonte:"ficticio"` → "candidato fictício — nome de preenchimento até a
  ata real sair"
- `fonte:"rrc"` → "registro oficial (TSE) — ata de convenção ainda não
  publicada"

Ausência de `fonte` = candidato real, já confirmado por ata (sem badge).

### 3.4b Painel informativo / notificação (padrão aprovado 18/08/2026)
Referência: o "i" do quadro "Quem levou cada vaga de sobra" (Disputa de
Sobra, Revisão) — o usuário aprovou este conceito como padrão pra
**informações e notificações** em geral:
- Abertura por botão "i" no padrão console (`.pc-sen-inf`, com estado
  `.aberto` em verde vivo), nunca tooltip de hover — funciona no toque.
- Caixa embutida (não overlay): fundo `#101214`, borda `#23262A`, raio
  10px, padding ~10-12px.
- Texto corrido em `#8A9096` (11.5px, line-height 1.6); **termos-chave em
  branco** (`#F2F4F5`, bold); o número/valor decisivo em **verde-lima**
  (`#C6E62A`) — um só por caixa, é o "punchline".
- Sempre que possível, ilustrar a regra com os **números reais do estado
  atual da tela** (ex.: a 1ª sobra do cálculo em curso), não exemplo
  fixo inventado — dinâmico > genérico.

### 3.4c Logotipo / marca (aprovado 18/08/2026)
Wordmark **SIMULA·LEGIS** numa palavra só: "SIMULA" em texto principal
(`#F2F4F5`) + "LEGIS" em verde vivo (`#34E84A`), peso 750,
`letter-spacing:.05em`, mesma família do app (nunca fonte decorativa).
Nasceu no cartão-desafio e o usuário aprovou como marca. Regras:
- Só sobre fundo escuro da identidade (o verde vivo precisa do contraste).
- O "LEGIS" verde conta como uso estratégico do verde — em peças onde a
  marca aparece, ela divide a cota de verde com o CTA (evitar mais verdes
  além desses dois + selo ELEITO).

### 3.4d Logo/ícone da marca (aprovada 25/08/2026)
Além do wordmark acima, a marca tem um **ícone-selo** (app-icon-style):
quadrado arredondado `65×65px`, raio `16px`, fundo verde vivo (`#34E84A`),
o ícone `ballot` (`iconeSvg`) em `31px` por cima, cor `#07230C` (texto sobre
verde vivo, mesmo token do selo ELEITO). Usado hoje só na tela de
"Carregando…" (`telaCarregando()` + o placeholder estático de
`index.html`, que precisam ficar sempre em espelho um do outro) — mesmo
lugar que antes tinha um ícone genérico dentro de um círculo verde
translúcido.

**Respiração** (protótipo iterado em várias rodadas com o usuário,
25/08/2026 — valores finais, não repropor sem pedido novo):
- **Tamanho**: pulsa até 15% maior (`scale(1.15)`) no pico e volta — nunca
  mais que isso.
- **Halo**: círculo de `110px` atrás da logo, `radial-gradient` de
  `rgba(52,232,74,.18)` até transparente, acompanha o pulso de tamanho e
  opacidade da logo (`@keyframes pc-pulse`, já usado noutros lugares do
  app) — verde vivo puro, sem mistura de cor.
- **Cor da própria logo**: a logo tem 2 camadas de preenchimento
  sobrepostas — uma sólida (`#34E84A`) e uma em degradê
  (`radial-gradient(circle 95px at 123% -23%, #C6E62A 0%, #34E84A 65%,
  #1D8038 100%)`, origem ~15px FORA do ícone, canto superior direito) —
  cross-fade entre as duas, cada uma indo só até 50% de opacidade no pico
  (nunca uma troca 100%, é uma mistura sutil). O ícone (`#07230C`) fica
  por cima das duas camadas, sempre nítido, nunca perde opacidade.
- **Timing**: `3s`, curva `cubic-bezier(.37,0,.63,1)` (sine suave — começa
  e termina devagar, sem corte seco), pico em `62%` do ciclo (não 50%, pra
  passar mais tempo perto do estado-base) e **sem platô parado** — a
  sensação de movimento precisa estar sempre presente, nunca um trecho
  estático.
- **Sem legenda**: a própria respiração já comunica "carregando" — não
  repor texto abaixo da logo nessa tela específica.

### 3.5 Selo ELEITO
Pílula verde vivo (`#34E84A`) com texto `#07230C`, 8px/800. Único elemento
da lista que é **sempre** verde, mesmo fora de interação — porque é fato
consumado, não estado de controle.

### 3.6 Botões e controles pequenos (aplicados globalmente via `.pc-tema-fader`)
- `button.primary`: fundo/borda `#34E84A`, texto `#07230C` — ação principal
  da tela, no máximo uma por tela visível de cada vez.
- `button.ghost`: sem fundo, borda `#2B2F33`, texto `#8A9096` — ação
  secundária.
- `.pc-mini-btn:hover` / `.pc-stepper-btn`: halo verde translúcido
  (`rgba(52,232,74,.1)` a `.16`) só no hover/estado ativo, repouso neutro.
- `.pc-erro`: vermelho-alaranjado `#E8432A`.

Essas regras já estão em CSS global (`#modoColaborativoWrap.pc-tema-fader
button.primary` etc.) — uma tela nova que usa os componentes compartilhados
do app (não HTML solto) já herda tudo isso automaticamente ao entrar dentro
de `#modoColaborativoWrap` com a classe `pc-tema-fader` no elemento raiz
(hoje aplicada globalmente, ver `renderColaborativo()`).

---

## 4. Padrões de composição de tela (herdados de §8.1, ainda válidos)

A paleta/componentes acima **substituem** os da versão 1.0, mas a
composição estrutural abaixo continua sendo a referência de layout —
reaproveitar as classes, só recriar se genuinamente não servir (e
documentar por quê):

- **Banner de destaque** (`.pc-lobby-banner`): no máximo 1 por tela, pra
  UMA ação prioritária.
- **Grade de atalhos** (`.pc-lobby-atalhos`/`.pc-lobby-atalho`): 2 colunas,
  subtítulo com dado real (nunca número inventado).
- **"Mais funções"** (`.pc-lobby-mais`): lista discreta, sem moldura de
  card grossa — nitidamente menos importante que a grade acima.
- **Listas/menus verticais**: ícone-em-quadrado + título + subtítulo +
  seta `›`.
- **Mini-card de item dentro de lista**: moldura própria, nunca uma linha
  de texto solta.
- **Conteúdo "teaser"**: desenhar o conteúdo de verdade e desfocar de
  verdade (`filter:blur()` + máscara), nunca caixa vazia fingindo prévia.

---

## 5. Checklist pra migrar/criar uma tela no padrão 2.0

1. A tela está dentro de `#modoColaborativoWrap`? Se sim, já herda
   `pc-tema-fader` — confira que nenhum estilo inline hardcoded (cor antiga
   verde-neon `#3dffb0`, fundo `#081712`) sobrevive por cima.
2. Ícones: todos via `iconeSvg()`. Zero emoji, zero SVG solto copiado de
   outro lugar sem estar em `PC_ICONES`.
3. Cor: se algo "pede destaque", pergunte se é fato consumado/ação
   principal (verde vivo) ou só hierarquia visual (use tom de cinza mais
   claro, não verde).
4. Números que mudam ao vivo: `font-variant-numeric: tabular-nums`.
5. Qualquer componente com padding + largura definida: `box-sizing:
   border-box` explícito.
6. Testar em 320px, 375px, 768px antes de considerar pronta (não só
   "parece certo" no tamanho em que foi construída).
7. Depois de editar CSS/JS: subir o `cb=` de **todas** as tags `<script>`
   em `index.html` junto (contador único compartilhado).

---

## 6. Fora do escopo deste documento

- Regras eleitorais (QE/QP/D'Hondt/FMD) → `ENGENHARIA.md`.
- Sistema de pontuação/ranking → `RANQUEAMENTO.md` (rascunho).
- Monetização → `MONETIZACAO.md` (rascunho).
- Roteiro de fases e páginas pendentes → `PROJETO.md`.

## Refino 20/08/2026 — regras de escala (protótipo "refino v3" aprovado)
- **Botões de comando fluidos**: console 26–51px, card de partido 28–52px,
  respiro `clamp(4px, 1.5vw, 12px)`; sempre uma linha, nunca grudados.
  Fundo escuro discreto em AMBOS (#101214 / borda #1F2327).
- **Desfazer|Refazer**: um círculo dividido ao meio (2 alvos de toque,
  1 volume) — `renderBotoesComandos` funde o par automaticamente.
- **Régua do console**: fade linear de opacidade (100% centro → 50% pontas).
- **Metas do console** (vagas X/N · QE Y/Z): número pendente em LARANJA
  #FF9A2E (o "em disputa" das réguas); batido = branco. Classe
  `.pc-meta-num(.pend)`.
- **Nome do candidato RESPONSIVO**: `clamp(15,5px, 3vw, 24,5px)` — mantém
  a proporção da referência (24,5px em ~810px) em qualquer dispositivo;
  % em `clamp(14px, 2.5vw, 20px)`. Instagram inline logo após o nome.
- **Puxador de gaveta**: alça 92×5px na base do card; fechado, 1º
  candidato em preview difuso (blur 2,6px, opacity .22, máscara em
  degradê descendente).
