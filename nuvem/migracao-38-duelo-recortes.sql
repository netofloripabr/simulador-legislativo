-- Migração 38: Duelo 1×1 — tipos de disputa, visibilidade dos votos e o
-- recorte "Eleitos" (protótipo aprovado 30/08/2026). Colar no SQL Editor
-- e rodar UMA vez, depois da migração 37.
--
-- O QUE MUDA:
--   1. tipo_disputa: 'eleitos' | 'cargo' | 'partido' | 'candidato'.
--      Os três últimos são o MESMO mecanismo por baixo (escopo de
--      candidatos + votos indicados) — o tipo fica gravado só pra tela
--      contar a história certa. 'eleitos' é mecânica nova: cada lado
--      monta a composição do plenário cadeira a cadeira (eleitos_criador/
--      eleitos_desafiado), sem números de voto.
--   2. votos_visiveis: o criador decide se o desafiado VÊ os votos dele
--      antes de responder (abertos) ou só depois de selado (ocultos).
--      Segurança de verdade, não só de tela: as colunas de voto perdem o
--      SELECT direto do cliente (revoke por coluna) e passam a sair só
--      pela RPC desafio_detalhe, que mascara quando precisa.
--   3. Pontuação real continua fora do escopo (igual às migrações 28/33):
--      pontos_criador/pontos_desafiado ficam null até a apuração oficial.

-- ========== 1. Colunas novas ==========
alter table public.desafios add column if not exists tipo_disputa text not null default 'cargo';
alter table public.desafios add column if not exists votos_visiveis boolean not null default true;
-- [{chave, nome, partido}, ...] — a composição do plenário de cada lado
-- no recorte 'eleitos' (tamanho = vagas do cargo; o banco valida só a
-- contagem mínima e a unicidade, o número exato de vagas é regra do
-- cliente, que conhece vagasFixasCargo por estado).
alter table public.desafios add column if not exists eleitos_criador jsonb;
alter table public.desafios add column if not exists eleitos_desafiado jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'desafios_tipo_disputa_check') then
    alter table public.desafios
      add constraint desafios_tipo_disputa_check
      check (tipo_disputa in ('eleitos', 'cargo', 'partido', 'candidato'));
  end if;
end $$;

-- ========== 2. Segurança de coluna: voto oculto é oculto DE VERDADE ==========
-- Sem isto, "ocultos" seria só cosmético — qualquer um com a sessão aberta
-- poderia pedir ?select=votos_criador na API. Com o revoke por coluna, o
-- cliente só lê votos/eleitos pela RPC desafio_detalhe (security definer),
-- que decide o que mascarar. listarMeusDesafios passa a selecionar colunas
-- explícitas (sem as de voto) — o hub nunca precisou delas.
revoke select (votos_criador, votos_desafiado, eleitos_criador, eleitos_desafiado)
  on public.desafios from authenticated;

