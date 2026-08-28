# Conferência contra o RRC oficial — candidatos 2026 MS

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `ms-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **391** confirmados, **0** divergência(s) de partido, **8** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 8 | 8 |
| Vice-Governador | 9 | 11 | 0 |
| Senador | 10 | 10 | 10 |
| Deputado Federal | 122 | 128 | 121 |
| Deputado Estadual | 252 | 276 | 252 |
| Senador (1º suplente) | 11 | 13 | 0 |
| Senador (2º suplente) | 10 | 14 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 50 | KAELLY VIRGINIA DE OLIVEIRA SARAIVA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 7011 | FRANCISCO DE SA | AVANTE |
| Deputado Federal | 1401 | GERMANO LIMA RODRIGUES CAIRES | MISSÃO |
| Deputado Federal | 1467 | LUCAS VENDITE MACEDO | MISSÃO |
| Deputado Estadual | 44710 | ELIEZER MOLAS RODRIGUES | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 50651 | FABIANO DUARTE DA SILVA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 70770 | RODRIGO JUNIOR DE MORAIS RODRIGUES | AVANTE |
| Deputado Estadual | 15774 | VALDIR ELIAS MARIANO | MDB |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Antonio João Coimbra Jacintho | 30 | 1113-novo-convencao.pdf |
| Vice-Governador | José Carlos Barbosa | 11 | 717-44-uniao-11-pp-convencao.pdf |
| Vice-Governador | Gilda Maria Gomes Dos Santos | 13 | 503-pt-pc-do-b-pv-retificadora.pdf |
| Vice-Governador | Mariliana Santos Da Silva | 25 | 1798-25-prd-77-solidariedade-executiva.pdf |
| Vice-Governador | Roberto Oscar Patzlaff | 27 | 2089-dc-executiva.pdf |
| Vice-Governador | Silvia Benites | 29 | 1417-pco-convencao.pdf |
| Vice-Governador | Valdenir Aparecido Duarte | 36 | 148-agir-convencao.pdf |
| Senador (1º suplente) | Alessandro Garcia | 365 | 148-agir-convencao.pdf |
| Senador (1º suplente) | Augusto Raimundo Alessio | 300 | 1113-novo-convencao.pdf |
| Senador (1º suplente) | Bruno Nascimento Migueis | 400 | 103-psb-convencao.pdf |
| Senador (1º suplente) | Cláudio George Mendonça | 221 | 717-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Elizangela Tiago Da Maia | 500 | 283-psol-rede-convencao.pdf |
| Senador (1º suplente) | André Da Costa Maciel | 277 | 2089-dc-executiva.pdf |
| Senador (1º suplente) | Luciano Lemes | 290 | 1417-pco-convencao.pdf |
| Senador (1º suplente) | Nelson Trad Filho | 222 | 542-pl-convencao.pdf |
| Senador (1º suplente) | Valdevino Perroni | 258 | 1326-25-prd-77-solidariedade-convencao.pdf |
| Senador (1º suplente) | Maria Aparecida Diogo | 133 | 503-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Roberto Oscar Patzlaff | 277 | 791-dc-convencao.pdf |
| Senador (2º suplente) | Aldeci Teixeira Dos Santos | 277 | 791-dc-convencao.pdf |
| Senador (2º suplente) | Adamário De Lana Gerling Júnior | 258 | 1798-25-prd-77-solidariedade-executiva.pdf |
| Senador (2º suplente) | Felipe Mattos De Lima Ribeiro | 222 | 542-pl-convencao.pdf |
| Senador (2º suplente) | Geana Fernanda De Mesquita Da Rosa | 400 | 1048-psb-executiva.pdf |
| Senador (2º suplente) | Italivio Coelho Neto | 300 | 1906-novo-executiva.pdf |
| Senador (2º suplente) | Francisca Kátia Bastos Pereira | 500 | 283-psol-rede-convencao.pdf |
| Senador (2º suplente) | Luciano Medeiros Barbosa Rodrigues | 221 | 542-pl-convencao.pdf |
| Senador (2º suplente) | Luciene Ramos Da Silva | 365 | 148-agir-convencao.pdf |
| Senador (2º suplente) | Maria José De Jesus Alves Cordeiro | 133 | 503-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Thiago De Carvalho Assad | 290 | 1417-pco-convencao.pdf |

