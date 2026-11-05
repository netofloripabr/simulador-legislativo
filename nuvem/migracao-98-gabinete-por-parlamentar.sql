-- Migração 98 (05/11/2026): dados privados do Gabinete separados por parlamentar.
-- Por quê: ao trocar o gabinete vinculado (gab_vinculo) para outro deputado, o painel escondia Controle, Cotas,
-- Indicar e o aviso da LOA 2027 (o código só considerava "próprio" o mandato de Napoleão Bernardes), e as tabelas
-- privadas não diziam de qual parlamentar era cada linha — o controle de um aparecia no outro. Agora cada linha tem
-- `parlamentar` (número de urna 2026). As linhas que já existem são do gabinete de Napoleão Bernardes (55777).
-- Um gatilho preenche `parlamentar` com o gabinete vinculado à conta quando a tela não manda (inserções antigas).
-- Capacidade: 1 coluna em 4 tabelas (~400 linhas), sem dado novo.

alter table public.gab_recursos add column if not exists parlamentar text;
alter table public.gab_demandas add column if not exists parlamentar text;
alter table public.gab_listas   add column if not exists parlamentar text;
alter table public.gab_itens    add column if not exists parlamentar text;
update public.gab_recursos set parlamentar = '55777' where parlamentar is null;
update public.gab_demandas set parlamentar = '55777' where parlamentar is null;
update public.gab_listas   set parlamentar = '55777' where parlamentar is null;
update public.gab_itens    set parlamentar = '55777' where parlamentar is null;
create index if not exists gab_recursos_parl on public.gab_recursos (dono, parlamentar);
create index if not exists gab_listas_parl on public.gab_listas (dono, parlamentar);

create or replace function public.gab_poe_parlamentar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parlamentar is null then
    select v.parlamentar into new.parlamentar from public.gab_vinculo v where v.dono = new.dono;
  end if;
  return new;
end $$;
revoke all on function public.gab_poe_parlamentar() from public, anon, authenticated;
drop trigger if exists gab_recursos_parl on public.gab_recursos;
create trigger gab_recursos_parl before insert on public.gab_recursos for each row execute function public.gab_poe_parlamentar();
drop trigger if exists gab_demandas_parl on public.gab_demandas;
create trigger gab_demandas_parl before insert on public.gab_demandas for each row execute function public.gab_poe_parlamentar();
drop trigger if exists gab_listas_parl on public.gab_listas;
create trigger gab_listas_parl before insert on public.gab_listas for each row execute function public.gab_poe_parlamentar();
drop trigger if exists gab_itens_parl on public.gab_itens;
create trigger gab_itens_parl before insert on public.gab_itens for each row execute function public.gab_poe_parlamentar();
