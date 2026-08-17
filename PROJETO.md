# Projeto — Documento de Definição (Simulador/Prospecção Parlamentar 2026)

> Este documento organiza a visão do projeto item por item, os pontos que
> ainda precisam de decisão antes de avançar na arquitetura técnica, e um
> roteiro faseado com checkboxes. É a referência viva do projeto — deve ser
> atualizado conforme as fases avançam e as decisões forem tomadas.

---

## 1. Visão geral

Um site onde pessoas convidadas/cadastradas preveem a votação dos candidatos a
Deputado Estadual da ALESC nas eleições de 2026 — cada previsão ancorada nos
resultados reais de 2022 (já modelados no simulador atual) como parâmetro de
coerência.

## 2. Finalidade e objetivos

Criar um **modelo contemporâneo de pesquisa eleitoral**, focado especificamente
em Deputado Estadual — um tipo de eleição que pesquisas tradicionais têm
dificuldade de captar bem, por causa da fragmentação regional e da quantidade
de candidatos/bases hiperlocais. A aposta é que a percepção agregada de pessoas
politicamente engajadas (a "sabedoria coletiva") produza um sinal mais fino do
que pesquisa de opinião tradicional consegue captar para esse cargo específico.

## 3. Tipos de usuário

| Tipo | O que faz | O que recebe |
|---|---|---|
| **Usuário meio** (quem prevê) | Preenche a simulação com base no próprio conhecimento político | Acesso à média final do grupo/coletivo; pode salvar sua lista de eleitos previstos, comparar com colegas em privado ou tornar pública; entra no ranking final |
| **Usuário final** (parceiro estratégico) | Não prevê — consome informação | Acesso a dados estratégicos: perfil de quem previu + resultados agregados. Ex: partidos políticos, empresários interessados |
| **Administrador** | Gerencia o sistema | Acesso ao cenário analítico completo: todas as respostas, todos os perfis, todos os agregados |

Motivações do usuário meio, que devem orientar o tom do produto: (a) **jogo** —
testar a própria percepção política, satisfação de "acertar"; (b) **estratégia**
— precisa da informação para uso profissional/político futuro.

## 4. Modelo de funcionamento

