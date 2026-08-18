# Engenharia aplicada — modelo Fader (Deputados e Senador)

Documentação técnica da reescrita de 17–18/08/2026: as três abas de
palpite (Estadual, Federal, Senador) passaram de "marcar eleito por
interruptor" pra um modelo de distribuição direta de votos por barras
deslizantes ("faders"), com a matemática eleitoral real por baixo. Este
documento existe pra quem for mexer nesse código depois entender o
porquê das peças, não só o quê.

## 1. A Fórmula Matriz de Distribuição (FMD)

Arquivo: `calculo/eleitoral.js`, funções `fmdTravaIndividual` e
`fmdEscalarProporcional`.

Toda vez que a pessoa arrasta uma barra, digita um número ou usa a alça
mestra, o valor final passa por uma trava dupla:

```
fmdTravaIndividual(pedido, tetoIndividual, tetoColetivo, somaOutros)
  → Math.round(max(0, min(pedido, tetoIndividual, tetoColetivo - somaOutros)))
```

- **Teto individual**: o quanto UM candidato/partido pode ter sozinho
  (ex.: E — votos válidos projetados — pro Senado; E também pro
  candidato de deputado, mas a BARRA usa uma régua visual menor, ver
  §3).
- **Teto coletivo menos os outros**: o que sobra do "cofre" geral (T ou
  E) depois do que já foi distribuído pra todo mundo — garante que a
  soma nunca passa do total real de votos possíveis.
- **Arredondamento**: voto é inteiro. Sem o `Math.round`, o teto vindo
  de uma projeção (número fracionário) vazava fração pro valor final —
  bug real, corrigido em 18/08/2026.

Pra gestos que mexem em VÁRIOS valores de uma vez (alça mestra, arrasto
do fader de partido que reescala os candidatos de dentro):

```
fmdEscalarProporcional(base, alvo, tetoIndividual)
```

Recebe o vetor de valores-BASE (fotografado no INÍCIO do gesto, nunca
recalculado a cada movimento — ver §2), um alvo de soma, e resolve por
busca binária o fator `f` tal que `Σ min(tetoIndividual, base[i] · f) =
alvo`. Quem atinge o teto individual "estaciona" lá; os demais
continuam crescendo na proporção exata da base; quem começa em zero
continua em zero (decisão do usuário, 17/08/2026 — nunca "inventar"
votos pra quem não tinha nenhum).

## 2. Por que fotografar a base no início do gesto

Erro da primeira versão (achado pelo usuário testando a alça mestra):
recalcular a partir dos valores JÁ escalados a cada `pointermove` fazia
o arredondamento composto ao longo do gesto — resultado não-linear,
alguém "sumia" com zero antes da hora, outro saturava cedo demais.

Regra desde então, em toda função de gesto (`attachListenersSenador`,
`attachListenersDeputadosFader`): capturar `base = valores atuais` no
`pointerdown`, e cada `pointermove` chama `fmdEscalarProporcional(base,
novoAlvo, teto)` — sempre a partir da MESMA fotografia, nunca do
resultado do movimento anterior.

## 3. Duas réguas por candidato: barra ≠ número

Decisão de 17–18/08/2026, revisando uma versão anterior:

- **O NÚMERO** (percentual grande no card) usa a régua do CABEÇALHO —
  fração do total de votos do cargo (T = k·E). A soma de todos os
  candidatos/partidos sempre fecha em 100%.
- **A BARRA** (o fader visual) usa uma régua PRÓPRIA, mais generosa,
  só pra dar curso físico ao controle:
  - Senador: teto individual = E inteiro (k=2, então um candidato no
    teto individual mostra 50% no número, barra cheia).
  - Deputados: régua fixa por regra do usuário — SC Estadual 250 mil
    (200% do mais votado real de 2022); SC Federal = mais votado ×1,5;
    outros estados = mais votado ×2. É limite do DESENHO, não do voto:
    passar da régua mostra o número verdadeiro com a barra cravada no
    fim (`capCandidatoDeputado()`).

## 4. Apuração ao vivo nos Deputados (D'Hondt no modelo fader)

