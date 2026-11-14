-- Migração 101 (14/11/2026): eventos que a equipe do gabinete cadastra na Agenda (Gabinete › Administrativo › Agenda).
-- O resto da Agenda (prazos, feriados, comissões, sessões, aniversários das bases) vem de arquivos públicos em
-- dados/painel; aqui fica só o que a equipe registra: compromisso, evento numa base eleitoral, prazo próprio.
-- Mesmas regras do privado do gabinete (migração 100): vê quem é da equipe (gab_le), grava Editor/Responsável
-- (gab_edita); "quem alterou e quando" pelo gatilho gab_carimbo. Tamanho: ~200 bytes por evento; dezenas por mês.
create table if not exists public.gab_agenda (
  id uuid primary key default gen_random_uuid(),
  parlamentar text not null,
  data date not null,
  ate date,
  hora text,
  titulo text not null check (length(titulo) between 1 and 200),
  local text check (local is null or length(local) <= 200),
  municipio text check (municipio is null or length(municipio) <= 80),
  tipo text not null default 'compromisso' check (tipo in ('compromisso','base','prazo','outro')),
  obs text check (obs is null or length(obs) <= 1000),
  dono uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_por uuid,
  atualizado_em timestamptz default now()
);
grant select, insert, update, delete on public.gab_agenda to authenticated;
grant select, insert, update, delete on public.gab_agenda to service_role;
create index if not exists gab_agenda_parl_data on public.gab_agenda (parlamentar, data);
alter table public.gab_agenda enable row level security;

drop trigger if exists gab_agenda_carimbo on public.gab_agenda;
create trigger gab_agenda_carimbo before insert or update on public.gab_agenda for each row execute function public.gab_carimbo();

drop policy if exists gab_agenda_ver on public.gab_agenda;
drop policy if exists gab_agenda_incluir on public.gab_agenda;
drop policy if exists gab_agenda_alterar on public.gab_agenda;
drop policy if exists gab_agenda_apagar on public.gab_agenda;
create policy gab_agenda_ver on public.gab_agenda for select to authenticated using (public.gab_le(parlamentar));
create policy gab_agenda_incluir on public.gab_agenda for insert to authenticated with check (public.gab_edita(parlamentar));
create policy gab_agenda_alterar on public.gab_agenda for update to authenticated using (public.gab_edita(parlamentar)) with check (public.gab_edita(parlamentar));
create policy gab_agenda_apagar on public.gab_agenda for delete to authenticated using (public.gab_edita(parlamentar));
