# Economia SIMULALEGIS — documento de estrutura (v2, 19/08/2026)

Consolida a **entrevista de monetização** de 19/08/2026 (3 rodadas) e
estrutura o modelo completo — lados A e B, regras, valores e lógica de
implementação. Marcação: **[DECIDIDO]** = resposta explícita do usuário
na entrevista · **[PROPOSTA]** = número/regra minha pra validação ·
**[ABERTO]** = pendente de decisão. O usuário pediu o documento inteiro
estruturado pra validar em cima da versão final — é este. **Nada
implementado ainda.**

---

## 1. Arquitetura de receita [DECIDIDO]

**Dois lados que se alimentam:**
- **Lado A — Jogador**: paga (em créditos) por CONVENIÊNCIAS — nunca
  por vantagem competitiva. O jogo é igual pra todos.
- **Lado B — Campanhas/candidatos**: pagam em dinheiro (tabela fixa por
  período) pelo painel de dados estratégicos. Mais jogadores no A =
  dado mais valioso no B.

**Restrição inegociável** (prometida na capa): *"não é aposta online"*
— dinheiro entra, **nunca sai como prêmio**. Crédito compra
acesso/conveniência, jamais recompensa em dinheiro. Toda regra abaixo
foi checada contra isso.

---

## 2. LADO A — a moeda (créditos)

### 2.1 Ganho por engajamento — fase 1, lançamento [DECIDIDO]
Sem venda em dinheiro no lançamento; crédito nasce só de engajamento:

| Ação | Regra | Valor [PROPOSTA] |
|---|---|---|
| **Convite convertido** | Convidado cria conta (CPF validado) E deposita a 1ª cédula completa | **10** |
| Marco: 7 dias seguidos | Único, não repete | 5 |
| Marco: 30 dias seguidos | Único | 20 |
| Marco: semana da eleição | Único (acessar entre 27/09 e 03/10) | 10 |

Marcos únicos = escolha anti-farm [DECIDIDO]: nada repetível, nada
"farmável", auditável por natureza.

### 2.2 Compra em dinheiro — fase 2 [DECIDIDO adiar / ABERTO preço]
Pacotes em R$ só depois de medir o uso real da fase 1. Decisão-chave do
usuário: **"a carteira será sempre a partir da compra de créditos"** —
interpretação estruturada aqui (a validar):

- **Dois saldos separados**: *créditos de engajamento* (ganhos, teto
  natural pelas regras acima) e *carteira* (só existe com compra).
- Gasto consome primeiro do engajamento, depois da carteira [PROPOSTA]
  — quem compra nunca "perde" o que ganhou de graça.
- No extrato os dois aparecem separados; no total exibido, somados.
- Razão do desenho: protege o valor da moeda comprada (a economia de
  engajamento tem teto; a inflação não contamina o produto pago) e
  simplifica reembolso/contabilidade (dinheiro só toca a carteira).

### 2.3 Grátis pra sempre [DECIDIDO]
**Jogo completo 1x**: conta, montar e depositar 1 cédula (3 cargos),
entrar em 1 grupo, ver ranking.

### 2.4 Mediana em conta-gotas [DECIDIDO — mecânica do usuário]
O quadro da mediana revela **2 linhas de candidato por dia de acesso**;
créditos **aceleram**:
- Contador por conta: cada dia com acesso ao app soma +2 linhas
  reveladas (cumulativo, não zera).
- A ordem de revelação é do topo pro fundo do quadro (1º colocado
  primeiro) [PROPOSTA].
- Aceleração: **2 créditos = +10 linhas** [PROPOSTA].
- Pós-eleição: mediana integral aberta pra todos [PROPOSTA] — vira o
  material de comparação com o resultado real.
- Efeito de produto: retenção diária embutida sem farm de moeda (voltar
  todo dia dá INFORMAÇÃO, não moeda).

### 2.5 Escada de conveniências [DECIDIDO estrutura; PROPOSTA valores]
"Combo equilibrado" com a **edição de cédula travada como nível
especial, o mais caro** [DECIDIDO]:

| Nível | Conveniência | Custo base [PROPOSTA] |
|---|---|---|
| Pequeno | Acelerar mediana (+10 linhas) | 2 |
| Médio | Abrir grupo (além do 1º, que é grátis participar) | 10 |
| Grande | Depositar 2ª cédula (cenário paralelo) | 40 |
| **Especial** | **Editar cédula travada** | **60** |

