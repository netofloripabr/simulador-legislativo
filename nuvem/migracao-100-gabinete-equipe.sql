-- Migração 100 (11/11/2026): equipe do gabinete (Etapa 2, desenho aprovado pelo usuário em 11/11/2026).
-- Por quê: o Gabinete virou a página inicial de toda conta (migração 99) e vários usuários precisam trabalhar juntos no
-- gabinete de um deputado. Os dados privados (Controle de Recursos, Cotas, Indicar, Contatos, RH) deixam de pertencer
-- à conta que digitou (dono) e passam a pertencer ao gabinete (coluna parlamentar = número de urna 2026). Quem pode ver
-- e alterar vem da equipe (gab_equipe), com três papéis:
--   responsavel: vê e altera tudo, aprova/recusa pedidos, muda papel, remove, nomeia outro Responsável;
--   editor:      vê e altera Controle, Cotas, Contatos, RH e Indicar;
--   leitor:      só vê Controle, Cotas, Contatos e RH (Indicar não).
-- O administrador do site vale como Responsável de todo gabinete (libera o 1º Responsável de cada um).
-- Quem já está ativo num gabinete e pede outro precisa também da autorização de um Responsável do gabinete atual
-- (ok_origem). Nada é apagado: removido/recusado ficam no histórico. "Quem alterou e quando" vai em atualizado_por /
-- atualizado_em (gatilho). Apagar uma conta não apaga mais o gabinete (dono passa a on delete set null).
-- Dados atuais: todos os registros privados são do administrador (conferido antes: 0 linhas de outras contas) e do
-- gabinete 55777; o administrador vira Responsável do 55777. adm_* (servidores com nomes) não mudam: seguem gab_pode().
-- Capacidade: gab_equipe ~150 B/linha (100 gabinetes × 5 pessoas ≈ 75 KB); 1 leitura de papel + 1 lista por acesso
-- (~1 KB); sem cron nem polling; notificações só em pedido/decisão. Bem abaixo de 0,1% dos limites do plano gratuito.

-- 1) equipe -------------------------------------------------------------------------------------------------------
create table if not exists public.gab_equipe (
  id uuid primary key default gen_random_uuid(),
  parlamentar text not null,
  parlamentar_nome text,
  perfil_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'leitor' check (papel in ('responsavel','editor','leitor')),
  status text not null default 'pedido' check (status in ('pedido','ativo','recusado','removido')),
  ok_origem boolean,            -- null: não precisa; false: aguardando o Responsável do gabinete atual; true: autorizado
  ok_origem_por uuid,
  aprovado_por uuid,
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create unique index if not exists gab_equipe_aberta on public.gab_equipe (parlamentar, perfil_id) where status in ('pedido','ativo');
create index if not exists gab_equipe_perfil on public.gab_equipe (perfil_id, status);
create index if not exists gab_equipe_parl on public.gab_equipe (parlamentar, status);
alter table public.gab_equipe enable row level security;
grant select on public.gab_equipe to authenticated;
grant select, insert, update, delete on public.gab_equipe to service_role;

-- 2) papel de quem está logado num gabinete -----------------------------------------------------------------------
create or replace function public.gab_papel(p text) returns text
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.admins where perfil_id = (select auth.uid())) then 'responsavel'
    else (select e.papel from public.gab_equipe e where e.parlamentar = p and e.perfil_id = (select auth.uid()) and e.status = 'ativo' limit 1) end;
$$;
create or replace function public.gab_le(p text) returns boolean
language sql stable security definer set search_path = public as $$ select public.gab_papel(p) is not null; $$;
create or replace function public.gab_edita(p text) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.gab_papel(p) in ('responsavel','editor'), false); $$;
create or replace function public.gab_gere(p text) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.gab_papel(p) = 'responsavel', false); $$;
revoke all on function public.gab_papel(text), public.gab_le(text), public.gab_edita(text), public.gab_gere(text) from public, anon;
grant execute on function public.gab_papel(text), public.gab_le(text), public.gab_edita(text), public.gab_gere(text) to authenticated;

