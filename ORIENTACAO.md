# Orientação em tempo real — conceito lógico do preenchimento

Documento pedido pelo usuário em 19/08/2026. Duas funções:
1. **Registrar o caminho lógico ideal** de preenchimento do palpite (a
   "trilha ágil") — como o usuário inicia e conclui com a experiência
   mais rápida e completa.
2. **Servir de especificação** pra futura **aba especial de notificação**
   que orienta o usuário em tempo real, passo a passo, dentro do app —
   cada passo com gatilho de conclusão DETECTÁVEL pelo sistema e a
   miniatura do botão correspondente.

Nada aqui está implementado como notificação ainda — o tutorial atual
("COMO MONTAR A LISTA", overlay estático da 1ª visita) é o ancestral
desta ideia; a aba nova o substitui/complementa acompanhando o estado
REAL do palpite, não só explicando de antemão.

---

## 1. O princípio

O app nunca tranca o usuário num fluxo — ele pode preencher como quiser
(voto a voto, arrasto, mágico). A orientação é um **farol, não um
trilho**: mostra sempre "qual é o próximo passo mais eficiente a partir
do estado atual", e se atualiza sozinha quando o estado muda, por
qualquer via.

Consequência de arquitetura: cada passo é definido por um **predicado
sobre o estado** (avaliável a qualquer momento), não por "o usuário
clicou em X". Refazer o palpite do zero faz a orientação voltar sozinha
pro passo certo.

---

## 2. Trilha por cargo

### 2.1 Deputado Estadual / Federal (proporcional)

| # | Passo (texto pro usuário) | Gatilho de conclusão (predicado) | Miniatura |
|---|---|---|---|
| 1 | **Preencha as vagas por partido** até completar o total do cargo (40 Estadual / 16 Federal em SC) | `Σ vagasIndicadas === totalVagasCargo` (tapete curto garante que nunca passa) | o box de vagas do card de partido |
| 2 | **Distribua a votação pelos candidatos** até a barra do console fechar — o atalho é o mágico, que completa o que faltar e preserva o que você já digitou | `somaVotosCargo ≥ 0,995 × votosValidosProj` (o mesmo gate que habilita o Avançar) | botão mágico (`pcBtnPreencherAutoTudo`, ícone "completar") |
| 3 | **Próximo** — avance pra Revisão | clique em Avançar (habilitado pelo passo 2) | botão Avançar (`pcBtnDepositar`, ícone "setaDireita") |

Nota do passo 1→2: o passo 2 só "abre" quando o 1 fecha — mas se o
usuário votar antes de indicar vagas, a orientação NÃO bloqueia; apenas
continua mostrando o passo 1 como pendente (farol, não trilho).

### 2.2 Senador (majoritário)

| # | Passo | Gatilho | Miniatura |
|---|---|---|---|
| 1 | **Indique os 2 eleitos** (as vagas em disputa em 2026) — toque no candidato ou arraste a barra dele | `totalIndicado === totalVagasCargo` (2) | selo ELEITO |
| 2 | **Dê votação a todos** — o mágico distribui uma simulação realista pelo peso dos partidos, sem mexer no que você digitou | mesmo gate de soma do proporcional | botão mágico |
| 3 | **Próximo** — Revisão | clique em Avançar | botão Avançar |

### 2.3 Depois dos 3 cargos (fluxo comum)

| # | Passo | Gatilho | Miniatura |
|---|---|---|---|
| 4 | **Revise os três cargos** — dá pra ajustar voto aqui mesmo | os 3 cargos com listas completas (gate que abre a Revisão) | — |
| 5 | **Salvar** — sua lista fica em "Minhas listas", editável | lista salva com nome (`listaSalvaId` existe) | botão salvar do console da Revisão (ícone "salvar") |
| 6 | **Depositar a cédula** — trava e vale no ranking (1ª é grátis) | `depositadoEm` preenchido | botão Depositar de Minhas Listas |
| 7 | **Convide e compare** — cartão-desafio + grupo (1º grátis, 5 vagas) | 1º convite convertido / 1º grupo com 2+ cédulas | card "Convide e ganhe" |

O passo 7 é o fim da trilha de onboarding e o começo do loop da
economia (convite → créditos → conveniências, MONETIZACAO.md §7).

---

## 3. A aba especial de notificação (espec da feature)

- **Onde** (protótipo de 19-20/08, artifact "Painel de Orientação"):
  o **farol** — barra colapsada no material console, vivendo logo abaixo
  do console de votos, com pulso verde-vivo + "Passo N · frase" +
  progresso vivo ("12 de 40"). Tocar expande o **painel** da trilha.
- **Conteúdo**: SÓ o passo atual em destaque + os concluídos com check
  verde-vivo + os futuros apagados. Cada passo com a frase curta da
  tabela e a **miniatura do botão real** (reaproveitar o markup/ícone do
  próprio botão, nunca um desenho paralelo — mesma regra do tutorial,
  que já embute o stepper e o "Auto" reais).
- **Tempo real**: reavaliar os predicados nos mesmos pontos que já
  re-renderizam a tela (toda edição re-renderiza — basta calcular os
  predicados dentro do render, custo desprezível).
- **Descartável**: o usuário pode recolher/ocultar; a preferência
  persiste (localStorage pra convidado, perfil pra logado).
- **Convidado vs logado**: mesma trilha até o passo 5; o 6 (depositar)
  desvia pro cadastro (comportamento já existente).

## 4. Estado dos gatilhos no código (pra implementação)

Todos os predicados JÁ EXISTEM como expressões no código — a feature é
só dar visibilidade a eles:
- Vagas: `vagasIndicadasDe()` somadas vs `vagasFixasCargo()` (o tapete
  curto de 19/08/2026 garante o invariante).
- Votação: `somaVotosCargo() >= 0.995 * votosValidos2026Proj` (gate do
  `pcBtnDepositar`, `gateDeputados`).
- Senador: `totalIndicado === totalVagasCargo`.
- Salva/depositada: `pcState.listaSalvaId` / `depositadoEm`.
- Convite convertido: linha `ganho_convite` no extrato (migração 26).

## 5. Pendências pra virar feature
- [x] Protótipo do indicador + painel (artifact "Painel de Orientação",
      20/08/2026): farol pulsante + painel-console com feito ✓ (verde,
      família do ELEITO), atual em destaque verde-vivo, futuros
      apagados, miniaturas dos controles reais. Verde vivo em dois
      papéis legítimos: "ação agora" (pulso/passo atual) e "fato
      consumado" (checks). Aguardando aprovação do usuário.
- [x] Posição: farol abaixo do console de votos (decidido no protótipo).
- [ ] Copy final de cada passo (as frases da tabela são rascunho).
- [ ] Tutorial estático da 1ª visita: mantém, encurta ou some quando a
      aba existir? (decisão de produto).
