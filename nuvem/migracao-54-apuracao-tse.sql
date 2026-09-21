-- Migração 54 — apuração em tempo real do TSE (Fase 6, Resultados), 21/09/2026.
--
-- A rotina (Edge Function `apuracao-tse`) lê os JSONs públicos do painel de
-- resultados do TSE (resultados.tse.jus.br/oficial/ele{ano}/{cd_eleicao}/
-- dados-simplificados/sc/sc-c000{cargo}-e000{cd_eleicao}-r.json — formato
-- confirmado no arquivo de 2022 em 21/09/2026), grava aqui e publica um JSON
-- consolidado no Storage (bucket público `apuracao`) no MESMO formato dos
-- arquivos estáticos de dados/resultados/, que a tela já lê.
--
-- Liga/desliga pela config_app (chave `apuracao_ativa`): o pg_cron chama a
-- função a cada minuto, mas ela só trabalha com a chave em 'true'. Os
-- parâmetros da eleição (ano, código, cargos) também vêm da config_app —
-- em 2026 é só trocar os valores, sem redeploy.
-- Objeto verificável: tabela public.apuracao_status.

create table if not exists public.apuracao_status (
  ano int not null,
  uf text not null,
  cargo text not null check (cargo in ('estadual','federal','senador')),
  secoes_total int,
  secoes_totalizadas int,
  pct_secoes numeric(5,2),
  eleitorado int,
  votos_validos int,
  votos_nominais int,
  vagas int,
  qe int,
  final boolean not null default false,
  dg text, hg text,           -- data/hora de geração do arquivo no TSE
  fonte text,
  atualizado_em timestamptz not null default now(),
  primary key (ano, uf, cargo)
);
create table if not exists public.apuracao_candidato (
  ano int not null,
  uf text not null,
  cargo text not null,
  sq text not null,           -- SQ_CANDIDATO do TSE (mesmo dos arquivos de dados abertos)
  numero text,
  nome_urna text,
  partido text,
  votos int not null default 0,
  pct numeric(6,2),
  situacao text,
  eleito boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (ano, uf, cargo, sq)
);
create index if not exists apuracao_candidato_votos_idx on public.apuracao_candidato (ano, uf, cargo, votos desc);

alter table public.apuracao_status enable row level security;
alter table public.apuracao_candidato enable row level security;
drop policy if exists apuracao_status_leitura on public.apuracao_status;
create policy apuracao_status_leitura on public.apuracao_status for select to anon, authenticated using (true);
drop policy if exists apuracao_candidato_leitura on public.apuracao_candidato;
create policy apuracao_candidato_leitura on public.apuracao_candidato for select to anon, authenticated using (true);
-- escrita: só service role (a função), nenhuma policy de escrita pra API

-- config: parâmetros da eleição (ensaio = 2022/546)
insert into public.config_app (chave, valor) values
  ('apuracao_ativa', 'false'),
  ('apuracao_ano', '2022'),
  ('apuracao_cd_eleicao', '546'),
  ('apuracao_uf', 'SC'),
  ('apuracao_intervalo_s', '60')
on conflict (chave) do nothing;

-- bucket público pro JSON consolidado (a tela lê por fetch, sem auth)
insert into storage.buckets (id, name, public) values ('apuracao', 'apuracao', true)
on conflict (id) do update set public = true;
drop policy if exists apuracao_bucket_leitura on storage.objects;
create policy apuracao_bucket_leitura on storage.objects for select to anon, authenticated using (bucket_id = 'apuracao');

-- agendamento: pg_cron chama a Edge Function a cada minuto; a função
-- decide se trabalha (apuracao_ativa) — assim ligar/desligar é só a chave.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
grant usage on schema cron to postgres;

-- Token de chamada e URL da função: tabela PRIVADA (RLS ligada, nenhuma
-- policy → só a service role/postgres lê). Preenchida uma vez, fora do
-- repositório (ver nuvem/funcoes/apuracao-tse/LEIA-ME.md).
create table if not exists public.config_privada (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.config_privada enable row level security;

create or replace function public.apuracao_chamar_rotina()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_url text;
begin
  if coalesce((select valor from public.config_app where chave = 'apuracao_ativa'), 'false') <> 'true' then
    return;
  end if;
  select valor into v_token from public.config_privada where chave = 'apuracao_rotina_token';
  select valor into v_url from public.config_privada where chave = 'apuracao_rotina_url';
  if v_token is null or v_url is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rotina-token', v_token),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  );
end;
$$;
revoke all on function public.apuracao_chamar_rotina() from public, anon, authenticated;

select cron.unschedule('apuracao-tse') where exists (select 1 from cron.job where jobname = 'apuracao-tse');
select cron.schedule('apuracao-tse', '* * * * *', $$select public.apuracao_chamar_rotina()$$);
