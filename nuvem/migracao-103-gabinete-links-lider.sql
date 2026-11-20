-- Migração 103 (20/11/2026): Indicação de recursos › links dos líderes.
-- O gabinete gera um link (token) para um líder — ou para uma pessoa só — com um grupo de emendas da lista
-- (ex.: LOA 2027). Quem recebe abre painel/indicar-lider.html?t=TOKEN SEM LOGIN, vê só essas emendas, escolhe o
-- objeto no Portfólio (ou o "Item do gabinete"), pode mudar município e quem recebe (município/entidade + CNPJ),
-- escreve a justificativa e envia. O gabinete acompanha na planilha (coluna Etapa) e aceita ✓ ou recusa ✕ cada
-- proposta; ao aceitar, os campos vão para a emenda (gab_itens).
-- Segurança: anon NÃO lê as tabelas; só chama 3 funções (link_abrir, link_salvar, link_enviar) que conferem o
-- token, o prazo, o "fechado" e se a emenda é do link. Limite de 600 gravações por link por hora.
-- Capacidade: ~20 links e ~120 propostas por LOA, < 1 KB cada (< 200 KB no total). Cada abertura do link devolve
-- ~20 KB; o Portfólio e os municípios vêm do GitHub Pages. Sem cron, sem polling.

create table if not exists public.gab_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_'),
  parlamentar text not null,
  lista_id uuid not null references public.gab_listas(id) on delete cascade,
  nome text not null,                 -- líder ou pessoa que recebe o link
  lideranca text,                     -- grupo do líder (null = link avulso)
  itens uuid[] not null,              -- emendas do link
  titulo text,                        -- ex.: "Gabinete do dep. Fulano"
  prazo timestamptz not null,
  fechado boolean not null default false,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  aberto_em timestamptz,
  ult_acesso timestamptz,
  acessos int not null default 0,
  enviado_em timestamptz,
  jan_ini timestamptz,                -- janela do limite de gravações
  jan_n int not null default 0
);
grant select, insert, update, delete on public.gab_links to authenticated;
grant select, insert, update, delete on public.gab_links to service_role;
create index if not exists gab_links_lista on public.gab_links(lista_id);
alter table public.gab_links enable row level security;
drop policy if exists gab_links_equipe on public.gab_links;
create policy gab_links_equipe on public.gab_links for all to authenticated
  using (public.gab_edita(parlamentar)) with check (public.gab_edita(parlamentar));

create table if not exists public.gab_link_propostas (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.gab_links(id) on delete cascade,
  item_id uuid not null references public.gab_itens(id) on delete cascade,
  municipio text,
  benef_tipo text check (benef_tipo in ('mun', 'ent')),
  beneficiario text,
  cnpj text,
  objeto text,
  objeto_fonte text check (objeto_fonte in ('gab', 'port', 'outro')),
  justificativa text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aceito', 'recusado')),
  atualizado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid,
  unique (link_id, item_id)
);
grant select, insert, update, delete on public.gab_link_propostas to authenticated;
grant select, insert, update, delete on public.gab_link_propostas to service_role;
create index if not exists gab_link_propostas_item on public.gab_link_propostas(item_id);
alter table public.gab_link_propostas enable row level security;
drop policy if exists gab_link_propostas_equipe on public.gab_link_propostas;
create policy gab_link_propostas_equipe on public.gab_link_propostas for all to authenticated
  using (exists (select 1 from public.gab_links l where l.id = link_id and public.gab_edita(l.parlamentar)))
  with check (exists (select 1 from public.gab_links l where l.id = link_id and public.gab_edita(l.parlamentar)));

-- abre o link: devolve o grupo de emendas e o que já foi preenchido; conta o acesso (no máx. 1 gravação por minuto)
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
    'nome', l.nome, 'titulo', l.titulo, 'prazo', l.prazo, 'enviado_em', l.enviado_em,
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'benef_tipo', i.benef_tipo, 'beneficiario', coalesce(i.razao_social, i.beneficiario), 'cnpj', i.cnpj)
        order by array_position(l.itens, i.id)) from public.gab_itens i where i.id = any(l.itens)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id), '[]'::jsonb));
end $$;

-- grava (rascunho) o que o líder preencheu numa emenda
create or replace function public.link_salvar(p_token text, p_item uuid, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links; st text;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
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

-- envia ao gabinete: o que está em rascunho passa a "enviado"
create or replace function public.link_enviar(p_token text)
returns int language plpgsql security definer set search_path = public as $$
declare l public.gab_links; n int;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  update public.gab_link_propostas set status = 'enviado', atualizado_em = now() where link_id = l.id and status = 'rascunho';
  get diagnostics n = row_count;
  update public.gab_links set enviado_em = now() where id = l.id;
  return n;
end $$;

revoke all on function public.link_abrir(text), public.link_salvar(text, uuid, jsonb), public.link_enviar(text) from public;
grant execute on function public.link_abrir(text), public.link_salvar(text, uuid, jsonb), public.link_enviar(text) to anon, authenticated;
