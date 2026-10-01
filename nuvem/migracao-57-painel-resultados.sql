-- Migração 57 (01/10/2026): aba Painel da tela de Resultados.
-- O usuário fixa candidatos e locais (estado, região, município, bairro,
-- colégio, seção) para acompanhar a apuração. Até aqui ficava só no
-- aparelho (localStorage); agora acompanha a conta em qualquer aparelho.
-- Uma linha por perfil; "dados" guarda o mesmo JSON do localStorage
-- ({ cargo: [blocos], _aberto: { cargo: {...} } }). Só o dono lê/grava.
create table if not exists public.painel_resultados (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.painel_resultados enable row level security;
drop policy if exists painel_resultados_proprio on public.painel_resultados;
create policy painel_resultados_proprio on public.painel_resultados
  for all to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));
