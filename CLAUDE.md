# Simulador Eleitoral ALESC — 40 Vagas

Simulador de projeção eleitoral 2026 para a Assembleia Legislativa de Santa
Catarina (ALESC), a partir dos dados reais de 2022 (TSE). Site estático,
sem build step — abre direto no navegador.

## Quem está usando este projeto

A pessoa que vai pedir mudanças **não programa**. Explique o mínimo de
código possível; foque em confirmar o que vai mudar na tela, não como.
Sempre que possível, mostre o resultado (ex.: "abra o index.html e veja X")
em vez de descrever a implementação.

## Estrutura (não misturar)

- `dados/base-2022.js` — só constantes: resultado oficial 2022, lista de
  candidatos, municípios, referência TRE-SC. Nada de lógica aqui.
- `calculo/eleitoral.js` — só regras eleitorais: quociente eleitoral (QE),
  quociente partidário (QP), método das médias (sobras), D'Hondt,
  auto-balanceamento de votos. Funções puras sempre que possível.
- `interface/prospeccao.js` — tudo que toca no DOM: telas, listeners,
  modais. (O `interface/app.js` original — o Simulador individual — foi
  removido em 18/08/2026 por decisão do usuário: todas as funções dele já
  tinham sido absorvidas pela Prospecção Coletiva. Código completo no
  histórico do git até o commit `57a5138`.)
- `css/estilo.css` — variáveis de cor/tema e layout.
- `index.html` — só estrutura HTML + os `<script src>` nesta ordem
  (dados → calculo → nuvem → interface — a ordem importa, cada camada
  depende de coisas definidas antes).

Ao adicionar uma função nova, pare e pergunte: isso é fato (dados), regra
(cálculo) ou tela (interface)? Coloque no arquivo certo, não no mais fácil.

## Regras eleitorais implementadas (não simplificar sem avisar)

- QE = votos válidos ÷ vagas, com a regra de arredondamento do art. 106 do
  Código Eleitoral (fração ≤ 0,5 despreza; > 0,5 soma 1).
- QP = votos do partido ÷ QE, parte inteira (art. 107).
- Sobras distribuídas pelo método das médias (art. 109) — implementado como
  D'Hondt puro em `dhondt()`/`dhondtComCorte()`. **Não é mais uma
  limitação** (corrigido em 12/08/2026, verificado via busca): o piso de
  votos pra concorrer à sobra (art. 109 §2º, 80% do QE pro partido e 20%
  do QE por candidato) foi **derrubado pelo STF em fevereiro/2024**,
  valendo já a partir das eleições de 2024 — hoje todo partido/candidato
  concorre à sobra sem piso mínimo, exatamente o que o código já fazia.
  Não "corrigir" isso pra reintroduzir o piso; se surgir uma reforma
  eleitoral nova mudando essa regra de novo, avisar antes de mexer aqui.
- `window.storage` tem um shim em `index.html` que cai para `localStorage`
  quando rodando fora do claude.ai. Não remover.

## Antes de considerar uma mudança pronta

0. Se mexeu em `calculo/eleitoral.js` ou `dados/base-2022.js`, rodar
   `node testes/eleitoral.test.js` — reproduz a ALESC 2022 (QE, vagas por
   partido e os 40 nomes) no regime de 2022 e confere que a função usada
   pelo app segue o regime de 2026. Sem dependências. Se falhar, NÃO
   "ajustar" a regra pra bater: 2022 e 2026 têm regras diferentes de
   sobra (ver o cabeçalho do teste).
1. Validar sintaxe dos 3 arquivos JS (ex.: `node --check`).
2. Abrir o `index.html` num navegador (ou pedir para a pessoa abrir) e
   conferir visualmente — não basta o código "parecer" certo.
3. Nunca editar `dados/base-2022.js` (os votos reais de 2022) sem citar a
   fonte da mudança.
4. Toda tag `<script src="...">` em `index.html` tem um `?cb=NÚMERO` igual
   (ex.: `?cb=256`) — é cache-busting manual. Editar um arquivo JS/CSS sem
   subir esse número faz o navegador (e o preview) continuarem servindo a
   versão antiga em cache, mesmo depois de recarregar a página — já causou
   um bug real (10/08/2026, login com Google: função nova não existia até
   perceber isso). Ao editar qualquer arquivo referenciado por `<script src>`,
   suba o número `cb=` de TODAS as tags juntas (são um contador único
   compartilhado, não um por arquivo) antes de considerar a mudança pronta.

## Mudança no elenco de candidatos (obrigatório desde 04/09/2026)

Achado do usuário: candidatos foram incluídos em `dados/estados/*.js`
(via atas/RRC do TSE) sem ele saber — só a mensagem do commit registrava,
e ninguém lê commit no dia a dia. **Toda vez que uma sessão ou rotina
altera candidato incluído, alterado (partido/número/status) ou excluído**
em `dados/estados/*.js`, antes de considerar a mudança pronta, chamar:

```js
await adminNotificarMudancaCandidatos("SC", "2 candidatos incluídos no PDT", "Fulano de Tal (nº 12345), Beltrano da Silva (nº 12346)");
```

