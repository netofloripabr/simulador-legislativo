-- ============================================================
-- Migração 41 — Lembrete de duelo parado (31/08/2026)
-- Decisão do usuário: se o desafiado não aceitar em 3 dias, o
-- DESAFIANTE é lembrado no sino pra reenviar o convite; a validade
-- de 7 dias que já existe (migração 28) segue encerrando o duelo
-- depois disso ("trabalhar inconscientemente a ausência de tempo").
-- Mesmo modelo "preguiçoso" da expiração: a RPC roda quando o
-- criador abre a lista de duelos — o sino só é visto dentro do app,
-- então não precisa de agendador no servidor.
-- ============================================================

-- 1. Carimbo pra não lembrar duas vezes o mesmo duelo
alter table public.desafios add column if not exists lembrete_em timestamptz;

-- 2. Tipo novo de notificação (o check da migração 28 é restritivo)
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'desafio_recebido', 'desafio_aceito', 'desafio_recusado', 'desafio_cancelado',
  'desafio_expirado', 'desafio_lembrete', 'convite_convertido', 'termometro_abriu'
));

-- 3. RPC: lembra o próprio criador dos duelos parados há 3+ dias
create or replace function public.lembrar_meus_desafios_parados()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_d record;
begin
  for v_d in
    select * from public.desafios
    where criador_id = auth.uid()
      and status = 'aguardando'
      and lembrete_em is null
      and criado_em < now() - interval '3 days'
      and expira_em > now()
  loop
    update public.desafios set lembrete_em = now() where id = v_d.id;
    perform public.criar_notificacao_interna(
      auth.uid(), 'desafio_lembrete', '"' || v_d.nome || '" ainda espera um rival',
      'Ninguém aceitou em 3 dias — reenvie o convite. O duelo expira em '
        || to_char(v_d.expira_em at time zone 'America/Sao_Paulo', 'DD/MM') || '.',
      v_d.id);
  end loop;
end;
$$;
grant execute on function public.lembrar_meus_desafios_parados() to authenticated;
