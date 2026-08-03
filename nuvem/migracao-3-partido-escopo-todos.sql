-- Migração adicional (rodar depois das migrações 1 e 2, no mesmo SQL Editor):
-- antes, só dava pra escolher "meu partido" entre os 13 que elegeram alguém
-- em 2022. Agora que a lista de candidatos cobre os 27 partidos, o cadastro
-- deixa escolher qualquer um deles como escopo.
alter table public.perfis drop constraint if exists perfis_partido_escopo_check;
alter table public.perfis add constraint perfis_partido_escopo_check check (
  (escopo = 'assembleia' and partido_escopo is null)
  or (escopo = 'partido' and partido_escopo in (
    'PL','MDB','PT','PSD','Podemos','União Brasil','PP','PSDB','Republicanos',
    'PTB','PSOL','Novo','PDT','PSB','Patriota','Solidariedade','DC','PSC',
    'Cidadania','PCdoB','Avante','PRTB','Rede','PROS','PSTU','PV','PCO'
  ))
);
