# Roteiro de testes por tipo de usuário

Guia prático pra VOCÊ rodar os testes de ponta a ponta (19/08/2026 —
atualizado com os limites da economia fase 1). Ordem pensada pra
preparar o terreno de um teste com o anterior. Marque conforme for.

## Preparação (uma vez)
- [ ] Criar a **conta de teste** no próprio site (qualquer e-mail seu;
      pode usar o truque do Gmail: `seuemail+teste1@gmail.com` — chega
      na sua caixa). Anote e-mail e senha.
- [ ] Logado como **admin**, ir em Menu → Painel do administrador →
      **Financeiro** e conceder créditos pra conta de teste pelo e-mail
      (ex.: 100, motivo "conta de teste").
- [ ] Pra testar grupos com 2 pessoas, criar uma **2ª conta de teste**
      (`seuemail+teste2@gmail.com`).

## 1. Convidado (sem conta) — aba anônima do navegador
- [ ] Capa → Começar → escolher SC → montar palpite nos 3 cargos
      (tutorial aparece na 1ª vez; faders respondem; mágico preenche).
- [ ] Revisão: cortes de exibição certos (Senador só 4), disputa de
      sobra abre, salvar lista pede nome.
- [ ] Tentar depositar → deve mandar pro cadastro.
- [ ] Mediana/Grupos/Ranking: gates de "precisa se cadastrar" no lugar.

## 2. Cadastrado comum (conta de teste 1, SEM créditos ainda)
Se já concedeu créditos na preparação, teste esta seção ANTES — ou use
a conta de teste 2.
- [ ] Cadastro completo (CPF, CEP) → login → palpite → depositar a
      1ª cédula (grátis) → cartão-desafio no compartilhar.
- [ ] Criar 2 listas em aberto (grátis) → tentar a 3ª → aviso "limite
      grátis: 2 listas" apontando pro convite.
- [ ] Tentar depositar uma 2ª cédula → aviso "70 créditos".
- [ ] Criar 1º grupo (grátis, 5 vagas) → tentar criar 2º → aviso "10
      créditos".
- [ ] Menu → Créditos: saldo 0, extrato vazio com dica de convite.
- [ ] Mediana: só 2 linhas nítidas + resto desfocado + caixa "2 linhas
      por dia" com botão de acelerar; acelerar sem saldo → mensagem
      apontando convite.

## 3. Cadastrado com créditos (depois de conceder pelo admin)
- [ ] Menu → Créditos: saldo atualizado, linha "Crédito concedido" com
      o motivo que você digitou.
- [ ] Criar 3ª lista (deve debitar 1 e aparecer no extrato).
- [ ] Criar 2º grupo (debita 10; extrato mostra "abrir grupo").
- [ ] Depositar 2ª cédula (debita 70; extrato "Nova cédula").
- [ ] Mediana → acelerar (+10 linhas, debita 2; extrato "Aceleração da
      mediana"); voltar no dia seguinte soma +2 sozinho.
- [ ] Editar cédula depositada: botão "Editar · 20c" → debita 20, abre
      no editor, salvar mantém depositada e ganha a marca "editada em";
      2ª edição custa 35, 3ª custa 50, depois botão vira "3/3"
      desabilitado apontando nova cédula (70).
- [ ] Conferir que o saldo bate: concedido − 1 − 10 − 70.

## 3b. Convite convertido (usa as duas contas de teste)
- [ ] Conta 1: Grupos → card "Seu link pessoal de convite" → copiar.
- [ ] Aba anônima: abrir o link (?conv=...) → cadastrar a conta 2 →
      depositar a 1ª cédula completa.
- [ ] Conta 1: extrato deve mostrar "+10 · Convite convertido: <nome>";
      Menu → Créditos com o saldo atualizado.
- [ ] Depositar de novo/editar pela conta 2 NÃO premia de novo (1x só).
- [ ] Presença: entrar 7 dias seguidos rende +5 uma única vez (marco) —
      teste de longo prazo, marcar no calendário.

## 4. Grupos e limite de 5 (usa as duas contas de teste)
- [ ] Conta 1 cria grupo → código → conta 2 entra pelo código.
- [ ] Encher o grupo até 5 pessoas (ou simular: no SQL Editor, inserts
      em grupo_membros até 5) → a 6ª tentativa deve ser barrada com
      "Grupo cheio — o dono pode ampliar as vagas."
- [ ] Comparação do grupo funciona com 2 cédulas depositadas.
- [ ] Dono do grupo vê "Vagas: X/5" e os botões "+1 vaga · 10" /
      "+5 vagas · 50"; comprar amplia na hora, aparece o selo VIP e a
      linha "gasto_vaga" no extrato; membro comum NÃO vê os botões.
- [ ] Tentar passar de 30 vagas → erro do teto ("conta institucional").

## 5. Admin (sua conta principal)
- [ ] Menu → Painel do administrador → todas as abas abrem.
- [ ] Financeiro: conceder créditos (aparece no extrato geral E no
      extrato da conta de teste), ajustar com quantidade negativa
      (saldo nunca fica abaixo de 0), e-mail inexistente dá erro claro.
- [ ] Usuários/Problemas/Pesquisa/Rotinas: dados carregam.

## 6. Regressão rápida (depois de qualquer mudança grande)
- [ ] Convidado consegue ir da capa ao palpite completo sem tela preta.
- [ ] Console do navegador sem erro vermelho (F12 → Console).
- [ ] Celular (ou janela estreita ~375px): nada estoura na horizontal.

## Pendências conhecidas deste roteiro
- Gestor Eleitoral e conta institucional: ainda sem fluxo pra testar
  (etapa 8 do plano de implementação).
- Convite especial nominal e patrocínio de funcionalidade (§5 do
  MONETIZACAO.md): fatia seguinte da etapa 5 — a compra de vagas e o
  selo VIP já estão testáveis acima.
