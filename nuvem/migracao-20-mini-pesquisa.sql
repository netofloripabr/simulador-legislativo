-- Migração 20: mini-pesquisa de cadastro (PROJETO.md, Fase 2.7 — "o plano
-- original do usuário é que compartilhar/grupos só desbloqueiem de verdade
-- depois do cadastro e de uma mini-pesquisa por estado: Presidente/
-- Governador/Senador/Dep. Federal/Dep. Estadual + 2º turno". Nunca tinha
-- sido desenhada nem implementada — desenho fechado com o usuário em
-- 14/08/2026: 5 cargos completos, obrigatória logo depois do cadastro
-- (não só ao tentar compartilhar/entrar em grupo), e SEM efeito retroativo
-- em quem já tinha conta antes desta migração.
--
-- Colunas simples em "perfis" (mesmo padrão de genero/municipio_residencia
-- — dado de opinião da própria pessoa, não sensível como admin/crédito, por
-- isso não precisa da tabela separada sem grant de escrita usada em
-- admins/usuarios_finais/creditos_conta).
-- Colar no SQL Editor do Supabase e rodar uma vez.
alter table public.perfis add column mini_pesquisa_respostas jsonb;
alter table public.perfis add column mini_pesquisa_em timestamptz;

-- Não-retroativo: toda conta que já existe na hora de rodar esta migração
-- é considerada "já respondeu" (grandfathering) — só quem se cadastrar
-- DEPOIS desta linha rodar nasce com mini_pesquisa_em null e cai na tela
-- obrigatória (ver initColaborativo, interface/prospeccao.js).
update public.perfis set mini_pesquisa_em = criado_em where mini_pesquisa_em is null;
