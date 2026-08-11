-- Migração 13: adiciona CEP (+ município/UF resolvidos automaticamente a
-- partir dele via ViaCEP, ver interface/prospeccao.js) e gênero ao perfil.
-- Colar no SQL Editor do Supabase e rodar uma vez.
--
-- Pedido do usuário em 11/08/2026: essas informações vão alimentar os
-- futuros painéis de perfil de usuário e as pesquisas eleitorais (ver
-- PROJETO.md). Coletado tanto no Cadastro normal quanto na etapa de
-- completar perfil de quem entra pelo Google — é obrigatório nos dois.
alter table public.perfis add column if not exists cep text;
alter table public.perfis add column if not exists municipio_residencia text;
alter table public.perfis add column if not exists uf_residencia text;
alter table public.perfis add column if not exists genero text;