- Ancorado nos parâmetros de 2022 (já existe: `dados/base-2022.js`).
- Gamificação com ranking ao final, possibilidade de salvar/compartilhar
  respostas e dados do próprio usuário meio (com controle de privacidade —
  ver ponto em aberto #1 abaixo).
- **Dois modos de preenchimento**:
  1. **Detalhado**: prevê o número de votos de cada candidato (reaproveita o
     motor de cálculo já existente — `calculo/eleitoral.js`).
  2. **Simplificado/objetivo**: a pessoa não preenche votos de todo mundo —
     só indica **quem são os 40 eleitos** e a **posição de cada um dentro do
     partido**, de forma mais rápida e "gamificada". Precisa ficar amparado
     pelos parâmetros dos outros anos (2022) pra continuar comparável com o
     modo detalhado e com o resultado real.

## 5. Envelopamento como produto

Lançamento em duas etapas:
1. **Fase exclusiva**: convite fechado, para pessoas que gostam de exibir
   habilidade política/instinto de análise — cria desejo de participar por
   status/ego, não é aberto ao público geral de início.
2. **Fase expandida**: acesso por categoria de usuário (provavelmente
   implica níveis diferentes de acesso/permissão — a definir).

## 6. Resultados esperados (o que conta como sucesso)

Um site interativo, responsivo e atrativo o suficiente para as pessoas
quererem compartilhar/divulgar suas previsões e convidar amigos para
comparar resultados — sucesso = engajamento social/viral em cima da própria
dinâmica de prever e comparar.

## 7. Aplicação (janela de tempo)

**Prazo crítico**: o sistema precisa estar pronto e populado com **todos os
candidatos reais de 2026** logo após o encerramento das convenções partidárias
e do prazo de registro de candidaturas (no calendário eleitoral brasileiro,
isso normalmente cai em agosto para eleições de outubro — precisa confirmar a
data exata de 2026 quando estiver perto). É esse o momento em que as pessoas
começam a montar suas listas de verdade.

## 8. Identidade visual

**Decisão confirmada** (substitui a assunção anterior de paleta clara/glassmorphism —
ver histórico no ponto em aberto #4): tema **escuro com verde neon vibrante**
(`#3dffb0` sobre fundo verde-petróleo quase preto, `#081712`/`#0c231a`), com
brilho sutil (glow) nos elementos de destaque — ícone da capa, botão principal,
avatar do 1º lugar, ícone ativo da navegação. Inspirado num app de bolão de
futebol usado como referência direta (prints em `Exemplos/`), tanto na estética
quanto na **engenharia de menus**:
- Barra de navegação inferior fixa (5 destinos), não mais só cards empilhados.
- Pill de contexto (estado/grupo atual) flutuando acima da barra, abre uma
  folha (bottom sheet) pra trocar de contexto sem sair da tela.
- Telas de configuração/menu como tela cheia com X no canto e título+subtítulo
  centralizados — padrão único reaproveitado em todo submenu.
- Ranking com pódio (blocos 1º/2º/3º) e avatares com anel colorido.
- Fugir do visual "genérico de IA", logo simples e objetivo — mantidos.

O Simulador individual (aba separada) não é afetado — continua com o visual
escuro/terminal original, que é outra identidade, não esta.

Protótipos validados com o usuário (capa + navegação inferior, tema claro vs.
escuro vs. verde neon) antes desta decisão — ver conversa. Próximos elementos
ainda em validação, um de cada vez: grupos como feature de primeira classe,
redesign do ranking, estados vazios, tom da escrita.

### 8.1 Padrão de card/tela — Menu, Painel e cartões de divulgação

**Decisão confirmada em 16/08/2026** (Menu/Perfil, Painel principal e card-
convite "Meu palpite" já redesenhados nesse padrão — ver commits `55f87f0`,
`eac6ed0`): referência direta trazida pelo usuário — Nubank ("Nu Viagens",
faixa de ícones grandes + banner promocional) e BYD ("Dolphin Mini", grade
2x2 de ícones com ação clara + "Mais funções" recolhido). Prints em
`Exemplos/referencia-nubank-nu-viagens.png` e
`Exemplos/referencia-byd-dolphin-mini.png`. Vale como padrão pra **qualquer
tela nova ou redesenho** deste ponto em diante, não só as três já feitas:

- **Card de perfil/identidade** no topo de telas de conta: avatar circular
  com inicial (sem foto ainda), nome, e-mail/subtítulo, ação secundária
  (editar) discreta ao lado.
- **Banner de destaque** (no máximo 1 por tela) pra UMA ação prioritária:
  fundo em gradiente sutil (`linear-gradient(120deg, #12351f 0%, [tom de
  fundo da tela] 65%)`) + círculo de brilho decorativo (`::before`, verde
  translúcido) + rótulo pequeno maiúsculo + título + corpo curto + botão
  pill sólido verde. Não usar mais de um por tela — é destaque, satura se
  repetir.
- **Grade de atalhos** (2 colunas): card com borda verde translúcida
  (`rgba(61,255,176,.28)`), ícone dentro de círculo (`rgba(61,255,176,.14)`
  de fundo), título em negrito + subtítulo com dado real sempre que for
  barato de buscar (nº de itens, status) — nunca um número inventado.
  Brilho leve (`box-shadow: 0 0 12px rgba(61,255,176,.05)`), não forte
  (ficou "chapado" demais na 1ª rodada de ajuste, corrigido pra esse meio-
  termo na 2ª).
- **"Mais funções"** (itens secundários, menos usados): lista discreta,
  SEM moldura de card grossa — fundo quase invisível
  (`rgba(15,35,27,.5)`), texto pequeno cor `#a9c2b5`/`#6b8f7d`, ícones
  finos. Deve parecer nitidamente menos importante que a grade de atalhos
  acima, não competir com ela.
- **Listas/menus verticais** (Conta, Sobre etc.): linha com ícone-em-
  quadrado + título + subtítulo + seta `›`, dividida por borda fina —
  mesmo padrão em toda tela de configuração.
- **Mini-cards de item dentro de uma lista** (ex.: candidato num card-
  convite): moldura própria (`background:#0e2018; border:1px solid
  #1d3a2c; border-radius:8-12px`), nunca só uma linha de texto solta —
  cada item é um cartãozinho independente.
- **Conteúdo "teaser" escondido** (prévia que corta e convida a ver mais):
  desenhar o conteúdo de verdade (nunca uma caixa vazia) e aplicar
  desfoque real + degradê de opacidade de cima pra baixo — em HTML/CSS via
  `filter:blur()` + `mask-image:linear-gradient(...)`; em `<canvas>` via
  canvas offscreen com `ctx.filter='blur()'` recortado por
  `globalCompositeOperation:'destination-in'` (ver
  `_desenharColunaCedulaResumo`, interface/prospeccao.js). Caixa vazia
  desfocada não passa a ideia — feedback direto do usuário na 1ª rodada.

Classes CSS de referência (`css/estilo.css`): `.pc-lobby-banner`,
`.pc-lobby-atalhos`/`.pc-lobby-atalho`, `.pc-lobby-mais`. Ao criar uma tela
nova que precise desses padrões, reaproveitar essas classes em vez de
recriar inline — só criar variante nova se o padrão genuinamente não
servir (documentar por quê, se acontecer).

### 8.2 Identidade visual 2.0 — padrão "Fader" (monocromático + verde estratégico)

**Decisão confirmada em 17/08/2026**, após ~15 rodadas de protótipo
interativo com o usuário (aba Senador como vitrine). **Este é o padrão
oficial do app daqui em diante** — a aba Senador nasce nele; as demais
telas migram em etapa própria (a seção 8.1 continua valendo como referência
de COMPOSIÇÃO de tela — banners, grades, listas — mas a PALETA e os
componentes de controle abaixo substituem os antigos ao migrar).

**Paleta (monocromático escuro + 1 cor estratégica):**
- Fundo: degradê radial `#1B1E22 → #101214 (48%) → #0C0E10` (ellipse no
  topo). Nunca preto puro, nunca cinza tingido de verde.
- Cards: `rgba(29,32,35,.85)`, raio 12px; card de eleito ganha borda
  `rgba(242,244,245,.18)` (clara sutil, NÃO verde).
- Bordas/filetes: `#23262A` / `#26292D` / `#2B2F33`.
- Textos: principal `#F2F4F5`, secundário `#8A9096`, apagado `#5C6268`.
- **Verde vivo `#34E84A` — SÓ em itens estratégicos**: selo ELEITO,
  preenchimento da barra de progresso coletivo (soma de votos), halo de
  feedback enquanto uma alça está sendo segurada, e detalhes de foco
  (borda do box de edição, "i" ativo). NUNCA em fundos, textos correntes ou
  controles em repouso — a escassez é o que faz o verde significar.
- Alertas (únicas outras cores): âmbar `#FFB020` (avisos/sobra), coral
  `#FF5A48` (fora hoje/erro). Só quando carregam significado.
- Modo claro (frente futura): mesma estrutura invertida — fundo `#F4F5F6`,
  cards brancos, texto `#1B1E21`, verde escurece pra `#2BB93C`-faixa pra
  manter contraste sobre branco.

**Tipografia:** UMA família só (a `var(--sans)` do app) pra tudo — a
variação é apenas de tamanho e peso, nunca de família. Números sempre com
`font-variant-numeric: tabular-nums` (não "dançam" de largura ao mudar).
Hierarquia do card: nome 14.5px/650 · %-herói 22px/750 (sufixo % pequeno
dim) · sublinha 10.5px/#8A9096 · votos na barra 9px/700.

**Componentes (a "família fader"):**
- **Barra de votação (controle individual)**: trilho 13px com fundo no tom
  mais escuro do degradê da tela (`#0C0E10`, borda `#23262A`) — efeito de
  "sulco cavado"; régua de marcações internas a cada 10%
  (`rgba(138,144,150,.28)`, visível só na parte vazia); preenchimento em
  degradê de cinzas escuros (`rgba(42,46,50,.75) → rgba(60,65,70,.97)`) —
  nunca claro/branco; **votos nominais escritos dentro do preenchimento**
  (deslizam pra fora, na parte vazia, quando a fatia é estreita demais).
- **Alça (fader)**: pílula vertical 11×27px em **metal escuro** — degradê
  `#5B6168 → #3A3F45 → #22262A → #3C4147`, borda `rgba(242,244,245,.18)`,
  brilho interno no topo, vinco central claro; iluminação de repouso fraca
  e escura (`0 0 0 3px rgba(10,12,14,.55)`); halo verde só enquanto ativa.
- **Barra principal (progresso coletivo)**: trilho de 5px (metade), régua
  EXTERNA acima (3px de altura, ticks finos 2,5% + maiores 10%, com máscara
  em degradê horizontal — quase invisíveis nas bordas, presentes no centro,
  efeito de perspectiva); preenchimento **verde**: `#34E84A 0% → #14602A
  52% → #1D8038 100%`; marco central (traço claro) no ponto de 1 voto por
  eleitor; **mini alça mestra** 8×15px no mesmo metal escuro; escala de
  extremos embaixo (0 · marco · teto).
- **Cabeçalho fixo (sticky)**: abas de cargo compactas (padding 3.5px,
  fonte 11px, ativa = pílula clara `#F2F4F5` com texto escuro) + linha
  "VOTOS (i) …… 65% · 5,11M de 7,9M" + régua + barra principal + escala,
  tudo num bloco `rgba(16,18,20,.88)` com blur e borda inferior
  arredondada. O (i) abre o **funil de votos válidos** (ver abaixo).
- **Funil de votos válidos** (o "i" do cabeçalho): painel com barras
  decrescentes mostrando a metodologia real — eleitores aptos projetados →
  comparecimento (taxa histórica 2022) → votos válidos → ×k votos por
  eleitor — com números calculados dos dados reais (TSE 2022 + crescimento
  do eleitorado) e fonte declarada. A perda em cada etapa é VISTA, não só
  explicada.
- **Selo ELEITO**: pílula `#34E84A` com texto `#07230C` 8px/800 — o único
  elemento sempre-verde da lista; a % individual usa base própria (fração
  do eleitorado, teto 100%).

**Interações (validadas em protótipo):**
- Arrasto fluido: durante o gesto, só o próprio card atualiza (número,
  barra, %); NENHUMA reordenação no meio do arrasto; ranking se reacomoda
  ~450ms depois de soltar. (Reordenar durante o gesto destruía o elemento
  sob o dedo e travava o arrasto — bug real da 1ª rodada.)
- Votação nominal por toque: tocar no número de votos abre um box de
  edição inline (borda verde) ali mesmo; Enter/tocar fora aplica.
- Sem setas de incremento (testadas e descartadas pelo usuário em
  17/08/2026).

**Fórmula Matriz de Distribuição (FMD)** — a regra matemática única, feita
pra escalar da aba Senador (candidatos) pros quadros de Deputados
(partidos, e dentro deles candidatos):

Parâmetros: `E` = votos válidos projetados do cargo (TSE 2022 escalado
pelo crescimento do eleitorado, taxas históricas de comparecimento/brancos/
nulos mantidas); `k` = votos por eleitor no cargo (Senador 2026: k=2;
proporcionais: k=1); `T = k·E` = teto coletivo ("tapete curto"); `c_i` =
teto individual da unidade i (candidato: `E` — um eleitor não vota duas
vezes no mesmo nome; partido em proporcional: `E`); `v_i` = votos da
unidade i.

Invariantes (valem pra QUALQUER via de edição — arrasto, box, alça):
1. `0 ≤ v_i ≤ c_i`
2. `Σ v_i ≤ T`
3. Edição individual: `v_i ← clamp(pedido, 0, min(c_i, T − Σ_{j≠i} v_j))`

Alça mestra (escala proporcional com saturação — decisão (b) do usuário):
- Ao INICIAR o gesto, fotografa a base `b_i = v_i` e `S = Σ b_i` (exige
  S > 0; se tudo zero, a alça não age).
- Alvo `A = posição × T`, limitado a `A_max = min(T, Σ_{b_i>0} c_i)`.
- Resolve o fator `f ≥ 0` tal que `Σ min(c_i, b_i·f) = A` (função
  monótona em f — busca binária; solver exato, sem acúmulo de erro).
- Aplica `v_i = min(c_i, b_i·f)`. Consequências garantidas: quem está em
  0 permanece em 0; quem satura estaciona no teto individual; os
  não-saturados mantêm a proporção EXATA da base entre si; descer e subir
  dentro do mesmo gesto restaura a distribuição original (a base só é
  descartada ao soltar).

Extensão pros Deputados (etapa 2, aprovada em conceito): a FMD é
**aninhável** — no nível do cargo, as unidades são partidos/federações
(k=1, T=E); a fatia `v_partido` conquistada vira o teto coletivo interno
do card do partido, onde a mesma FMD roda de novo com os candidatos como
unidades (alça mestra do partido = escala interna proporcional). A
marcação de eleitos continua 100% derivada (majoritário: top-k por votos;
proporcional: QE/QP/médias como hoje).

- Acesso ao site → cadastro padrão → tela inicial com janelas de introdução/
  tutorial de cada item.
- Fontes bem ajustadas, alinhamento cuidadoso, **muitos ícones de informação**
  (o padrão que já existe no Simulador — `infoTip()` — vai nessa linha; é
  para expandir, não inventar do zero).
- Documentação do projeto adequada, estruturada, modular — para avançar de
  forma sequenciada e segura (este documento é a base disso).

---

## Pontos em aberto — resolvidos como assunção de trabalho (revisar quando puder)

O usuário não conseguiu revisar esses pontos em detalhe ainda e pediu para
seguirmos evoluindo. As respostas abaixo são **assunções de trabalho** —
escolhidas pela opção mais simples/reversível/segura em cada caso — não são
decisões definitivas. Qualquer uma pode ser corrigida a qualquer momento;
o código foi feito para não depender de nenhuma delas de forma irreversível.

1. **Privacidade do usuário meio vs. acesso do usuário final.**
   → *Assunção*: o usuário final só acessa dados agregados/anônimos. Nunca
   o perfil individual de quem pediu privacidade. É a opção mais protetiva;
   fácil de abrir o acesso depois, mais difícil fechar depois de aberto.
2. **Monetização do usuário final.**
   → *Assunção*: nenhum sistema de pagamento dentro do site por enquanto —
   acesso do usuário final gerido manualmente pelo usuário/administrador.
3. **Coexistência dos dois modos de preenchimento (detalhado vs. simplificado).**
   → *Assunção*: cada pessoa escolhe um modo no cadastro (mais simples de
   construir e de entender). Critério de desempate/comparação entre modos
   no ranking fica para ser definido na Fase 6 (pós-eleição), quando
   houver resultado real para calibrar.
4. **Identidade visual: uma coisa só, ou dois "modos"?**
   → *Assunção*: o Simulador individual mantém o visual atual (escuro,
   estilo analista) sem alteração. A nova identidade (clara, glassmorphism)
   é aplicada só na parte de Prospecção Coletiva — menor risco de mexer no
   que já funciona.
5. **Escopo do painel do administrador nesta fase.**
   → *Assunção*: por enquanto, "acesso administrativo" = os dados direto no
   painel do Supabase (já disponível). Painel dedicado dentro do site fica
   para uma fase posterior.

---

## Roteiro faseado

### Fase 0 — Fundamentos (concluído)
- [x] Simulador individual funcional (quociente eleitoral, D'Hondt, hemiciclo, candidatos)
- [x] Dados de 2022 corrigidos e verificados contra fonte oficial (TSE) e lista de eleitos real
- [x] Marcação de candidatos com voto invalidado (fato documentado, com fonte)
- [x] Legendas separadas por hemiciclo (2022 real / 2026 projeção com saldo)
- [x] Conceito e nome do projeto validados ("Simulador Eleitoral ALESC 2026")
- [x] Conta Supabase criada (projeto de banco de dados pronto para uso)

### Fase 1 — Validação do documento de projeto (concluída como assunção de trabalho)
- [x] Redigir e organizar as seções 1 a 9
- [x] Resolver os 5 pontos em aberto listados acima (como assunção de trabalho — revisar quando possível)
- [x] Direção de identidade visual definida como assunção (Simulador mantém visual atual; Prospecção Coletiva ganha estilo novo)

### Fase 2 — Arquitetura técnica de cadastro e dados compartilhados
- [x] Modelo de dados no Supabase (`nuvem/schema.sql`, já rodado no projeto)
- [x] Cadastro/login (nome + e-mail + senha) — testado ponta a ponta, funcionando
- [x] Modo de preenchimento **detalhado** (votos por candidato) — `interface/prospeccao.js`, reaproveitando `dhondt()`/`desenharHemiciclo()`
- [x] Modo de preenchimento **simplificado** (marcar quem se elege, sem votos) — é o modo padrão agora; testado: marcar/desmarcar, "completar automaticamente" (preenche até a cota de 2022 por partido), e alternar por partido para "preencher com votos completos" e voltar
- [x] Quadro de médias (projeção agregada de todas as previsões) — testado com palpite real, agregação e recálculo de vagas corretos
- [ ] Painel do usuário final (conforme escopo decidido no ponto em aberto #2)
- [ ] Painel do administrador (conforme escopo decidido no ponto em aberto #5) — por ora, painel do Supabase mesmo

**Limpeza pendente (opcional)**: algumas contas de teste (`teste.simulador.alesc.*@gmail.com`) foram criadas durante a validação — pode apagar em Authentication → Users no painel do Supabase, se quiser.

**Nota sobre e-mail**: o serviço de e-mail embutido do Supabase (grátis) tem limite de 2 e-mails/hora, fixo, só aumenta configurando um provedor próprio (SMTP). Não afeta o cadastro em si (que não depende mais de e-mail de confirmação), só entraria em jogo se um dia usarmos recuperação de senha por e-mail em volume.

### Abertura simplificada — boxes por partido (nova entrada do fluxo)
- [x] `dados/partidos-brasil.js` — lista completa dos 27 partidos que tiveram votos em SC 2022 (fonte: mesmo arquivo bruto do TSE já usado em `base-2022.js`), incluindo os 14 que não elegeram ninguém — todos disponíveis como box.
- [x] Tela "quantos elege por partido": um box por partido com legenda discreta de 2022 (vagas + votos) e o quociente projetado de 2026 dentro do ícone (i).
- [x] Sistema de sobras com autorização: ao editar um box, o sistema sugere o ajuste no maior partido ainda não editado, explica o motivo, e a pessoa aceita ou ajusta na mão — nunca muda nada sem confirmação.
- [x] Painel principal (hub): cards pra "Ajustar vagas por partido", "Preencher votação completa", "Quadro de médias", "Ranking" — "Criar grupos" e "Atualizar lista base" ficam como placeholders "em breve".
- [x] Vagas por partido persistidas no Supabase (nova coluna `vagas_por_partido`) — **precisa rodar `nuvem/migracao-2-vagas-por-partido.sql` no SQL Editor** (só isso, é aditivo, não afeta o que já existe).
- [x] Boxes conectados ao checklist: a meta de vagas definida nos boxes já entra pré-marcada no checklist (os N mais votados de 2022), tanto no modo simplificado quanto no "completar automaticamente".
- [x] Candidatos reais de 2022 dos 14 partidos sem cadeira (`dados/candidatos-extra-2022.js`, mesma fonte TSE) — checklist agora cobre os 27 partidos, não só os 13. Lista tratada como provisória (aviso no topo da tela) até sair a lista homologada de 2026.
- [x] Cadastro e SQL (`nuvem/migracao-3-partido-escopo-todos.sql`) atualizados pra aceitar qualquer um dos 27 partidos como escopo — **precisa rodar essa migração no SQL Editor**.
- [x] Tabela de referência pra corrigir nomes (`dados/correcoes-nomes.md`) — processo caso a caso, cada linha só vira alteração de dado depois de validada. Primeiro caso confirmado e aplicado: Pedro Baldissera (registro) → Padre Pedro (nome de urna), PT.
- [x] **Identidade estável do candidato**: cada candidato em `base-2022.js`/`candidatos-extra-2022.js` agora tem um campo `id` fixo (gerado a partir do nome original, uma vez só). Renomear um candidato não perde mais o histórico de palpites já salvos — testado e confirmado. Ver comentário em `nuvem/palpites.js`.
- [ ] Separar de vez os dois tipos de dado: "parâmetro 2022" (fixo, `base-2022.js`) vs. "lista de candidatos 2026" (hoje é uma cópia provisória do 2022, gerada na hora — no futuro vira um dado próprio, editável pelo admin em "Atualizar lista base", ligado aos 2022 pelo mesmo `id` quando for a mesma pessoa recandidata).

### Fase 2.5 — Novo fluxo de entrada (sem cadastro até a pessoa "prosseguir") — superada pela Fase 2.7
Primeira versão do fluxo de convidado (Capa → boxes numéricos → checklist separado → conclusão). Funcionou e foi testada ponta a ponta, mas o usuário pediu uma reestruturação depois de ver funcionando — ver Fase 2.7 abaixo, que é a versão atual. Fica registrado aqui só como histórico da decisão.

### Fase 2.6 — Multi-estado (arquitetura pronta, dados populados aos poucos)
- [x] Tela de escolha de estado na entrada do fluxo — implementada como a 2ª tela do convite (ver Fase 2.7). Lista todos os 27 estados/DF (`dados/estados-brasil.js`), só Santa Catarina habilitado, resto opaco/desabilitado ("em breve").
- [x] **Regra confirmada**: o desenho do plenário (arco de círculos) nunca usa um número fixo de cadeiras — sempre reflete a quantidade real daquele cargo específico, naquele estado específico. Ex.: SC tem 40 Deputados Estaduais, 16 Federais e 3 Senadores — cada cargo tem seu próprio total, diferente entre si e diferente de outros estados. O protótipo (`plenario-svg` no "Mapa de telas") já foi ajustado pra se adaptar bem tanto a números grandes (40) quanto pequenos (3), parametrizado por `data-total` — só falta alimentar o número certo por cargo/estado na implementação real.
  - **Senado tem uma nuance**: são 3 cadeiras por estado no total, mas o Senado renova por terços — cada eleição disputa só parte delas (2026: 2 das 3 vagas de SC). O plenário mostra o total real (3), mas a mini pesquisa (P-07) só pergunta sobre quem está de fato em disputa nesta eleição (2 vagas).
- [ ] `dados/estados/` — uma pasta/arquivo por estado com a lista de candidatos (mesmo formato usado hoje pra SC), começando só com `sc.js` populado.
- [ ] `dados/estados/indice.js` — número de vagas de cada estado **por cargo** (Estadual, Federal — varia por estado, fórmula constitucional) — hoje o "40" ainda está fixo em vários lugares da interface.
- [ ] `calculo/eleitoral.js` já é genérico (recebe vagas como parâmetro) — não deve precisar mudar, só parar de assumir "40" implicitamente em alguns lugares da interface.
- [ ] Palpites/perfis passam a guardar o estado, pra médias e ranking não misturarem estados diferentes.
- [ ] Cada novo estado é adicionado aos poucos, no mesmo processo rigoroso feito pra SC (dados oficiais do TSE, conferência candidato a candidato) — não é algo que se gera de uma vez pra todos.

### Fase 2.8 — Multi-cargo dentro do mesmo estado (rascunho, em validação — 2026-07-24)
O escopo deixou de ser só Deputado Estadual — cada estado passa a ter até 3 cargos simuláveis (Estadual, Federal, Senador), cada um com sua própria lista de candidatos, plenário e cédula.
- [ ] **Interruptor de cargo**: P-03 (seleção) e P-04 (revisão) ganham um controle de 3 abas no topo — Dep. Estadual / Dep. Federal / Senador. Trocar de aba troca o conteúdo inteiro (painel eleitoral, plenário, lista de partidos), não é uma tela nova.
- [ ] **Cédula por cargo, não uma só**: cada aba tem seu próprio botão "Depositar cédula — [cargo]", que trava até aquele cargo específico estar completo e, depois de depositado, o texto vira "Cédula depositada — [cargo]". As 3 cédulas são independentes entre si.
- [ ] Cada aba do interruptor ganha um indicador visual sutil (pontinho) de cargo já concluído/depositado.
- [ ] **Quociente eleitoral só existe pra Estadual e Federal** (proporcional). Senador é eleição majoritária (mais votos vence) — não usa quociente, não faz sentido mostrar essa métrica nessa aba.
- [ ] Card "por bancada regional" **abandonado do projeto inteiro** — não vamos mais cruzar município × bancada da ALESC.
- [ ] Cartão compartilhável (P-17) ganha um seletor de impressão: por cargo específico, ou "Tudo" (Estadual + Federal + Senador juntos na mesma imagem).
- [ ] Pendência de dados reais: candidatos de Dep. Federal e Senador (SC) ainda não foram fornecidos — ver reminder já registrado, não implementar com nomes reais até o usuário passar a lista.

### Fase 2.7 — Reestruturação em 4 telas (Capa → Estado → Seleção de candidatos → Lobby) — concluída
O usuário pediu pra simular cada tela num protótipo interativo antes de programar (mesmo processo que vamos repetir pras próximas telas do projeto). Estrutura final, testada ponta a ponta:

1. **Capa** (landing, mantida da Fase 2.5): "Pronto para testar as suas habilidades políticas?" + botão "Começar".
2. **Estado** (nova, antecipa a Fase 2.6): lista de estados, só SC clicável.
3. **Seleção de candidatos** (`renderSelecaoCandidatos`, substitui os antigos boxes numéricos + checklist separado): tela única por partido em sanfona (um expandido por vez), com:
   - **Painel eleitoral** no topo: "Deputados eleitos" (X/40), "Votação somada" (+ ícone "i" com a metodologia — regra geral daqui pra frente: todo dado projetado/estimado leva o ícone "i"), "QE projetado 2026" (mesma fórmula já usada no Simulador individual: QE de 2022 escalado pelo crescimento do eleitorado, mantendo as taxas históricas de branco/nulo/comparecimento).
   - **Hemiciclo monocromático** (sigla dentro de cada assento, sem cor — `desenharHemiciclo(..., coresMono)` em `calculo/eleitoral.js`, parâmetro novo e opcional, o desenho colorido original continua igual pra quem não passar esse parâmetro).
   - Cada partido: referência de 2022 (votos + vagas), candidatos com posição ("1º", "2º"...) recalculada ao vivo pela votação atual, checkbox pra marcar eleito, campo de votos 2026 (só habilitado se marcado), botão **"Balancear vazios"** (preenche só quem a pessoa não editou à mão, proporcional ao peso de 2022, até bater a expectativa do QE projetado) e indicador de balanço (bolinha cinza/verde/amarela).
   - Lista de partidos ordenada por quantidade de eleitos marcados (decrescente).
   - Botão **"Voltar"** (desfaz a última ação — pilha de até 30 estados).
   - **"+ adicionar partido"** e **"+ adicionar candidato"**: continuam existindo, agora criando o candidato já no formato novo (votos2022: 0, editável).
4. **Cerimônia de depósito**: "Revisar e depositar a cédula" (só habilita com 40/40) → tela de revisão com a lista final agrupada por partido → "Depositar a cédula" → confirmação → **Lobby**.
5. **Lobby** (renomeado de "conclusão", mesmas 4 opções de antes — compartilhar, lista detalhada, registrar no ranking, salvar PDF). O plano original do usuário é que compartilhar/grupos só desbloqueiem de verdade depois do cadastro **e** de uma "mini pesquisa" por estado (Presidente/Governador/Senador/Dep. Federal/Dep. Estadual + 2º turno) — a mini pesquisa ainda não foi desenhada nem implementada, fica pra uma próxima rodada de protótipo.
- [x] Migração de dados de convidado pro Supabase ao cadastrar continua funcionando, agora via `salvarPalpiteCompleto` (`nuvem/palpites.js`) — um upsert só, salva candidatos + vagas_por_partido (esse último só como resumo derivado, não é mais fonte de verdade).
- [ ] Painel do administrador continua com acesso a tudo, incluindo os dados da "pesquisa eleitoral" e o perfil de quem respondeu — ainda não construído (ver ponto em aberto #5).
- [x] **Bug pré-existente encontrado durante o teste** (não é desta reestruturação) — corrigido: o `id` gerado por `cloneBase()` (`calculo/eleitoral.js`) é um contador que reinicia a cada carregamento de página, não o `id` fixo de `dados/base-2022.js`; isso fazia a "chave estável" do candidato (`nuvem/palpites.js: chaveCandidato`) não ser realmente estável entre sessões/pessoas para os 423 candidatos dos 13 partidos que passam por `cloneBase()` (os 213 de `dados/candidatos-extra-2022.js` já usavam o id certo). `montarEstadoPalpite()` (`nuvem/palpites.js`) agora repõe o id string de `dados/base-2022.js` antes de calcular a chave, sem mexer em `cloneBase()` (que segue como estava, usada pelo Simulador individual). **Não migrado**: palpites que já estavam salvos no Supabase antes desta correção guardaram a chave antiga (numérica) e não vão se juntar automaticamente aos novos palpites da mesma pessoa/candidato — se já houver dados reais na tabela `palpites`, avaliar se vale a pena migrar.

### Pendência — conferência de candidaturas invalidadas
Ainda restam resíduos de votos não explicados em PT, PP, PTB e Republicanos
(ver histórico da conversa) — provavelmente mais candidatos com voto
invalidado que ainda não identificamos, parecido com os 7 já confirmados.
Retomar quando o usuário tiver mais desses casos "sub júdice" pra conferir
(mesma fonte usada antes: painel de resultados eleitorais 2022).

### Fase 3 — Identidade visual e onboarding
- [ ] Definir paleta clara + estilo glassmorphism (conforme decisão do ponto em aberto #4)
- [ ] Logo simples
- [ ] Telas de introdução/tutorial no primeiro acesso
- [ ] Expansão dos ícones de informação por todo o fluxo novo

### Fase 4 — Hospedagem e lançamento
- [ ] Publicar em link fixo (site de verdade, não mais arquivo local)
- [ ] Lançamento fechado/por convite (fase exclusiva)
- [ ] Expansão por categoria de acesso

### Fase 5 — Prontidão para a eleição real de 2026
- [ ] Carregar todos os candidatos reais de 2026 (após fim das convenções/registro de candidaturas)
- [ ] Abrir oficialmente para preenchimento das listas

### Fase 6 — Pós-eleição
- [ ] Inserir resultado oficial de 2026 (mesmo padrão de fonte/verificação usado para 2022)
- [ ] Calcular ranking final (acerto de eleitos + votação geral do partido + critérios de desempate)
- [ ] Divulgar resultados e vencedores

---

## Referência de inspiração

App "Bolão de Futebol 2026" (App Store) — mesmo não usando o nome "bolão" no
nosso projeto, o modelo de experiência é uma boa referência: grupos privados
com convite fácil (tipo link de WhatsApp), divisão de times/equipes dentro de
um grupo, ferramenta de simulação "e se" (já temos isso — o Simulador
individual), lembrete de prazo pendente, ranking dividido em séries/níveis,
e o princípio de acessibilidade extrema ("sua vó consegue usar"). Vale
revisitar quando chegarmos na Fase de grupos privados/comparação entre
colegas e no desenho fino do ranking.

## Achado técnico já validado (vale para quando chegarmos na Fase 2)

O `id` de cada candidato no simulador hoje (`calculo/eleitoral.js`, `candSeq`)
é só um contador que recomeça a cada sessão — não serve como identidade
estável entre pessoas diferentes. Qualquer previsão salva por usuários
diferentes precisa identificar cada candidato por nome+partido (chave
estável), nunca por esse `id` interno, senão a comparação/agregação entre
pessoas fica errada sem ninguém perceber.
