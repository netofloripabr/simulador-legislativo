-- Migração 19: acesso do "Usuário final" (PROJETO.md, seção 3 — "parceiro
-- estratégico": não prevê, só consome dados agregados. Ex.: partidos
-- políticos, empresários interessados). Ponto em aberto #2 do PROJETO.md
-- já resolvia a dúvida de acesso: "gerido manualmente pelo
-- usuário/administrador" — mesmo padrão de admins (migração 18), sem
-- fluxo de cadastro/pagamento próprio ainda.
--
-- Ponto em aberto #1 do PROJETO.md resolve a dúvida de privacidade: usuário
-- final só acessa dados AGREGADOS/anônimos, nunca perfil individual de quem
-- previu. Por isso a função abaixo devolve só contagem de vagas por
-- partido (mesmo formato de montarComparacaoGrupo, interface/
-- prospeccao.js) — nenhuma linha com nome de eleitor.
-- Colar no SQL Editor do Supabase e rodar uma vez, depois da migração 18.
--
-- ========== USUARIOS_FINAIS ==========
-- Mesmo padrão de segurança de admins/creditos_conta: tabela própria, sem
-- grant de insert/update/delete pra "authenticated" — só você, direto no
-- SQL Editor, concede acesso:
--   insert into public.usuarios_finais (perfil_id, organizacao) values ('<uuid-da-conta>', 'Partido X');
create table public.usuarios_finais (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  organizacao text, -- livre, só anotação de quem é (partido, empresa) — não usado em nenhuma regra
  concedido_em timestamptz not null default now()
);
alter table public.usuarios_finais enable row level security;
create policy "usuarios_finais_select_proprio" on public.usuarios_finais for select using ((select auth.uid()) = perfil_id);
grant select on public.usuarios_finais to authenticated;
-- Sem grant de insert/update/delete pra authenticated, de propósito.

create or replace function public.sou_usuario_final()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select exists (select 1 from public.usuarios_finais where perfil_id = (select auth.uid()));
$$;
grant execute on function public.sou_usuario_final() to authenticated;

-- Pesquisa agregada — mesma lógica de admin_pesquisa_agregada (migração
-- 18), só trocando a checagem de acesso pra sou_usuario_final(). Reaproveita
-- salvamentos_depositados_publicos (migração 15/16), que já não expõe nome
-- de quem depositou anonimamente.
create or replace function public.usuario_final_pesquisa_agregada(p_estado text, p_genero text default null, p_uf_residencia text default null)
returns setof public.salvamentos_depositados_publicos
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_usuario_final() then
    raise exception 'Acesso restrito a usuários finais autorizados.';
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
revoke all on function public.usuario_final_pesquisa_agregada(text, text, text) from public, anon;
grant execute on function public.usuario_final_pesquisa_agregada(text, text, text) to authenticated;
