# Conferência contra o RRC oficial — candidatos 2026 AP

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `ap-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **302** confirmados, **0** divergência(s) de partido, **5** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 5 | 6 | 6 |
| Vice-Governador | 5 | 7 | 0 |
| Senador | 9 | 9 | 9 |
| Deputado Federal | 89 | 96 | 94 |
| Deputado Estadual | 192 | 197 | 193 |
| Senador (1º suplente) | 9 | 12 | 0 |
| Senador (2º suplente) | 9 | 10 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Estadual | 12131 | CLEICY LEÃO MIRANDA | PDT |
| Deputado Estadual | 22456 | ACHILES EDUARDO PONTES CAMPOS | PL |
| Senador (1º suplente) | 290 | IRIS MONTEIRO SILVA | PCO |
| Senador (2º suplente) | 130 | JESSYCA SOUSA DE AGUIAR | JUNTOS POR TODO O AMAPÁ |
| Senador (2º suplente) | 444 | MIGUEL ROBERTO NOGUEIRA DE ANDRADE | JUNTOS POR TODO O AMAPÁ |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Ana Paula Pinheiro De Araujo | 16 | 686-pstu-convencao.pdf |
| Vice-Governador | Cristina De Sousa Araujo | 27 | 760-dc-convencao.pdf |
| Vice-Governador | Iracelia Barbosa Rodrigues | 29 | 1341-pco-convencao.pdf |
| Vice-Governador | Luciana Araujo Goes Gurgel | 55 | 83-psd-convencao.pdf |
| Vice-Governador | Antonio Pinheiro Teles Junior | 44 | 1751-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Elisangela Do Socorro Moraes Bastos | 151 | 2094-mdb-retificadora.pdf |
| Senador (1º suplente) | Carlos Gabriel Andrade Nonato | 130 | 1514-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Hélio Flávio De Souza Lima | 272 | 1791-dc-retificadora.pdf |
| Senador (1º suplente) | Jaime Domingues Nunes | 444 | 1751-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Jose Ramalho De Oliveira | 401 | 867-psb-convencao.pdf |
| Senador (1º suplente) | Jose Furlan Neto | 200 | 68-pode-convencao.pdf |
| Senador (1º suplente) | Paulo José De Brito Silva Albuquerque | 555 | 83-psd-convencao.pdf |
| Senador (1º suplente) | Tobias Laurindo | 277 | 1791-dc-retificadora.pdf |
| Senador (2º suplente) | Abdias Eduardo Pontes | 151 | 2094-mdb-retificadora.pdf |
| Senador (2º suplente) | Diogo Brito Grunho | 555 | 83-psd-convencao.pdf |
| Senador (2º suplente) | Gilberto Mauro Amanajás Pena | 272 | 1791-dc-retificadora.pdf |
| Senador (2º suplente) | Jaziel Magalhaes De Souza | 290 | 1341-pco-convencao.pdf |
| Senador (2º suplente) | Antonia Ferreira Sullyvan | 200 | 68-pode-convencao.pdf |
| Senador (2º suplente) | Halda Maria Dos Santos Brandão | 401 | 867-psb-convencao.pdf |
| Senador (2º suplente) | Vilmar Laurindo | 277 | 1791-dc-retificadora.pdf |

