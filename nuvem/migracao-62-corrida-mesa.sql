-- Migração 62 (08/10/2026): Corrida da Mesa (painel/mesa.html).
-- Acesso só para quem está logado E foi liberado pelo admin (ou é admin).
-- Cada usuário guarda os próprios cenários (chapas, cargos, comissões).

create table if not exists public.mesa_acesso (
  perfil_id uuid primary key references auth.users(id) on delete cascade,
  concedido_por uuid references auth.users(id),
  concedido_em timestamptz not null default now()
);
alter table public.mesa_acesso enable row level security;
create policy mesa_acesso_le_proprio on public.mesa_acesso for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.sou_admin()));

create table if not exists public.mesa_cenarios (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default 'Meu cenário',
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create index if not exists mesa_cenarios_perfil_idx on public.mesa_cenarios (perfil_id);
alter table public.mesa_cenarios enable row level security;
create policy mesa_cenarios_dono on public.mesa_cenarios for all to authenticated
  using (perfil_id = (select auth.uid())) with check (perfil_id = (select auth.uid()));

create or replace function public.pode_acessar_mesa()
returns boolean language sql security definer stable set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.admins where perfil_id = (select auth.uid()))
    or exists (select 1 from public.mesa_acesso where perfil_id = (select auth.uid())));
$$;
grant execute on function public.pode_acessar_mesa() to authenticated;

-- admin libera/retira pelo e-mail da conta
create or replace function public.admin_definir_acesso_mesa(p_email text, p_liberar boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then raise exception 'só admin'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if v is null then return 'e-mail não encontrado'; end if;
  if p_liberar then
    insert into public.mesa_acesso (perfil_id, concedido_por) values (v, (select auth.uid())) on conflict (perfil_id) do nothing;
    return 'liberado';
  end if;
  delete from public.mesa_acesso where perfil_id = v; return 'retirado';
end $$;
grant execute on function public.admin_definir_acesso_mesa(text, boolean) to authenticated;
