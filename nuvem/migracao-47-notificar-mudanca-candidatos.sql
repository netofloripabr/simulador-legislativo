-- Migração 47: notificação obrigatória de mudança no elenco de candidatos
-- (04/09/2026 — achado do usuário: 2 candidatos do PDT foram incluídos em
-- SC sem ele saber. O histórico do repositório mostra dezenas de commits
-- alterando dados/estados/*.js ao longo de semanas — via atas/RRC do TSE
-- — sem nenhum aviso além da mensagem do commit, que ninguém checa no
-- dia a dia. Esta função broadcasta uma notificação real (a mesma central
-- que já existe, sino no topo) pra TODOS os admins sempre que o elenco
-- muda: candidato incluído, alterado (partido/número/status) ou excluído.
--
-- Quem chama: qualquer sessão/rotina que edite dados/estados/*.js DEVE
-- chamar esta função antes de considerar a mudança pronta (regra em
-- CLAUDE.md, seção "Mudança no elenco de candidatos"). Não é automático
-- (os arquivos são estáticos, editados fora do banco) — é uma disciplina
-- de processo, apoiada por uma notificação real em vez de depender de
-- alguém ler o commit. Só admin pode chamar (gate explícito, mesmo padrão
-- das outras funções administrativas).
create or replace function public.admin_notificar_mudanca_candidatos(
  p_uf text, p_resumo text, p_detalhe text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  for v_admin in select perfil_id from public.admins loop
    perform public.criar_notificacao_interna(
      v_admin.perfil_id,
      'mudanca_candidato',
      'Elenco de ' || p_uf || ' foi alterado',
      p_resumo || coalesce(' — ' || p_detalhe, '')
    );
  end loop;
end;
$$;
revoke all on function public.admin_notificar_mudanca_candidatos(text, text, text) from public, anon;
grant execute on function public.admin_notificar_mudanca_candidatos(text, text, text) to authenticated;

notify pgrst, 'reload schema';
