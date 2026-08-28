# Conferência contra o RRC oficial — candidatos 2026 RS

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `rs-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **1015** confirmados, **0** divergência(s) de partido, **12** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 7 | 7 |
| Vice-Governador | 7 | 9 | 0 |
| Senador | 13 | 13 | 13 |
| Deputado Federal | 457 | 473 | 457 |
| Deputado Estadual | 541 | 556 | 538 |
| Senador (1º suplente) | 13 | 15 | 0 |
| Senador (2º suplente) | 13 | 18 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 7785 | ARLINDO FERNANDO DA SILVA MENCA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 4500 | DANIEL TRZECIAK DUARTE | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 1590 | JOSE ORLANDO RODOLFO DOS SANTOS | MDB |
| Deputado Federal | 2004 | RENAN MACHADO DE LIMA | PODE |
| Deputado Estadual | 45459 | ALEXANDRE DELMAR BRAUN DOS PASSOS | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23023 | ROBERT BROCCA PERES | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 45745 | FABIO AUGUSTO AVILA DA SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 45657 | NEY VALDIR REICHOW BANDEIRA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23320 | DANILO DE PAULA GONCALVES | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 45005 | PAULO ROBERTO DA ROSA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Senador (1º suplente) | 234 | PAULO CESAR COITINHO DOS SANTOS | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Senador (2º suplente) | 290 | ABRAO RAFAEL SPRITZER | PCO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Adão Alberto Teixeira Lima | 16 | 759-pstu-convencao.pdf |
| Vice-Governador | Claudio Castanheira Diaz | 45 | 1939-psdb-cidadania-retificadora.pdf |
| Vice-Governador | Joao Edegar Pretto | 12 | 1051-pdt-retificadora.pdf |
| Vice-Governador | Ernani Polo | 15 | 1613-mdb-retificadora.pdf |
| Vice-Governador | Naftaly Pereira Do Nascimento | 80 | 390-up-convencao.pdf |
| Vice-Governador | Silvana Maria Franciscatto Covatti | 22 | 570-44-uniao-11-pp-convencao.pdf |
| Vice-Governador | Tiago Nilo | 29 | 1367-pco-convencao.pdf |
| Senador (1º suplente) | Aitana Godoy Da Costa | 160 | 759-pstu-convencao.pdf |
| Senador (1º suplente) | José Paulo Dornelles Cairoli | 151 | 1613-mdb-retificadora.pdf |
| Senador (1º suplente) | Claudiane Maria Campelo Lopes | 808 | 496-up-executiva.pdf |
| Senador (1º suplente) | Denior José Machado | 161 | 759-pstu-convencao.pdf |
| Senador (1º suplente) | Domingos Alessandretti | 290 | 1367-pco-convencao.pdf |
| Senador (1º suplente) | Enio Alves Bordoni | 800 | 496-up-executiva.pdf |
| Senador (1º suplente) | Henrique Fontana Junior | 500 | 428-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Ireneu Orth | 222 | 1115-pl-executiva.pdf |
| Senador (1º suplente) | Josilene Da Silva Martins | 455 | 1939-psdb-cidadania-retificadora.pdf |
| Senador (1º suplente) | Paula Cristina Ioris De Oliveira | 555 | 818-psd-convencao.pdf |
| Senador (1º suplente) | Sérgio Bergonsi Turra | 300 | 570-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Carlos Eduardo Vieira Da Cunha | 131 | 1051-pdt-retificadora.pdf |
| Senador (2º suplente) | Adelar Cansi | 161 | 759-pstu-convencao.pdf |
| Senador (2º suplente) | Anna Beatriz Santos Pires Da Silva | 555 | 818-psd-convencao.pdf |
| Senador (2º suplente) | Antonio Carlos Hohlfeldt | 151 | 1613-mdb-retificadora.pdf |
| Senador (2º suplente) | Cleiton Elias Niesciur | 234 | 1939-psdb-cidadania-retificadora.pdf |
| Senador (2º suplente) | Débora Cristina De Campos Bernardes | 808 | 496-up-executiva.pdf |
| Senador (2º suplente) | Dulce Maria Marques Lopes | 455 | 1939-psdb-cidadania-retificadora.pdf |
| Senador (2º suplente) | Ernani Mário Coelho Mello | 222 | 700-pl-retificadora.pdf |
| Senador (2º suplente) | Lucas Caregnato | 500 | 428-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Marcela Cristina Andrade De Azevedo | 160 | 759-pstu-convencao.pdf |
| Senador (2º suplente) | Fernanda Vecchi Pegorini | 800 | 496-up-executiva.pdf |
| Senador (2º suplente) | Ricardo Munarski Jobim | 300 | 1115-pl-executiva.pdf |
| Senador (2º suplente) | Tamyres Francis Carvalho Filgueira | 131 | 428-pt-pc-do-b-pv-retificadora.pdf |

