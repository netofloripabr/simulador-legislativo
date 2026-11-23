-- Migração 115 (23/11/2026): link do líder acompanha a planilha AO VIVO.
-- Problema (links do Duda e do Evandro): o link guardava em gab_links.itens a lista de emendas do momento em que foi
-- criado. Emenda nova do líder, emenda trocada de líder ou apagada não mudava o link. Agora o link de líder
-- (lideranca = nome) e o de contato (lideranca = 'contato:Nome') pegam, a cada abertura, as emendas que HOJE são
-- daquele líder/contato na lista (com município ou valor, a mesma regra "cheia" da planilha). Link avulso ou de
-- uma emenda só (lideranca nula) continua com a lista fixa. A ordem: primeiro as que já estavam no link, depois as novas.
-- Capacidade: nada novo gravado; cada abertura faz uma busca a mais numa lista de ~100 emendas. Sem cron, sem polling.

create or replace function public.link_itens_atuais(l public.gab_links)
returns uuid[] language sql stable security definer set search_path = public as $$
  select case
    when l.lideranca is null then l.itens
    else coalesce((select array_agg(i.id order by coalesce(array_position(l.itens, i.id), 100000), i.criado_em, i.id)
      from public.gab_itens i
      where i.lista_id = l.lista_id and (i.municipio is not null or coalesce(i.valor, 0) > 0)
        and case when l.lideranca like 'contato:%'
          then substr(l.lideranca, 9) = any(regexp_split_to_array(coalesce(i.contato, ''), '\s*,\s*'))
          else i.lideranca = l.lideranca end), '{}'::uuid[])
  end
$$;
revoke all on function public.link_itens_atuais(public.gab_links) from public, anon, authenticated;

create or replace function public.link_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links; li public.gab_listas; ids uuid[];
begin
  select * into l from public.gab_links where token = p_token;
  if not found then return null; end if;
  select * into li from public.gab_listas where id = l.lista_id;
  ids := public.link_itens_atuais(l);
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'limpo', l.limpo, 'travado', l.travado, 'pedido_reabrir_em', l.pedido_reabrir_em, 'prazo', l.prazo, 'enviado_em', l.enviado_em,
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'benef_tipo', i.benef_tipo, 'beneficiario', coalesce(i.razao_social, i.beneficiario), 'cnpj', i.cnpj,
        'justificativa', i.justificativa, 'nota_lider', i.nota_lider,
        'etq', case when i.marca is null then null else jsonb_build_object('n', i.marca, 'c',
          (select e->>'c' from jsonb_array_elements(coalesce(li.regras->'etiquetas', '[]'::jsonb)) e where e->>'n' = i.marca limit 1)) end)
        order by array_position(ids, i.id)) from public.gab_itens i where i.id = any(ids)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id and p.item_id = any(ids)), '[]'::jsonb));
end $$;

create or replace function public.link_salvar(p_token text, p_item uuid, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; st text;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if l.travado then raise exception 'link enviado e trancado: peça ao gabinete para reabrir'; end if;
  if not (p_item = any(public.link_itens_atuais(l))) then raise exception 'emenda fora do link'; end if;
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
