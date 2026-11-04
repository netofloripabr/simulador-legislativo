-- Migração 94 (04/11/2026) · A estrutura da Casa: chave estável por servidor no arquivo público
-- Por quê: dados/painel/estrutura-casa.json é público (GitHub Pages) e não leva nome nem matrícula. Até aqui o admin
-- via o nome casando lotação + bruto do contracheque, o que falha quando várias pessoas da mesma unidade recebem o
-- mesmo bruto (teto constitucional na Consultoria, Casa Militar) ou quando o bruto não veio na leitura do portal:
-- nomes apareciam em uma abertura e não em outra, ou na linha errada. Agora cada pessoa vai no arquivo com uma
-- chave = HMAC-SHA256(matrícula, segredo), 16 hex. O segredo fica só aqui (tabela sem acesso pela API) e na pasta
-- local fora do git (ferramentas/diario/_cache/segredo-estrutura); sem ele não dá para voltar da chave à matrícula.
-- Capacidade: 1 linha nova; a função lê adm_servidores (~3 mil linhas) por chamada do admin, sem cron.

create table if not exists public.adm_segredos (
  k text primary key,
  v text not null
);
alter table public.adm_segredos enable row level security;   -- sem política: nenhum papel da API lê
revoke all on public.adm_segredos from anon, authenticated;
grant select, insert, update, delete on public.adm_segredos to service_role;

insert into public.adm_segredos (k, v)
values ('estrutura_casa', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (k) do nothing;

-- nomes das chaves pedidas (só administrador)
create or replace function public.adm_estrutura_nomes(p_chaves text[])
returns table (chave text, matricula integer, nome text)
language plpgsql security definer set search_path = public, extensions
as $$
declare s text;
begin
  if not public.gab_pode() then return; end if;
  select v into s from public.adm_segredos where k = 'estrutura_casa';
  return query
    select x.ch, x.matricula, x.nome from (
      select substr(encode(extensions.hmac(a.matricula::text, s, 'sha256'), 'hex'), 1, 16) as ch, a.matricula, a.nome
      from public.adm_servidores a) x
    where x.ch = any(p_chaves);
end $$;
revoke all on function public.adm_estrutura_nomes(text[]) from public, anon;
grant execute on function public.adm_estrutura_nomes(text[]) to authenticated;
