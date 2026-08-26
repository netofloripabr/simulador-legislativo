-- Migração 33: Desafio 1×1 passa de "cédula inteira depositada" pra
-- "recorte de candidatos específicos" — mockup aprovado 25/08/2026
-- (protótipo "Duelo de Titãs", memória: alesc_referencia_senador_deputados
-- e a conversa que gerou o protótipo A3 friso-lateral). Colar no SQL
-- Editor do Supabase e rodar UMA vez, depois da migração 32.
--
-- O QUE MUDA (era → agora):
--   - Era: cada lado escolhia uma cédula JÁ depositada inteira (3 cargos,
--     candidatos ilimitados) — cedula_criador_id/cedula_desafiado_id
--     apontavam pra public.salvamentos.
--   - Agora: o desafio é sobre UM cargo só, e um recorte de candidatos
--     dentro dele — "cargo inteiro" (todo mundo daquele cargo) ou
--     "candidatos específicos" (qualquer subconjunto escolhido a dedo) são
--     a MESMA coisa por baixo: uma lista explícita de chaves de candidato
--     travada no momento da criação (escopo_candidatos). Cada lado então
--     só indica votos PROS candidatos desse recorte (votos_criador /
--     votos_desafiado), não uma cédula pronta.
--   - O próprio desafio passa a ser uma cédula com código (campo codigo,
--     mesmo formato/geração de salvamentos.codigo) — antes ele só
--     REFERENCIAVA cédulas de terceiros, agora ele É uma, desde a criação
--     (o lado desafiado "deposita" a resposta dele nela, no aceite).
--
-- Fora do escopo (continua igual à migração 28): pontuação real do duelo
-- na apuração oficial — RANQUEAMENTO.md ainda é rascunho. pontos_criador/
-- pontos_desafiado/vencedor_id continuam null até essa peça existir; a
-- tela mostra "aguarda apuração" (protótipo A3), não calcula nada aqui.

-- ========== 1. Tabela desafios: trocar cédula-inteira por recorte ==========
alter table public.desafios drop constraint if exists desafios_cedula_criador_id_fkey;
alter table public.desafios drop constraint if exists desafios_cedula_desafiado_id_fkey;
alter table public.desafios drop column if exists cedula_criador_id;
alter table public.desafios drop column if exists cedula_desafiado_id;

alter table public.desafios add column if not exists cargo text;
alter table public.desafios add column if not exists codigo text;
-- [{chave, nome, partido}, ...] — travado no momento da criação. Um
-- desafio "cargo inteiro" tem aqui TODOS os candidatos do cargo naquele
-- instante; um "candidatos específicos" tem só os escolhidos. A partir
-- daqui os dois casos são tratados de forma idêntica pelo resto do
-- sistema (pontuação, exibição) — não existe um "tipo" de desafio, só um
-- escopo maior ou menor.
alter table public.desafios add column if not exists escopo_candidatos jsonb;
-- [{chave, votos}, ...] — só pros candidatos do escopo acima. Preenchido
-- na criação (criador) e no aceite (desafiado); antes do aceite,
-- votos_desafiado fica null (é o que a tela mostra como "aguardando
-- resposta").
alter table public.desafios add column if not exists votos_criador jsonb;
alter table public.desafios add column if not exists votos_desafiado jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'desafios_cargo_check') then
    alter table public.desafios
      add constraint desafios_cargo_check check (cargo in ('estadual','federal','senador'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'desafios_codigo_formato') then
    alter table public.desafios
      add constraint desafios_codigo_formato check (codigo ~ '^DS[A-Z0-9]{2}-[A-Z0-9]{4}$');
  end if;
end $$;
create unique index if not exists desafios_codigo_key on public.desafios (codigo) where codigo is not null;

-- Linhas antigas (modelo cédula-inteira, se houver alguma em teste) não
-- têm como preencher cargo/escopo retroativamente — encerra em vez de
-- deixar num limbo que a UI nova não sabe renderizar.
update public.desafios
set status = 'cancelado', respondido_em = now()
where cargo is null and status in ('aguardando', 'selado', 'apuracao');

alter table public.desafios alter column cargo set not null;
alter table public.desafios alter column escopo_candidatos set not null;
alter table public.desafios alter column votos_criador set not null;

-- ========== 2. criar_desafio: recebe escopo + meus votos, não mais cédula ==========
-- p_escopo: [{chave, nome, partido}, ...] — vem do cliente (o mesmo
-- formato de listas_salvas.candidatos, filtrado pro recorte escolhido em
-- "Criar desafio" → Cargo/Candidatos). p_meus_votos: [{chave, votos}, ...]
-- com EXATAMENTE as mesmas chaves de p_escopo — valida aqui, não confia
-- no cliente.
create or replace function public.criar_desafio(
  p_desafiado_id uuid, p_nome text, p_estado text, p_cargo text,
  p_escopo jsonb, p_meus_votos jsonb, p_codigo text
)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gratis int;
  v_custo int := 0;
  v_chaves_escopo text[];
  v_chaves_votos text[];
  v_novo public.desafios;
begin
  if p_desafiado_id = auth.uid() then
    raise exception 'Não dá pra desafiar a própria conta.';
  end if;
  if p_cargo not in ('estadual','federal','senador') then
    raise exception 'Cargo inválido.';
  end if;
  if jsonb_typeof(p_escopo) <> 'array' or jsonb_array_length(p_escopo) < 1 then
    raise exception 'Escolha ao menos 1 candidato.';
  end if;
  if jsonb_array_length(p_escopo) > 200 then
    raise exception 'Recorte grande demais.';
  end if;
  if p_codigo !~ '^DS[A-Z0-9]{2}-[A-Z0-9]{4}$' then
    raise exception 'Código de cédula inválido.';
  end if;

  select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_escopo
  from jsonb_array_elements(p_escopo) elem;
  select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_votos
  from jsonb_array_elements(p_meus_votos) elem;
  if v_chaves_escopo is distinct from v_chaves_votos then
    raise exception 'Os votos não batem com o recorte de candidatos.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_meus_votos) elem
    where not (elem->>'votos' ~ '^[0-9]+$')
  ) then
    raise exception 'Votação inválida.';
  end if;

  v_gratis := public.desafios_gratis_restantes(auth.uid());
  if v_gratis <= 0 then
    if not public.gastar_creditos(auth.uid(), 10, 'gasto_desafio', 'desafio: ' || p_nome) then
      raise exception 'Saldo insuficiente — precisa de 10 SL.';
    end if;
    v_custo := 10;
  end if;

  insert into public.desafios (
    criador_id, desafiado_id, nome, estado, cargo, codigo,
    escopo_candidatos, votos_criador, custo_sl
  )
  values (
    auth.uid(), p_desafiado_id, trim(p_nome), p_estado, p_cargo, p_codigo,
    p_escopo, p_meus_votos, v_custo
  )
  returning * into v_novo;

  perform public.criar_notificacao_interna(
    p_desafiado_id, 'desafio_recebido', '"' || v_novo.nome || '"',
    (select nome from public.perfis where id = auth.uid()) || ' te desafiou.', v_novo.id);
  return v_novo;
