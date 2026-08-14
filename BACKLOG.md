# Backlog — organizado por página

> Fonte da verdade da fila de trabalho. Atualizado por mim (Claude) a cada
> pedido novo ou item concluído — não editar à mão sem avisar, pra não
> perder sincronia com o que já foi de fato implementado.
>
> Cada página tem três blocos: **✅ Concluído**, **🔄 Em andamento**,
> **⬜ Pendente** (pendente já vem na ordem sugerida de execução — de cima
> pra baixo). Pra pedir algo novo, é só falar — eu classifico na página
> certa e coloco na ordem que fizer mais sentido.

_Última atualização: 13/08/2026_

---

## Login / Cadastro

**✅ Concluído**
- Login social com Google (Login e Cadastro), com etapa de completar CPF/CEP/gênero pra quem entra por ele
- CEP no cadastro, com resolução automática de município/UF (ViaCEP)
- Gênero no cadastro (Masculino/Feminino/Outro)
- "Esqueci minha senha"
- Redesenho da tela de Cadastro (telefone, regra de senha, remoção de escopo/mostrar-nome)

**🔄 Em andamento**
- _(nenhum agora)_

**⬜ Pendente**
- _(nenhum agora)_

---

## P02 — Escolha de estado

**✅ Concluído**
- Tela de escolha de estado (27 estados + DF listados, só SC habilitado)
- Texto trocado: "Gire e solte no seu estado" → "Selecione o estado" (14/08/2026)

**⬜ Pendente**
1. Permitir trocar de estado dentro do app + participação multi-estado
2. Remover o aviso "Lista de candidatos pronta" quando a lista final de 2026 estiver no ar — **não fiz essa parte**, continua esperando confirmação de que a lista final oficial de candidatos de 2026 já está no ar (não tenho como saber esse status sozinho)

**❌ Descartado**
- Pré-selecionar o estado de residência usando a UF do CEP salvo no cadastro — descartado pelo usuário em 12/08/2026, sem justificativa registrada além de "descartar"

---

## P03 — Seleção de candidatos

