-- Migração 5: "salvamentos" nomeados por pessoa — cada um é UMA lista com
-- nome escolhido pela pessoa (ex.: "Palpite 07/08, cenário otimista"),
-- cobrindo os 3 cargos (Estadual/Federal/Senador) de um mesmo estado de
-- uma vez, com uma marcação "oficial" (o salvamento que conta no Quadro de
-- Médias público). Colar no SQL Editor do Supabase e rodar uma vez.
--
-- REVISADA em 07/08/2026 — AINDA NÃO FOI RODADA NO SUPABASE. A primeira
-- versão deste arquivo (31/07/2026) desenhava "listas_salvas" como 1 linha
-- por cargo+estado, sem nenhuma entidade pai amarrando as 3 linhas de um
-- mesmo salvamento — na prática, "uma lista nomeada" da pessoa virava 3
-- linhas soltas com o mesmo texto em "nome", sem nada que garantisse que
-- elas fossem criadas/apagadas/marcadas-oficial juntas (dava pra apagar só
-- a linha "senador" de um salvamento e sobrar "estadual"/"federal" órfãos
-- com aquele nome). Como esse arquivo nunca foi aplicado (nenhum .js
-- referencia "listas_salvas" ainda), a revisão foi feita direto nele em vez
-- de virar uma migração 9 nova — não há dado real em produção pra
-- preservar. CONFIRMAR COM O USUÁRIO antes de colar isto no SQL Editor de
-- verdade.
--
-- Modelo novo: "salvamentos" é a entidade que a pessoa nomeia (1 nome, 1
-- estado, 1 data, 1 marcação oficial) — "listas_salvas" vira uma tabela
-- filha, com exatamente 3 linhas por salvamento (uma por cargo), amarradas
-- por salvamento_id e apagadas em cascata se o salvamento for excluído.
-- Isso é o que permite "comparar dois salvamentos inteiros" (buscar as 3
-- listas de cada lado de uma vez) sem depender de comparar string de nome.
--
-- REVISADA de novo em 07/08/2026 (mesmo dia, ainda antes de rodar) — o
-- produto separou dois momentos distintos: "Salvar" (tela de Revisão) cria
-- um salvamento sempre editável, sem compromisso nenhum; "Depositar cédula"
-- (ação nova, painel principal) escolhe UM salvamento já existente e o
-- torna definitivo. "oficial" e "depositado_em" são DUAS coisas diferentes
-- que convivem, não uma substituindo a outra:
--   - "oficial"       = qual salvamento vale AGORA pro Quadro de Médias
--                        público daquela pessoa+estado (pode trocar de mão
--                        entre salvamentos livremente, é sobre "o que conta
--                        hoje", não sobre "o que é permanente").
--   - "depositado_em" = null enquanto o salvamento pode ser editado; uma
--                        vez preenchido (timestamp de quando a pessoa
--                        confirmou o depósito), o salvamento — e as 3
--                        listas de cargo dentro dele — ficam travados pra
--                        sempre, mesmo pro próprio dono. É sobre "isso
--                        aconteceu e não muda mais", não sobre "o que conta
--                        hoje". Depositar também marca oficial=true de
--                        tabela (é o gesto que faz aquele salvamento passar
--                        a valer), mas um salvamento pode ficar
--                        oficial=false depois (se a pessoa depositar outro
--                        mais novo pro mesmo estado) sem deixar de ser
--                        depositado — o registro de que foi depositado é
--                        permanente, o registro de "é o que conta hoje" não.
-- Pensando à frente (sem implementar cobrança aqui): "quantos salvamentos
-- deste perfil_id têm depositado_em preenchido" é a contagem natural pra
-- decidir no futuro se libera mais um depósito de graça ou exige pagamento
-- — não precisa de nenhuma coluna nova pra isso quando chegar a hora.
--
-- Por que uma tabela nova em vez de mudar "palpites": a tabela "palpites"
-- (nuvem/schema.sql) tem UMA linha por pessoa (perfil_id é a chave
-- primária, upsert sobrescreve sempre) e não distingue cargo nem guarda
-- histórico. "salvamentos"/"listas_salvas" é o modelo de "várias versões
-- nomeadas, cada uma com histórico preservado".
--
-- "palpites" continua existindo e sendo usada por outros fluxos (restorar
-- progresso ao logar, migração de convidado pra cadastro, Quadro de Médias
-- atual via palpites_publicos/rascunhos_publicos) — não foi tocada nesta
-- migração. Unificar tudo numa tabela só fica pra uma próxima etapa, depois
-- que este fluxo novo estiver validado em uso.

-- ========== SALVAMENTOS (a "pasta" nomeada) ==========
create table public.salvamentos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  -- sigla do estado (ex. "SC") — hoje só SC tem dado real, mas a coluna já
  -- vem pronta pros outros 26 quando tiverem. Um salvamento é sempre de UM
  -- estado só (os 3 cargos dentro dele são desse mesmo estado — é assim
  -- que a Revisão already funciona, pcState.estado é único pra tela
  -- inteira, ver interface/prospeccao.js: renderRevisaoDeposito).
  estado text not null,
  nome text not null check (char_length(trim(nome)) > 0),
  -- só um salvamento por (perfil_id, estado) pode estar oficial — ver
  -- trigger abaixo. É o salvamento oficial que entra no Quadro de Médias
  -- público (as 3 listas de cargo dele, via listas_salvas_publicas).
  -- default false: "Salvar" (tela de Revisão) não implica mais "vale pra
  -- verdade" — só "Depositar cédula" (depositarSalvamento, nuvem/
  -- salvamentos.js) marca oficial=true, junto com depositado_em.
  oficial boolean not null default false,
  -- null = ainda editável ("Salvar" de novo sobrescreve/renomeia à vontade).
  -- preenchido = depositado: timestamp de quando a pessoa confirmou o
  -- depósito (ação "Depositar cédula", painel principal) — a partir daí
  -- este salvamento e as 3 listas de cargo dentro dele (listas_salvas) são
  -- travados pra sempre, inclusive pro próprio dono (ver políticas de
  -- update abaixo). Ver comentário no topo do arquivo pra "oficial" x
  -- "depositado_em" não serem confundidos.
  depositado_em timestamptz,
  -- Anonimato é por DEPÓSITO, não da conta inteira (perfis.mostrar_nome já
  -- existe pra isso em outro nível — ver nuvem/autenticacao.js) — a pessoa
  -- pode depositar uma cédula pública num estado e outra anônima noutro.
  -- Só tem efeito prático a partir do depósito (listas_salvas_publicas,
  -- abaixo, é a única coisa que expõe nome pra fora); enquanto o
  -- salvamento só está salvo (não depositado), ele não aparece em nenhuma
  -- view pública nomeada mesmo assim. Pedido do usuário em 07/08/2026.
  anonimo boolean not null default false,
  criado_em timestamptz not null default now()
);

