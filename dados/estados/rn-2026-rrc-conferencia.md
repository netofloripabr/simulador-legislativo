# Conferência contra o RRC oficial — candidatos 2026 RN

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `rn-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **283** confirmados, **0** divergência(s) de partido, **8** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 9 | 9 | 9 |
| Vice-Governador | 9 | 11 | 0 |
| Senador | 14 | 14 | 14 |
| Deputado Federal | 111 | 114 | 109 |
| Deputado Estadual | 153 | 154 | 151 |
| Senador (1º suplente) | 14 | 15 | 0 |
| Senador (2º suplente) | 15 | 17 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 13 | LARISSA DANIELA ESCOSSIA ROSADO | TIME QUE CUIDA |
| Vice-Governador | 50 | LENY MACIEL GRILO | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 4508 | ALEXSANDSON SILVA DO NASCIMENTO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 7717 | DEBORAH SUELLEN CABRAL DE FREITAS | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 45321 | ANTONIO JUSCICLEITON SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 45454 | ENGRACIA ALVES DE OLIVEIRA NETA DA SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Senador (1º suplente) | 800 | ELEIDE CRISTIANA DOS SANTOS | UP |
| Senador (2º suplente) | 800 | LUCICLEIDE FERREIRA DA SILVA LUCAS | UP |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Andre Gustavo Medeiros De Oliveira | 29 | 1978-pco-retificadora.pdf |
| Vice-Governador | Anteomar Pereira Da Silva | 22 | 376-pl-convencao.pdf |
| Vice-Governador | Fernanda Lourena Pereira Soares | 16 | 560-pstu-convencao.pdf |
| Vice-Governador | Francisco De Assis Da Costa Dias | 80 | 544-up-convencao.pdf |
| Vice-Governador | Hermano Da Costa Moraes | 44 | 294-mdb-convencao.pdf |
| Vice-Governador | Júlio César Neves | 27 | 1157-dc-convencao.pdf |
| Vice-Governador | Maria Socorro Batista De Macedo | 36 | 857-agir-convencao.pdf |
| Senador (1º suplente) | Danniel Alexandre Ferreira De Morais | 500 | 1832-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Aldair De Lucena Da Silva | 369 | 857-agir-convencao.pdf |
| Senador (1º suplente) | Jean Paul Terra Prates | 123 | 533-pdt-retificadora.pdf |
| Senador (1º suplente) | José Ananias Neto | 360 | 857-agir-convencao.pdf |
| Senador (1º suplente) | Kelly Jane Pinheiro Teixeira | 161 | 560-pstu-convencao.pdf |
| Senador (1º suplente) | Anne Kelly Valentim Mendes | 200 | 337-pode-convencao.pdf |
| Senador (1º suplente) | Marcos Solano Vale | 444 | 128-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Modesto Cornelio Batista Neto | 501 | 1832-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Nazareno De Deus Godeiro | 166 | 560-pstu-convencao.pdf |
| Senador (1º suplente) | Joaquim Luiz De Araujo Neto | 555 | 70-republicanos-convencao.pdf |
| Senador (1º suplente) | Glisiany Pluvia De Oliveira | 131 | 281-pt-pc-do-b-pv-convencao.pdf |
| Senador (1º suplente) | Valério Djalma Cavalcanti Marinho | 222 | 376-pl-convencao.pdf |
| Senador (1º suplente) | Wilka Nóbrega Batista Souza | 277 | 1157-dc-convencao.pdf |
| Senador (2º suplente) | Allain Patrick Ferreira Xavier | 277 | 1157-dc-convencao.pdf |
| Senador (2º suplente) | Marijara Luz Ribeiro Chaves | 444 | 128-44-uniao-11-pp-convencao.pdf |
| Senador (2º suplente) | Francisco Erivaldo Da Costa | 360 | 857-agir-convencao.pdf |
| Senador (2º suplente) | Gabriela Xavier Da Silveira Palma Fagundes | 222 | 376-pl-convencao.pdf |
| Senador (2º suplente) | João Batista Nascimento Da Silva | 123 | 533-pdt-retificadora.pdf |
| Senador (2º suplente) | José Josimar Henrique Da Silva | 166 | 560-pstu-convencao.pdf |
| Senador (2º suplente) | Márcio Roberto Gomes De Souza | 161 | 560-pstu-convencao.pdf |
| Senador (2º suplente) | Milena Galvão Ferreira De Souza | 200 | 337-pode-convencao.pdf |
| Senador (2º suplente) | Odete Maria De Araujo Silva Lopes | 555 | 128-44-uniao-11-pp-convencao.pdf |
| Senador (2º suplente) | Oswaldo Gomes Correa Negrao | 131 | 281-pt-pc-do-b-pv-convencao.pdf |
| Senador (2º suplente) | Priscila Dutra Da Costa | 369 | 857-agir-convencao.pdf |
| Senador (2º suplente) | Santino Arruda Silva | 501 | 1832-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Wesley De Lima Caetano | 500 | 1832-psol-rede-retificadora.pdf |