Âncora de proporcionalidade [DECIDIDO]: *"o 1º convidado que deposita
lista concede créditos suficientes pra abrir um grupo"* → convite=10,
grupo=10. Nova cédula e edição "muito maiores" → 4x e 6x um convite.

### 2.6 Preço dinâmico pelo calendário [DECIDIDO lógica; PROPOSTA números]
*"Fica mais caro quanto mais perto da eleição"* — vale pros níveis
Grande e Especial:

| Período | Multiplicador | Nova cédula | Editar travada |
|---|---|---|---|
| até 31/08 | 1x | 40 | 60 |
| 01–20/09 | 1,5x | 60 | 90 |
| 21/09 → trava | 2x | 80 | 120 |
| **últimas 72h** | **bloqueado** | — | — |

**Trava final de 72h** [PROPOSTA]: perto demais da eleição, editar com
base em pesquisa de véspera seria vantagem injusta contra quem cravou
cedo — "cravar e sustentar" é parte do jogo. O bloqueio protege o
ranking e reforça a narrativa ("agora vale o que está na urna").

### 2.7 Promoção de lançamento [DECIDIDO]
Primeira semana no ar: o 1º convite convertido de cada conta rende o
suficiente pra abrir um grupo (já coberto pela tabela: 10=10 — a
"promoção" é comunicação, não exceção de regra). O ciclo
convite→grupo→mais convites é o motor de aquisição do lançamento.

---

## 3. Checks and balances [pedido explícito do usuário]

1. **CPF único por conta** (já existe, hash no cadastro) — âncora
   anti-multiconta. Convite só premia com CPF do convidado validado.
2. **Conversão exige cédula completa depositada** — clique/conta vazia
   não premia. Teto de **5 convites premiados/dia** por conta
   [PROPOSTA]; acima disso o convite vale (o convidado entra normal),
   só não gera crédito — freio de esquema em cascata.
3. **Ledger imutável** — nenhuma mudança de saldo sem linha de extrato
   (ver §5.1). Usuário vê o próprio extrato; admin vê tudo.
4. **Edição paga é transparente** [PROPOSTA]: cédula editada carrega
   marca visível ("editada em DD/MM") — pagar destrava a ação, não
   apaga o histórico. Preserva a confiança entre jogadores.
5. **Máximo 2 edições pagas por cédula** na campanha [PROPOSTA] — a
   trava continua significando algo mesmo pra quem tem crédito.
6. **Auto-convite bloqueado**: mesmo CPF/dispositivo do convidante não
   premia [PROPOSTA de verificação no servidor, não só na interface].
7. **Preço dinâmico é do servidor**: o multiplicador de calendário vem
   de função no banco (nunca do cliente) — impossível burlar via
   console do navegador.

---

## 4. LADO B — campanhas e dados estratégicos

[DECIDIDO]: **tabela fixa por período** (não concierge caso a caso).
Valores e regras abaixo são **[PROPOSTA] integral** pra validação:

