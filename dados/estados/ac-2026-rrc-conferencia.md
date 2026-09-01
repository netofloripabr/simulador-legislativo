# Conferência contra o RRC oficial — candidatos 2026 AC

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `ac-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **373** confirmados, **0** divergência(s) de partido, **3** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 6 | 6 | 6 |
| Vice-Governador | 6 | 7 | 0 |
| Senador | 8 | 8 | 8 |
| Deputado Federal | 102 | 111 | 105 |
| Deputado Estadual | 246 | 261 | 254 |
| Senador (1º suplente) | 9 | 10 | 0 |
| Senador (2º suplente) | 10 | 11 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 7745 | ANDREIA NASCIMENTO DE LIMA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Senador (1º suplente) | 222 | JEBERT WILLYANS CAVALCANTE NASCIMENTO | AVANÇA ACRE |
| Senador (1º suplente) | 555 | MARFIZA DE LIMA GALVÃO | TRABALHO DA ESPERANÇA |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Daniela Paiva De Oliveira | 36 | 1508-agir-retificadora.pdf |
| Vice-Governador | Jéssica Rojas Sales | 11 | 2212-44-uniao-11-pp-retificadora.pdf |
| Vice-Governador | Cesar Augusto Felix Da Silva | 21 | 720-pcb-convencao.pdf |
| Vice-Governador | Fábio Ricardo Leite | 10 | 477-republicanos-retificadora.pdf |
| Vice-Governador | Adonis Francisco De Almeida Souza | 45 | 2210-psdb-cidadania-retificadora.pdf |
| Vice-Governador | Maria Do Perpétuo Socorro Rodrigues De Souza | 40 | 398-psb-convencao.pdf |
| Senador (1º suplente) | Beatriz Barroso Pardo De Cameli | 111 | 2212-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Arnobio Marques De Almeida Junior | 131 | 1718-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Francisco Ubiracy Machado De Vasconcelos | 131 | 1863-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Raimundo Nonato Moreira Da Silva | 100 | 477-republicanos-retificadora.pdf |
| Senador (1º suplente) | Rejane Holanda De Velloso Vianna | 777 | 2227-25-prd-77-solidariedade-retificadora.pdf |
| Senador (1º suplente) | Soleane De Souza Brasil Manchineri | 500 | 2207-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Benedito Walter Damasceno | 277 | 617-dc-retificadora.pdf |
| Senador (2º suplente) | Debora Nunes Da Silva | 111 | 2212-44-uniao-11-pp-retificadora.pdf |
| Senador (2º suplente) | Carla Ivane De Britto | 131 | 1863-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Fábio De Castro Barbosa | 777 | 2165-25-prd-77-solidariedade-executiva.pdf |
| Senador (2º suplente) | Janaina Silva De Almeida Queiroz | 500 | 2207-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Livio Veras | 222 | 941-pl-convencao.pdf |
| Senador (2º suplente) | Francisco Jose Moreira Neto | 100 | 477-republicanos-retificadora.pdf |
| Senador (2º suplente) | Raimundo Moreira Noleto | 277 | 617-dc-retificadora.pdf |
| Senador (2º suplente) | Solino De Matos Filho | 555 | 868-psd-retificadora.pdf |

