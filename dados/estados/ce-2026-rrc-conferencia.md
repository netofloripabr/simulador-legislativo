# Conferência contra o RRC oficial — candidatos 2026 CE

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `ce-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **746** confirmados, **0** divergência(s) de partido, **10** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 9 | 11 | 11 |
| Vice-Governador | 9 | 10 | 0 |
| Senador | 8 | 9 | 9 |
| Deputado Federal | 293 | 327 | 317 |
| Deputado Estadual | 374 | 426 | 409 |
| Senador (1º suplente) | 8 | 8 | 0 |
| Senador (2º suplente) | 8 | 8 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 14 | FELIPE SILVA MOREIRA | MISSÃO |
| Deputado Federal | 2999 | AURENI VIEIRA DA SILVA | PCO |
| Deputado Federal | 3050 | FRANCISCO IAGO SOUSA SILVA | NOVO |
| Deputado Estadual | 22223 | FRANCISCO DAVID VASCONCELOS CARNEIRO | PL |
| Deputado Estadual | 30007 | EVILASIO INACIO DA SILVA | NOVO |
| Deputado Estadual | 43143 | GERSON AUGUSTO PEREIRA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 30222 | NÁDIA WLÁDINA LOPES DA SILVA | NOVO |
| Deputado Estadual | 30111 | ORIEL MOTA FILHO | NOVO |
| Deputado Estadual | 30123 | RAIMUNDO RODRIGUES DA ROCHA | NOVO |
| Deputado Estadual | 30330 | KEROLLEYNNE DHENNYFER MARTINS MAGALHÃES | NOVO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Amilton Alves Gomes | 30 | 1984-novo-executiva.pdf |
| Vice-Governador | Catherine Morais Teles | 80 | 399-up-retificadora.pdf |
| Vice-Governador | Francisco Eryck De Souza Veloso | 35 | 1901-democrata-executiva.pdf |
| Vice-Governador | Gabriella Pequeno Costa Gomes De Aguiar | 13 | 1194-pt-pc-do-b-pv-executiva.pdf |
| Vice-Governador | Maria Ivonete Ferreira Félix | 16 | 763-pstu-convencao.pdf |
| Vice-Governador | Laerte Silva De Melo | 29 | 1311-pco-convencao.pdf |
| Vice-Governador | Roberto Claudio Rodrigues Bezerra | 45 | 663-44-uniao-11-pp-retificadora.pdf |
| Vice-Governador | Vera Lúcia Da Silva | 30 | 989-novo-executiva.pdf |
| Senador (1º suplente) | Francisco Das Chagas Cipriano Vieira | 180 | 1167-pdt-executiva.pdf |
| Senador (1º suplente) | Verônica Do Amaral Madeiro Batista | 300 | 989-novo-executiva.pdf |
| Senador (1º suplente) | Emanuel Antonio Menezes Pereira | 800 | 399-up-retificadora.pdf |
| Senador (1º suplente) | João Ribeiro Barroso | 222 | 1379-pl-retificadora.pdf |
| Senador (1º suplente) | Antonio Luiz Rodrigues Mano Junior | 400 | 1129-psb-executiva.pdf |
| Senador (1º suplente) | Prisco Rodrigues Bezerra | 445 | 846-44-uniao-11-pp-executiva.pdf |
| Senador (1º suplente) | Antônio Ferreira Félix | 162 | 763-pstu-convencao.pdf |
| Senador (1º suplente) | Tiago Ferreira Lima | 290 | 1311-pco-convencao.pdf |
| Senador (2º suplente) | José Nery Rocha Júnior | 300 | 989-novo-executiva.pdf |
| Senador (2º suplente) | Carlos Augusto Nogueira Feitosa | 800 | 399-up-retificadora.pdf |
| Senador (2º suplente) | Jose Denisio Pinheiro | 222 | 1379-pl-retificadora.pdf |
| Senador (2º suplente) | Francisco De Assis Ferreira Estevam | 290 | 1311-pco-convencao.pdf |
| Senador (2º suplente) | Julio Ventura Neto | 400 | 1129-psb-executiva.pdf |
| Senador (2º suplente) | Lúcio Ferreira Gomes | 445 | 846-44-uniao-11-pp-executiva.pdf |
| Senador (2º suplente) | Geraldo Mano Magela Filho | 162 | 763-pstu-convencao.pdf |
| Senador (2º suplente) | Rodrigo Antonio Paes De Andrade Lopes De Oliveira | 180 | 1057-mdb-executiva.pdf |

