# Conferência contra o RRC oficial — candidatos 2026 BA

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `ba-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **1171** confirmados, **0** divergência(s) de partido, **37** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 7 | 7 |
| Vice-Governador | 7 | 7 | 0 |
| Senador | 10 | 9 | 9 |
| Deputado Federal | 535 | 543 | 528 |
| Deputado Estadual | 643 | 651 | 627 |
| Senador (1º suplente) | 10 | 10 | 0 |
| Senador (2º suplente) | 11 | 9 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Senador | 100 | ANGELO MARIO CORONEL DE AZEVEDO MARTINS | UNIDOS PARA MUDAR A BAHIA |
| Deputado Federal | 7778 | ANALENE FONSECA DE SOUSA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 5528 | ARIANE CARLA DE OLIVEIRA PEREIRA ABDALLA | PSD |
| Deputado Federal | 1820 | CARMEN ELOIZA NASCIMENTO DOS SANTOS | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 7770 | CLEBSON SANTOS SILVA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 1290 | ODAIR JOSÉ DA CRUZ SILVA | PDT |
| Deputado Federal | 4568 | ADEMILTON DE PAULA PAIM | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 4333 | JOSE RAIMUNDO SAMPAIO OLIVEIRA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Federal | 4481 | LESLEY SOUZA CARNEIRO | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 2552 | JOÃO MARCOS LEITE DULTRA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 7725 | SANDRO FERREIRA SOUZA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 1808 | SAVIO DOS SANTOS RIOS | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 1369 | VALDEMIR MEDEIROS DA SILVA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Federal | 1507 | VALTER NILSON PEREIRA DOS SANTOS FILHO | MDB |
| Deputado Estadual | 55255 | ARTUR RIBEIRO BARACHISIO LISBOA | PSD |
| Deputado Estadual | 27993 | CELMA DE MACÊDO | DC |
| Deputado Estadual | 22000 | CINTHYA NUNES FARIA BORGES | PL |
| Deputado Estadual | 15999 | FABIO ALMEIDA DA SILVA | MDB |
| Deputado Estadual | 50222 | JESNÁRIA XAVIER OLIVEIRA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 15117 | DORISVALDO CARDOSO OLIVEIRA JUNIOR | MDB |
| Deputado Estadual | 55321 | JUSMARI TEREZINHA DE SOUZA OLIVEIRA | PSD |
| Deputado Estadual | 15335 | MIRANICE DA SILVA LIMA | MDB |
| Deputado Estadual | 15089 | RAIMUNDO NONATO SANTOS DA SILVA | MDB |
| Deputado Estadual | 22017 | JOSEVALDO VASCONCELOS | PL |
| Deputado Estadual | 15030 | TAIANE NASCIMENTO CAMPOS | MDB |
| Deputado Estadual | 10316 | JAQUELINE ARAÚJO SANTANA | REPUBLICANOS |
| Deputado Estadual | 15013 | UELITON SANTOS DE ALMEIDA | MDB |
| Deputado Estadual | 15322 | RUBERVAL DA SILVA ROCHA | MDB |
| Deputado Estadual | 15070 | ZENILDO ARAGÃO DE SOUZA | MDB |
| Senador (1º suplente) | 800 | ELIENE ALMEIDA SILVA | UP |
| Senador (1º suplente) | 100 | MARCELO DE OLIVEIRA GUIMARÃES FILHO | UNIDOS PARA MUDAR A BAHIA |
| Senador (1º suplente) | 290 | SILVANO ALVES DE SOUZA | PCO |
| Senador (1º suplente) | 222 | SUZANA ALEXANDRE DE CARVALHO RAMOS | UNIDOS PARA MUDAR A BAHIA |
| Senador (2º suplente) | 800 | ARLANIA SAMPAIO GONCALVES | UP |
| Senador (2º suplente) | 100 | EDYLENE LOPES FERREIRA | UNIDOS PARA MUDAR A BAHIA |
| Senador (2º suplente) | 290 | MARIA DO CARMO OLIVEIRA REIS | PCO |
| Senador (2º suplente) | 222 | RODRIGO HAGGE COSTA | UNIDOS PARA MUDAR A BAHIA |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Geraldo Alves Ferreira Junior | 13 | 1679-pt-pc-do-b-pv-retificadora.pdf |
| Vice-Governador | Marilia Regina Santana Dos Santos | 80 | 342-up-convencao.pdf |
| Vice-Governador | Neuzimar Marques Camacam Díaz Morales | 27 | 734-dc-convencao.pdf |
| Vice-Governador | Meire Lúcia Alves Dos Reis | 50 | 456-psol-rede-retificadora.pdf |
| Vice-Governador | Jose Augusto Maciel Torres | 27 | 729-dc-retificadora.pdf |
| Vice-Governador | Zenildo Brandão Santana | 44 | 1583-44-uniao-11-pp-retificadora.pdf |
| Vice-Governador | José Ricardo De Lima Chaves | 29 | 1338-pco-convencao.pdf |
| Senador (1º suplente) | Cinde Fatima De Morais Santos | 277 | 729-dc-retificadora.pdf |
| Senador (1º suplente) | Edvaldo Pereira De Brito | 130 | 1679-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Marcos Leoneli Espinheira | 333 | 906-mobiliza-retificadora.pdf |
| Senador (1º suplente) | Nilo Rosa Dos Santos | 500 | 456-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Ronaldo Carletto | 133 | 1679-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Herzem Costa Rodrigues | 180 | 456-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Maria Aladilce De Souza | 130 | 1679-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Cristina Marques Da Silva | 180 | 456-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Jailma Dantas Gama Alves | 133 | 1679-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Jeovane Marúsia Ribeiro Fernandes | 500 | 456-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Lazaro Souza Leite | 277 | 1574-dc-executiva.pdf |
| Senador (2º suplente) | Lilian Conceição Cardoso | 333 | 906-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Mauro Leme | 277 | 729-dc-retificadora.pdf |