### 4.1 O produto
Acesso ao painel de dados estratégicos (infra já existe —
`pcState.souUsuarioFinal`) durante o período contratado:
- Mediana completa e em tempo real (sem conta-gotas).
- Tendência temporal (evolução dos palpites semana a semana).
- Recortes: por cargo, por partido/federação.
- **Nunca dados individuais de jogador** — só agregados (regra de
  privacidade já assumida no projeto, ponto em aberto #1).

### 4.2 Tabela [PROPOSTA — escalonada por cargo do candidato]
O valor do dado cresce com o tamanho da disputa:

| Faixa | Público | Até 31/08 | Setembro | Outubro (até a eleição) |
|---|---|---|---|---|
| Estadual | candidato a Dep. Estadual | R$ 500 | R$ 750 | R$ 1.000 |
| Federal | candidato a Dep. Federal | R$ 1.500 | R$ 2.250 | R$ 3.000 |
| Majoritária | Senador/Governador, partidos, consultorias | R$ 3.000 | R$ 4.500 | R$ 6.000 |

- Preço é pelo período contratado ATÉ a eleição (contratou em setembro
  na faixa Federal = R$ 2.250 uma vez, vale até o fim).
- Sobe perto da eleição — coerência com o lado A (o dado fica mais
  quente) e incentivo a fechar cedo (mais caixa antecipado).
- Pagamento fase B2B: Pix direto + liberação manual do painel pelo
  admin (infra de permissão existe; sem gateway no lançamento).
- Nota de sanidade: enquanto o volume de palpites for pequeno, oferecer
  a faixa Estadual como "early access" com desconto [ABERTO] — dado de
  200 palpites não vale tabela cheia.

### 4.3 Regras do lado B
- Contrato simples por escrito (mesmo que 1 página) com escopo do
  acesso e período [PROPOSTA].
- Acesso é por CONTA nomeada (não link compartilhável); revogável.
- O comprador nunca aparece pros jogadores; nada de "patrocinado por"
  sem decisão separada.

---

## 5. Lógica de implementação (pra quando o documento for validado)

### 5.1 Modelo de dados (Supabase, migração nova)
- `transacoes_creditos` (ledger): `id, perfil_id, tipo`
  (`ganho_convite | ganho_marco | gasto_grupo | gasto_cedula |
  gasto_edicao | gasto_mediana | compra | ajuste_admin`), `valor`
  (+/-), `saldo_engajamento_apos, saldo_carteira_apos, referencia`
  (ex.: id do convidado, id da cédula), `criado_em`. **Só INSERT via
  função security definer; nunca UPDATE/DELETE.**
- `perfis`: ganha `saldo_engajamento` e `saldo_carteira` (o saldo único
  atual migra pra carteira [ABERTO: ou pra engajamento?]).
- `marcos_conquistados`: `perfil_id, marco, criado_em` (unique por
  perfil+marco — garante "único" no banco, não só na tela).
- `mediana_revelacao`: `perfil_id, linhas_reveladas, ultimo_dia_contado`.
- `convites`: já existe a noção de código de convite; ganha
  `convertido_em` + trigger que, no 1º depósito completo do convidado,
  chama `premiar_convite()` (checa CPF, teto diário, auto-convite).

### 5.2 Funções (security definer, mesmas garantias das atuais)
- `gastar_creditos(perfil, tipo, custo_base)` — aplica multiplicador de
  calendário NO SERVIDOR, debita engajamento→carteira, insere ledger,
  retorna novo saldo. Recusa se trava de 72h ativa pro tipo.
- `premiar_convite(convidado)` / `premiar_marco(perfil, marco)`.
- `multiplicador_atual()` — função SQL pura com as datas da §2.6.
- As atuais `consumir_credito`/`conceder_credito` são absorvidas/
  aposentadas na migração (mantendo histórico).

### 5.3 Ganchos na interface (ordem de construção)
1. Ledger + saldos duplos + extrato no Menu (fundação, sem mudar UX).
2. Mediana conta-gotas (contador + tela com linhas borradas — reusa o
   padrão de blur do cartão-desafio).
3. Gasto plugado: abrir grupo / 2ª cédula / edição travada (com o
   preço dinâmico e a marca "editada em").
4. Convite convertido + marcos.
5. Painel B2B: flag por conta + recortes (grande parte já existe).

Cada etapa é testável isolada e nenhuma quebra o grátis atual.

### 5.4 O que já existe (inalterado)
`nuvem/creditos.js` + `migracao-9-creditos.sql`: saldo por conta, RLS,
funções security definer, zero escrita direta do cliente. A fase 1
inteira é extensão disso.

---

## 6. Pontos que precisam da sua validação (checklist)

- [ ] §2.2 — interpretação da "carteira a partir da compra" (dois
      saldos separados)?
- [ ] §2.1/2.5 — os NÚMEROS (10/5/20/10 de ganho; 2/10/40/60 de custo)
- [ ] §2.6 — datas e multiplicadores do calendário + trava de 72h
- [ ] §3.4/3.5 — marca "editada em" visível e limite de 2 edições
- [ ] §4.2 — tabela B2B (faixas, valores, subida por período)
- [ ] §4.3 — regras do lado B
- [ ] A resposta da entrevista sobre B2B mencionou "abertura da cédula
      ou depositar mais cédulas... mais caro perto da eleição" — foi
      interpretada como regra do LADO A (§2.6). Se era sobre o lado B,
      me corrija.
