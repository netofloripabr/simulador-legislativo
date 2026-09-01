# Conferência contra o RRC oficial — candidatos 2026 PR

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `pr-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **1054** confirmados, **0** divergência(s) de partido, **27** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 10 | 10 |
| Vice-Governador | 8 | 7 | 0 |
| Senador | 9 | 13 | 13 |
| Deputado Federal | 426 | 445 | 427 |
| Deputado Estadual | 615 | 672 | 604 |
| Senador (1º suplente) | 10 | 10 | 0 |
| Senador (2º suplente) | 10 | 9 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 33 | DAIANA DA SILVA CRIMINACIO | MOBILIZA |
| Vice-Governador | 16 | HELENA FIGUEIREDO DA COSTA | PSTU |
| Vice-Governador | 14 | JOÃO ADOLFO PADILHA YAMANE WENDPAP | MISSÃO |
| Deputado Federal | 5569 | ELCIO JAIME DA LUZ | PSD |
| Deputado Federal | 5064 | GENECI DE ABREU | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 1277 | JOSIAS MILANI | PDT |
| Deputado Federal | 1800 | MARCOS ANTONIO DE OLIVEIRA SOUZA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Federal | 5556 | ELAINE DE FARIA MICHELE SILVA | PSD |
| Deputado Federal | 4523 | TAUILLO TEZELLI | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23100 | ANTONIO CARLOS LOPES MENDES | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 20042 | CINTHIA GONCALVES DA SILVA | PODE |
| Deputado Estadual | 50888 | GISLENE DO ROCIO PIRES CARVALHO | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 45030 | JOSE DIRCEU ALVES DE ALMEIDA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 55194 | MAITÊ DIAS | PSD |
| Deputado Estadual | 20230 | MARIO MARCIO BARROS | PODE |
| Deputado Estadual | 20050 | MARCOS EDUARDO LIMA MARTINS | PODE |
| Deputado Estadual | 55775 | GLORIA SANTANA ARCANJO | PSD |
| Deputado Estadual | 45190 | PAULO HENRIQUE OLIVEIRA COSTA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 18199 | CLAUDECIR DO ESPÍRITO SANTO | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Deputado Estadual | 55550 | RICARDO ALVES NASCIMENTO | PSD |
| Deputado Estadual | 55999 | ROSELI DE FATIMA GALVÃO | PSD |
| Deputado Estadual | 45772 | SILVANE COSTA ROSA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 23111 | SONIA BORGES ALEXANDRE PAIS | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 20010 | WALDIRENE BUDAL | PODE |
| Senador (1º suplente) | 100 | CARLOS EDUARDO HAMMERSCHMIDT | COLIGAÇÃO A MUDANÇA CONTINUA |
| Senador (1º suplente) | 144 | SONNI JAIR RICARDO COLOMBO REZINI | MISSÃO |
| Senador (2º suplente) | 144 | RENATO SCARANTE | MISSÃO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Edson Jose De Vasconcelos | 22 | 1606-pl-retificadora.pdf |
| Vice-Governador | Michele Caputo Neto | 12 | 1355-pdt-convencao.pdf |
| Vice-Governador | Rafael Valdomiro Greca De Macedo | 55 | 1529-psd-retificadora.pdf |
| Vice-Governador | Willian Yukio Araki | 80 | 520-up-convencao.pdf |
| Vice-Governador | José Carlos Telles | 29 | 1413-pco-convencao.pdf |
| Senador (1º suplente) | Assis Gurgacz Neto | 131 | 1370-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Cristiane Aparecida Wainer | 132 | 1370-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Jackson André Dos Santos | 555 | 1529-psd-retificadora.pdf |
| Senador (1º suplente) | João Paulo Hostin | 290 | 1413-pco-convencao.pdf |
| Senador (1º suplente) | Patrícia Cota | 800 | 520-up-convencao.pdf |
| Senador (1º suplente) | Paulo Henrique Carrano Santos | 222 | 1606-pl-retificadora.pdf |
| Senador (1º suplente) | Wilson Picler | 300 | 1095-novo-executiva.pdf |
| Senador (2º suplente) | Alexandre Radde Kranen | 290 | 1413-pco-convencao.pdf |
| Senador (2º suplente) | João Fernando Dornellas De Oliveira | 800 | 520-up-convencao.pdf |
| Senador (2º suplente) | Marcos Renato Baumgart | 555 | 1529-psd-retificadora.pdf |
| Senador (2º suplente) | Markenson Marques Dos Santos | 300 | 1095-novo-executiva.pdf |
| Senador (2º suplente) | Nelson Fernando Padovani | 100 | 1557-republicanos-retificadora.pdf |
| Senador (2º suplente) | Aldair Tarcisio Rizzi | 131 | 1370-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Sergio Roberto Domingues | 222 | 1606-pl-retificadora.pdf |
| Senador (2º suplente) | Celina Do Carmo Da Silva Wotcoski | 132 | 1370-pt-pc-do-b-pv-executiva.pdf |