**✅ Concluído**
- Corrigir sobreposição em "Soma de Votos" / conflito de camadas de fundo
- Botão "zerar" (por partido) só com ícone de borracha
- Selo "SOBRA" com legenda específica por caso e cor sólida
- Vista agrupada por partido (soma de votos + falta-pra-próxima-vaga ao lado do nº de eleitos)
- Bug: editar votos de vários candidatos de um partido não atualizava o painel
- Ajuste do teto de 80% pra nunca suprimir abaixo do voto real de 2022
- Box de votação com borda verde suave quando o ajuste foi manual (automático fica sem borda extra)
- Autopreenchimento (✦, por partido ou "Auto" geral) agora pergunta antes de preencher, com opção "não perguntar de novo"
- **CRÍTICO** — matemática eleitoral zero-sum: o interruptor "eleito" não é mais clicável, é 100% calculado (sempre os N mais votados agora, N = quantidade escolhida no contador do partido). Editar um voto que muda o ranking corrige sozinho quem fica marcado — testado ao vivo
- Bug do botão de autopreenchimento (✦, na Revisão): na real não era o botão que sumia — clicar nele reconstruía a tela e fechava os cards de cargo que já estavam abertos, dando a impressão de "voltar pro topo". Corrigido em 12/08/2026: estado aberto/fechado e posição de rolagem agora são preservados entre as atualizações da tela
- 2ª forma de abrir o menu de autopreenchimento: seta ao lado de "faltam X votos", além do botão ✦ redondo (pedido do usuário, 12/08/2026)
- Tooltip "eleito · média" simplificado + mostra em qual rodada de sobra GLOBAL (entre todos os partidos do cargo) aquela vaga foi conquistada, não só a cadeira dentro do próprio partido (pedido do usuário, 12/08/2026)
- Painel Eleitoral reformulado: título sai de dentro do card (label simples acima), Seus Eleitos + Quociente do Cargo + Soma de Votos numa linha só — o Quociente, que antes só aparecia dentro de um partido expandido depois de marcar alguém, agora fica sempre visível (pedido do usuário: "é um ponto central", 12/08/2026)
- Card do Plenário ganhou seta pra recolher/expandir o hemiciclo + legenda (estado lembrado por cargo)
- Painel "Disputa de Sobra": selo "sobra · rodada X/Y" visível direto no card do candidato eleito por média + botão "Ver disputa de sobra completa" abrindo um painel com quociente/QP/sobra e a tabela rodada a rodada (mockup confirmado, implementado e testado ao vivo em 12/08/2026 — matemática bate: média de cada vencedor recalculada corretamente na rodada seguinte)
- **Achado ao investigar o item de corte de texto, 12/08/2026**: `index.html` não tinha `<meta name="viewport">`. Sem essa tag, qualquer navegador de celular renderiza o site numa largura virtual de 980px e reduz a escala pra caber na tela — quase certo que estava abrindo minúsculo/precisando de pinça-zoom em telefone real, e também mascarava vários cortes de texto que só aparecem na largura real do celular. Adicionada a tag; corte de texto confirmado ao vivo logo em seguida, já com a largura certa.
- Cabeçalho do cargo na Revisão cortava texto (ex.: "5 do seu pal..."). Filtro lista/agrupado movido pra dentro do card (só aparece ao abrir) + texto agora quebra em 2 linhas em vez de cortar com "..." quando não cabe numa linha só (mockup com 3 opções de linha única + a opção de quebra de linha; usuário escolheu quebra de linha — texto completo sempre visível). Confirmado ao vivo em 12/08/2026 com a largura real de celular (375px)
- Caixa do contador de eleitos por partido (Seleção) desalinhada: media 52px de altura contra 34px dos botões de ação ao lado, "flutuava" maior que o resto da linha. 1ª tentativa (mockup comparando antes/depois confirmado, 12/08/2026) reduziu a caixa pra 34px pra alinhar com os ícones — mas ao testar na largura real de celular, o usuário percebeu que a fileira toda (4 ícones + caixa) vazava ~6,6px pra fora do card em todos os 16 partidos. Correção final (13/08/2026, com mockup e usuário pedindo explicitamente pra manter a caixa grande/em destaque): ícones de ação encolhidos de 34px pra 26px (nova classe `.pc-mini-btn-sm`, só nesses 4 botões — os outros `.pc-mini-btn` do resto do app continuam 34px), caixa do contador volta a ser grande e com borda verde de destaque, número com largura mínima pra 2 dígitos (testado com "11" do PL, sem deslocar). Fileira toda cabe com ~25px de folga dentro do card — testado ao vivo nos 16 partidos
- **Auditoria completa de corte de texto em largura real de celular (13/08/2026)**, disparada pela correção da tag de viewport acima. Quatro pontos achados e corrigidos, todos testados ao vivo em 375px:
  - Nome do candidato na Revisão espremido em **27px** de largura (precisava de ~98px) pelo emblema de posição + campo de voto fixo de 112px — texto ilegível, quebrando letra por letra. Corrigido nos dois formatos de card (eleito e não-eleito): campo de voto desce pra uma 2ª linha, alinhado à direita, nome ganha a linha inteira (mesmo padrão de quebra já aprovado no cabeçalho do cargo). Confirmado em 660 linhas de candidato, 0 restantes cortadas
  - Selo "sobra · rodada X/Y" vazando ~48-50px pra fora do card (container dos selos tinha `flex-shrink:0`, nunca encolhia pra quebrar linha). 1ª correção: `min-width:0`, quebra embaixo do selo "eleito · média" quando não cabe — depois substituída pelo redesenho lateral abaixo
  - Resumo "Eleições 2022" no rodapé do card de partido (Seleção) cortava em 5 dos 16 partidos — exatamente os que são federação (2-3 nomes de partido na mesma linha, ex. "PSDB / CIDADANIA"). Era um `text-overflow:ellipsis` intencional (comentário no código dizia isso explicitamente) mas o usuário preferiu quebrar como nos outros casos — trocado pra permitir 2+ linhas, texto completo sempre visível
  - Régua "Soma de Votos" do Painel Eleitoral: não corta com "...", é uma faixa com scroll horizontal de propósito — só faltava indicar visualmente que dá pra arrastar. Adicionado um degradê sutil na borda direita do card (mesma cor de fundo, sem brilho/glow) como pista visual
