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
| Verde-lima (aviso) | `#C6E62A` | sobra, candidato provisório/RRC, alerta não-crítico (atualizado 18/08/2026, era âmbar `#FFB020`) |
| Vermelho-alaranjado (erro) | `#E8432A` | erro de validação, "fora hoje", excluir conta (atualizado 18/08/2026, era coral `#FF5A48`, referência trazida pelo usuário) |

**Regra do verde vivo** — só aparece em: selo ELEITO, preenchimento da barra
de progresso coletivo, halo enquanto uma alça está sendo arrastada, foco de
campo de edição, botão de ação primária (CTA). Nunca em fundo, texto
corrido, ícone em repouso ou card não-selecionado. A escassez é a função —
some o verde de um lugar e pergunte "isso realmente aconteceu ou precisa de
atenção agora?" antes de pôr de volta.

### 1.2 Tipografia

Uma família só: `var(--sans)` → `'Inter', -apple-system,
BlinkMacSystemFont, 'Segoe UI', sans-serif`. Nunca trocar de família pra dar
ênfase — só tamanho e peso variam. Números sempre com
`font-variant-numeric: tabular-nums` (impede o valor "dançar" de largura
quando muda, ex.: contador de votos ao vivo).

Escala de referência (card de candidato, o caso mais denso hoje):
- Nome: 14.5px / peso 650
- Número-herói (%): 22px / peso 750 (sufixo "%" menor, em tom apagado)
- Sublinha: 10.5px / `#8A9096`
- Rótulo dentro de barra: 9px / peso 700

### 1.3 Espaçamento e forma

- Raio padrão de card: 12px. Raio de material console: 14px.
- Cápsula/pílula (selo, aba ativa): raio total (`border-radius:999px` ou
  circular quando quadrado).
- `box-sizing: border-box` sempre em qualquer componente com padding +
  largura fixa/percentual — regra aprendida na dor (3 rodadas de protótipo
  perdidas com o painel de comandos por esquecer isso, ver
  `alesc_painel_comandos_responsivo.md`).

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