Sem interruptor de "marcar eleito", quem está eleito é 100% derivado da
votação: `recalcularMarcadosDeputados()` roda `dhondtComCorte()` (já
existente, art. 106/107/109) sobre `pcState.palpiteEdicao` a cada
mudança, e marca os N mais votados de cada grupo (N = cadeiras que o
D'Hondt deu ao grupo). Chamada em todo ponto de entrada da tela
(render, fim de gesto, mágico, box de vagas).

Selo do candidato (`ELEITO`/`SOBRA`/`FORA`) decompõe as vagas do grupo
em quociente direto (art. 107) vs sobra por média (art. 109) — mesmo
cálculo que a Revisão já fazia, só que ao vivo.

## 5. Box de vagas: só a META, nunca os votos

`data-dep-vaga-edit` / `data-dep-vaga-mais/menos` mexem em
`p.vagasIndicadas` (novo campo, não existia antes) — **isso muda só o
CURSO/META da barra** (`meta = vagasIndicadas × QE projetado`), nunca
reescala a votação já dada. Decisão final do usuário em 18/08/2026,
depois de duas versões erradas (uma que reescalava, uma que chegou a
realocar votos de OUTROS partidos). Preencher o espaço aberto é sempre
gesto do usuário — arrasto, digitação ou mágico.

Quando `soma > meta`: fio verde de 1px sobreposto ao preenchimento
normal marca o excedente (não é hachura nem trecho colorido — decisão
final depois de 4 rodadas de protótipo, ver commit `307453e`).

## 6. Mágico (auto-preenchimento) por cargo

Cada aba tem a própria heurística — não dá pra reusar a do Simulador
antigo porque a régua de origem dos dados é diferente:

- **Deputados** (`autoPreenchimentoDeputadosFader`): usa
  `balancearPartidoSelecao` (curva decrescente a partir do voto real de
  2022, já existente) por partido, depois normaliza os candidatos NÃO
  editados à mão pra fechar exatamente em E — fecha o gate de 100%
  automaticamente.
- **Senador** (`autoPreenchimentoSenador`): candidatos de 2026 são
  estreantes (sem voto individual de 2022) — o peso vem da FORÇA DO
  GRUPO/FEDERAÇÃO em 2022 (`PARTIDOS_BRASIL`, siglas somadas quando é
  federação), com uma variação determinística de ±6% por chave (evita
  empate artificial entre colegas de partido), distribuído pela FMD.

## 7. Reordenação sem travar o arrasto

Bug real da primeira versão: re-renderizar (reordenar) a lista NO MEIO
do gesto destrói o elemento DOM sob o dedo → arrasto trava ao cruzar a
votação de outro card. Regra desde então: durante o gesto, só o
PRÓPRIO card + o cabeçalho atualizam via manipulação direta do DOM
(`atualizarFaderDep`, `atualizarBarraPartidoDom`, `atualizarHeaderDeputados`);
a reordenação de verdade só acontece num `setTimeout` depois de soltar
— 450ms no Senador (candidatos), 150ms nos Deputados (partidos —
mais rápido porque a lista é mais curta e o custo de render medido é
~8ms, a demora sentida era quase toda a pausa em si).

Critério de ordem: Senador por votos; Deputados por VAGAS INDICADAS no
box primeiro, votos como desempate (pedido do usuário, 18/08/2026).

## 8. Plenário: hemiciclo vs. case de cápsulas

`desenharHemiciclo()` (arco geométrico, `calculo/eleitoral.js`) é
EXCLUSIVO da Assembleia de Santa Catarina (`estado === "SC" &&
cargoAtivo === "estadual"`). Todo o resto (Federal, outros estados)
usa `renderCasePlenario()`: grade de nichos fixos (um por vaga),
preenchida por cápsulas no visual dos botões do console conforme as
vagas indicadas nos boxes — não a apuração automática, pra bater com o
que os boxes mostram. A grade sempre procura o número de colunas que
divide as vagas em linhas iguais (8 a 14, depois 7 a 5); em plenários
grandes, encolhe as cápsulas até ~50% do tamanho antes de aceitar linha
incompleta.

## 9. Console — identidade "Fader" (visual, PROJETO.md §8.2)

O cabeçalho fixo das três abas é uma peça só: card elevado (`#2C3239`
+ borda `#4D545C`, o "material do console") com VOTOS/barra/escala em
cima e o painel de comandos (translúcido, ícones claros, sem cor de
destaque — nem no mágico) dentro do mesmo card, separado por um fio.
O interruptor de cargos (pílula de abas) fica FORA do console, mas
herda a mesma cor de material na aba ativa. `pc-tema-fader` é a classe
que liga esse tema — hoje cobre a tela inteira de palpite; as demais
telas do app seguem na identidade 1.0 até a migração (ver
`alesc-deputados-prototipo-primeiro` na memória / task de estética v2).
