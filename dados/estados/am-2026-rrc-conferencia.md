# Conferência contra o RRC oficial — candidatos 2026 AM

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `am-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **467** confirmados, **0** divergência(s) de partido, **7** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 9 | 8 |
| Vice-Governador | 7 | 9 | 0 |
| Senador | 9 | 11 | 11 |
| Deputado Federal | 139 | 152 | 146 |
| Deputado Estadual | 289 | 308 | 302 |
| Senador (1º suplente) | 9 | 12 | 0 |
| Senador (2º suplente) | 9 | 12 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 22 | MARIO ANIBAL GOMES DA COSTA JUNIOR | MUDAR É URGENTE |
| Deputado Federal | 3044 | JEAN CARLOS DE ALENCAR CARVALHO | NOVO |
| Deputado Federal | 1800 | LUIZ ANDRADE DE SOUSA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 13777 | MARIA JOSE GUIMARAES FERREIRA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 13334 | PAULO HONORATO MENDES | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 13656 | RODRIGO FURTADO DA SILVA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 30170 | WANDO FONTELES GOMES | NOVO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Alessandra Campelo Da Silva | 55 | 909-psd-executiva.pdf |
| Vice-Governador | Shádia Hussami Hauache Fraxe | 70 | 292-avante-convencao.pdf |
| Vice-Governador | Juliana Frota Rebouças | 16 | 319-pstu-convencao.pdf |
| Vice-Governador | Leonardo Balbi Da Silva | 18 | 737-psol-rede-retificadora.pdf |
| Vice-Governador | Igor Felipe Oliveira Bezerra | 33 | 2189-mobiliza-retificadora.pdf |
| Vice-Governador | Serafim Fernandes Corrêa | 44 | 1114-psb-executiva.pdf |
| Senador (1º suplente) | Alessandro Bronze Toniza | 222 | 1615-pl-retificadora.pdf |
| Senador (1º suplente) | Antonio Pereira De Oliveira | 161 | 319-pstu-convencao.pdf |
| Senador (1º suplente) | Isaías Amazonas Da Silva | 277 | 494-dc-retificadora.pdf |
| Senador (1º suplente) | Grace Kelly Gonçalves Barbosa | 455 | 420-psdb-cidadania-convencao.pdf |
| Senador (1º suplente) | Laynara Cristina Leite Prestes | 181 | 737-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Luís Mário Braga Bonates | 444 | 1515-44-uniao-11-pp-retificadora.pdf |
| Senador (1º suplente) | Neida Maria De Oliveira Farias | 333 | 1513-mobiliza-retificadora.pdf |
| Senador (1º suplente) | Renan Nogueira Rotondano | 500 | 737-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Sandra Backsmann Braga | 155 | 883-mdb-executiva.pdf |
| Senador (2º suplente) | André Monteiro Da Silva | 181 | 737-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Angelo Augusto Cavalcante Reis | 333 | 1513-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Jose Tupinamba Ribeiro Ponte | 444 | 1515-44-uniao-11-pp-retificadora.pdf |
| Senador (2º suplente) | Roberto Da Silva | 277 | 494-dc-retificadora.pdf |
| Senador (2º suplente) | Jander Dos Santos Muniz | 500 | 737-psol-rede-retificadora.pdf |
| Senador (2º suplente) | João Queiroz Rebouças | 161 | 319-pstu-convencao.pdf |
| Senador (2º suplente) | Mário Bastos Dos Santos | 222 | 1615-pl-retificadora.pdf |
| Senador (2º suplente) | Miguel Capobiango Neto | 155 | 883-mdb-executiva.pdf |
| Senador (2º suplente) | Judite Da Silva Pinho | 455 | 420-psdb-cidadania-convencao.pdf |