end;
$$;
revoke all on function public.criar_desafio(uuid, text, text, text, jsonb, jsonb, text) from public, anon;
grant execute on function public.criar_desafio(uuid, text, text, text, jsonb, jsonb, text) to authenticated;

-- Assinatura antiga (migração 28, cédula-inteira) não existe mais —
-- ninguém deve chamar com o formato velho; se sobrar alguma referência
-- em cache de PostgREST, isto garante um erro claro em vez de ambiguidade
-- entre duas funções de mesmo nome com aridades diferentes.
drop function if exists public.criar_desafio(uuid, text, uuid);

-- ========== 3. aceitar_desafio: recebe meus votos pro MESMO escopo ==========
create or replace function public.aceitar_desafio(p_desafio_id uuid, p_meus_votos jsonb)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
  v_chaves_escopo text[];
  v_chaves_votos text[];
  v_ja_premiado boolean;
  v_premios_dados int;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null or v_d.desafiado_id <> auth.uid() then
    raise exception 'Desafio não encontrado.';
  end if;
  if v_d.status <> 'aguardando' then
    raise exception 'Este desafio não está mais disponível.';
  end if;
  if v_d.expira_em < now() then
    update public.desafios set status = 'expirado', respondido_em = now() where id = v_d.id;
    if v_d.custo_sl > 0 then
      perform public.conceder_creditos_interno(v_d.criador_id, v_d.custo_sl, 'estorno_desafio', 'expirado: ' || v_d.nome);
    end if;
    perform public.criar_notificacao_interna(
      v_d.criador_id, 'desafio_expirado', '"' || v_d.nome || '" expirou',
      case when v_d.custo_sl > 0 then 'Ninguém respondeu em 7 dias — os ' || v_d.custo_sl || ' SL voltaram.' else 'Ninguém respondeu em 7 dias.' end,
      v_d.id);
    raise exception 'Este desafio expirou — peça pro criador desafiar de novo.';
  end if;

  select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_escopo
  from jsonb_array_elements(v_d.escopo_candidatos) elem;
  select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_votos
  from jsonb_array_elements(p_meus_votos) elem;
  if v_chaves_escopo is distinct from v_chaves_votos then
    raise exception 'Os votos não batem com o recorte de candidatos deste desafio.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_meus_votos) elem
    where not (elem->>'votos' ~ '^[0-9]+$')
  ) then
    raise exception 'Votação inválida.';
  end if;

  update public.desafios
  set status = 'selado', votos_desafiado = p_meus_votos, respondido_em = now()
  where id = p_desafio_id
  returning * into v_d;

  select exists(
    select 1 from public.desafios
    where status in ('selado','apuracao','encerrado') and id <> v_d.id
      and ((criador_id = v_d.criador_id and desafiado_id = v_d.desafiado_id)
        or (criador_id = v_d.desafiado_id and desafiado_id = v_d.criador_id))
  ) into v_ja_premiado;

  select count(*) into v_premios_dados
  from public.transacoes_creditos where perfil_id = v_d.criador_id and tipo = 'ganho_desafio';

  if not v_ja_premiado and v_premios_dados < 5 then
    perform public.conceder_creditos_interno(
      v_d.criador_id, 5, 'ganho_desafio', 'aceite de ' || (select nome from public.perfis where id = auth.uid()));
  end if;

  perform public.criar_notificacao_interna(
    v_d.criador_id, 'desafio_aceito', (select nome from public.perfis where id = auth.uid()) || ' aceitou "' || v_d.nome || '"',
    case when not v_ja_premiado and v_premios_dados < 5 then 'A cédula está selada até a apuração — +5 SL.'
         else 'A cédula está selada até a apuração.' end,
    v_d.id);
  return v_d;
end;
$$;
revoke all on function public.aceitar_desafio(uuid, jsonb) from public, anon;
grant execute on function public.aceitar_desafio(uuid, jsonb) to authenticated;
drop function if exists public.aceitar_desafio(uuid, uuid);
