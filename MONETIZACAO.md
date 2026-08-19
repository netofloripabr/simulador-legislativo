# Economia SIMULALEGIS — documento de estrutura (v3, 19/08/2026)

**AUTORIZADO pelo usuário em 19/08/2026** ("Certo. Autorizado.") — em
implementação pela ordem do §11.2 (etapas 1-2 concluídas em 19/08:
migração 21 + extrato no Menu + aba admin Créditos e Financeiro).
v3 incorpora a validação do usuário sobre a v2 (respostas de
19/08/2026). Marcação: **[DECIDIDO]** = definição do usuário ·
**[PROPOSTA]** = sugestão minha pra validar · **[SIMULAR]** = só depois
de simular cenários · **[ABERTO]** = pendente. Nada implementado.

---

## 1. As três fontes de receita

1. **Jogador (créditos)** [DECIDIDO] — paga por conveniências, nunca
   por vantagem competitiva.
2. **Upgrade profissional — "Gestor Eleitoral"** [DECIDIDO na v3] —
   não é uma classe separada de cliente: é a MESMA conta do app,
   **atualizada** pra versão profissional, que destrava o painel de
   dados estratégicos. Quem compra: candidato, marqueteiro, assessor.
3. **Contas Premium institucionais** [DECIDIDO na v3] — venda pra
   entidades e instituições (associação, sindicato, empresa, diretório):
   um pacote com **N acessos** e funções especiais, em particular
   **grupos grandes** (o grupão da instituição inteira).

**Restrição inegociável**: *"não é aposta online"* — dinheiro entra,
nunca sai como prêmio.

---

## 2. A moeda: créditos (e NADA de saldo em dinheiro) [DECIDIDO]

- Existe **um saldo só: créditos**. O usuário paga → o sistema **gera
  créditos na hora** → o dinheiro nunca fica "depositado". Sem carteira
  financeira, sem saque, sem saldo em R$.
- **Reembolso**: segue a legislação vigente (direito de arrependimento
  do CDC pra compra online); operacionalmente = estornar o pagamento e
  remover os créditos correspondentes se não usados. [PROPOSTA de
  detalhe: crédito já gasto não é reembolsável — regra padrão de
  consumível, exibida na compra.]
- **Venda em 3 pacotes progressivos com desconto** [DECIDIDO]:
  quanto maior o pacote, mais crédito por real.

### 2.1 Ponte créditos ↔ reais [PROPOSTA de coerência — validar]
O usuário definiu dois preços concretos em R$ (vaga de grupo: R$ 4,99;
+5 vagas: R$ 14,99). Pra tudo falar UMA língua (créditos), proponho que
esses preços sejam exatamente os dois primeiros pacotes:

| Pacote | Preço | Créditos | R$/crédito | O que dá pra fazer |
|---|---|---|---|---|
| Início | R$ 4,99 | 10 | 0,50 | 1 vaga extra de grupo |
| Grupo | R$ 14,99 | 50 | 0,30 | +5 vagas de grupo (com folga) |
| Temporada | R$ 29,99 | 120 | 0,25 | vagas + edições + cédula extra |

Assim "R$ 4,99 por vaga" continua verdadeiro (1 vaga = 10 créditos), e
quem compra maior leva desconto real. **← validar a ponte e o 3º pacote**

### 2.2 Recibo [DECIDIDO]
Toda cobrança gera **recibo/nota no menu do perfil**: lista de compras
com data, item, valor — **baixável (PDF/imagem) e enviável por
e-mail**. Espelho completo no painel do administrador (§7).

---

## 3. O que o usuário padrão tem GRÁTIS [DECIDIDO — números do usuário]

| Item | Grátis |
|---|---|
| Listas editáveis (rascunhos) | **2** |
| Cédula depositada | **1** |
| Criar grupo | **1** (grupo básico) |
| Participar de grupo | **1** grupo básico |
| Tamanho do grupo básico | **5 pessoas** |
| Ranking | completo |
| Mediana | em conta-gotas (§4) |

### 3.1 Como grupo, vaga e convite se relacionam (a explicação que faltou)
- **Criar** o seu 1º grupo é grátis; ele nasce com **5 vagas**.
- **Participar** do 1º grupo (o seu ou de um amigo) é grátis.
- O grupo cresce **comprando vagas**: R$ 4,99 por vaga avulsa,
  R$ 14,99 pelo pacote de +5 — **quem paga é o dono do grupo**
  (anfitrião), e a vaga vem com o **convite especial** (§5).
- Exemplo narrado: *Maria cria o grupo da família (grátis, 5 vagas).
  Entram ela + 4. O tio quer entrar: Maria compra 1 vaga (R$ 4,99) e
  manda o convite especial pro tio — pro tio, entrar continua sem
  custo.*

