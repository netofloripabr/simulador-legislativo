-- Migração adicional (rodar no SQL Editor, depois das anteriores): adiciona
-- o controle de CPF (guardado só como hash, nunca em texto puro — ver
-- PROJETO.md) e o registro de aceite da LGPD no cadastro.
alter table public.perfis add column if not exists cpf_hash text;
alter table public.perfis add column if not exists lgpd_aceite_em timestamptz;

-- unique = é isso que impede duas contas com o mesmo CPF
create unique index if not exists perfis_cpf_hash_key on public.perfis (cpf_hash);

notify pgrst, 'reload schema';