- **Redesenho do card de candidato eleito (Revisão), 13/08/2026** — pedido do usuário pra economizar altura: selo(s) + campo de voto lado a lado (antes eram linhas empilhadas), com destaque pro nome do candidato acima. Vários ajustes até caber sem vazar (testado com medição exata, não só visual, porque o vazamento é discreto no fundo escuro):
  - Ícone "i" de explicação tirado desses selos especificamente (evita o toque acidental, e é o que mais pesava em largura) — a explicação continua disponível ao tocar/segurar no próprio selo (atributo `title`, função nova `explicacaoTagTexto` que tira as tags HTML da explicação original)
  - Fonte e respiro interno dos selos reduzidos (9,5px→9px, padding 8px→6px), campo de voto de 112px pra 94px
  - Caso raro "eleito · média" + "sobra · rodada X/Y" (2 selos empilhados): coube ao lado do campo de voto sem cortar texto nenhum, com ~10px de folga — testado especificamente pedido do usuário
  - Caso "eleito · majoritário" (Senador): span sozinho ainda vazava 11,5px mesmo espremido — resolvido simplificando pra só "ELEITO" (sem o "· majoritário"), a pedido do usuário: cargo majoritário não tem sobra pra explicar mesmo, a palavra extra não fazia falta
  - Rede de segurança: a linha ganhou `flex-wrap:wrap`, então qualquer caso futuro que não caiba (nome de selo muito comprido) quebra pra 2 linhas em vez de vazar escondido
  - Confirmado ao vivo em 660 candidatos (todos os 3 cargos), 0 elementos vazando — nem selo nem campo de voto

**🔄 Em andamento**
- _(nenhum agora)_

**⬜ Pendente**
- _(nenhum agora — auditoria de corte de texto concluída)_

**⏸️ Ideia pausada — aviso de "vaga não marcada" (candidato fecharia vaga mas você não marcou)**
Conceito fechado em 12/08/2026 (caso Acélio Casagrande): a Revisão hoje
troca quem aparece como "ELEITO" pelo vencedor REAL da matemática
completa, mesmo que a pessoa não tenha marcado esse candidato — isso
"rompe" com o princípio de que o palpite do usuário é soberano (o app
orienta, não substitui a decisão de ninguém). Caminho decidido:
- "ELEITO" na Revisão passa a refletir só quem o usuário marcou, nunca
  mais é substituído por um candidato que ele não escolheu.
- Quando a matemática mostra que um partido teria direito a mais vagas do
  que o usuário marcou, isso vira um AVISO informativo (não uma
  substituição) — sem botão de "marcar automaticamente", só informa; se a
  pessoa concordar, ela mesma sobe o contador do partido.
- "Quem perderia a vaga" (o lado espelhado do "faltam X votos" que já
  existe) ficou de fora da conversa por enquanto, sem decisão.

Mockup do aviso foi mostrado e ajustado: usuário quer o aviso FECHADO por
padrão (só um mini ícone de exclamação no card do partido, não o bloco de
texto todo já aberto), texto mais objetivo, e levantou uma preocupação
real de performance/complexidade — rodar a matemática completa (quociente
+ sobra entre TODOS os partidos) toda hora enquanto a pessoa ainda está no
começo do preenchimento (poucos candidatos marcados) pode pesar demais
pra ficar recalculando o tempo todo. Pausado a pedido do usuário — **ele
pediu pra eu lembrar de retomar essa conversa antes de finalizarmos** (ver
também memória de escopo de lançamento).