---

## 4. Mediana em conta-gotas [DECIDIDO — mantido da v2]
- Revela **2 linhas de candidato por dia de acesso** (cumulativo).
- Créditos aceleram: [PROPOSTA] 2 créditos = +10 linhas.
- Pós-eleição: quadro integral aberto pra todos [PROPOSTA].

---

## 5. Convite especial, patrocínio e grupo VIP [DECIDIDO na v3]

Ideias novas do usuário, estruturadas:

- **Convite especial**: a vaga comprada (§3.1) materializa-se como um
  convite nominal — o convidado entra **sem custo** pra ele.
- **Patrocínio de funcionalidade**: o anfitrião pode pagar pra
  DESTRAVAR algo pro convidado — ex.: *"pago pro meu amigo receber a
  minha lista como a 2ª lista dele"*. [PROPOSTA de escopo inicial:
  patrocinável = 2ª lista do convidado e vaga de grupo; resto fica pra
  depois — cada item patrocinável precisa de recibo e ledger próprios.]
- **Grupo VIP**: variação do grupo em que o dono absorve todos os
  custos — convidado nunca paga nada — e pode **expandir a capacidade**
  além do básico. [PROPOSTA: VIP = grupo básico + pacotes de vaga; o
  rótulo "VIP" aparece pros convidados ("você foi convidado, entrada
  livre"). Capacidade máxima inicial: 30, expansível — validar teto.]

---

## 6. Cédulas: edição progressiva e nova cédula [DECIDIDO na estrutura]

Correção da v2 (que tinha "2ª cédula 40 / edição 60" — o usuário
apontou que o efeito é parecido e não fazia sentido a diferença):

- **Editar cédula travada: até 3 edições, com custo progressivo** —
  cada edição custa mais que a anterior.
- **Esgotou as 3? Só depositando nova cédula — que custa MAIS que a
  edição mais cara.**
- Escada [PROPOSTA — validar valores]:

| Ação | Custo em créditos |
|---|---|
| 1ª edição | 20 |
| 2ª edição | 35 |
| 3ª edição | 50 |
| Nova cédula (após as 3, ou cenário paralelo) | 70 |

- **Valorização perto da eleição** [DECIDIDO na intenção]: progressão
  **suave**, "apenas pra dar a sensação de valorização e de que ficará
  mais caro depois" — NÃO os multiplicadores duros da v2.
  [SIMULAR antes de adotar qualquer curva: multiplicadores, datas e a
  eventual trava de 72h ficam suspensos até simularmos cenários.]
  [PROPOSTA de curva suave pra simulação: +10% em setembro, +20% na
  última semana, sem trava.]
- Marca **"editada em DD/MM"** visível na cédula editada [DECIDIDO].

---

## 7. Ganho de créditos por engajamento (fase 1) — explicado com exemplo

A parte "não entendi os números" da v2, reapresentada:

**A regra**: você ganha créditos por duas coisas — trazer gente
(convite convertido) e marcos de presença (únicos, não repetem).

| Como ganhar | Quanto [PROPOSTA] |
|---|---|
| Amigo SEU cria conta e deposita a 1ª cédula | 10 créditos |
| Usar o app 7 dias seguidos (1x na vida) | 5 |
| Usar o app 30 dias seguidos (1x na vida) | 20 |
| Voltar na semana da eleição (1x na vida) | 10 |

**Exemplo narrado**: *João convida Pedro. Pedro cria conta e deposita a
cédula completa → João ganha 10 créditos → com 10 créditos, João compra
1 vaga extra pro grupo dele (vaga = 10). Ou seja: **1 amigo convertido =
1 vaga de grupo.** É a promoção de lançamento virando regra: convidar é
o jeito grátis de crescer o grupo.*

Anti-farm [DECIDIDO]: marcos são únicos; convite só premia com cédula
completa + CPF validado; [PROPOSTA] teto de 5 convites premiados/dia.

---

## 8. Painel do administrador — aba "Créditos e Financeiro" [DECIDIDO]

Tudo desta economia espelhado numa aba própria do painel admin:

- **Atribuir créditos a qualquer conta, a qualquer momento** — a
  ferramenta-chave pra estimular os **jogadores base** (primeiros
  usuários que puxam o efeito bola de neve). A função de banco
  (`conceder_credito`) já existe; o que falta é a interface no painel.
- Extrato geral (ledger): toda concessão, gasto, compra — quem, o quê,
  quando.
- Receitas: compras por pacote, recibos emitidos, upgrades Gestor,
  contas institucionais.
- Gestão dos upgrades: ativar/revogar Gestor Eleitoral e contas
  Premium institucionais.

---

## 9. Upgrade "Gestor Eleitoral" e contas institucionais

### 9.1 Gestor Eleitoral (ex-"lado B", reenquadrado) [DECIDIDO]
A conta comum vira profissional por upgrade pago. Destrava o painel de
dados estratégicos (mediana completa em tempo real, tendências,
recortes por cargo/partido — nunca dado individual de jogador).

**Preço em R$, tabela fixa por período** [o usuário validou a tabela na
v2; explicação simplificada]: o preço depende de **qual disputa** o
gestor acompanha e de **quando** ele assina — mais perto da eleição,
mais caro (o dado vale mais). Paga uma vez, vale até a eleição.

| Faixa da disputa | Assinando até 31/08 | Em setembro | Em outubro |
|---|---|---|---|
| Dep. Estadual | R$ 500 | R$ 750 | R$ 1.000 |
| Dep. Federal | R$ 1.500 | R$ 2.250 | R$ 3.000 |
| Majoritária (Senador/Gov) | R$ 3.000 | R$ 4.500 | R$ 6.000 |

Operação no lançamento: Pix + ativação manual pelo admin (§8); sem
gateway. Acesso nomeado, revogável, com recibo.

### 9.2 Conta Premium institucional [DECIDIDO conceito; ABERTO preço]
Pacote vendido a entidade/instituição: **N acessos** + funções
especiais — destaque pra **grupos grandes** (o grupão da instituição,
acima do teto comum). [ABERTO: tabela de N acessos × preço; teto de
grupo institucional; se inclui painel de dados ou é só jogo ampliado.]

---

## 10. Checks and balances [mantidos da v2 + ajustes]

1. CPF único por conta (já existe) — âncora anti-multiconta.
2. Convite premia só com cédula completa + CPF validado do convidado;
   teto diário [PROPOSTA: 5]; auto-convite bloqueado no servidor.
3. **Ledger imutável** — nenhum saldo muda sem linha de extrato; o
   usuário vê o próprio extrato + recibos; admin vê tudo (§8).
4. Marca "editada em" visível [DECIDIDO] + máximo 3 edições [DECIDIDO].
5. Preços e regras sempre validados no servidor, nunca no cliente.
6. Recibo obrigatório pra toda cobrança em R$ (§2.2).

---

## 11. Lógica de implementação (após validação deste documento)

### 11.1 Banco (migração nova)
- `transacoes_creditos` (ledger, INSERT-only via security definer):
  perfil, tipo (`ganho_convite | ganho_marco | ganho_admin | compra |
  gasto_vaga | gasto_edicao | gasto_cedula | gasto_mediana |
  gasto_patrocinio | estorno`), valor ±, saldo_apos, referência,
  criado_em.
- `recibos`: perfil, itens, valor R$, forma (pix), criado_em — fonte do
  PDF do perfil e da aba financeiro.
- `marcos_conquistados` (unique perfil+marco).
- `mediana_revelacao` (linhas_reveladas, ultimo_dia).
- `grupos`: + capacidade, tipo (`basico|vip|institucional`), dono.
- `convites_especiais`: vaga nominal + patrocínio (o que foi pago, pra
  quem).
- `perfis`: + `plano` (`padrao|gestor|institucional`), validade.

### 11.2 Ordem de construção (cada etapa testável)
1. Ledger + extrato no Menu (fundação invisível).
2. Aba admin "Créditos e Financeiro" (atribuir créditos + extrato
   geral) — destrava a operação com jogadores base JÁ na fase 1.
3. Limites grátis novos (2 rascunhos / 1 cédula / grupo 5) + telas de
   "chegou no limite" apontando pro caminho (convite ou compra).
4. Mediana conta-gotas (blur progressivo — reusa o padrão do cartão).
5. Vagas de grupo + convite especial + VIP.
6. Edição progressiva (até 3) + nova cédula + marca "editada em".
7. Compra de pacotes (gateway) + recibos — fase 2.
8. Upgrade Gestor + institucional (ativação manual primeiro).

---

## 12. Checklist de validação da v3

- [ ] §2.1 — ponte créditos↔reais (1 crédito = R$ 0,50 no pacote de
      entrada; vaga = 10 créditos) e o 3º pacote
- [ ] §5 — escopo inicial do patrocínio (2ª lista + vaga) e teto do VIP
- [ ] §6 — valores da escada progressiva (20/35/50/70)
- [ ] §6 — curva suave pra SIMULAÇÃO (+10% set, +20% última semana)
- [ ] §7 — valores de ganho (10/5/20/10) agora com o exemplo narrado
- [ ] §9.2 — desenho da conta institucional (N acessos, preço, teto)
- [ ] §11.2 — a ordem de construção (o que entra antes do lançamento?)
