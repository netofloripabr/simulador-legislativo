# Conferência contra o RRC oficial — candidatos 2026 PB

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `pb-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **415** confirmados, **0** divergência(s) de partido, **13** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 6 | 7 | 7 |
| Vice-Governador | 6 | 7 | 0 |
| Senador | 10 | 12 | 12 |
| Deputado Federal | 188 | 199 | 189 |
| Deputado Estadual | 211 | 217 | 207 |
| Senador (1º suplente) | 11 | 12 | 0 |
| Senador (2º suplente) | 12 | 12 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 1217 | ALLANA RODRIGUES CIRILO | PDT |
| Deputado Federal | 7020 | JOSÉ CRISTIANO DOS SANTOS | AVANTE |
| Deputado Federal | 2900 | LATIFI ABOU HAIKAL | PCO |
| Deputado Federal | 7788 | HENILTON FERREIRA MAIA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 22789 | MARCOS ALEXANDRE DE OLIVEIRA LIMA SOBREIRA | PL |
| Deputado Estadual | 12247 | ELAINE KARLA FERNANDES CARDOSO DOS SANTOS | PDT |
| Deputado Estadual | 12247 | EVILLIANE LINS TENÓRIO | PDT |
| Deputado Estadual | 11500 | JAKELINE MARIA DA SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 22287 | SAULO PORTO DE OLIVEIRA | PL |
| Senador (1º suplente) | 272 | ELIÚ ANTENOR NICACIO DA SILVA | DC |
| Senador (2º suplente) | 290 | OZANARA DE SOUZA E SILVA | PCO |
| Senador (2º suplente) | 155 | PAULO ROBERTO VANDERLEI REBELLO FILHO | JUNTOS PARA A PARAÍBA DAR O PRÓXIMO PASSO |
| Senador (2º suplente) | 400 | ROBERTO FRANCA GADELHA | COLIGAÇÃO DAQUI PRA MELHOR |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Maria Do Carmo Lourenço | 80 | 571-up-convencao.pdf |
| Vice-Governador | Diogo Oliveira Cunha Lima | 15 | 1662-mdb-retificadora.pdf |
| Vice-Governador | Lenilda Pereira Da Silva | 27 | 1888-dc-retificadora.pdf |
| Vice-Governador | Ana Ligia Costa Feliciano | 11 | 1754-44-uniao-11-pp-executiva.pdf |
| Vice-Governador | Marcos José Da Silva Lima | 29 | 1385-pco-convencao.pdf |
| Vice-Governador | Nayana Pontes Pereira Gomes | 22 | 965-pl-retificadora.pdf |
| Senador (1º suplente) | Antonio Carlos Alves Pereira | 290 | 1385-pco-convencao.pdf |
| Senador (1º suplente) | Flavia Carolina Rocha Morais | 222 | 1792-pl-executiva.pdf |
| Senador (1º suplente) | Francisco Mendes Campos | 400 | 1800-psb-retificadora.pdf |
| Senador (1º suplente) | Maria Da Conceição De Brito Dantas | 800 | 571-up-convencao.pdf |
| Senador (1º suplente) | Daniella Velloso Borges Ribeiro | 100 | 1491-republicanos-retificadora.pdf |
| Senador (1º suplente) | Flávio Cassanello Amaral | 222 | 1083-pl-executiva.pdf |
| Senador (1º suplente) | Ivonete Almeida De Andrade Ludgério | 151 | 1662-mdb-retificadora.pdf |
| Senador (1º suplente) | Maria Janine Assis De Lucena Barros | 155 | 1662-mdb-retificadora.pdf |
| Senador (1º suplente) | José Carneiro De Carvalho Neto | 300 | 1058-novo-executiva.pdf |
| Senador (1º suplente) | Josiane Soares Da Silva Santos | 801 | 571-up-convencao.pdf |
| Senador (2º suplente) | Francisco De Assis Alves Freire | 151 | 1662-mdb-retificadora.pdf |
| Senador (2º suplente) | Bruno Souto Martins | 801 | 571-up-convencao.pdf |
| Senador (2º suplente) | Flavia Carolina Rocha Morais | 222 | 1083-pl-executiva.pdf |
| Senador (2º suplente) | Emir Candeia Gurjão | 222 | 1792-pl-executiva.pdf |
| Senador (2º suplente) | Jamaika Suênia Da Silva Oliveira | 272 | 1888-dc-retificadora.pdf |
| Senador (2º suplente) | João Cavalcanti Filho | 151 | 1979-mdb-executiva.pdf |
| Senador (2º suplente) | Laylla Michele Dos Santos Silva | 800 | 571-up-convencao.pdf |
| Senador (2º suplente) | Jader Medeiros Clementino Junior | 300 | 1058-novo-executiva.pdf |
| Senador (2º suplente) | Renato Costa Feliciano | 100 | 1462-44-uniao-11-pp-retificadora.pdf |

