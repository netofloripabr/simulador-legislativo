# Conferência contra o RRC oficial — candidatos 2026 SC

Gerado em 2026-08-26 por `ferramentas/conferir_rrc.py`. Cruza `sc-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **660** confirmados, **0** divergência(s) de partido, **15** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 10 | 9 |
| Vice-Governador | 8 | 11 | 1 |
| Senador | 13 | 15 | 14 |
| Deputado Federal | 231 | 242 | 227 |
| Deputado Estadual | 409 | 435 | 405 |
| Senador (1º suplente) | 13 | 19 | 2 |
| Senador (2º suplente) | 13 | 15 | 2 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 55 | CARLOS ALBERTO CHIODINI | SANTA CATARINA ACIMA DE TUDO |
| Senador | 155 | ANTIDIO ALEIXO LUNELLI | SANTA CATARINA ACIMA DE TUDO |
| Deputado Federal | 4033 | ALAN ALVES MOREIRA | PSB |
| Deputado Federal | 7777 | CLEBER LUCIANO SANTANA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 5533 | EDIANE APARECIDA FOLLE | PSD |
| Deputado Federal | 1414 | FELIPE BARCELLOS MONTE RASO | MISSÃO |
| Deputado Federal | 7767 | GLENDA CATIUSSALA CABRERA DA SILVA BONI | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 7020 | SADI MIGUEL RIBEIRO | AVANTE |
| Deputado Estadual | 55100 | DIEGO MACHADO | PSD |
| Deputado Estadual | 15180 | INAJARA RODRIGUES DOS SANTOS | MDB |
| Deputado Estadual | 77773 | JANAINA SABINO MEDEIROS | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 25123 | JOAO BATISTA DA SILVA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 45888 | KARINY NAIARA MULLER BRUM | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 20316 | LUCAS ALVES DE MELLO ROSA | PODE |
| Deputado Estadual | 55007 | NEURI LUIZ MANTELLI | PSD |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Adriano Bornschein Silva | 22 | 680-pl-convencao.pdf |
| Vice-Governador | Angela Albino | 40 | 1148-psb-retificadora.pdf |
| Vice-Governador | Carlos Alberto Souza Bordin | 25 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Vice-Governador | Flávio Ferreira Amaral | 29 | 2099-pco-retificadora.pdf |
| Vice-Governador | Nathália Tarses Gomes De Melo | 80 | 189-up-convencao.pdf |
| Vice-Governador | Tatiane Pasdiora | 16 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Adriana Alves Da Silva | 808 | 189-up-convencao.pdf |
| Senador (1º suplente) | Camila Guimaraes Moreira Zimmer | 250 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Senador (1º suplente) | Clenilton Carlos Pereira | 155 | 769-44-união-11-pp-convencao.pdf |
| Senador (1º suplente) | Domingos Luiz Prestes | 290 | 2099-pco-retificadora.pdf |
| Senador (1º suplente) | Elaine Cristina Huber | 133 | 1235-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Geraldo Wetzel Neto | 221 | 1533-agir-executiva.pdf |
| Senador (1º suplente) | Jaqueline Almeida Camargo | 800 | 189-up-convencao.pdf |
| Senador (1º suplente) | Jocemir Adenilson De Souza | 160 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Marcos Becker | 161 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Rafael Caleffi | 222 | 680-pl-convencao.pdf |
| Senador (1º suplente) | Volnei Weber | 111 | 1683-44-união-11-pp-executiva.pdf |
| Senador (2º suplente) | Adriana Farias Pereira | 160 | 347-pstu-convencao.pdf |
| Senador (2º suplente) | Andrey Otavio Tomazi | 221 | 680-pl-convencao.pdf |
| Senador (2º suplente) | Balduino Rodrigues Ferreira | 222 | 680-pl-convencao.pdf |
| Senador (2º suplente) | Aparecida Da Silva | 500 | 1748-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Eni José Voltolini | 111 | 1683-44-união-11-pp-executiva.pdf |
| Senador (2º suplente) | Fernanda Klitzke | 133 | 1235-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Genesio Moises Spillere | 155 | 769-44-união-11-pp-convencao.pdf |
| Senador (2º suplente) | Gilberto Silveira Dos Santos | 290 | 2099-pco-retificadora.pdf |
| Senador (2º suplente) | Jeann Souza Lisboa | 250 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Senador (2º suplente) | Jorge Luiz Adão | 800 | 189-up-convencao.pdf |
| Senador (2º suplente) | Jacson Da Silva Dos Santos | 808 | 189-up-convencao.pdf |
| Senador (2º suplente) | Wagner Luiz Betto | 161 | 347-pstu-convencao.pdf |

