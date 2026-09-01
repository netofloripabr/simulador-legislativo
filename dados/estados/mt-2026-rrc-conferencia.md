# Conferência contra o RRC oficial — candidatos 2026 MT

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `mt-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **417** confirmados, **0** divergência(s) de partido, **14** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 7 | 6 | 6 |
| Vice-Governador | 7 | 11 | 0 |
| Senador | 10 | 11 | 11 |
| Deputado Federal | 137 | 151 | 139 |
| Deputado Estadual | 267 | 272 | 261 |
| Senador (1º suplente) | 10 | 11 | 0 |
| Senador (2º suplente) | 10 | 12 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Deputado Federal | 1055 | ALINE LUCIA DA SILVA PEREIRA | REPUBLICANOS |
| Deputado Federal | 4550 | DAIARA ROCHO DA SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 2577 | DARLAN TRINDADE CARVALHO | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 1023 | EDUARDO VICTOR MAGALHÃES | REPUBLICANOS |
| Deputado Federal | 4545 | DEJAMIR SOUZA SOARES | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23000 | ALDEMIR OLIVEIRA SANTOS FILHO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 50011 | ANTÔNIO LEONIL DUARTE DA COSTA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 23333 | VANIA SIMONE NONATO | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 45400 | HORACIO GOMES PEREIRA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 11123 | LUCIENE FIRMINIA DE SOUZA MOCELIN | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 55022 | LUCIVALDO VIEIRA DE SOUSA | PSD |
| Deputado Estadual | 12244 | ONÉSIMO UNÉ TSEREWARIRIWE | PDT |
| Senador (1º suplente) | 111 | JUCELIA GONÇALVES FERRO | MATO GROSSO NAO PODE PARAR I |
| Senador (2º suplente) | 111 | GRASIELLE PAES DA SILVA BUGALHO | MATO GROSSO NAO PODE PARAR I |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Alex Pedde Pucineli | 36 | 2204-agir-executiva.pdf |
| Vice-Governador | Alex Pedde Pucineli | 36 | 2204-agir-executiva.pdf |
| Vice-Governador | Diogo Peixoto Botelho | 55 | 643-psd-convencao.pdf |
| Vice-Governador | Wagner Marques Pereira Malheiros | 33 | 982-mobiliza-convencao.pdf |
| Vice-Governador | Gisela Simona Viana De Souza | 10 | 1771-44-uniao-11-pp-executiva.pdf |
| Vice-Governador | Reinaldo Gomes De Morais | 22 | 1949-novo-executiva.pdf |
| Vice-Governador | Thales Rodrigo Sartorelo | 14 | 1681-missao-retificadora.pdf |
| Senador (1º suplente) | Alexandre Pedro Schenkel | 555 | 643-psd-convencao.pdf |
| Senador (1º suplente) | Aluizo Lima Pereira | 150 | 2005-mdb-executiva.pdf |
| Senador (1º suplente) | Carlos Ernesto Augustin | 400 | 611-psb-convencao.pdf |
| Senador (1º suplente) | José Aparecido Dos Santos | 444 | 1096-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Geraldo Oliveira Dos Santos | 365 | 1202-agir-executiva.pdf |
| Senador (1º suplente) | Maria Ferreira Guedes | 360 | 1202-agir-executiva.pdf |
| Senador (1º suplente) | Odilio Balbinotti Filho | 222 | 2223-pl-retificadora.pdf |
| Senador (1º suplente) | Aline Franciele De Rezende Duarte | 700 | 1122-avante-executiva.pdf |
| Senador (1º suplente) | Celio Selestrino Dos Santos | 351 | 1059-democrata-executiva.pdf |
| Senador (2º suplente) | Carmen Silvia Campos Machado | 555 | 643-psd-convencao.pdf |
| Senador (2º suplente) | Elson Ramos De Figueiredo | 444 | 973-pode-executiva.pdf |
| Senador (2º suplente) | Guelda Cristina De Oliveira Andrade | 400 | 611-psb-convencao.pdf |
| Senador (2º suplente) | Ibrahim Zaher | 150 | 2005-mdb-executiva.pdf |
| Senador (2º suplente) | Itioma Barros Da Silva Ferreira | 360 | 1202-agir-executiva.pdf |
| Senador (2º suplente) | Antonio Jackson Pereira Da Cruz | 365 | 1202-agir-executiva.pdf |
| Senador (2º suplente) | Carlo Leopoldo Marques Fernandes | 351 | 1059-democrata-executiva.pdf |
| Senador (2º suplente) | Saulo Breda Guizelini | 700 | 1122-avante-executiva.pdf |
| Senador (2º suplente) | Ederson Dal Molin | 222 | 1246-pl-executiva.pdf |

