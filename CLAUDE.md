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
- `interface/app.js` — tudo que toca no DOM: renderização de tabelas,
  hemiciclo SVG, modal de novo candidato, listeners de evento.
- `css/estilo.css` — variáveis de cor/tema e layout.
- `index.html` — só estrutura HTML + os 3 `<script src>` nesta ordem
  (dados → calculo → interface — a ordem importa, `calculo` e `interface`
  dependem de coisas definidas antes).

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
