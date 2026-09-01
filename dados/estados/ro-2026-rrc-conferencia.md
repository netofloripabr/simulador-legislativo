# Conferência contra o RRC oficial — candidatos 2026 RO

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `ro-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **412** confirmados, **0** divergência(s) de partido, **11** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 6 | 7 | 7 |
| Vice-Governador | 6 | 8 | 0 |
| Senador | 10 | 16 | 14 |
| Deputado Federal | 132 | 134 | 130 |
| Deputado Estadual | 260 | 277 | 261 |
| Senador (1º suplente) | 10 | 14 | 0 |
| Senador (2º suplente) | 11 | 14 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 2766 | PATRICK DE LIMA OLIVEIRA MORAES | DC |
| Deputado Federal | 4455 | AMALIA CAMPOS MILANI E SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 2720 | MAGNOLIA SANTOS DE OLIVEIRA | DC |
| Deputado Federal | 2790 | PAULO JORGE SULZBACHER | DC |
| Deputado Estadual | 27364 | EDIVALDO PEDRO DO NASCIMENTO | DC |
| Deputado Estadual | 27321 | ODAIR YAMAMOTO ARAUJO | DC |
| Deputado Estadual | 55544 | RAFAEL ALVES SILVA | PSD |
| Senador (1º suplente) | 555 | ANDERSON DE SOUSA BRITO | GENTE QUE GOSTA DE GENTE |
| Senador (1º suplente) | 144 | CLEIDSON MOURA DA SILVA | MISSÃO |
| Senador (2º suplente) | 144 | MIGUEL CONSTANCE MARTINS | MISSÃO |
| Senador (2º suplente) | 123 | MARIO JORGE SOUZA DE OLIVEIRA | EXPERIÊNCIA, FÉ E AUTORIDADE: RONDÔNIA FORTE DE VERDADE |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Elcirone Moreira Deiró | 44 | 1505-44-uniao-11-pp-retificadora.pdf |
| Vice-Governador | Rodrigo Camargo Ribeiro Pinho | 22 | 1405-pl-executiva.pdf |
| Vice-Governador | Luiz Carlos Teodoro | 13 | 324-pt-pc-do-b-pv-convencao.pdf |
| Vice-Governador | Everton Leoni | 55 | 1738-psd-retificadora.pdf |
| Vice-Governador | Mauro Pereira Dos Santos | 15 | 2244-pdt-executiva.pdf |
| Vice-Governador | Anderson Souza Machado | 40 | 1808-psb-executiva.pdf |
| Senador (1º suplente) | Francisco Carlos Londe Raposo Junior | 100 | 1629-44-uniao-11-pp-executiva.pdf |
| Senador (1º suplente) | Guilherme Augusto De Freitas Teodoro | 222 | 1405-pl-executiva.pdf |
| Senador (1º suplente) | Julio Olivar Benedito | 400 | 1808-psb-executiva.pdf |
| Senador (1º suplente) | Marcelo Lucas Da Silva | 111 | 1505-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Paulo Cesar Pires Andrade | 123 | 465-mdb-retificadora.pdf |
| Senador (1º suplente) | Sandra Maria Barreto De Moraes | 221 | 1405-pl-executiva.pdf |
| Senador (1º suplente) | Raimundo Soares Da Costa | 432 | 1878-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Antonio Masioli | 133 | 1878-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Maria Berenice Alves De Azevedo Da Silva | 400 | 1808-psb-executiva.pdf |
| Senador (2º suplente) | Edinaldo Gonçalves Cardoso | 221 | 1405-pl-executiva.pdf |
| Senador (2º suplente) | Dilceu Fernandes Machado | 222 | 1405-pl-executiva.pdf |
| Senador (2º suplente) | Paulo Nunes Ribeiro | 133 | 1878-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Jonatas Luiz Da Silva Sales | 555 | 1738-psd-retificadora.pdf |
| Senador (2º suplente) | Lázaro Elias Pereira | 432 | 1878-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Marcelo Rodrigues Correia | 100 | 1629-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | Ricardo Lira Maia | 100 | 1938-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | Rodrigo Augusto Macedo Marinho | 111 | 1505-44-uniao-11-pp-retificadora.pdf |

