-- Migração 118 (24/11/2026): COMENTÁRIO DO GESTOR por emenda.
-- O Link Gestor mostrava a etiqueta e o recado do gabinete, mas o gestor não tinha onde responder ou anotar algo numa emenda
-- sem propor mudança. Agora cada emenda tem nota_gestor (+ quando foi escrita): o gestor escreve na coluna Comentários do
-- link (gestor_comentar), o gabinete vê na planilha (balão de observações da emenda) e recebe um aviso no balão de avisos.
-- Segurança: anon só chama gestor_comentar, que confere token, tipo gestor, prazo/fechado e se a emenda é da lista do link.
-- Capacidade: 1 texto curto (até 1000 caracteres) por emenda + 1 aviso (~300 bytes) por comentário. Sem cron, sem polling.

alter table public.gab_itens add column if not exists nota_gestor text;
alter table public.gab_itens add column if not exists nota_gestor_em timestamptz;

create or replace function public.gestor_comentar(p_token text, p_item uuid, p_texto text)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; i public.gab_itens; t text := nullif(btrim(left(coalesce(p_texto, ''), 1000)), '');
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  select * into i from public.gab_itens where id = p_item and lista_id = l.lista_id;
  if not found then raise exception 'emenda fora da lista'; end if;
  if t is not distinct from i.nota_gestor then return 'igual'; end if;
  update public.gab_itens set nota_gestor = t, nota_gestor_em = case when t is null then null else now() end where id = i.id;
  if t is not null then
    perform public.gab_avisar_gestores(l.parlamentar, 'Comentário do gestor · ' || coalesce(i.municipio, 'emenda') || coalesce(' · ' || i.lideranca, ''),
      left(t, 300) || ' (Indicação: abra o balão de observações da emenda para ver.)', i.id);
  end if;
  return 'ok';
end $$;
revoke all on function public.gestor_comentar(text, uuid, text) from public;
grant execute on function public.gestor_comentar(text, uuid, text) to anon, authenticated;

-- gestor_abrir: igual à 116, devolvendo também o comentário do gestor
create or replace function public.gestor_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links; li public.gab_listas;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then return null; end if;
  select * into li from public.gab_listas where id = l.lista_id;
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'prazo', l.prazo, 'enviado_em', l.enviado_em, 'cota', l.cota,
    'lista', coalesce(li.origem, li.apelido),
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'lideranca', i.lideranca, 'contato', i.contato, 'justificativa', i.justificativa,
        'benef_tipo', i.benef_tipo, 'razao_social', coalesce(i.razao_social, case when i.benef_tipo = 'ent' then i.beneficiario end), 'cnpj', i.cnpj,
        'nota_lider', i.nota_lider, 'nota_gestor', i.nota_gestor, 'nota_gestor_em', i.nota_gestor_em,
        'etq', case when i.marca is null then null else jsonb_build_object('n', i.marca, 'c',
          (select e->>'c' from jsonb_array_elements(coalesce(li.regras->'etiquetas', '[]'::jsonb)) e where e->>'n' = i.marca limit 1)) end) order by i.criado_em, i.id)
        from public.gab_itens i where i.lista_id = l.lista_id and (i.municipio is not null or coalesce(i.valor, 0) > 0)), '[]'::jsonb),
    'pendentes', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'acao', p.acao, 'item_id', p.item_id, 'dados', p.dados,
        'enviado_em', p.atualizado_em) order by p.atualizado_em)
        from public.gab_link_propostas p where p.link_id = l.id and p.status = 'enviado'), '[]'::jsonb));
end $$;
