-- ============================================================
-- Migração 52 — recusar_desafio ignora convite aberto (08/09/2026, bug
-- achado pelo usuário 09/09/2026: link "Amigos PL" parou de abrir)
--
-- A migração 48 (convite aberto vira molde reutilizável) atualizou
-- aceitar_desafio pra nunca tocar no molde, mas ESQUECEU recusar_desafio.
-- A tela de aceitar convite (fase "convite") sempre mostra um botão
-- "Rejeitar" que chama recusar_desafio(id) — e pra um link aberto, esse
-- id é o do PRÓPRIO MOLDE (desafiado_id null), não de um clone pessoal.
--
-- O guard antigo tinha um bug de NULL que piorava isso:
--   if v_d.id is null or v_d.desafiado_id <> auth.uid() or ... then raise
-- Em SQL, `null <> auth.uid()` avalia NULL (não TRUE nem FALSE). Um `if`
-- em plpgsql trata NULL como FALSE — a condição inteira vira FALSE (não
-- levanta a exceção) e a função segue pro UPDATE, marcando o MOLDE
-- COMPARTILHADO como 'recusado' — matando o link pra qualquer pessoa
-- que abrisse depois, mesmo quem nunca tinha visto o convite.
--
-- Fix: convite aberto (desafiado_id null) não tem "recusar" de verdade —
-- a pessoa simplesmente não aceita, o molde continua valendo pra quem
-- mais receber o link. A função agora sai sem mexer em nada nesse caso.
-- ============================================================

create or replace function public.recusar_desafio(p_desafio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null or v_d.status <> 'aguardando' then
    raise exception 'Desafio não encontrado ou não pode mais ser recusado.';
  end if;
  if v_d.desafiado_id is null then
    -- Convite aberto (molde) — nada a recusar: a pessoa só não aceita.
    -- O molde continua "aguardando" pra quem mais tiver o link.
    return;
  end if;
  if v_d.desafiado_id <> auth.uid() then
    raise exception 'Desafio não encontrado ou não pode mais ser recusado.';
  end if;
  update public.desafios set status = 'recusado', respondido_em = now() where id = p_desafio_id;
  if v_d.custo_sl > 0 then
    perform public.conceder_creditos_interno(v_d.criador_id, v_d.custo_sl, 'estorno_desafio', 'recusado: ' || v_d.nome);
  end if;
  perform public.criar_notificacao_interna(
    v_d.criador_id, 'desafio_recusado', (select nome from public.perfis where id = auth.uid()) || ' recusou "' || v_d.nome || '"',
    case when v_d.custo_sl > 0 then 'Os ' || v_d.custo_sl || ' SL voltaram pra sua carteira.' else null end, v_d.id);
end;
$$;
revoke all on function public.recusar_desafio(uuid) from public, anon;
grant execute on function public.recusar_desafio(uuid) to authenticated;

-- Recupera o molde que já foi derrubado por esse bug (link "Amigos PL",
-- código DSNT-PAT7, e qualquer outro na mesma situação) — volta a valer.
update public.desafios
set status = 'aguardando', respondido_em = null
where desafiado_id is null and modelo_de is null and status = 'recusado';
