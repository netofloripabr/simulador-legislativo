-- Migração 18: base do painel do administrador (PROJETO.md, ponto em
-- aberto #5 — "por enquanto, painel do Supabase mesmo... painel dedicado
-- fica pra fase posterior". Fase posterior chegou, 14/08/2026, escopo
-- definido pelo usuário: fluxo de usuários, pesquisa em tempo real,
-- financeiro, notificações de rotina, notificações de problema reportado.
-- Colar no SQL Editor do Supabase e rodar uma vez.
--
-- ========== ADMINS ==========
-- MESMO padrão de segurança já usado em creditos_conta (migração 9): um
-- campo "admin" solto em "perfis" seria perigoso, porque
-- "perfis_update_proprio" deixa o dono mudar QUALQUER coluna da própria
-- linha — incluindo um "admin" novo, o que deixaria qualquer pessoa se
-- promover sozinha via supabaseClient.from("perfis").update({admin:true}).
-- Por isso "admin" vive numa tabela PRÓPRIA, sem nenhuma permissão de
-- insert/update/delete concedida a "authenticated" — só você, direto no
-- SQL Editor do Supabase, torna alguém admin:
--   insert into public.admins (perfil_id) values ('<uuid-da-conta>');
create table public.admins (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  concedido_em timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy "admins_select_proprio" on public.admins for select using ((select auth.uid()) = perfil_id);
grant select on public.admins to authenticated;
-- Sem grant de insert/update/delete pra authenticated, de propósito.

-- Função auxiliar (SQL simples, sem security definer — só um atalho de
-- leitura da própria linha) que o front usa pra decidir se mostra o menu
-- Admin: "sou admin?" -> true/false. Mais barato que buscar a linha inteira.
create or replace function public.sou_admin()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select exists (select 1 from public.admins where perfil_id = (select auth.uid()));
$$;
grant execute on function public.sou_admin() to authenticated;

-- ========== PROBLEMAS REPORTADOS ==========
-- "Reportar problema" no menu de perfil do usuário comum (interface/
-- prospeccao.js) escreve aqui. Cada pessoa vê só os próprios reportes;
-- admin vê todos (policy extra abaixo, checando a tabela admins).
create table public.problemas_reportados (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  mensagem text not null check (char_length(trim(mensagem)) > 0),
  tela text, -- de onde a pessoa reportou (pcState.subaba/tela no momento do clique), opcional
  status text not null default 'aberto' check (status in ('aberto','resolvido')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);
alter table public.problemas_reportados enable row level security;

create policy "problemas_select_proprio_ou_admin" on public.problemas_reportados
  for select using (
    (select auth.uid()) = perfil_id
    or exists (select 1 from public.admins where perfil_id = (select auth.uid()))
  );
create policy "problemas_insert_proprio" on public.problemas_reportados
  for insert with check ((select auth.uid()) = perfil_id);
-- Só admin marca como resolvido — dono do problema não edita depois de enviar.
create policy "problemas_update_admin" on public.problemas_reportados
  for update using (exists (select 1 from public.admins where perfil_id = (select auth.uid())));

grant select, insert on public.problemas_reportados to authenticated;
grant update (status, resolvido_em) on public.problemas_reportados to authenticated;

create index problemas_reportados_status_idx on public.problemas_reportados (status, criado_em desc);

-- ========== EXECUÇÕES DE ROTINA AUTOMÁTICA ==========
-- Painel do admin mostra se as rotinas agendadas (ex.: atualizador de atas
-- 2026) rodaram ou não. Ninguém "authenticated" escreve aqui pelo site —
-- só o service_role (chave de servidor, usada pelo script agendado que
-- roda fora do navegador) ou você direto no SQL Editor. Fica registrado
-- como pendência de integração: ferramentas/atualizador-atas ainda
-- precisa ser ajustado pra de fato inserir uma linha aqui a cada
-- execução (não fizemos isso nesta migração, só a tabela + leitura).
create table public.execucoes_rotina (
  id uuid primary key default gen_random_uuid(),
  rotina text not null, -- ex.: 'atualizador-atas-sc-2026'
  executado_em timestamptz not null default now(),
  sucesso boolean not null,
  detalhe text
);
alter table public.execucoes_rotina enable row level security;
create policy "execucoes_rotina_select_admin" on public.execucoes_rotina
  for select using (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
grant select on public.execucoes_rotina to authenticated;
-- Sem grant de insert pra authenticated — só service_role (bypassa RLS por padrão).

-- ========== FUNÇÕES DE AGREGAÇÃO PRO PAINEL ADMIN ==========
-- "perfis" só deixa cada um ler a própria linha (perfis_select_proprio,
-- schema.sql) — um admin não conseguiria contar quantos cadastros existem
-- sem bypassar essa RLS. security definer + checagem explícita de
-- "sou_admin() por dentro da função (mesmo padrão do skill Supabase
-- Postgres Best Practices, security-rls-performance.md) resolve isso sem
-- abrir leitura pública da tabela inteira.
create or replace function public.admin_estatisticas_usuarios()
returns table (
  total_cadastros bigint,
  cadastros_7_dias bigint,
  cadastros_30_dias bigint,
  total_grupos bigint,
  total_cedulas_depositadas bigint,
  cedulas_depositadas_7_dias bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select
    (select count(*) from public.perfis),
    (select count(*) from public.perfis where criado_em > now() - interval '7 days'),
    (select count(*) from public.perfis where criado_em > now() - interval '30 days'),
    (select count(*) from public.grupos),
    (select count(*) from public.salvamentos where depositado_em is not null),
    (select count(*) from public.salvamentos where depositado_em > now() - interval '7 days');
end;
$$;
revoke all on function public.admin_estatisticas_usuarios() from public, anon;
grant execute on function public.admin_estatisticas_usuarios() to authenticated;

-- Pesquisa agregada com filtro demográfico (só gênero por enquanto — idade
-- não é coletada no cadastro hoje, ver BACKLOG.md). Reaproveita
-- salvamentos_depositados_publicos (migração 15/16) pra pegar as listas já
-- prontas, cruzando com perfis pra filtrar por gênero/UF/município.
create or replace function public.admin_pesquisa_agregada(p_estado text, p_genero text default null, p_uf_residencia text default null)
returns setof public.salvamentos_depositados_publicos
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select sdp.*
  from public.salvamentos_depositados_publicos sdp
  join public.perfis p on p.id = sdp.perfil_id
  where sdp.estado = p_estado
    and sdp.oficial
    and (p_genero is null or p.genero = p_genero)
    and (p_uf_residencia is null or p.uf_residencia = p_uf_residencia);
end;
$$;
revoke all on function public.admin_pesquisa_agregada(text, text, text) from public, anon;
grant execute on function public.admin_pesquisa_agregada(text, text, text) to authenticated;

-- Resumo financeiro (créditos) pro admin — creditos_conta (migração 9) só
-- deixa cada um ler o próprio saldo; sem isso, não daria pra ver o
-- panorama geral sem entrar direto no Supabase.
create or replace function public.admin_estatisticas_creditos()
returns table (
  contas_com_credito bigint,
  total_creditos_em_circulacao bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select
    (select count(*) from public.creditos_conta where saldo > 0),
    (select coalesce(sum(saldo), 0) from public.creditos_conta);
end;
$$;
revoke all on function public.admin_estatisticas_creditos() from public, anon;
grant execute on function public.admin_estatisticas_creditos() to authenticated;