(`nuvem/notificacoes.js`, RPC `admin_notificar_mudanca_candidatos`,
migração 47 — só admin pode chamar). Isso manda uma notificação de
verdade pro sino do admin no app, não depende de ele checar o Rotinas ou
o git log. Resumo curto na `p_resumo` (o que mudou, quantos), detalhe
com nomes/números na `p_detalhe`. Vale pra qualquer UF, não só SC.

## Migrações do Supabase (controle desde 04/09/2026)

- Cada mudança de banco continua sendo um arquivo `nuvem/migracao-N-*.sql`
  (numeração sequencial, comentário no topo explicando o porquê).
- Aplicar pelo MCP do Supabase (`apply_migration`, que registra em
  `supabase_migrations`) — não mais "colar no SQL Editor" sem registro.
- Depois de criar o arquivo, rodar `python3 ferramentas/gerar_indice_migracoes.py`
  (regera `nuvem/migracoes-index.js`) e subir o `?cb=` do `index.html`.
- A aba **Rotinas** do painel admin mostra "Migrações: X/Y aplicadas" e o
  que falta — o status vem do banco (função `admin_migracoes_status`
  confere se cada objeto existe), não de marcação manual. Se uma migração
  aparecer pendente ali, é porque um objeto dela não existe de verdade.
- Migração que só faz UPDATE/INSERT/DROP não tem objeto verificável e
  aparece como "sem verificação" (hoje só a 3).

## Visão de produto e roteiro

Veja `PROJETO.md` para a visão completa (tipos de usuário, objetivos, modelo
de funcionamento, identidade visual, roteiro de fases com checkboxes) e para
os pontos ainda em aberto que dependem de decisão do usuário antes de mexer
na arquitetura (privacidade, monetização, coexistência de modos de
preenchimento, escopo do painel administrativo). Ao planejar qualquer
mudança maior, confira esse arquivo primeiro.

## Permissões combinadas com o usuário

Em 04/08/2026 o usuário pediu "permissão geral pra todas as ações, sempre".
Registrando o que isso cobre de fato, pra não depender de lembrar de uma
conversa antiga:

- **`git push` para `origin/main` não precisa de confirmação a cada vez**
  neste projeto — pode commitar e empurrar direto quando fizer sentido
  dentro do trabalho pedido, sem parar pra perguntar antes.
- Isso não muda nada da categoria de ações que são sempre bloqueadas
  independente de autorização (credenciais, exclusão permanente de dado,
  movimentação financeira) — nenhuma dessas é esperada neste projeto de
  qualquer forma.
- Ações fora do escopo comum deste repositório (ex.: mexer em configuração
  de conta, publicar em outro lugar que não seja este repositório) ainda
  devem ser confirmadas normalmente — essa autorização é sobre o fluxo de
  trabalho git deste projeto, não um cheque em branco geral.

## Histórico

Este projeto começou como um único arquivo HTML no claude.ai e foi dividido
nestas pastas para crescer com segurança. Veja `README.md` para o
histórico completo de decisões e limitações conhecidas.

## REGRA MESTRA — elenco 2022 nunca se veste de 2026 (21/08/2026)

O candidato que aparece numa aba de palpite é SEMPRE do elenco 2026
(atas/RRC) onde esse dado existe (hoje: SC). O resultado de 2022 entra só
como BASE DE VOTOS dos candidatos que concorreram nos dois anos (o default
do 1º acesso equivale a apertar o relógio-2022) — jamais como elenco.
Quatro guardas implementadas:
1. `rascunhoEhOrfao` (interface/prospeccao.js) compara por CHAVE e exige
   maioria de sobrevivência — rascunhos da era pré-atas são descartados
   (o bug de 21/08: comparava por `id` inexistente, undefined casava com
   undefined e nenhum rascunho era descartado).
2. `podarGruposForaDoPool` também poda POR CANDIDATO (2ª regressão,
   21/08 à noite): rascunho antigo em que a MAIORIA dos candidatos de
   2022 também concorre em 2026 sobrevivia à régua da guarda 1, e os que
   NÃO concorrem (Julio Garcia, Zé Caramori...) voltavam pra tela dentro
   dos grupos sobreviventes. Agora candidato que não existe em nenhum
   grupo do pool oficial sai do rascunho — exceto adição manual
   (fonte:"manual") e voto de legenda; candidato novo do pool entra
   ZERADO; e o campo `status` (desistência/sub judice) do pool VENCE no
   sobrevivente — rascunho salvo antes da desistência não ressuscita o
   candidato congelado com votos (3ª regressão da família, 22/08).
3. `montarEstadoPalpite` (nuvem/palpites.js) grita `console.error` se SC
   cair no fallback de 2022 (sinal de sc-2026-provisorio.js quebrado).
4. O fallback pro elenco de 2022 continua válido SÓ pros estados sem dado
   2026 gerado.
Cuidado conhecido: "Editar" uma lista salva da era antiga é BLOQUEADO
(listaEhDaEraAntiga, 21/08) — não recarrega mais o elenco embutido.
