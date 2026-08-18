# Ideias de monetização — RASCUNHO (não implementado)

Documento de ideias, escrito em 18/08/2026 a pedido do usuário. **São
só ideias pra decisão** — nenhuma foi implementada, e nenhuma vai ser
sem confirmação explícita depois de discutida. Cobrança de verdade
(Pix, cartão) envolve dado financeiro real e não é algo que se decide
ou liga sozinho numa madrugada de trabalho autônomo.

## O que já existe (fundação pronta pra qualquer opção abaixo)

`nuvem/creditos.js` + `migracao-9-creditos.sql`: sistema de créditos por
conta, já em produção — a partir do 2º salvamento de lista ou 2º grupo
criado, a conta precisa de 1 crédito. Hoje o saldo só é concedido
manualmente (você rodando `conceder_credito()` no SQL Editor); a
arquitetura já é já é segura pra plugar cobrança de verdade depois (RLS +
função security definer, nenhuma escrita direta liberada pro cliente) —
**quando existir pagamento, ele só passa a chamar essa mesma função**,
sem mudar nada da base.

Isso significa: o modelo "freemium com créditos" já é o caminho de
menor esforço técnico, porque metade já está pronta.

## Ideia 1 — Créditos pagos (extensão direta do que já existe)
Comprar pacotes de crédito pra salvar mais listas / criar mais grupos.
Prós: infraestrutura pronta, familiar (é como já funciona hoje, só
troca "grátis por enquanto" por "compra". Contras: precisa de um
provedor de pagamento (Pix via gateway, ou cartão) — decisão de
fornecedor e taxa é sua, não técnica.

## Ideia 2 — Assinatura "Estrategista" (recorrente)
Um nível pago com: cédulas ilimitadas nos 3 cargos, grupos ilimitados,
acesso antecipado a atualizações de ata, estatísticas extras do próprio
desempenho no ranking (ver `RANQUEAMENTO.md`). Prós: receita recorrente
previsível. Contras: precisa de gestão de assinatura (cancelamento,
renovação) — mais complexo que crédito avulso.

## Ideia 3 — Dados agregados pra "usuário final" (já previsto no PROJETO.md §3)
O documento de projeto já descreve esse tipo de usuário: "parceiro
estratégico… não prevê, consome informação" — partidos, assessorias,
empresários interessados na leitura agregada (não individual — dado de
pessoa física continua privado) da percepção coletiva por região/
partido/candidato. Isso é o produto B2B natural do sistema: a "sabedoria
coletiva" que o PROJETO.md cita como tese central (§2) É o produto
vendável aqui, sem tocar em dado pessoal de ninguém. Painel administrador
já tem "pesquisa eleitoral em tempo real com filtros" no escopo (ver
memória `alesc_painel_administrador_escopo`) — é o mesmo dado, só que
hoje pensado só pra uso interno seu; vender acesso a uma versão
filtrada/agregada dele é extensão natural, não retrabalho.

## Ideia 4 — Patrocínio de marca (sem venda de dado)
Banner/destaque de UM patrocinador por tela (o padrão visual "banner de
destaque" já documentado no PROJETO.md §8.1 já reserva esse espaço,
"no máximo 1 por tela"). Mais simples de vender que dado agregado
(não depende de massa crítica de usuários), mas rende menos e pode
destoar do tom "jogo político sério" que o produto tem hoje.

## Ideia 5 — Cosméticos (sem afetar o jogo)
Avatares/molduras de perfil, temas de cor alternativos, selo de
"fundador"/early-adopter pra quem participou da fase fechada (Fase 4,
"lançamento fechado/por convite" — já no roteiro). Baixo risco de
distorcer a competição (ninguém compra vantagem política), mas receita
por usuário tende a ser pequena.

## O que eu NÃO devo decidir ou implementar sozinho
- Escolha de provedor de pagamento, taxas, termos comerciais.
- Qualquer fluxo que capture dado de cartão/Pix diretamente no app (isso
  é, no mínimo, PCI-DSS — sempre delegar pro checkout do provedor,
  nunca reconstruir).
- Preço. Isso é leitura de mercado sua, não engenharia.

## Pergunta em aberto pro usuário
Das cinco, a Ideia 1 (créditos pagos) é a que já tem metade construída
— se o objetivo é "monetizar o quanto antes", é o caminho mais curto.
Se o objetivo é "monetizar o que rende mais", a Ideia 3 (dado agregado
B2B) é a que mais combina com a tese central do produto (§2 do
PROJETO.md) e o painel administrador já planejado. As duas não se
excluem — dá pra ter as duas ativas ao mesmo tempo mais adiante.
