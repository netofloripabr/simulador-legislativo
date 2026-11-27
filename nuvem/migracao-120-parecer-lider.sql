-- Migração 120 (27/11/2026): PARECER E COMENTÁRIO DO LÍDER (ou contato) por emenda, igual ao do Link Gestor (119).
-- No link do líder (indicar-lider.html), cada emenda ganha ✓ (de acordo), ✕ (não de acordo, exige comentário) e o
-- balão de comentar. Tocar de novo no mesmo botão tira o parecer. A resposta chega à planilha (balão de observações da
-- emenda) e o ✕ ou um comentário novo geram aviso no sino do gabinete.
-- Uma emenda pode estar no link do líder e no de um contato: guarda-se a ÚLTIMA resposta, com o nome de quem respondeu.
-- Pode responder com o link aberto (não fechado e dentro do prazo), mesmo depois de enviado/trancado — é opinião, não
-- muda a emenda.
-- Segurança: anon só chama lider_avaliar e lider_comentar, que conferem token, tipo líder, prazo/fechado e se a emenda
-- está no link (link_itens_atuais); limite de 600 gravações por hora por link (o mesmo contador de link_salvar).
-- Capacidade: 5 colunas pequenas por emenda (texto até 1000 caracteres) + 1 aviso (~300 bytes) por ✕/comentário.
-- Sem cron, sem polling.

alter table public.gab_itens add column if not exists parecer_lider text;
alter table public.gab_itens drop constraint if exists gab_itens_parecer_lider_check;
alter table public.gab_itens add constraint gab_itens_parecer_lider_check check (parecer_lider in ('ok', 'nao'));
alter table public.gab_itens add column if not exists parecer_lider_em timestamptz;
alter table public.gab_itens add column if not exists nota_lider_resp text;
alter table public.gab_itens add column if not exists nota_lider_resp_em timestamptz;
alter table public.gab_itens add column if not exists lider_resp_por text;

-- confere o link e conta a gravação; devolve o link
create or replace function public.lider_link_ok(p_token text, p_item uuid)
returns public.gab_links language plpgsql security definer set search_path = public as $$
declare l public.gab_links;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'lider';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if not (p_item = any(public.link_itens_atuais(l))) then raise exception 'emenda fora do link'; end if;
  if l.jan_ini is null or l.jan_ini < now() - interval '1 hour' then
    update public.gab_links set jan_ini = now(), jan_n = 1 where id = l.id;
  elsif l.jan_n >= 600 then raise exception 'muitas gravações; tente de novo em alguns minutos';
  else update public.gab_links set jan_n = jan_n + 1 where id = l.id; end if;
  return l;
end $$;
revoke all on function public.lider_link_ok(text, uuid) from public, anon, authenticated;

create or replace function public.lider_avaliar(p_token text, p_item uuid, p_parecer text, p_texto text default null)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; i public.gab_itens; t text := nullif(btrim(left(coalesce(p_texto, ''), 1000)), ''); pa text := nullif(p_parecer, '');
  quem text;
begin
  l := public.lider_link_ok(p_token, p_item);
  if pa is not null and pa not in ('ok', 'nao') then raise exception 'parecer inválido'; end if;
  select * into i from public.gab_itens where id = p_item;
  if pa = 'nao' and coalesce(t, i.nota_lider_resp) is null then raise exception 'escreva o motivo no comentário'; end if;
  quem := coalesce(nullif(l.nome, ''), 'Líder');
  update public.gab_itens set parecer_lider = pa, parecer_lider_em = case when pa is null then null else now() end,
    nota_lider_resp = coalesce(t, nota_lider_resp), nota_lider_resp_em = case when t is not null then now() else nota_lider_resp_em end,
    lider_resp_por = quem where id = i.id;
  if pa = 'nao' then
    perform public.gab_avisar_gestores(l.parlamentar, quem || ' não está de acordo · ' || coalesce(i.municipio, 'emenda'),
      left(coalesce(t, i.nota_lider_resp, ''), 300) || ' (Indicação: abra o balão de observações da emenda.)', i.id);
  end if;
  return 'ok';
end $$;
revoke all on function public.lider_avaliar(text, uuid, text, text) from public;
grant execute on function public.lider_avaliar(text, uuid, text, text) to anon, authenticated;

create or replace function public.lider_comentar(p_token text, p_item uuid, p_texto text)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; i public.gab_itens; t text := nullif(btrim(left(coalesce(p_texto, ''), 1000)), ''); quem text;
begin
  l := public.lider_link_ok(p_token, p_item);
  select * into i from public.gab_itens where id = p_item;
  if t is not distinct from i.nota_lider_resp then return 'igual'; end if;
  if t is null and i.parecer_lider = 'nao' then raise exception 'tire o ✕ antes de apagar o motivo'; end if;
  quem := coalesce(nullif(l.nome, ''), 'Líder');
  update public.gab_itens set nota_lider_resp = t, nota_lider_resp_em = case when t is null then null else now() end, lider_resp_por = quem where id = i.id;
  if t is not null then
    perform public.gab_avisar_gestores(l.parlamentar, 'Comentário de ' || quem || ' · ' || coalesce(i.municipio, 'emenda'),
      left(t, 300) || ' (Indicação: abra o balão de observações da emenda para ver.)', i.id);
  end if;
  return 'ok';
end $$;
revoke all on function public.lider_comentar(text, uuid, text) from public;
grant execute on function public.lider_comentar(text, uuid, text) to anon, authenticated;

-- link_abrir: igual à 115, devolvendo também o parecer e o comentário do líder
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
        'parecer_lider', i.parecer_lider, 'nota_lider_resp', i.nota_lider_resp, 'nota_lider_resp_em', i.nota_lider_resp_em, 'lider_resp_por', i.lider_resp_por,
        'etq', case when i.marca is null then null else jsonb_build_object('n', i.marca, 'c',
          (select e->>'c' from jsonb_array_elements(coalesce(li.regras->'etiquetas', '[]'::jsonb)) e where e->>'n' = i.marca limit 1)) end)
        order by array_position(ids, i.id)) from public.gab_itens i where i.id = any(ids)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id and p.item_id = any(ids)), '[]'::jsonb));
end $$;
