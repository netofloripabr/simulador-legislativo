-- Migração 109 (22/11/2026): Indicação de recursos › LINK GESTOR.
-- Um link por lista (ex.: LOA 2027) para uma pessoa de confiança ver e editar a lista INTEIRA, sem login, em
-- painel/gestor-lista.html?t=TOKEN: alterar, incluir e excluir emendas. Nada grava direto na lista: cada mudança
-- vira uma proposta (gab_link_propostas, a mesma tabela dos links dos líderes) que o gabinete aceita ✓ ou recusa ✕
-- na planilha de Indicação. Reaproveita gab_links (tipo = 'gestor') — decisão do organizador do site, 22/11/2026.
-- Segurança: anon NÃO lê as tabelas; só chama gestor_abrir e gestor_enviar, que conferem token, tipo, prazo e
-- "fechado"; alterar/excluir só vale para emenda da própria lista; limite de 40 envios por link por hora.
-- Os links dos líderes não mudam: link_abrir/link_salvar com token de gestor não acham emendas (itens vazio).
-- Capacidade: 1 link por lista; ~100–300 propostas por LOA, < 1 KB cada (< 300 KB no total). Cada abertura devolve a
-- lista inteira (~25 KB para 90 emendas); municípios/regiões vêm do GitHub Pages. Sem cron, sem polling.

alter table public.gab_links add column if not exists tipo text not null default 'lider';
alter table public.gab_links drop constraint if exists gab_links_tipo_check;
alter table public.gab_links add constraint gab_links_tipo_check check (tipo in ('lider', 'gestor'));
alter table public.gab_links add column if not exists cota jsonb;          -- cota da lista (disp, max, saude), gravada pela planilha
create unique index if not exists gab_links_um_gestor on public.gab_links(lista_id) where tipo = 'gestor';

alter table public.gab_link_propostas alter column item_id drop not null;   -- inclusão ainda não tem emenda
alter table public.gab_link_propostas add column if not exists acao text not null default 'alterar';
alter table public.gab_link_propostas drop constraint if exists gab_link_propostas_acao_check;
alter table public.gab_link_propostas add constraint gab_link_propostas_acao_check check (acao in ('alterar', 'incluir', 'excluir'));
alter table public.gab_link_propostas add column if not exists dados jsonb;  -- campos propostos pelo gestor
alter table public.gab_link_propostas add column if not exists antes jsonb;  -- como a emenda estava quando o gestor enviou
create index if not exists gab_link_propostas_link on public.gab_link_propostas(link_id);

-- abre o Link Gestor: a lista inteira (emendas com município ou valor), a cota e as mudanças ainda não decididas
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
        'natureza', i.natureza, 'valor', i.valor, 'lideranca', i.lideranca, 'contato', i.contato) order by i.criado_em, i.id)
        from public.gab_itens i where i.lista_id = l.lista_id and (i.municipio is not null or coalesce(i.valor, 0) > 0)), '[]'::jsonb),
    'pendentes', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'acao', p.acao, 'item_id', p.item_id, 'dados', p.dados,
        'enviado_em', p.atualizado_em) order by p.atualizado_em)
        from public.gab_link_propostas p where p.link_id = l.id and p.status = 'enviado'), '[]'::jsonb));
end $$;

-- envia as mudanças: [{acao, item_id, dados}]; uma mudança nova de uma emenda substitui a anterior ainda não decidida
create or replace function public.gestor_enviar(p_token text, p_mud jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare l public.gab_links; m jsonb; a text; it uuid; d jsonb; antes jsonb; n int := 0;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if jsonb_typeof(p_mud) <> 'array' or jsonb_array_length(p_mud) = 0 then raise exception 'nenhuma mudança'; end if;
  if jsonb_array_length(p_mud) > 300 or length(p_mud::text) > 400000 then raise exception 'mudanças demais de uma vez'; end if;
  if l.jan_ini is null or l.jan_ini < now() - interval '1 hour' then
    update public.gab_links set jan_ini = now(), jan_n = 1 where id = l.id;
  elsif l.jan_n >= 40 then raise exception 'muitos envios; tente de novo em alguns minutos';
  else update public.gab_links set jan_n = jan_n + 1 where id = l.id; end if;
  for m in select * from jsonb_array_elements(p_mud) loop
    a := m->>'acao';
    if a not in ('alterar', 'incluir', 'excluir') then raise exception 'ação inválida'; end if;
    d := jsonb_strip_nulls(jsonb_build_object(
      'municipio', left(m->'dados'->>'municipio', 120), 'objeto', left(m->'dados'->>'objeto', 600), 'area', left(m->'dados'->>'area', 60),
      'natureza', left(m->'dados'->>'natureza', 20), 'valor', case when (m->'dados'->>'valor') ~ '^\d+(\.\d+)?$' then (m->'dados'->>'valor')::numeric end,
      'lideranca', left(m->'dados'->>'lideranca', 120), 'contato', left(m->'dados'->>'contato', 200)));
    -- campos que o gestor esvaziou de propósito (lista "limpar")
    if jsonb_typeof(m->'limpar') = 'array' then
      d := d || coalesce((select jsonb_object_agg(k, null) from jsonb_array_elements_text(m->'limpar') k
        where k in ('municipio', 'objeto', 'area', 'natureza', 'lideranca', 'contato')), '{}'::jsonb);
    end if;
    if a = 'incluir' then
      insert into public.gab_link_propostas (link_id, item_id, acao, dados, status, atualizado_em) values (l.id, null, 'incluir', d, 'enviado', now());
    else
      it := (m->>'item_id')::uuid;
      select jsonb_build_object('municipio', i.municipio, 'objeto', i.objeto, 'area', i.area, 'natureza', i.natureza, 'valor', i.valor,
          'lideranca', i.lideranca, 'contato', i.contato) into antes
        from public.gab_itens i where i.id = it and i.lista_id = l.lista_id;
      if antes is null then raise exception 'emenda fora da lista'; end if;
      delete from public.gab_link_propostas where link_id = l.id and item_id = it and status in ('rascunho', 'enviado');
      insert into public.gab_link_propostas (link_id, item_id, acao, dados, antes, status, atualizado_em)
        values (l.id, it, a, case when a = 'excluir' then null else d end, antes, 'enviado', now());
    end if;
    n := n + 1;
  end loop;
  update public.gab_links set enviado_em = now() where id = l.id;
  return n;
end $$;

-- desiste de uma mudança enviada que o gabinete ainda não decidiu
create or replace function public.gestor_desistir(p_token text, p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare l public.gab_links; n int;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  delete from public.gab_link_propostas where id = p_id and link_id = l.id and status = 'enviado';
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.gestor_abrir(text), public.gestor_enviar(text, jsonb), public.gestor_desistir(text, uuid) from public;
grant execute on function public.gestor_abrir(text), public.gestor_enviar(text, jsonb), public.gestor_desistir(text, uuid) to anon, authenticated;
