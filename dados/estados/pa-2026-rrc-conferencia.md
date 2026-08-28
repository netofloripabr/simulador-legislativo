# Conferência contra o RRC oficial — candidatos 2026 PA

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `pa-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **699** confirmados, **0** divergência(s) de partido, **15** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 8 | 7 |
| Vice-Governador | 7 | 11 | 0 |
| Senador | 13 | 14 | 14 |
| Deputado Federal | 264 | 275 | 272 |
| Deputado Estadual | 413 | 441 | 406 |
| Senador (1º suplente) | 12 | 15 | 0 |
| Senador (2º suplente) | 13 | 16 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 3017 | APARECIDA SILVA RÊGO | NOVO |
| Deputado Federal | 1155 | RUTH MARILIA NOGUEIRA DE MELLO | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 2322 | TAMAR LIMA MONTEIRO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 15155 | HELIZEIDI DE SOUSA COELHO | MDB |
| Deputado Estadual | 44077 | DEBORAH MAIA CRESPO | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 11100 | ELKI SILVA DA SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 30163 | IRISMAR BARBOSA MATIAS | NOVO |
| Deputado Estadual | 20107 | JOEL PANTOJA CARNEIRO | PODE |
| Deputado Estadual | 30033 | LOURIVAL LOPES DA SILVA | NOVO |
| Deputado Estadual | 30111 | MACIEL FARIAS DA LUZ | NOVO |
| Deputado Estadual | 15456 | MARTINHO ARNALDO CAMPOS CARMONA | MDB |
| Deputado Estadual | 23456 | NENDER MESSIAS DE CASTRO BATISTA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 20202 | ANA PAULA OLIVEIRA BEZERRA | PODE |
| Deputado Estadual | 15163 | VALMIR CLIMACO DE AGUIAR | MDB |
| Senador (2º suplente) | 222 | ALESSANDRA SOUZA PAREIRA | PL |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Dirceu Ten Caten Pies | 15 | 1746-mdb-retificadora.pdf |
| Vice-Governador | Ellayne Cristina Gurgel De Almeida | 20 | 1443-pode-executiva.pdf |
| Vice-Governador | Maria De Fatima Santana Da Silva | 50 | 1760-psol-rede-retificadora.pdf |
| Vice-Governador | Karen Suellen Lobato De Sousa | 80 | 587-up-convencao.pdf |
| Vice-Governador | Ruth Helena Ferreira Reis | 35 | 1815-democrata-executiva.pdf |
| Vice-Governador | Wellingta Josyane Siqueira Macedo | 16 | 699-pstu-convencao.pdf |
| Senador (1º suplente) | Alex Lima Santos | 222 | 1464-pl-retificadora.pdf |
| Senador (1º suplente) | Tarcizio Burin | 200 | 1128-pode-convencao.pdf |
| Senador (1º suplente) | Telmo Lima Marinho | 333 | 1822-mobiliza-retificadora.pdf |
| Senador (1º suplente) | Ian Blois Pinheiro | 777 | 2215-25-prd-77-solidariedade-retificadora.pdf |
| Senador (1º suplente) | Italo De Almeida Macola Junior | 123 | 213-pdt-convencao.pdf |
| Senador (1º suplente) | Jader Fontenelle Barbalho | 151 | 1746-mdb-retificadora.pdf |
| Senador (1º suplente) | Joel Carvalho Lobato | 444 | 1165-44-uniao-11-pp-executiva.pdf |
| Senador (1º suplente) | Maria Luisa Ferreira Farias | 500 | 1760-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Naide Cordeiro Pacheco | 505 | 1760-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Ruth Helena Ferreira Reis | 355 | 1710-democrata-executiva.pdf |
| Senador (1º suplente) | Sandro Reis De Oliveira | 277 | 1958-dc-executiva.pdf |
| Senador (1º suplente) | Maria Do Socorro Bayma Silva | 800 | 587-up-convencao.pdf |
| Senador (2º suplente) | Edna Filomena Costa Gouvêa | 505 | 1834-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Joana Santos Mota | 500 | 1834-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Joaquim Duarte Cordeiro | 777 | 2215-25-prd-77-solidariedade-retificadora.pdf |
| Senador (2º suplente) | Lucilene De Oliveira | 800 | 587-up-convencao.pdf |
| Senador (2º suplente) | Marcilio Fernandes Ferreira | 277 | 1958-dc-executiva.pdf |
| Senador (2º suplente) | Jari Ednei Teixeira | 123 | 213-pdt-convencao.pdf |
| Senador (2º suplente) | Nelson Antonio Barbosa Margalho | 355 | 1815-democrata-executiva.pdf |
| Senador (2º suplente) | Ibanes Taveira Da Silva | 444 | 1769-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | Fenelon Lima Sobrinho | 200 | 1128-pode-convencao.pdf |
| Senador (2º suplente) | Roseli Do Socorro Amaral Malcher | 333 | 1822-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Samuel Camara | 151 | 1746-mdb-retificadora.pdf |