-- ========== 3. desafio_detalhe: a única porta pros votos ==========
-- Devolve o desafio completo pra quem participa dele, mascarando os votos
-- do criador quando o duelo é oculto e ainda está aguardando resposta.
create or replace function public.desafio_detalhe(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_d public.desafios;
  v_json jsonb;
begin
  select * into v_d from public.desafios where id = p_desafio_id;
  if v_d.id is null or (v_d.criador_id <> auth.uid() and v_d.desafiado_id <> auth.uid()) then
    raise exception 'Desafio não encontrado.';
  end if;
  v_json := to_jsonb(v_d)
    || jsonb_build_object(
         'criador', (select jsonb_build_object('nome', nome) from public.perfis where id = v_d.criador_id),
         'desafiado', (select jsonb_build_object('nome', nome) from public.perfis where id = v_d.desafiado_id));
  if not v_d.votos_visiveis and v_d.status = 'aguardando' and auth.uid() = v_d.desafiado_id then
    v_json := v_json - 'votos_criador' - 'eleitos_criador';
  end if;
  return v_json;
end;
$$;
revoke all on function public.desafio_detalhe(uuid) from public, anon;
grant execute on function public.desafio_detalhe(uuid) to authenticated;

-- ========== 4. criar_desafio v3: tipo + visibilidade + eleitos ==========
-- Pro tipo 'eleitos': p_escopo e p_meus_votos chegam como '[]' e
-- p_eleitos traz a composição. Pros outros três tipos, p_eleitos é null e
-- a validação escopo×votos continua idêntica à migração 33.
create or replace function public.criar_desafio(
  p_desafiado_id uuid, p_nome text, p_estado text, p_cargo text,
  p_escopo jsonb, p_meus_votos jsonb, p_codigo text,
  p_tipo text, p_visiveis boolean, p_eleitos jsonb
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
  if p_tipo not in ('eleitos', 'cargo', 'partido', 'candidato') then
    raise exception 'Tipo de disputa inválido.';
  end if;

  if p_tipo = 'eleitos' then
    if p_eleitos is null or jsonb_typeof(p_eleitos) <> 'array' or jsonb_array_length(p_eleitos) < 1 then
      raise exception 'Monte o plenário antes de enviar.';
    end if;
    if (select count(distinct elem->>'chave') from jsonb_array_elements(p_eleitos) elem)
       <> jsonb_array_length(p_eleitos) then
      raise exception 'Tem candidato repetido em mais de uma cadeira.';
    end if;
  else
    if p_eleitos is not null then
      raise exception 'Composição de plenário só vale no tipo eleitos.';
    end if;
    select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_escopo
    from jsonb_array_elements(p_escopo) elem;
    select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_votos
    from jsonb_array_elements(p_meus_votos) elem;
    if v_chaves_escopo is null or v_chaves_escopo is distinct from v_chaves_votos then
      raise exception 'Os votos não batem com o recorte de candidatos.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_meus_votos) elem
      where not (elem->>'votos' ~ '^[0-9]+$')
    ) then
      raise exception 'Votação inválida.';
    end if;
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
    escopo_candidatos, votos_criador, custo_sl,
    tipo_disputa, votos_visiveis, eleitos_criador
  )
  values (
    auth.uid(), p_desafiado_id, trim(p_nome), p_estado, p_cargo, p_codigo,
    coalesce(p_escopo, '[]'::jsonb), coalesce(p_meus_votos, '[]'::jsonb), v_custo,
    p_tipo, coalesce(p_visiveis, true), p_eleitos
  )
  returning * into v_novo;

  perform public.criar_notificacao_interna(
    p_desafiado_id, 'desafio_recebido', '"' || v_novo.nome || '"',
    (select nome from public.perfis where id = auth.uid()) || ' te desafiou.', v_novo.id);
  return v_novo;
end;
$$;
revoke all on function public.criar_desafio(uuid, text, text, text, jsonb, jsonb, text, text, boolean, jsonb) from public, anon;
grant execute on function public.criar_desafio(uuid, text, text, text, jsonb, jsonb, text, text, boolean, jsonb) to authenticated;
-- Assinatura da migração 33 sai de cena — o app novo sempre manda os 10
-- parâmetros; manter as duas geraria ambiguidade no PostgREST.
drop function if exists public.criar_desafio(uuid, text, text, text, jsonb, jsonb, text);

-- ========== 5. aceitar_desafio v3: resposta por votos OU por plenário ==========
create or replace function public.aceitar_desafio(
  p_desafio_id uuid, p_meus_votos jsonb, p_meus_eleitos jsonb
)
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

  if v_d.tipo_disputa = 'eleitos' then
    if p_meus_eleitos is null or jsonb_typeof(p_meus_eleitos) <> 'array'
       or jsonb_array_length(p_meus_eleitos) <> jsonb_array_length(v_d.eleitos_criador) then
      raise exception 'Preencha todas as cadeiras do plenário antes de aceitar.';
    end if;
    if (select count(distinct elem->>'chave') from jsonb_array_elements(p_meus_eleitos) elem)
       <> jsonb_array_length(p_meus_eleitos) then
      raise exception 'Tem candidato repetido em mais de uma cadeira.';
    end if;
    update public.desafios
    set status = 'selado', eleitos_desafiado = p_meus_eleitos, respondido_em = now()
    where id = p_desafio_id
    returning * into v_d;
  else
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
  end if;

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
revoke all on function public.aceitar_desafio(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.aceitar_desafio(uuid, jsonb, jsonb) to authenticated;
drop function if exists public.aceitar_desafio(uuid, jsonb);