---

## Cédula depositada / Compartilhamento

_Pedido do usuário em 11/08/2026, refinado em 11/08/2026 — o que acontece
depois que a pessoa deposita a cédula: como ela vira pontuação de ranking,
como dá pra consultar, e como vira conteúdo pra compartilhar._

**Ancoragem confirmada com o usuário**: não é uma tela nova — vive dentro da
tela **"Minhas listas"** que já existe (`renderMinhasListas`), que é pra onde
a pessoa vai depois de salvar/nomear uma lista. O modal de "Depositar"
(irreversível) já existe ali, com uma opção de depositar anônimo ou com
nome (`pcCheckAnonimo`). O compartilhamento (imagem, código, links de
WhatsApp/Instagram) **respeita essa mesma escolha** — se a pessoa depositou
anônima, nada do que for gerado pra compartilhar mostra o nome dela.

**✅ Concluído**
- Sistema de código único por cédula depositada (formato `SLxx-xxxx`, gerado
  no momento do depósito, mesmo padrão do convite de grupo)
- Botão "Compartilhar" em cada lista depositada de "Minhas listas"
- Imagem compartilhável (Canvas → PNG, formato Stories) com os eleitos
  previstos de Dep. Estadual — respeita a escolha anônimo/com nome
- Baixar imagem + compartilhar via WhatsApp (texto pronto) + tentativa de
  compartilhar direto pra Instagram via Web Share API (com baixar como
  reserva quando o navegador não suporta)
- **Estendida pra Dep. Federal e Senador, 13/08/2026** (resolve também o
  item equivalente que estava duplicado em "Revisão / Lobby"). O modal de
  compartilhar ganhou um seletor de cargo (mesmo estilo do seletor já usado
  na impressão) — só aparece quando a lista tem eleitos em mais de um
  cargo; cargos sem nenhum eleito ficam desabilitados/apagados no seletor,
  em vez de somem. `gerarImagemCedula()` ganhou um parâmetro `cargoLabel`
  opcional (retrocompatível — sem ele, comportamento igual a antes) que
  desenha o nome do cargo como subtítulo na imagem. Trocar de cargo no
  seletor regenera a imagem na hora, sem recarregar nada (dados dos 3
  cargos já vêm carregados juntos no clique de "Compartilhar"). Testado
  via injeção direta de estado (sem precisar montar cadastro+depósito
  completo pra testar) — confirmado visualmente que a troca gera a imagem
  certa e o botão ativo fica destacado
