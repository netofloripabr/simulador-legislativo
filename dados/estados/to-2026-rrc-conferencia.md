# Conferência contra o RRC oficial — candidatos 2026 TO

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `to-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **322** confirmados, **0** divergência(s) de partido, **15** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 7 | 7 |
| Vice-Governador | 7 | 9 | 0 |
| Senador | 13 | 14 | 13 |
| Deputado Federal | 98 | 100 | 97 |
| Deputado Estadual | 207 | 222 | 205 |
| Senador (1º suplente) | 13 | 14 | 0 |
| Senador (2º suplente) | 14 | 13 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 35 | JAIR MEDEIRO DA CUNHA | DEMOCRATA |
| Senador | 303 | NILTON RODRIGUES DOS SANTOS | NOVO |
| Deputado Federal | 5000 | NILMA FERREIRA DE SOUSA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 20777 | HO-CHE-MIN SILVA DE VIEIRA | PODE |
| Deputado Estadual | 25111 | SILVANEY RABELO DA ROCHA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 30333 | THAISLA AMARO RESPLANDES | NOVO |
| Deputado Estadual | 45222 | VANI ALBINO DE CASTRO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 11190 | VIVIANE MAGALHÃES | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Senador (1º suplente) | 277 | ADEVAR JUNIOR BRAGA | DC |
| Senador (1º suplente) | 500 | DAYANA HERMANO SILVA VIEIRA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Senador (1º suplente) | 100 | SUELISMAR CAETANO FERREIRA | REPUBLICANOS |
| Senador (2º suplente) | 500 | ARENALDO GOMES FERREIRA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Senador (2º suplente) | 303 | EGLISON ABADE DOS SANTOS | NOVO |
| Senador (2º suplente) | 100 | ELSON RIBEIRO DOS SANTOS | REPUBLICANOS |
| Senador (2º suplente) | 351 | VANDA RODRIGUES DE CARVALHO PROPERCIO | DEMOCRATA |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Amélio Cayres De Almeida | 45 | 2138-psdb-cidadania-retificadora.pdf |
| Vice-Governador | Atos Gomes De Araújo | 44 | 536-44-uniao-11-pp-convencao.pdf |
| Vice-Governador | Julio Manoel Da Silva Neto | 55 | 2246-psd-retificadora.pdf |
| Vice-Governador | Maria Lúcia Soares Viana | 50 | 1789-psol-rede-retificadora.pdf |
| Vice-Governador | Rosileia Dias Carneiro | 30 | 1107-novo-convencao.pdf |
| Vice-Governador | Silvino Vitor Peres De Santana | 27 | 2073-dc-retificadora.pdf |
| Senador (1º suplente) | Giane Oliveira Da Silva | 180 | 1789-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Igor Danin Tokarski | 153 | 1620-mdb-retificadora.pdf |
| Senador (1º suplente) | Jair Correa Junior | 200 | 588-pode-convencao.pdf |
| Senador (1º suplente) | Muniz Araújo Pereira | 444 | 536-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Luiz Osvaldo Pastore | 222 | 438-pl-convencao.pdf |
| Senador (1º suplente) | Antonio Savio Barbalho Do Nascimento | 133 | 2163-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Sheyla Gonçalves Da Costa Moura | 303 | 1807-novo-executiva.pdf |
| Senador (1º suplente) | Sergio Vieira Marques | 202 | 588-pode-convencao.pdf |
| Senador (1º suplente) | Jose Humberto Alves Timóteo Júnior | 351 | 1871-democrata-retificadora.pdf |
| Senador (1º suplente) | Zuleica Silva Negri | 355 | 1871-democrata-retificadora.pdf |
| Senador (2º suplente) | Adalberto Brito Nunes | 180 | 1789-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Aluisio Gregorio Motta Junior | 444 | 536-44-uniao-11-pp-convencao.pdf |
| Senador (2º suplente) | Antonia Lopes Gonçalves | 202 | 588-pode-convencao.pdf |
| Senador (2º suplente) | Daniel Walison De Jesus Sousa | 200 | 588-pode-convencao.pdf |
| Senador (2º suplente) | Deusivete Sousa Dos Santos | 180 | 448-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Lusinete Bispo Araujo | 222 | 438-pl-convencao.pdf |
| Senador (2º suplente) | Marizangela Da Silva Carneiro Neto | 133 | 2163-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Marinalva Souza Duque | 355 | 1871-democrata-retificadora.pdf |
| Senador (2º suplente) | Nerivaldo Rosa De Araujo | 277 | 2073-dc-retificadora.pdf |
| Senador (2º suplente) | Thiago Simas Moura | 153 | 1620-mdb-retificadora.pdf |

