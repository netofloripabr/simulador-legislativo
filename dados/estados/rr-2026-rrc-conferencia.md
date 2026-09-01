# Conferência contra o RRC oficial — candidatos 2026 RR

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `rr-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **381** confirmados, **0** divergência(s) de partido, **9** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 5 | 5 | 5 |
| Vice-Governador | 5 | 7 | 0 |
| Senador | 13 | 14 | 14 |
| Deputado Federal | 108 | 123 | 111 |
| Deputado Estadual | 243 | 273 | 251 |
| Senador (1º suplente) | 14 | 20 | 0 |
| Senador (2º suplente) | 15 | 21 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 10 | SHÉRIDAN  ESTÉRFANY OLIVEIRA RAMOS | RORAIMA SEGUE EM FRENTE |
| Deputado Federal | 5057 | LARISSA CRISTINA DE SOUZA VIEIRA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 2728 | LENILDO MEDEIROS DO NASCIMENTO | DC |
| Deputado Federal | 2010 | NILMARA SUELY DA SILVA MELO | PODE |
| Deputado Federal | 1299 | EVANDRO ARAGAO BRUNO | PDT |
| Deputado Estadual | 11123 | ADAM HARISSON SILVA DE FRANCA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 12122 | THIAGO TORREIAS DALL AGNOL | PDT |
| Deputado Estadual | 13513 | YASMIN NASCIMENTO CESAR | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Senador (2º suplente) | 456 | EDINALDO DE SOUSA BARREIRA | RORAIMA MAIS FORTE |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | José Gregório Rodrigues Pereira | 29 | 1399-pco-convencao.pdf |
| Vice-Governador | Haroldo Alves Campos | 22 | 1160-pl-executiva.pdf |
| Vice-Governador | Lucia Alberto | 50 | 773-psol-rede-convencao.pdf |
| Vice-Governador | Maria Natalia Sousa Cipriano | 77 | 1605-25-prd-77-solidariedade-retificadora.pdf |
| Senador (1º suplente) | Diogo Montel Da Silva | 505 | 1099-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Idinaldo Cardoso Da Silva | 300 | 1186-novo-executiva.pdf |
| Senador (1º suplente) | Erislan Thiago Lucena Costa | 433 | 1686-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Fernanda Macedo Marques | 700 | 888-avante-convencao.pdf |
| Senador (1º suplente) | Flávio Pércio Zacher | 155 | 1397-mdb-executiva.pdf |
| Senador (1º suplente) | Gilmar Moraes Lira | 277 | 454-dc-convencao.pdf |
| Senador (1º suplente) | Isamar Pessoa Ramalho Junior | 444 | 2000-44-uniao-11-pp-executiva.pdf |
| Senador (1º suplente) | Leônidas Silva Morais | 456 | 2123-psdb-cidadania-retificadora.pdf |
| Senador (1º suplente) | Lincoln Almeida Freire | 500 | 1099-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Pedro Arthur Ferreira Rodrigues | 400 | 2046-psb-retificadora.pdf |
| Senador (1º suplente) | Raimundo Nonato Gonçalves Silva | 222 | 263-pl-convencao.pdf |
| Senador (1º suplente) | Velton Quincozes Poleto | 227 | 263-pl-convencao.pdf |
| Senador (1º suplente) | Tânia Soares De Souza | 555 | 2107-psd-retificadora.pdf |
| Senador (2º suplente) | José Alfredo Bezerra | 277 | 454-dc-convencao.pdf |
| Senador (2º suplente) | Cairon Rodrigo Corrêa Marques | 700 | 1806-avante-executiva.pdf |
| Senador (2º suplente) | Carla Jordanna Aparecida Rodrigues Meneses | 400 | 835-psb-retificadora.pdf |
| Senador (2º suplente) | Edjane Cardoso Almeida | 222 | 263-pl-convencao.pdf |
| Senador (2º suplente) | Edson Roberto Da Costa | 433 | 1686-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Eliete Da Silva Quadros | 500 | 1099-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Isaac Montel Da Silva | 505 | 1099-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Michele Marques Gutierrez | 227 | 263-pl-convencao.pdf |
| Senador (2º suplente) | Ilma De Araújo Xaud | 155 | 1397-mdb-executiva.pdf |
| Senador (2º suplente) | Ronaldo De Souza Damasceno | 444 | 2000-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | Simone Andrade Queiroz | 555 | 2107-psd-retificadora.pdf |
| Senador (2º suplente) | Jose Luiz Zago | 300 | 1186-novo-executiva.pdf |

