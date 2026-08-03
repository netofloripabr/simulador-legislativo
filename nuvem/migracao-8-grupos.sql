-- Migração 8: grupos privados de comparação — uma pessoa cria um grupo com
-- nome e ganha um código de convite curto; quem tem o código entra; a
-- comparação do grupo usa os rascunhos por cargo (rascunhos_publicos,
-- Migração 7) de quem está dentro, não o palpite público de um cargo só.
-- Colar no SQL Editor do Supabase e rodar uma vez (depois da Migração 7).
--
-- Por que 2 tabelas em vez de 1: "grupos" é o grupo em si (dono, nome,
-- código); "grupo_membros" é quem está dentro — inclusive o criador, que
-- vira membro automaticamente (trigger abaixo), pra não precisar tratar
-- "dono" como um caso especial em toda query que lista participantes.
--
-- Escopo do MVP (revisável depois, ver conversa): sem limite de membros,
-- sem "sair do grupo"/deletar grupo, uma pessoa pode estar em vários
-- grupos ao mesmo tempo.

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0),
  -- 6 caracteres, gerado no cliente (nuvem/grupos.js: gerarCodigoConvite) —
  -- unique aqui garante integridade mesmo numa colisão rara entre clientes.
  codigo_convite text not null unique check (codigo_convite ~ '^[A-Z0-9]{6}$'),
  criado_por uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.grupos enable row level security;

-- leitura pública do "cabeçalho" do grupo (nome, código) — nada sensível
-- sozinho, e a tela "entrar com código" precisa achar o grupo pelo código
-- antes de a pessoa virar membro.
create policy "grupos_select_publico" on public.grupos for select using (true);
create policy "grupos_insert_proprio" on public.grupos for insert with check (auth.uid() = criado_por);

grant select on public.grupos to anon, authenticated;
grant insert on public.grupos to authenticated;

-- ========== GRUPO_MEMBROS ==========
create table public.grupo_membros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (grupo_id, perfil_id)
);

alter table public.grupo_membros enable row level security;

-- leitura pública: os membros compõem a comparação exibida, que já é
-- pública via rascunhos_publicos — não expõe nada novo além de "quem está
-- em qual grupo".
create policy "grupo_membros_select_publico" on public.grupo_membros for select using (true);
-- entrar num grupo: qualquer pessoa autenticada pode se auto-inserir — a
-- "senha" é conhecer o código de convite (validado no app antes de
-- chamar isto, ver entrarNoGrupo em nuvem/grupos.js).
create policy "grupo_membros_insert_proprio" on public.grupo_membros for insert with check (auth.uid() = perfil_id);

grant select on public.grupo_membros to anon, authenticated;
grant insert on public.grupo_membros to authenticated;

-- Criador vira membro automaticamente ao criar o grupo — evita duplicar
-- "é dono" e "é membro" como dois conceitos em toda tela.
create or replace function public.grupos_criador_vira_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.grupo_membros (grupo_id, perfil_id)
  values (new.id, new.criado_por)
  on conflict do nothing;
  return new;
end;
$$;

create trigger grupos_apos_criar_adiciona_criador
after insert on public.grupos
for each row
execute function public.grupos_criador_vira_membro();

-- ========== VIEW: comparação do grupo ==========
-- Evita o app fazer 2 queries (ids do grupo, depois .in() em
-- rascunhos_publicos) toda vez que abre a tela de comparação.
create view public.grupo_comparacao as
select
  gm.grupo_id,
  rp.perfil_id,
  rp.nome_exibicao,
  rp.escopo,
  rp.partido_escopo,
  rp.rascunho_estadual,
  rp.rascunho_federal,
  rp.rascunho_senador,
  rp.atualizado_em
from public.grupo_membros gm
join public.rascunhos_publicos rp on rp.perfil_id = gm.perfil_id;

grant select on public.grupo_comparacao to anon, authenticated;
