-- Migração 5: múltiplas listas salvas por pessoa, nomeadas e separadas por
-- cargo+estado, com uma marcação "oficial" (a que conta no Quadro de
-- Médias). Colar no SQL Editor do Supabase e rodar uma vez.
--
-- Por que uma tabela nova em vez de mudar "palpites": a tabela "palpites"
-- (nuvem/schema.sql) tem UMA linha por pessoa (perfil_id é a chave
-- primária, upsert sobrescreve sempre) e não distingue cargo — salvar o
-- palpite de Senador hoje apaga o que a pessoa tinha salvo de Dep.
-- Estadual. "listas_salvas" é uma linha POR SALVAMENTO, então a pessoa
-- pode ter várias versões nomeadas por cargo, sem se apagarem.
--
-- "palpites" continua existindo e sendo usada por outros fluxos (restaurar
-- progresso ao logar, migração de convidado pra cadastro, a tela antiga
-- "Meu Palpite") — não foi tocada nesta migração. Unificar tudo numa
-- tabela só fica pra uma próxima etapa, depois que este fluxo novo estiver
-- validado em uso.

create table public.listas_salvas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  cargo text not null check (cargo in ('estadual','federal','senador')),
  -- sigla do estado (ex. "SC") — hoje só SC tem dado real, mas a coluna já
  -- vem pronta pros outros 26 quando tiverem.
  estado text not null,
  nome text not null check (char_length(trim(nome)) > 0),
  -- mesmo formato de palpiteEdicao/state.parties: array de partidos, cada
  -- candidato com "chave" estável (chaveCandidato() em nuvem/palpites.js).
  candidatos jsonb not null,
  -- só uma linha por (perfil_id, cargo, estado) pode estar oficial — ver
  -- trigger abaixo, que garante isso automaticamente a cada insert/update.
  -- É a linha oficial que entra no Quadro de Médias público.
  oficial boolean not null default true,
  criado_em timestamptz not null default now()
);

create index listas_salvas_perfil_cargo_estado_idx
  on public.listas_salvas (perfil_id, cargo, estado, criado_em desc);

-- Garante a unicidade da marcação "oficial" por pessoa+cargo+estado: sempre
-- que uma linha é inserida ou atualizada com oficial=true, desmarca as
-- outras linhas da mesma pessoa+cargo+estado. Feito como trigger (não como
-- lógica no app) pra valer não importa por qual caminho a escrita chegue.
create or replace function public.listas_salvas_unicidade_oficial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.oficial then
    update public.listas_salvas
    set oficial = false
    where perfil_id = new.perfil_id
      and cargo = new.cargo
      and estado = new.estado
      and id <> new.id
      and oficial;
  end if;
  return new;
end;
$$;

create trigger listas_salvas_oficial_unica
before insert or update of oficial on public.listas_salvas
for each row
execute function public.listas_salvas_unicidade_oficial();

alter table public.listas_salvas enable row level security;

-- mesmo padrão de "palpites": leitura pública, escrita restrita ao dono
-- (ver PROJETO.md, ponto em aberto #1 — decisão de produto já tomada).
create policy "listas_salvas_select_publico" on public.listas_salvas for select using (true);
create policy "listas_salvas_insert_proprio" on public.listas_salvas for insert with check (auth.uid() = perfil_id);
create policy "listas_salvas_update_proprio" on public.listas_salvas for update using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "listas_salvas_delete_proprio" on public.listas_salvas for delete using (auth.uid() = perfil_id);

grant select on public.listas_salvas to anon, authenticated;
grant insert, update, delete on public.listas_salvas to authenticated;

-- ========== VIEW PÚBLICA (só as oficiais, pro Quadro de Médias) ==========
-- Mesmo espírito de "palpites_publicos": roda com o privilégio de quem
-- criou a view (ignora RLS), cruza com o nome de exibição (ou "Participante
-- anônimo") e expõe só o que precisa. Filtra oficial=true — é assim que
-- uma pessoa com várias tentativas salvas conta só 1 vez na média pública,
-- com a versão que ela escolheu deixar como "a que vale".
create view public.listas_salvas_publicas as
select
  ls.id,
  ls.perfil_id,
  pp.nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pp.modo_preenchimento,
  ls.cargo,
  ls.estado,
  ls.nome,
  ls.candidatos,
  ls.criado_em
from public.listas_salvas ls
join public.perfis_publicos pp on pp.id = ls.perfil_id
where ls.oficial;

grant select on public.listas_salvas_publicas to anon, authenticated;