create index salvamentos_perfil_estado_idx
  on public.salvamentos (perfil_id, estado, criado_em desc);

-- Garante a unicidade da marcação "oficial" por pessoa+estado: sempre que
-- um salvamento é inserido ou atualizado com oficial=true, desmarca os
-- outros salvamentos da mesma pessoa+estado. Feito como trigger (não como
-- lógica no app) pra valer não importa por qual caminho a escrita chegue.
create or replace function public.salvamentos_unicidade_oficial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.oficial then
    update public.salvamentos
    set oficial = false
    where perfil_id = new.perfil_id
      and estado = new.estado
      and id <> new.id
      and oficial;
  end if;
  return new;
end;
$$;

create trigger salvamentos_oficial_unica
before insert or update of oficial on public.salvamentos
for each row
execute function public.salvamentos_unicidade_oficial();

alter table public.salvamentos enable row level security;

-- mesmo padrão de "palpites"/"grupos": leitura pública, escrita restrita ao
-- dono (ver PROJETO.md, ponto em aberto #1 — decisão de produto já
-- tomada). Leitura pública inclui salvamentos NÃO oficiais (rascunhos de
-- cenário que a pessoa ainda não marcou como "o que vale") — mesmo
-- espírito de "palpites"/"rascunhos_publicos": nada aqui é "revelado" só
-- depois de um evento, é sempre aberto. Se isso for diferente do que a
-- pessoa quer pra salvamentos específicos (ex.: rascunho privado até
-- decidir tornar oficial), avisar antes de mudar essa política.
create policy "salvamentos_select_publico" on public.salvamentos for select using (true);
create policy "salvamentos_insert_proprio" on public.salvamentos for insert with check (auth.uid() = perfil_id);
-- Update só é permitido enquanto o salvamento ainda NÃO foi depositado
-- (depositado_em is null na linha ANTES do update — é isso que o "using"
-- checa). Isso cobre tanto edições comuns (renomear, trocar candidatos via
-- listas_salvas) quanto a própria ação de depositar (que é o update que
-- FAZ depositado_em deixar de ser null) — depois dela, qualquer novo
-- update cai fora do "using" e é bloqueado, inclusive pro dono. Trava no
-- banco de propósito (não só na tela) — ver discussão no topo do arquivo.
create policy "salvamentos_update_proprio" on public.salvamentos for update
  using (auth.uid() = perfil_id and depositado_em is null)
  with check (auth.uid() = perfil_id);
-- Decisão tomada em 08/08/2026 (estava pendente): salvamento depositado
-- também não pode ser EXCLUÍDO, pelo mesmo motivo de não poder ser
-- editado — apagar seria um jeito de burlar "depositado é pra sempre"
-- (a pessoa deposita, se arrepende do resultado, apaga e deposita de
-- novo). Mesma trava de depositado_em is null usada no update acima.
create policy "salvamentos_delete_proprio" on public.salvamentos for delete
  using (auth.uid() = perfil_id and depositado_em is null);

grant select on public.salvamentos to anon, authenticated;
grant insert, update, delete on public.salvamentos to authenticated;