drop policy if exists gab_equipe_ver on public.gab_equipe;
create policy gab_equipe_ver on public.gab_equipe for select to authenticated
  using (perfil_id = (select auth.uid()) or public.gab_le(parlamentar));

-- 3) notificação: tipo novo ---------------------------------------------------------------------------------------
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo = any (array['desafio_recebido','desafio_aceito',
  'desafio_recusado','desafio_cancelado','desafio_expirado','desafio_lembrete','convite_convertido','termometro_abriu',
  'mudanca_candidato','acesso_parlamentares','desafio_apurado','conferencia_gabinete','rotina_servidores','gab_equipe']));

create or replace function public.gab_avisar_gestores(p text, p_titulo text, p_corpo text, p_ref uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select distinct perfil_id from public.gab_equipe where parlamentar = p and status = 'ativo' and papel = 'responsavel' loop
    perform public.criar_notificacao_interna(r.perfil_id, 'gab_equipe', p_titulo, p_corpo, p_ref); n := n + 1; end loop;
  if n = 0 then -- gabinete sem Responsável: o pedido vai para a administração do site
    for r in select perfil_id from public.admins loop perform public.criar_notificacao_interna(r.perfil_id, 'gab_equipe', p_titulo, p_corpo, p_ref); end loop;
  end if;
end $$;
revoke all on function public.gab_avisar_gestores(text, text, text, uuid) from public, anon, authenticated;

-- 4) pedidos e decisões (só por estas funções; a tabela não tem política de escrita) --------------------------------
create or replace function public.gab_pedir_entrada(p_parlamentar text, p_papel text default 'leitor', p_nome text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ex record; novo_id uuid; quem text; outros int; abertos int; pp text;
begin
  if uid is null then raise exception 'entre com a sua conta'; end if;
  if p_parlamentar is null or p_parlamentar !~ '^[0-9]{2,6}$' then raise exception 'gabinete inválido'; end if;
  pp := case when p_papel in ('editor','leitor') then p_papel else 'leitor' end; -- ninguém pede para ser Responsável
  select * into ex from public.gab_equipe where parlamentar = p_parlamentar and perfil_id = uid and status in ('pedido','ativo') limit 1;
  if found then return jsonb_build_object('id', ex.id, 'status', ex.status); end if;
  select count(*) into abertos from public.gab_equipe where perfil_id = uid and status = 'pedido';
  if abertos >= 5 then raise exception 'você já tem 5 pedidos aguardando resposta'; end if;
  select count(*) into outros from public.gab_equipe where perfil_id = uid and status = 'ativo';
  insert into public.gab_equipe (parlamentar, parlamentar_nome, perfil_id, papel, status, ok_origem)
    values (p_parlamentar, left(p_nome, 120), uid, pp, 'pedido', case when outros > 0 and not exists (select 1 from public.admins where perfil_id = uid) then false else null end)
    returning id into novo_id;
  select coalesce(nullif(nome, ''), 'Uma conta') into quem from public.perfis where id = uid;
  perform public.gab_avisar_gestores(p_parlamentar, 'Pedido para entrar na equipe',
    coalesce(quem, 'Uma conta') || ' pediu para entrar na equipe do gabinete' || coalesce(' de ' || p_nome, '') || ' como ' || pp || '.', novo_id);
  if outros > 0 then -- já está noutro gabinete: um Responsável de lá também precisa autorizar
    perform public.criar_notificacao_interna(g.perfil_id, 'gab_equipe', 'Autorizar outro gabinete',
      coalesce(quem, 'Uma conta') || ', da sua equipe, pediu para entrar também no gabinete' || coalesce(' de ' || p_nome, '') || '. É preciso a sua autorização.', novo_id)
    from (select distinct r.perfil_id from public.gab_equipe m join public.gab_equipe r on r.parlamentar = m.parlamentar and r.status = 'ativo' and r.papel = 'responsavel'
          where m.perfil_id = uid and m.status = 'ativo' and r.perfil_id <> uid) g;
  end if;
  return jsonb_build_object('id', novo_id, 'status', 'pedido');
end $$;

create or replace function public.gab_autorizar_origem(p_id uuid, p_aprovar boolean) returns text
language plpgsql security definer set search_path = public as $$
declare r public.gab_equipe; uid uuid := auth.uid();
begin
  select * into r from public.gab_equipe where id = p_id for update;
  if not found or r.status <> 'pedido' or r.ok_origem is distinct from false then raise exception 'pedido sem autorização pendente'; end if;
  if not exists (select 1 from public.admins where perfil_id = uid) and not exists (select 1 from public.gab_equipe m join public.gab_equipe g
      on g.parlamentar = m.parlamentar and g.perfil_id = uid and g.status = 'ativo' and g.papel = 'responsavel'
      where m.perfil_id = r.perfil_id and m.status = 'ativo') then raise exception 'só o Responsável do gabinete atual autoriza'; end if;
  if p_aprovar then update public.gab_equipe set ok_origem = true, ok_origem_por = uid, atualizado_em = now() where id = p_id;
  else update public.gab_equipe set status = 'recusado', ok_origem_por = uid, decidido_em = now(), atualizado_em = now() where id = p_id;
    perform public.criar_notificacao_interna(r.perfil_id, 'gab_equipe', 'Pedido não autorizado', 'O Responsável do seu gabinete não autorizou a entrada no gabinete' || coalesce(' de ' || r.parlamentar_nome, '') || '.', p_id); end if;
  return case when p_aprovar then 'autorizado' else 'recusado' end;
end $$;

create or replace function public.gab_decidir_pedido(p_id uuid, p_aprovar boolean, p_papel text default null) returns text
language plpgsql security definer set search_path = public as $$
declare r public.gab_equipe; uid uuid := auth.uid(); pp text; adm boolean := exists (select 1 from public.admins where perfil_id = auth.uid());
begin
  select * into r from public.gab_equipe where id = p_id for update;
  if not found or r.status <> 'pedido' then raise exception 'pedido não encontrado ou já decidido'; end if;
  if not public.gab_gere(r.parlamentar) then raise exception 'só o Responsável do gabinete decide'; end if;
  if p_aprovar and r.ok_origem = false and not adm then raise exception 'aguardando a autorização do gabinete atual da pessoa'; end if;
  pp := coalesce(p_papel, r.papel); if pp not in ('responsavel','editor','leitor') then raise exception 'papel inválido'; end if;
  update public.gab_equipe set status = case when p_aprovar then 'ativo' else 'recusado' end, papel = pp, aprovado_por = uid,
    decidido_em = now(), atualizado_em = now() where id = p_id;
  perform public.criar_notificacao_interna(r.perfil_id, 'gab_equipe', case when p_aprovar then 'Você entrou na equipe' else 'Pedido recusado' end,
    case when p_aprovar then 'Seu pedido para a equipe do gabinete' || coalesce(' de ' || r.parlamentar_nome, '') || ' foi aprovado. Papel: ' || pp || '.'
      else 'Seu pedido para a equipe do gabinete' || coalesce(' de ' || r.parlamentar_nome, '') || ' foi recusado.' end, p_id);
  return case when p_aprovar then 'ativo' else 'recusado' end;
end $$;

create or replace function public.gab_mudar_papel(p_id uuid, p_papel text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.gab_equipe; adm boolean := exists (select 1 from public.admins where perfil_id = auth.uid());
begin
  select * into r from public.gab_equipe where id = p_id for update;
  if not found or r.status <> 'ativo' then raise exception 'membro não encontrado'; end if;
  if not public.gab_gere(r.parlamentar) then raise exception 'só o Responsável muda papéis'; end if;
  if p_papel not in ('responsavel','editor','leitor') then raise exception 'papel inválido'; end if;
  if r.papel = 'responsavel' and p_papel <> 'responsavel' and not adm and (select count(*) from public.gab_equipe where parlamentar = r.parlamentar and status = 'ativo' and papel = 'responsavel') <= 1
    then raise exception 'o gabinete precisa de ao menos um Responsável'; end if;
  update public.gab_equipe set papel = p_papel, atualizado_em = now() where id = p_id;
  return p_papel;
end $$;

create or replace function public.gab_remover(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r public.gab_equipe; uid uuid := auth.uid(); adm boolean := exists (select 1 from public.admins where perfil_id = auth.uid());
begin
  select * into r from public.gab_equipe where id = p_id for update;
  if not found or r.status not in ('ativo','pedido') then raise exception 'membro não encontrado'; end if;
  if r.perfil_id <> uid and not public.gab_gere(r.parlamentar) then raise exception 'só o Responsável remove outra pessoa'; end if;
  if r.status = 'ativo' and r.papel = 'responsavel' and not adm and (select count(*) from public.gab_equipe where parlamentar = r.parlamentar and status = 'ativo' and papel = 'responsavel') <= 1
    then raise exception 'o último Responsável só sai pela administração do site'; end if;
  update public.gab_equipe set status = 'removido', decidido_em = now(), atualizado_em = now() where id = p_id;
  return 'removido';
end $$;

-- lista da equipe (com nome); pedidos só para o Responsável; inclui removidos para mostrar "editado por"
create or replace function public.gab_equipe_lista(p text)
returns table (id uuid, perfil_id uuid, nome text, papel text, status text, ok_origem boolean, criado_em timestamptz, decidido_em timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id, e.perfil_id, coalesce(nullif(pf.nome, ''), 'Conta sem nome'), e.papel, e.status, e.ok_origem, e.criado_em, e.decidido_em
  from public.gab_equipe e left join public.perfis pf on pf.id = e.perfil_id
  where e.parlamentar = p and (e.perfil_id = (select auth.uid()) or (public.gab_le(p) and (e.status in ('ativo','removido') or public.gab_gere(p))))
  order by case e.status when 'pedido' then 0 when 'ativo' then 1 else 2 end, case e.papel when 'responsavel' then 0 when 'editor' then 1 else 2 end, 3
  limit 300;
$$;

-- meus gabinetes (seletor) e autorizações que esperam por mim (pedido de alguém da minha equipe para outro gabinete)
create or replace function public.gab_meus_gabinetes()
returns table (id uuid, parlamentar text, parlamentar_nome text, papel text, status text, ok_origem boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.parlamentar, e.parlamentar_nome, e.papel, e.status, e.ok_origem from public.gab_equipe e
  where e.perfil_id = (select auth.uid()) and e.status in ('ativo','pedido') order by e.status, e.criado_em limit 50;
$$;
create or replace function public.gab_autorizacoes_pendentes()
returns table (id uuid, nome text, parlamentar text, parlamentar_nome text, papel text, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct p.id, coalesce(nullif(pf.nome, ''), 'Conta sem nome'), p.parlamentar, p.parlamentar_nome, p.papel, p.criado_em
  from public.gab_equipe p left join public.perfis pf on pf.id = p.perfil_id
  where p.status = 'pedido' and p.ok_origem = false and (exists (select 1 from public.admins where perfil_id = (select auth.uid()))
    or exists (select 1 from public.gab_equipe m join public.gab_equipe g on g.parlamentar = m.parlamentar and g.perfil_id = (select auth.uid()) and g.status = 'ativo' and g.papel = 'responsavel'
      where m.perfil_id = p.perfil_id and m.status = 'ativo'))
  limit 100;
$$;
revoke all on function public.gab_pedir_entrada(text, text, text), public.gab_autorizar_origem(uuid, boolean), public.gab_decidir_pedido(uuid, boolean, text),
  public.gab_mudar_papel(uuid, text), public.gab_remover(uuid), public.gab_equipe_lista(text), public.gab_meus_gabinetes(), public.gab_autorizacoes_pendentes() from public, anon;
grant execute on function public.gab_pedir_entrada(text, text, text), public.gab_autorizar_origem(uuid, boolean), public.gab_decidir_pedido(uuid, boolean, text),
  public.gab_mudar_papel(uuid, text), public.gab_remover(uuid), public.gab_equipe_lista(text), public.gab_meus_gabinetes(), public.gab_autorizacoes_pendentes() to authenticated;

-- 5) dados atuais: administrador = Responsável do 55777; contatos ganham parlamentar ----------------------------------
insert into public.gab_equipe (parlamentar, parlamentar_nome, perfil_id, papel, status, decidido_em)
  select '55777', 'Napoleão Bernardes', a.perfil_id, 'responsavel', 'ativo', now() from public.admins a
  where not exists (select 1 from public.gab_equipe e where e.parlamentar = '55777' and e.perfil_id = a.perfil_id and e.status = 'ativo');
alter table public.gab_contatos add column if not exists parlamentar text;
update public.gab_contatos set parlamentar = '55777' where parlamentar is null;

-- 6) "quem alterou e quando" + dono não apaga mais o gabinete -------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['gab_recursos','gab_demandas','gab_listas','gab_itens','gab_contatos','gab_cargos'] loop
    execute format('alter table public.%I add column if not exists atualizado_por uuid', t);
    execute format('alter table public.%I add column if not exists atualizado_em timestamptz default now()', t);
    execute format('update public.%I set parlamentar = ''55777'' where parlamentar is null', t);
    execute format('alter table public.%I alter column parlamentar set not null', t);
    execute format('alter table public.%I alter column dono drop not null', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_dono_fkey');
    execute format('alter table public.%I add constraint %I foreign key (dono) references auth.users(id) on delete set null', t, t || '_dono_fkey');
    execute format('create index if not exists %I on public.%I (parlamentar)', t || '_parlamentar', t);
  end loop; end $$;

create or replace function public.gab_carimbo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_por := auth.uid(); new.atualizado_em := now();
  if tg_op = 'INSERT' then new.dono := coalesce(new.dono, auth.uid()); end if;
  return new;
end $$;
revoke all on function public.gab_carimbo() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['gab_recursos','gab_demandas','gab_listas','gab_itens','gab_contatos','gab_cargos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_carimbo', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.gab_carimbo()', t || '_carimbo', t);
  end loop; end $$;
-- contatos também recebem o gabinete vinculado quando a tela não manda (mesmo gatilho da migração 98)
drop trigger if exists gab_contatos_parl on public.gab_contatos;
create trigger gab_contatos_parl before insert on public.gab_contatos for each row execute function public.gab_poe_parlamentar();

-- 7) regras de acesso por gabinete (troca dono + gab_pode por equipe) -------------------------------------------------
do $$ declare t text; pol record; begin
  foreach t in array array['gab_recursos','gab_demandas','gab_listas','gab_itens','gab_contatos','gab_cargos'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t); end loop;
    -- Indicar (listas e itens): Leitor não vê; o resto o Leitor vê
    if t in ('gab_listas','gab_itens') then
      execute format('create policy %I on public.%I for select to authenticated using (public.gab_edita(parlamentar))', t || '_ver', t);
    else
      execute format('create policy %I on public.%I for select to authenticated using (public.gab_le(parlamentar))', t || '_ver', t);
    end if;
    execute format('create policy %I on public.%I for insert to authenticated with check (public.gab_edita(parlamentar))', t || '_incluir', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.gab_edita(parlamentar)) with check (public.gab_edita(parlamentar))', t || '_alterar', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.gab_edita(parlamentar))', t || '_apagar', t);
  end loop; end $$;