- **Consulta pública por nome/código dentro do Ranking, 14/08/2026** —
  seguiu a assunção já registrada aqui: a busca-e-visualização de uma
  cédula específica não depende do resultado oficial, só a pontuação/
  colocação depende (essa continua bloqueada, mensagem de "disponível
  depois do resultado oficial" continua na tela). O item "Ranking" do
  menu (faixa do hub + barra fixa de baixo) estava com `disabled:true` —
  **precisou ser habilitado**, senão ninguém conseguiria chegar na busca
  nova; diferente de Médias/Grupos, não pede cadastro (é consulta
  pública de verdade, funciona pra visitante também, testado ao vivo sem
  login). Busca por código (`SLxx-xxxx`) é exata; por nome é por trecho,
  até 10 resultados. Clicar num resultado mostra a lista completa
  (Estadual/Federal/Senador), reaproveitando a mesma montagem visual de
  "Minhas listas" (função nova `montarSecoesCargosDetalhe`, extraída pra
  não duplicar). **Precisa rodar as migrações `nuvem/migracao-15-cedula-
  escolhida-grupo.sql` e `nuvem/migracao-16-busca-cedula-publica.sql` no
  Supabase antes de valer em produção** (a 16 expõe o código da cédula na
  view pública — testado ao vivo: sem a migração rodada, a busca
  degrada de forma segura pra "nada encontrado" em vez de quebrar a
  tela, confirmado no console do navegador)

---

## Revisão / Lobby

**✅ Concluído**
- Habilitar "Impressão/PDF" só depois de salvar
- Botão "Impressão/PDF" virou ícone-only (impressora + avião de papel)
- Aviso "Você não precisa zerar todos os avisos..." começa fechado
- Cards de cargo começam fechados por padrão
- Texto do modal "Dê um nome pra essa lista" corrigido
- Botão "← Ajustar" esclarecido
- Botão salvar em destaque, canto superior direito do cabeçalho — já implementado (contorno verde, padrão de botão primário do app); usuário confirmou em 13/08/2026 que o estado atual já resolve, sem mudança de código necessária
- Resumo de Dep. Federal e Senador na imagem compartilhável — feito, ver "Cédula depositada / Compartilhamento" (era o mesmo item duplicado nas duas seções)
- **Escolher qual cédula depositada aparece em cada grupo, 14/08/2026** — antes a cédula "oficial" (a que vale no Quadro de Médias público) era a única opção e valia em TODOS os grupos ao mesmo tempo, sem variar por grupo. Agora, se a pessoa tem mais de uma cédula depositada, um seletor aparece na tela do grupo ("Sua cédula neste grupo") deixando escolher qual delas representa ela ali — só afeta aquele grupo, os outros continuam como estavam (ou na oficial, se nunca escolher nada). **Precisa rodar a migração `nuvem/migracao-15-cedula-escolhida-grupo.sql` no SQL Editor do Supabase antes de valer em produção** — coluna nova (`grupo_membros.salvamento_escolhido_id`) + view nova (`salvamentos_depositados_publicos`) + `grupo_comparacao` recriada pra resolver a escolha. Lógica client-side (`nuvem/grupos.js`, `interface/prospeccao.js`) testada com dados fake via injeção direta de estado (sem precisar montar cadastro+grupo+depósito reais) — seletor renderiza certo, troca chama a função certa e força recarregar a comparação

**⬜ Pendente**
- _(nenhum agora)_

---

## Geral / Multi-estado

**⬜ Pendente**
1. Confirmar a regra de vagas de Senador por estado em 2026 (renovação por terços — já mapeado no PROJETO.md, falta só validar a fonte)

---

## Ranking

_Ainda em concepção (pedido do usuário, 11/08/2026) — não é pra construir
ainda, é pra fixar a ideia antes de chegar no fim da estrutura. Bloqueado
de qualquer forma pelo resultado oficial de 2026 (só existe pontuação
depois da eleição de verdade — Fase 6 do PROJETO.md)._

**Conceitos fechados nessa rodada:**
- Ranking = **pontuação do usuário**, sempre com o nome real do cadastro,
  **sem opção de anônimo** (diferente da divulgação de lista, que é por
  cédula e pode ser anônima — não confundir os dois).
- Nome de trabalho pro título de destaque (tipo "melhor colocado"):
  **"Cacique"** — pode mudar depois, mas é o nome usado por enquanto em
  qualquer rascunho/protótipo.
- Escopos geográficos: **Município → Estado → Brasil** (nessa ordem de
  exibição, do mais local pro mais amplo). Município já vem de graça do
  CEP capturado no cadastro (11/08/2026) — não precisa de trabalho extra
  pra isso existir.
- Categorias confirmadas até agora: **mais acertos** (composição certa dos
  eleitos, critério principal) e **mais preciso** (menor distância entre
  voto previsto e voto real, hoje é o critério de desempate). Usuário vai
  sugerir mais categorias antes de fechar a lista completa.
- **Engenharia**: pontuação não é calculada ao vivo — é um cálculo em lote,
  rodado uma vez depois que o resultado oficial de 2026 for carregado
  (mesmo processo de conferência já usado pra 2022). O resultado desse
  cálculo fica numa tabela própria; cada "ranking" (por município/estado/
  país/categoria) é só uma consulta ordenando essa tabela, não um
  recálculo — mantém rápido mesmo com volume.
- **UX proposta**: a posição da própria pessoa sempre em destaque no topo
  (mesmo fora do top 10), dois seletores (escopo geográfico + categoria) em
  vez de uma grade com tudo, lista dos mais bem colocados embaixo. Clicar
  em alguém leva pro perfil público dela via código da cédula (mesmo
  código do compartilhamento — ver seção "Cédula depositada" acima e a
  tarefa #34, consulta por nome/código dentro dessa mesma tela).

**⬜ Pendente**
1. Fechar a lista de categorias (só "mais acertos" e "mais preciso" até agora)
2. Consulta por nome/código dentro da tela de Ranking (tarefa já registrada — #34)
3. Desenhar e implementar o cálculo em lote pós-resultado oficial (schema, função, tabela de pontuação)
4. Protótipo visual da tela (seletores + destaque da posição própria + lista) antes de programar
5. Testar o fluxo de Ranking **antes** do resultado oficial sair (pedido do usuário, 12/08/2026) — precisa definir como simular/mockar um "resultado oficial" de teste pra validar cálculo em lote + telas sem esperar a eleição de verdade

**⏸️ Ideia pausada — 155 usuários fictícios de "cold start"**
Especificação de produto já fechada (ver histórico: contas reais e
permanentes, 3 cargos, só SC, variação de ±20% por candidato em cima de
uma lista de referência, "efeito boot" cancela 1 fictício por cédula real
depositada). Usuário pediu pra amadurecer mais antes de seguir. Dois
pontos em aberto quando retomar:
- Quem preenche a lista de referência (o próprio usuário pelo site, ou
  ele dita a lista pra mim registrar) — perguntado, ainda sem resposta.
- Cada uma das 156 contas (referência + 155) precisa de nome brasileiro
  realista (não pode parecer "bot"/marca) e e-mail próprio e único
  (não precisa ser caixa de e-mail real, só sintaticamente válido e
  distinto — Supabase não aceita e-mail repetido entre contas).

---

## Visual / Identidade

**✅ Concluído**
- Tema escuro com verde neon confirmado (substitui a ideia anterior de tema claro/glassmorphism)
- Removida a fonte monoespaçada (JetBrains Mono) do app inteiro — todo número (tabelas, quociente, contadores) usa a fonte do sistema/Inter agora, igual ao resto do texto (pedido do usuário, 12/08/2026)

- **Textura de fundo sutil em todas as telas, 14/08/2026** — a vinheta radial já existia (`#modoColaborativoWrap`, presente em toda a Prospecção Coletiva); faltava o grão/textura em si. Adicionado um ruído bem sutil (gerado por SVG, `feTurbulence`, sem precisar de arquivo de imagem) por cima da vinheta, opacidade bem baixa (0,035) de propósito — quase imperceptível num print comprimido, mas confirmado de verdade: renderizado num canvas isolado, o mesmo SVG produz variação real de pixel (alpha de 12 a 138), então a textura é real, só é discreta como pedido

**⬜ Pendente**
1. Revisar se falta mais alguma coisa pra fechar de vez a identidade visual antes do lançamento (item antigo, pode já estar resolvido — validar com o usuário)

---

## Estratégico / Negócio

_Itens grandes, sem detalhamento técnico ainda — cada um precisa de uma
conversa própria antes de virar tarefa executável._

**⬜ Pendente**
1. Capacidade operacional do servidor (armazenamento/processamento)
2. Limites do Supabase no plano atual + o que precisa além dele pra crescer
3. Rotina de triagem diária de bugs e correções
4. Apps nativos (iOS e Android), além do site
5. Sistema de monetização via desbloqueio de funções
6. Estratégia de mailing com a base de e-mails já disponível (Deputados do Brasil + vereadores de SC)
7. Criação de e-mail e mídia de divulgação pra captar usuários
8. Criar Instagram do app
9. Desenhar o sistema de rankeamento (pontuação por atividade + acerto de candidatos)
10. Pesquisar viabilidade de registrar a ideia (propriedade intelectual)