-- ========== LISTAS_SALVAS (as 3 linhas de cargo dentro de um salvamento) ==========
create table public.listas_salvas (
  id uuid primary key default gen_random_uuid(),
  salvamento_id uuid not null references public.salvamentos(id) on delete cascade,
  cargo text not null check (cargo in ('estadual','federal','senador')),
  -- mesmo formato de palpiteEdicao/state.parties: array de partidos, cada
  -- candidato com "chave" estável (chaveCandidato() em nuvem/palpites.js).
  candidatos jsonb not null,
  -- no máximo 1 linha por cargo dentro do mesmo salvamento (evita duplicar
  -- "estadual" duas vezes por engano no mesmo salvamento).
  unique (salvamento_id, cargo)
);

create index listas_salvas_salvamento_idx on public.listas_salvas (salvamento_id);

alter table public.listas_salvas enable row level security;

-- "listas_salvas" não tem perfil_id próprio (o dono é o salvamento pai) —
-- por isso a política de escrita usa uma subconsulta em "salvamentos" em
-- vez do padrão direto "auth.uid() = perfil_id" usado no resto do projeto.
-- Mesma intenção (só o dono do salvamento escreve nas listas dele), só que
-- expressa via join porque a coluna não existe nesta tabela.
create policy "listas_salvas_select_publico" on public.listas_salvas for select using (true);
create policy "listas_salvas_insert_proprio" on public.listas_salvas for insert with check (
  exists (select 1 from public.salvamentos s where s.id = salvamento_id and s.perfil_id = auth.uid())
);
-- Mesma trava de "salvamentos_update_proprio": só edita os candidatos de um
-- cargo enquanto o salvamento PAI ainda não foi depositado. Precisa checar
-- via subconsulta (listas_salvas não tem depositado_em própria — o dado
-- vive no pai) — uma vez que salvamentos.depositado_em é preenchido, esta
-- política passa a não achar nenhuma linha, bloqueando o update.
create policy "listas_salvas_update_proprio" on public.listas_salvas for update using (
  exists (
    select 1 from public.salvamentos s
    where s.id = salvamento_id and s.perfil_id = auth.uid() and s.depositado_em is null
  )
) with check (
  exists (select 1 from public.salvamentos s where s.id = salvamento_id and s.perfil_id = auth.uid())
);
create policy "listas_salvas_delete_proprio" on public.listas_salvas for delete using (
  exists (select 1 from public.salvamentos s where s.id = salvamento_id and s.perfil_id = auth.uid())
);

grant select on public.listas_salvas to anon, authenticated;
grant insert, update, delete on public.listas_salvas to authenticated;

-- ========== VIEW PÚBLICA (só os oficiais, pro Quadro de Médias) ==========
-- Mesmo espírito de "palpites_publicos"/"rascunhos_publicos": roda com o
-- privilégio de quem criou a view (ignora RLS) e expõe só o que precisa.
-- Filtra oficial=true — é assim que uma pessoa com vários salvamentos conta
-- só 1 vez na média pública, com a versão que ela escolheu deixar como "a
-- que vale". Uma linha por salvamento oficial, com os 3 cargos em 3
-- colunas — mesmo formato de "rascunhos_publicos" (nuvem/migracao-7), o
-- que permite reaproveitar o mesmo tipo de código de agregação/comparação
-- já escrito pra rascunhos.
--
-- nome_exibicao vira "Participante anônimo" quando s.anonimo é true — o
-- anonimato aqui é DESTE salvamento específico (a pessoa pode ter outro
-- salvamento, de outro estado, público) — não confundir com
-- perfis.mostrar_nome, que é um interruptor da conta inteira usado noutro
-- lugar (ver nuvem/autenticacao.js).
create view public.listas_salvas_publicas as
select
  s.id as salvamento_id,
  s.perfil_id,
  case when s.anonimo then 'Participante anônimo' else pp.nome_exibicao end as nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pp.modo_preenchimento,
  s.estado,
  s.nome,
  s.anonimo,
  -- jsonb não tem uma função "max" nativa no Postgres — como cada
  -- salvamento tem no máximo 1 linha por cargo (unique constraint em
  -- listas_salvas), array_agg + pegar o primeiro elemento faz o mesmo papel
  -- de "escolher o único valor daquele cargo dentro do grupo".
  (array_agg(ls.candidatos) filter (where ls.cargo = 'estadual'))[1] as lista_estadual,
  (array_agg(ls.candidatos) filter (where ls.cargo = 'federal'))[1] as lista_federal,
  (array_agg(ls.candidatos) filter (where ls.cargo = 'senador'))[1] as lista_senador,
  s.criado_em
from public.salvamentos s
join public.perfis_publicos pp on pp.id = s.perfil_id
left join public.listas_salvas ls on ls.salvamento_id = s.id
where s.oficial
group by s.id, s.perfil_id, s.anonimo, pp.nome_exibicao, pp.escopo, pp.partido_escopo, pp.modo_preenchimento, s.estado, s.nome, s.criado_em;

grant select on public.listas_salvas_publicas to anon, authenticated;
