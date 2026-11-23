-- Migração 113 (23/11/2026): link do líder TRANCA ao enviar. Depois de "Enviar ao gabinete" o líder vê o botão verde
-- com cadeado e não edita mais; se quiser mudar, toca no botão e pede para reabrir (link_pedir_reabrir), o que avisa
-- no sino a equipe responsável do gabinete (gab_avisar_gestores, migração 100). Só o gabinete reabre: na planilha de
-- Indicação, menu do link › "Autorizar reabertura" (update direto, RLS da equipe: travado = false, pedido_reabrir_em
-- = null). Links já enviados antes desta migração passam a trancados. Sem tabela nova; 2 colunas; sem cron/polling.
alter table public.gab_links add column if not exists travado boolean not null default false;
alter table public.gab_links add column if not exists pedido_reabrir_em timestamptz;
update public.gab_links set travado = true where tipo = 'lider' and enviado_em is not null;

create or replace function public.link_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then return null; end if;
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'limpo', l.limpo, 'travado', l.travado, 'pedido_reabrir_em', l.pedido_reabrir_em, 'prazo', l.prazo, 'enviado_em', l.enviado_em,
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'benef_tipo', i.benef_tipo, 'beneficiario', coalesce(i.razao_social, i.beneficiario), 'cnpj', i.cnpj,
        'justificativa', i.justificativa)
        order by array_position(l.itens, i.id)) from public.gab_itens i where i.id = any(l.itens)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id), '[]'::jsonb));
end $$;

create or replace function public.link_salvar(p_token text, p_item uuid, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; st text;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if l.travado then raise exception 'link enviado e trancado: peça ao gabinete para reabrir'; end if;
  if not (p_item = any(l.itens)) then raise exception 'emenda fora do link'; end if;
  if length(p_dados::text) > 4000 then raise exception 'dados grandes demais'; end if;
  if l.jan_ini is null or l.jan_ini < now() - interval '1 hour' then
    update public.gab_links set jan_ini = now(), jan_n = 1 where id = l.id;
  elsif l.jan_n >= 600 then raise exception 'muitas gravações; tente de novo em alguns minutos';
  else update public.gab_links set jan_n = jan_n + 1 where id = l.id; end if;
  select status into st from public.gab_link_propostas where link_id = l.id and item_id = p_item;
  if st in ('aceito', 'recusado') then raise exception 'esta emenda já foi decidida pelo gabinete'; end if;
  insert into public.gab_link_propostas as p (link_id, item_id, municipio, benef_tipo, beneficiario, cnpj, objeto, objeto_fonte, justificativa, status, atualizado_em)
  values (l.id, p_item, left(p_dados->>'municipio', 120), nullif(p_dados->>'benef_tipo', ''), left(p_dados->>'beneficiario', 300), left(p_dados->>'cnpj', 20),
    left(p_dados->>'objeto', 600), nullif(p_dados->>'objeto_fonte', ''), left(p_dados->>'justificativa', 2000), 'rascunho', now())
  on conflict (link_id, item_id) do update set municipio = excluded.municipio, benef_tipo = excluded.benef_tipo, beneficiario = excluded.beneficiario,
    cnpj = excluded.cnpj, objeto = excluded.objeto, objeto_fonte = excluded.objeto_fonte, justificativa = excluded.justificativa,
    status = 'rascunho', atualizado_em = now();
  return 'ok';
end $$;


create or replace function public.link_enviar(p_token text)
returns int language plpgsql security definer set search_path = public as $$
declare l public.gab_links; n int;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if l.travado then raise exception 'link já enviado e trancado'; end if;
  update public.gab_link_propostas set status = 'enviado', atualizado_em = now() where link_id = l.id and status = 'rascunho';
  get diagnostics n = row_count;
  update public.gab_links set enviado_em = now(), travado = true, pedido_reabrir_em = null where id = l.id;
  return n;
end $$;


-- o líder pede para reabrir um link trancado; avisa a equipe responsável (uma vez por pedido)
create or replace function public.link_pedir_reabrir(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'lider';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if not l.travado then return 'aberto'; end if;
  if l.pedido_reabrir_em is not null then return 'ja_pedido'; end if;
  update public.gab_links set pedido_reabrir_em = now() where id = l.id;
  perform public.gab_avisar_gestores(l.parlamentar, 'Pedido para reabrir link', l.nome || ' pediu para reabrir o link de indicação e mudar o que já enviou. Autorize na planilha de Indicação, menu do link.', l.id);
  return 'ok';
end $$;

revoke all on function public.link_abrir(text), public.link_salvar(text, uuid, jsonb), public.link_enviar(text), public.link_pedir_reabrir(text) from public;
grant execute on function public.link_abrir(text), public.link_salvar(text, uuid, jsonb), public.link_enviar(text), public.link_pedir_reabrir(text) to anon, authenticated;
