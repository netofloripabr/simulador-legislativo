# Backlog — organizado por página

> Fonte da verdade da fila de trabalho. Atualizado por mim (Claude) a cada
> pedido novo ou item concluído — não editar à mão sem avisar, pra não
> perder sincronia com o que já foi de fato implementado.
>
> Cada página tem três blocos: **✅ Concluído**, **🔄 Em andamento**,
> **⬜ Pendente** (pendente já vem na ordem sugerida de execução — de cima
> pra baixo). Pra pedir algo novo, é só falar — eu classifico na página
> certa e coloco na ordem que fizer mais sentido.

_Última atualização: 12/08/2026_

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

**⬜ Pendente**
1. Ajustar textos: trocar "Gire e solte no seu estado" por "Selecione o estado"; remover o aviso "Lista de candidatos pronta" quando a lista final de 2026 estiver no ar (**avisar antes de executar**)
2. Pré-selecionar o estado de residência usando a UF que já vem do CEP salvo no cadastro
3. Permitir trocar de estado dentro do app + participação multi-estado

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

**🔄 Em andamento**
- _(nenhum agora)_

**⬜ Pendente**
1. Cabeçalho do cargo trunca texto (ex.: "5 do seu pal...") — mover o filtro pra dentro do card, só ao abrir
2. Padronizar alinhamento das caixas de contagem de eleitos por partido
3. Decisão de design pendente: hoje a Revisão mostra como "ELEITO" quem REALMENTE fecharia a vaga pela matemática completa, mesmo que a pessoa não tenha marcado esse candidato no palpite dela — gera confusão quando aparece "ELEITO" junto com o aviso "você não marcou esse candidato" (achado pelo usuário em 12/08/2026, exemplo: Acélio Casagrande). Usuário quer que a lista reflita o palpite escolhido por ele, com o alerta só indicando a divergência matemática — não decidido ainda como fica a "vaga extra" que o partido teria direito mas o usuário não preencheu. Retomar essa conversa antes de mexer

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

**⬜ Pendente**
1. Consulta pública **dentro da tela de Ranking** (não é página separada):
   buscar um colega pelo nome ou pelo código da cédula (`SLxx-xxxx`) pra ver
   a lista/posição dele. Ranking hoje é só um placeholder ("disponível
   depois do resultado oficial de 2026") — a pontuação/colocação de fato
   depende do resultado real, mas a busca-e-visualização de uma cédula
   específica não depende disso, então dá pra liberar já (assunção — avisar
   se for pra esperar o resultado oficial também).
2. Estender a imagem/resumo pra Dep. Federal e Senador (hoje só Estadual)

---

## Revisão / Lobby

**✅ Concluído**
- Habilitar "Impressão/PDF" só depois de salvar
- Botão "Impressão/PDF" virou ícone-only (impressora + avião de papel)
- Aviso "Você não precisa zerar todos os avisos..." começa fechado
- Cards de cargo começam fechados por padrão
- Texto do modal "Dê um nome pra essa lista" corrigido
- Botão "← Ajustar" esclarecido

**⬜ Pendente**
1. Botão salvar/exportar em destaque, canto superior direito do cabeçalho
2. Interruptor pra gerar resumo de Dep. Federal e Senador (hoje só sai o de Dep. Estadual)
3. Permitir escolher qual cédula depositada aparece em cada grupo (hoje é só uma "oficial" global)

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

**⬜ Pendente**
1. Padrão sutil de textura de fundo com blur nas bordas, em todas as telas
2. Revisar se falta mais alguma coisa pra fechar de vez a identidade visual antes do lançamento (item antigo, pode já estar resolvido — validar com o usuário)

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
