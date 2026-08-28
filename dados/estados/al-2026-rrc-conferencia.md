# Conferência contra o RRC oficial — candidatos 2026 AL

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `al-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **250** confirmados, **0** divergência(s) de partido, **8** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 4 | 4 | 4 |
| Vice-Governador | 4 | 6 | 0 |
| Senador | 7 | 9 | 8 |
| Deputado Federal | 111 | 109 | 101 |
| Deputado Estadual | 139 | 146 | 137 |
| Senador (1º suplente) | 9 | 10 | 0 |
| Senador (2º suplente) | 9 | 11 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 4599 | ANA MARIA PEREIRA HORA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 4577 | CLAUDIO MOREIRA DA SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 7022 | CARLOS GUSTAVO FERNANDES HOLMES BURITI | AVANTE |
| Deputado Federal | 4566 | IVANA FORTES PEIXOTO TOLEDO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 1177 | RILVANIA THIAGO DA SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 45022 | DEBORA EDINEZ FARIAS BISPO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 77892 | GENILDA RAIMUNDO DA SILVA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Senador (2º suplente) | 355 | JEFFERSON GONCALVES DA SILVA | DEMOCRATA |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Célia Maria Barbosa Rocha | 45 | 2077-psdb-cidadania-executiva.pdf |
| Vice-Governador | Jardel Wandson Queiroz Da Cruz | 80 | 232-up-convencao.pdf |
| Vice-Governador | Jaudinete Pontes Da Silva | 35 | 2090-democrata-retificadora.pdf |
| Vice-Governador | Yale Barbosa Fernandes | 15 | 2133-mdb-executiva.pdf |
| Senador (1º suplente) | Adriana Nunes Da Silva | 355 | 2090-democrata-retificadora.pdf |
| Senador (1º suplente) | Arthur Jesse Mendonça De Albuquerque | 100 | 1223-republicanos-convencao.pdf |
| Senador (1º suplente) | Eudocia Maria Holanda De Araujo Caldas | 456 | 2077-psdb-cidadania-executiva.pdf |
| Senador (1º suplente) | Gustavo Dias Henrique | 151 | 2198-mdb-executiva.pdf |
| Senador (1º suplente) | Liliane Pereira Da Silva | 800 | 232-up-convencao.pdf |
| Senador (1º suplente) | Luiz Romero Cavalcante Farias | 111 | 2075-44-uniao-11-pp-executiva.pdf |
| Senador (1º suplente) | Paulo Guilherme Barbosa Leão | 151 | 1100-mdb-convencao.pdf |
| Senador (1º suplente) | Cícero Rafael Tenório Da Silva | 156 | 2198-mdb-executiva.pdf |
| Senador (1º suplente) | Robertson Henrique Santos Freire | 156 | 1100-mdb-convencao.pdf |
| Senador (2º suplente) | Ademir Pereira Cabral | 156 | 1100-mdb-convencao.pdf |
| Senador (2º suplente) | Camila Renatha Paiva Barbosa Torres | 156 | 2198-mdb-executiva.pdf |
| Senador (2º suplente) | Christiane Bulhões Barros Melo Silva | 151 | 2198-mdb-executiva.pdf |
| Senador (2º suplente) | Kamila Miranda Davino | 100 | 1223-republicanos-convencao.pdf |
| Senador (2º suplente) | Gustavo Dantas Feijó | 111 | 2075-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | José Nivaldo Cardozo Mota | 800 | 232-up-convencao.pdf |
| Senador (2º suplente) | Ronaldo Augusto Lessa Santos | 456 | 2077-psdb-cidadania-executiva.pdf |
| Senador (2º suplente) | Sabino Fidelis De Moura | 151 | 1100-mdb-convencao.pdf |

