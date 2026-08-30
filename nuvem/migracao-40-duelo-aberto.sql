-- Migração 40: DUELO ABERTO — desafiar quem ainda NÃO está no jogo
-- (pedido do usuário 30/08/2026: a função principal do Duelo 1×1 é
-- justamente trazer gente nova; exigir o código de quem já tem conta
-- invertia o funil). Colar no SQL Editor e rodar UMA vez, depois da 39.
--
-- Como funciona: o duelo pode nascer SEM desafiado (desafiado_id null).
-- O criador recebe um link com o código do duelo (?duelo=DSXX-XXXX) pra
-- mandar no WhatsApp; quem clicar cria a conta e cai direto na tela de
-- aceitar — o aceite "reivindica" o duelo (grava desafiado_id).

-- ========== 1. desafiado_id vira opcional ==========
alter table public.desafios alter column desafiado_id drop not null;

-- ========== 2. desafio_por_codigo: resolve o link do convite ==========
-- Só devolve duelos AGUARDANDO que estão abertos (sem desafiado) ou já
-- endereçados ao próprio chamador — nunca expõe duelo alheio.
create or replace function public.desafio_por_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_d public.desafios;
begin
  select * into v_d from public.desafios
  where codigo = upper(trim(p_codigo)) and status = 'aguardando'
    and (desafiado_id is null or desafiado_id = auth.uid());
  if v_d.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_d.id, 'nome', v_d.nome, 'estado', v_d.estado, 'cargo', v_d.cargo,
    'tipo_disputa', v_d.tipo_disputa,
    'criador_nome', (select nome from public.perfis where id = v_d.criador_id),
    'sou_o_criador', v_d.criador_id = auth.uid());
end;
$$;
revoke all on function public.desafio_por_codigo(text) from public, anon;
grant execute on function public.desafio_por_codigo(text) to authenticated;

-- ========== 3. criar_desafio aceita p_desafiado_id null (duelo aberto) ==========
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
  if p_desafiado_id is not null and p_desafiado_id = auth.uid() then
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

  if p_desafiado_id is not null then
    perform public.criar_notificacao_interna(
      p_desafiado_id, 'desafio_recebido', '"' || v_novo.nome || '"',
      (select nome from public.perfis where id = auth.uid()) || ' te desafiou.', v_novo.id);
  end if;
  return v_novo;
end;
$$;

-- ========== 4. aceitar_desafio reivindica o duelo aberto ==========
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
  -- Duelo aberto: qualquer conta (menos o criador) pode reivindicar.
  if v_d.id is null
     or (v_d.desafiado_id is not null and v_d.desafiado_id <> auth.uid())
     or v_d.criador_id = auth.uid() then
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
    set status = 'selado', desafiado_id = auth.uid(), eleitos_desafiado = p_meus_eleitos, respondido_em = now()
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
    set status = 'selado', desafiado_id = auth.uid(), votos_desafiado = p_meus_votos, respondido_em = now()
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

-- ========== 5. desafio_detalhe: duelo aberto é visível pra quem tem o link ==========
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
  if v_d.id is null
     or (v_d.criador_id <> auth.uid()
         and v_d.desafiado_id is distinct from auth.uid()
         and not (v_d.desafiado_id is null and v_d.status = 'aguardando')) then
    raise exception 'Desafio não encontrado.';
  end if;
  v_json := to_jsonb(v_d)
    || jsonb_build_object(
         'criador', (select jsonb_build_object('nome', nome) from public.perfis where id = v_d.criador_id),
         'desafiado', (select jsonb_build_object('nome', nome) from public.perfis where id = v_d.desafiado_id));
  if not v_d.votos_visiveis and v_d.status = 'aguardando' and auth.uid() <> v_d.criador_id then
    v_json := v_json - 'votos_criador' - 'eleitos_criador';
  end if;
  return v_json;
end;
$$;
