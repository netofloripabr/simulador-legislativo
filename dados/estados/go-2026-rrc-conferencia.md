# Conferência contra o RRC oficial — candidatos 2026 GO

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `go-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **857** confirmados, **0** divergência(s) de partido, **25** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 6 | 6 | 6 |
| Vice-Governador | 6 | 9 | 0 |
| Senador | 11 | 11 | 10 |
| Deputado Federal | 261 | 266 | 257 |
| Deputado Estadual | 591 | 613 | 584 |
| Senador (1º suplente) | 12 | 14 | 0 |
| Senador (2º suplente) | 11 | 12 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Senador | 155 | ZACARIAS CALIL HAMU | MDB |
| Deputado Federal | 2512 | ADEMIR AFONSO AMADOR | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 1292 | ALESSANDRA CARMO SOARES DOS SANTOS | PDT |
| Deputado Federal | 1593 | LOUIZA RAMIRO DA COSTA | MDB |
| Deputado Federal | 2502 | LORRAYNE FERREIRA DE PAULA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 1488 | MÔNICA DE PAULA RODRIGUES FERREIRA | MISSÃO |
| Deputado Federal | 1199 | VALDIRENE FERREIRA DO NASCIMENTO | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 2577 | WASHINGTON OSMUNDO ALVES | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 13113 | ALESSANDRO MENDONÇA CABRAL | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 13700 | ANA CAROLINE CARMO DA SILVA NUNES | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 27300 | DINAIR BERNARDO PEREIRA | DC |
| Deputado Estadual | 44322 | ANA CARLA ALVES DA SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 50777 | ENIO BRITO DE SA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 25145 | MICHELE DINIZ BELTRÃO | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 20001 | THUMILLA BATISTA DE CARVALHO | PODE |
| Deputado Estadual | 13180 | ALANMAIM ROBSON DE ORIAS OLIVEIRA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 10128 | PATRICIA PEREIRA SANTIAGO | REPUBLICANOS |
| Deputado Estadual | 45625 | PEDRO HENRIQUE DE OLIVEIRA ARAÚJO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23200 | ROSA MARIA SILVA DE OLIVEIRA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 13678 | MARIA ROSALINA DA SILVA PAULA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 15555 | LORENA JARDIM MARQUES | MDB |
| Deputado Estadual | 15029 | SEBASTIANA DONIZETE DE FREITAS | MDB |
| Senador (1º suplente) | 400 | VICTOR HENRIQUE DUTRA SANTOS | GOIÁS PODE MAIS |
| Senador (2º suplente) | 500 | PAULO HENRIQUE ROCHIFILD RODRIGUES PEREIRA | GOIÁS PODE MAIS |
| Senador (2º suplente) | 227 | TEOBALDO DE QUEIROZ GOMES | GOIAS QUE CRESCE |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Ana Paula De Araujo Rezende Machado Craveiro | 22 | 1627-pl-retificadora.pdf |
| Vice-Governador | Carlos Gomes Cavalcante Mundim | 13 | 1750-pdt-retificadora.pdf |
| Vice-Governador | Caymmi Henrique Cardoso | 80 | 2191-up-retificadora.pdf |
| Vice-Governador | Jacqueline Freitas Nascimento Zaiden | 45 | 1758-psdb-cidadania-retificadora.pdf |
| Vice-Governador | Luiz Carlos Do Carmo | 15 | 1103-mdb-convencao.pdf |
| Vice-Governador | Maria Joana Ribeiro Da Silva | 29 | 2135-pco-retificadora.pdf |
| Senador (1º suplente) | Alexandre Baldy De Sant Anna Braga | 444 | 1387-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Augusto Cardoso De Oliveira | 800 | 2191-up-retificadora.pdf |
| Senador (1º suplente) | Carlos Cardoso De Oliveira Filho | 251 | 1247-25-prd-77-solidariedade-convencao.pdf |
| Senador (1º suplente) | Darlene Costa Azevedo Araújo | 234 | 1758-psdb-cidadania-retificadora.pdf |
| Senador (1º suplente) | Fernando Isaac Borges De Faria | 500 | 1254-pdt-retificadora.pdf |
| Senador (1º suplente) | Leonardo Cairo Rizzo | 222 | 1627-pl-retificadora.pdf |
| Senador (1º suplente) | Milton José Das Mercêz | 456 | 1758-psdb-cidadania-retificadora.pdf |
| Senador (1º suplente) | Pedro Pinheiro Chaves | 555 | 970-psd-convencao.pdf |
| Senador (1º suplente) | Telemaco Brandão | 227 | 1627-pl-retificadora.pdf |
| Senador (1º suplente) | Thales José Jayme | 155 | 1103-mdb-convencao.pdf |
| Senador (2º suplente) | Maria Da Conceição Alves | 155 | 1103-mdb-convencao.pdf |
| Senador (2º suplente) | Allan Pereira Cardoso | 251 | 1247-25-prd-77-solidariedade-convencao.pdf |
| Senador (2º suplente) | Emerson Alves De Lima | 222 | 1627-pl-retificadora.pdf |
| Senador (2º suplente) | Manoel Castro De Arantes | 444 | 1387-44-uniao-11-pp-retificadora.pdf |
| Senador (2º suplente) | Hermes Traldi Neto | 456 | 1758-psdb-cidadania-retificadora.pdf |
| Senador (2º suplente) | Luiz Otavio Do Nascimento | 234 | 1758-psdb-cidadania-retificadora.pdf |
| Senador (2º suplente) | Patrick De Noronha | 400 | 1678-psol-rede-executiva.pdf |
| Senador (2º suplente) | Samir Hajjar | 555 | 970-psd-convencao.pdf |
| Senador (2º suplente) | Victor Barbo De Siqueira | 800 | 2191-up-retificadora.pdf |

