# Conferência contra o RRC oficial — candidatos 2026 ES

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `es-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **572** confirmados, **0** divergência(s) de partido, **9** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 5 | 6 | 6 |
| Vice-Governador | 5 | 7 | 0 |
| Senador | 11 | 11 | 11 |
| Deputado Federal | 136 | 146 | 141 |
| Deputado Estadual | 410 | 437 | 414 |
| Senador (1º suplente) | 12 | 14 | 0 |
| Senador (2º suplente) | 11 | 13 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 14 | VICTOR RICARDO DE OLIVEIRA | MISSÃO |
| Deputado Federal | 7070 | JOAO BATISTA BARBOSA PINTO | AVANTE |
| Deputado Estadual | 40345 | JOANA RIBEIRO DA SILVA | PSB |
| Deputado Estadual | 40233 | JULIO CESAR DE OLIVEIRA | PSB |
| Deputado Estadual | 40170 | JÚLIO CÉSAR FERRAÇO ANDREÃO | PSB |
| Deputado Estadual | 25000 | VALDEVIR NOGUEIRA NETO | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Senador (1º suplente) | 222 | DIEGO CASSOTTO GOULART | PAZ PRA VIVER UM NOVO TEMPO |
| Senador (1º suplente) | 400 | MARCELO DE SOUZA COELHO | AGORA É O FUTURO |
| Senador (2º suplente) | 400 | MARCELO HENRIQUE FERREIRA | AGORA É O FUTURO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Camillo Augusto Marchezi De Oliveira Neves | 15 | 1912-mdb-retificadora.pdf |
| Vice-Governador | Dionary Sarmento Regis | 80 | 829-up-convencao.pdf |
| Vice-Governador | Eliane Leal Vieira | 10 | 2072-republicanos-executiva.pdf |
| Vice-Governador | Valdirene Bernadino Pires | 13 | 1648-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Bruno Lourenço De Souza | 277 | 1524-dc-executiva.pdf |
| Senador (1º suplente) | Dant Nicchio Sathler | 100 | 2072-republicanos-executiva.pdf |
| Senador (1º suplente) | Pedro José Pagotto | 556 | 2146-psd-retificadora.pdf |
| Senador (1º suplente) | Erico Patricio Orletti | 156 | 1912-mdb-retificadora.pdf |
| Senador (1º suplente) | Evani Dos Santos Reis | 133 | 1648-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Kítia Coimbra Perciano | 300 | 168-novo-convencao.pdf |
| Senador (1º suplente) | Patricia Neitzl Da Silva | 280 | 1959-prtb-executiva.pdf |
| Senador (1º suplente) | Silvia Ligia Suassuna De Vasconcelos | 700 | 504-avante-convencao.pdf |
| Senador (1º suplente) | Antonio Elias Miranda Gomes | 500 | 1601-psol-rede-executiva.pdf |
| Senador (2º suplente) | Rogério Da Silva Resende | 556 | 2146-psd-retificadora.pdf |
| Senador (2º suplente) | Vinícius Fregonazzi Tavares | 300 | 168-novo-convencao.pdf |
| Senador (2º suplente) | Luiz Emanuel Zouain Da Rocha | 100 | 2072-republicanos-executiva.pdf |
| Senador (2º suplente) | Néio Lúcio Fraga Pereira | 133 | 201-pt-pc-do-b-pv-convencao.pdf |
| Senador (2º suplente) | Nerleo Caus De Souza | 222 | 972-pl-executiva.pdf |
| Senador (2º suplente) | Nubia Rocha Dos Passos | 156 | 1912-mdb-retificadora.pdf |
| Senador (2º suplente) | Priscila De Souza Ramos | 277 | 1524-dc-executiva.pdf |
| Senador (2º suplente) | Rodrigo Rodrigues Ferreira | 280 | 1959-prtb-executiva.pdf |
| Senador (2º suplente) | Nilton Ferreira Goes | 700 | 504-avante-convencao.pdf |
| Senador (2º suplente) | Wilson Jesus Lucas Junior | 500 | 1601-psol-rede-executiva.pdf |

