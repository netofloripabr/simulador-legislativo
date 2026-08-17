-- Migração 24: link de Instagram por candidato, editável só por admin,
-- visível pra todo mundo na Seleção. Pedido do usuário em 16/08/2026.
--
-- Candidatos não são linhas de tabela hoje (vêm de dados/estados/*.js,
-- arquivo estático) — não dá pra pendurar uma coluna "instagram" neles.
-- Em vez disso, uma tabela À PARTE mapeia a identidade do candidato
-- (estado + cargo + chave, mesma "chave" que o app já usa em
-- nuvem/palpites.js pra tudo que precisa de identidade estável — id fixo
-- do dado quando existe, senão partido+nome normalizado) pro link.
--
-- Mesmo padrão de segurança das outras tabelas de admin (migração 18):
-- leitura pública (qualquer pessoa vê o Instagram de um candidato, mesmo
-- convidado, sem login), escrita só via função security definer que
-- confere sou_admin() por dentro — nenhum grant de insert/update direto
-- na tabela pra "authenticated". Colar no SQL Editor do Supabase e rodar
-- uma vez, depois da migração 18 (depende de public.sou_admin()).
create table public.candidato_links (
  estado text not null,
  cargo text not null,
  chave text not null,
  instagram text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.perfis(id),
  primary key (estado, cargo, chave)
);
alter table public.candidato_links enable row level security;

create policy "candidato_links_select_public" on public.candidato_links
  for select using (true);
grant select on public.candidato_links to anon, authenticated;
-- Sem grant de insert/update/delete pra authenticated, de propósito — só
-- a função abaixo escreve.

-- Upsert do link (cria a linha na primeira vez, atualiza depois) — chamada
-- do ícone de editar no card do candidato (Seleção), visível só quando
-- sou_admin() já deu true no front (souAdmin, ver nuvem/autenticacao.js).
-- A checagem AQUI dentro é a que vale de verdade — o front só decide se
-- MOSTRA o botão, não protege nada sozinho.
create or replace function public.admin_definir_instagram_candidato(
  p_estado text, p_cargo text, p_chave text, p_instagram text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  insert into public.candidato_links (estado, cargo, chave, instagram, atualizado_em, atualizado_por)
  values (p_estado, p_cargo, p_chave, nullif(trim(p_instagram), ''), now(), (select auth.uid()))
  on conflict (estado, cargo, chave)
  do update set instagram = excluded.instagram, atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por;
end;
$$;
revoke all on function public.admin_definir_instagram_candidato(text, text, text, text) from public, anon;
grant execute on function public.admin_definir_instagram_candidato(text, text, text, text) to authenticated;
