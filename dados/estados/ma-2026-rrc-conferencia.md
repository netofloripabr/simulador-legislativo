# Conferência contra o RRC oficial — candidatos 2026 MA

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `ma-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **577** confirmados, **0** divergência(s) de partido, **9** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 9 | 9 |
| Vice-Governador | 8 | 6 | 0 |
| Senador | 11 | 11 | 11 |
| Deputado Federal | 272 | 283 | 274 |
| Deputado Estadual | 283 | 295 | 283 |
| Senador (1º suplente) | 11 | 12 | 0 |
| Senador (2º suplente) | 11 | 11 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 15 | EDIVALDO DE HOLANDA BRAGA JUNIOR | AVANÇO POR TODO MARANHÃO |
| Vice-Governador | 14 | CARLOS EDUARDO SOUSA AGUIAR | MISSÃO |
| Deputado Federal | 7778 | HORMANN SCHNNEYDER ALMEIDA DA SILVA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 7071 | ANTONILDES MEDEIROS MOTA GOMES | AVANTE |
| Deputado Federal | 5022 | JOSÉ DE ARIMATEA E SILVA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 15180 | SAMANTHA DE CASSIA FERNANDES DE CASTRO | MDB |
| Deputado Estadual | 22122 | JULIO CESAR DE SOUZA MATOS FILHO | PL |
| Deputado Estadual | 70123 | MARIA DA CONCEICAO RODRIGUES BELFORT | AVANTE |
| Senador (2º suplente) | 151 | MARIA CAROLINA DUAILIBE BARROS GOMES | AVANÇO POR TODO MARANHÃO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Bartolomeu Moreira | 21 | 445-pcb-convencao.pdf |
| Vice-Governador | Charlieth Maciel Viana Barros | 29 | 1354-pco-convencao.pdf |
| Vice-Governador | Elaine Cortez Carneiro | 55 | 1590-psd-retificadora.pdf |
| Vice-Governador | Josias Cardoso Silva | 28 | 1972-prtb-executiva.pdf |
| Vice-Governador | Luciana Costa Correa | 16 | 1116-pstu-retificadora.pdf |
| Vice-Governador | Ricardo Rodrigues De Matos | 13 | 1896-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Alderico Jefferson Abreu Da Silva Campos | 123 | 320-pdt-convencao.pdf |
| Senador (1º suplente) | Antonio Roberto Dos Santos | 160 | 1116-pstu-retificadora.pdf |
| Senador (1º suplente) | Miguel Daladier Barros | 222 | 608-pl-retificadora.pdf |
| Senador (1º suplente) | Ester Alves Soares | 333 | 1525-mobiliza-retificadora.pdf |
| Senador (1º suplente) | Fernando Antônio Brito Fialho | 111 | 1178-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Fernando Antonio Vicente Dos Santos | 277 | 2108-dc-retificadora.pdf |
| Senador (1º suplente) | Jose Pereira Barbosa | 212 | 445-pcb-convencao.pdf |
| Senador (1º suplente) | Joslene Silva Rodrigues | 133 | 1896-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Maurício Baggio Rizzi | 300 | 1669-novo-executiva.pdf |
| Senador (1º suplente) | Valberlene Lopes Dias Santos | 151 | 1101-mdb-executiva.pdf |
| Senador (1º suplente) | Valdeny Barros | 500 | 1119-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Cícero Célio Da Silva | 277 | 2108-dc-retificadora.pdf |
| Senador (2º suplente) | Carla Fernanda Do Rego Gonçalo | 333 | 1525-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Francisco Santos Soares | 300 | 1669-novo-executiva.pdf |
| Senador (2º suplente) | Hivina Carvalho Brito | 212 | 445-pcb-convencao.pdf |
| Senador (2º suplente) | Kelly Cristina Santos Silva | 500 | 1119-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Osmar Walcacer De Oliveira Filho | 160 | 1116-pstu-retificadora.pdf |
| Senador (2º suplente) | Patrícia Carlos De Sousa Macieira | 133 | 1896-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Renan Waynne Rego Reis | 123 | 543-pdt-executiva.pdf |
| Senador (2º suplente) | Deniskley Abreu Barbosa | 111 | 1178-44-uniao-11-pp-convencao.pdf |
| Senador (2º suplente) | Josè Carlos Gabriel | 222 | 608-pl-retificadora.pdf |

