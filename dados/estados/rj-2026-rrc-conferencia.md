# Conferência contra o RRC oficial — candidatos 2026 RJ

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `rj-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **2013** confirmados, **0** divergência(s) de partido, **22** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 9 | 10 | 10 |
| Vice-Governador | 10 | 11 | 0 |
| Senador | 17 | 21 | 20 |
| Deputado Federal | 788 | 802 | 798 |
| Deputado Estadual | 1174 | 1203 | 1185 |
| Senador (1º suplente) | 18 | 16 | 0 |
| Senador (2º suplente) | 17 | 17 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 16 | PERCILIANA COSTA RODRIGUES | PSTU |
| Vice-Governador | 14 | RAFAEL BARROS SILVA DA LUZ | MISSÃO |
| Deputado Federal | 1588 | ADELE FATIMA HAHLBOHM CARNEIRO | MDB |
| Deputado Federal | 1265 | MARCOS ANTONIO DE OLIVEIRA E SILVA | PDT |
| Deputado Federal | 1299 | FRANCISCO LIMA FILHO | PDT |
| Deputado Federal | 1261 | LAUANE REGINA DA SILVA | PDT |
| Deputado Federal | 7788 | EDGAR JESUS COSTA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 2019 | ANTONIO CARLOS DE CARVALHO | PODE |
| Deputado Federal | 1225 | ANTONIO MARCOS RODRIGUES PIRES | PDT |
| Deputado Estadual | 11131 | CARLOS ALBERTO DA COSTA CUNHA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 20055 | DANIEL DO NASCIMENTO | PODE |
| Deputado Estadual | 35700 | ERICA DOS SANTOS FERREIRA PIO | DEMOCRATA |
| Deputado Estadual | 15800 | FRANCISCO FLORIANO DE SOUSA SILVA | MDB |
| Deputado Estadual | 35221 | GLAUCIANE MARTINS CAMILO | DEMOCRATA |
| Deputado Estadual | 77533 | DEISILANE CAMPOS TORRES | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Estadual | 15766 | ODAIR JOSE DE SOUZA | MDB |
| Deputado Estadual | 22015 | PRISCILLA PEREIRA BARROS | PL |
| Deputado Estadual | 20230 | OTACILIO DE SOUSA FILHO | PODE |
| Deputado Estadual | 15220 | THAIZA CRISTINA ESPERANCA DIAS | MDB |
| Senador (1º suplente) | 160 | FLORINDA MOREIRA LOMBARDI | PSTU |
| Senador (1º suplente) | 144 | MOISÉS SARMENTO DE QUEIROZ | MISSÃO |
| Senador (2º suplente) | 144 | RAMON OLIVEIRA BATISTA | MISSÃO |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Luiz André De Moura Monteiro | 10 | 2202-democrata-executiva.pdf |
| Vice-Governador | Meiby Jeanine Martins Lima | 80 | 1573-up-retificadora.pdf |
| Vice-Governador | Caetano Albuquerque Sigiliano | 29 | 1390-pco-convencao.pdf |
| Vice-Governador | Fernanda Anchieta Louback | 22 | 1219-pl-retificadora.pdf |
| Vice-Governador | Jeannie Mayr Reis De Oliveira | 55 | 1350-psd-executiva.pdf |
| Vice-Governador | Juliana Pereira De Carvalho | 50 | 551-psol-rede-convencao.pdf |
| Vice-Governador | Elaine Cristina Gonçalves Nogarol De Andrade | 10 | 1076-republicanos-executiva.pdf |
| Vice-Governador | Erigreyce De Alcantara Monteiro | 30 | 269-novo-convencao.pdf |
| Senador (1º suplente) | Alberto Barbosa Dos Santos | 355 | 1732-democrata-retificadora.pdf |
| Senador (1º suplente) | Alexandre Cardoso Da Silva | 350 | 2202-democrata-executiva.pdf |
| Senador (1º suplente) | Andre Bezerra Ribeiro Soares | 101 | 592-republicanos-retificadora.pdf |
| Senador (1º suplente) | Antônio Carlos De Paula | 290 | 1390-pco-convencao.pdf |
| Senador (1º suplente) | Cleber Ribeiro Afonso | 350 | 1071-democrata-executiva.pdf |
| Senador (1º suplente) | Everaldo Dias Pereira | 200 | 1069-pode-executiva.pdf |
| Senador (1º suplente) | Gabriela Gonçalves Cardoso | 808 | 1573-up-retificadora.pdf |
| Senador (1º suplente) | Lucimar Cristina Da Silva Ferreira | 221 | 1924-pl-executiva.pdf |
| Senador (1º suplente) | Manoel Severino Dos Santos | 131 | 697-pt-pc-do-b-pv-convencao.pdf |
| Senador (1º suplente) | Miro Teixeira | 555 | 1350-psd-executiva.pdf |
| Senador (1º suplente) | Murilo Romero De Oliveira | 280 | 1942-prtb-executiva.pdf |
| Senador (1º suplente) | Roberto Vasconcellos | 800 | 1573-up-retificadora.pdf |
| Senador (1º suplente) | Samuel Lima Malafaia | 222 | 1924-pl-executiva.pdf |
| Senador (1º suplente) | Vagner Arruda Dos Santos | 100 | 1076-republicanos-executiva.pdf |
| Senador (1º suplente) | Vanderlea Da Silva De Aguiar | 500 | 551-psol-rede-convencao.pdf |
| Senador (2º suplente) | Alexandre Cardoso Da Silva | 350 | 1071-democrata-executiva.pdf |
| Senador (2º suplente) | Carlos Alberto Araújo Silveira | 160 | 254-pstu-convencao.pdf |
| Senador (2º suplente) | Renata Santos Rosado De Almeida | 101 | 592-republicanos-retificadora.pdf |
| Senador (2º suplente) | Elaine Diniz Olegario De Figueiredo Pereira | 200 | 1069-pode-executiva.pdf |
| Senador (2º suplente) | Elza Maria Cavalcante De Medeiros | 800 | 1573-up-retificadora.pdf |
| Senador (2º suplente) | Francisco Eugenio Miranda Morais | 100 | 1076-republicanos-executiva.pdf |
| Senador (2º suplente) | George Thompson Dos Santos Sabara Augusto | 808 | 1573-up-retificadora.pdf |
| Senador (2º suplente) | Guilherme De Lima Morais Dos Santos | 290 | 1390-pco-convencao.pdf |
| Senador (2º suplente) | Jorge Page | 355 | 1732-democrata-retificadora.pdf |
| Senador (2º suplente) | Kleber Lucas Costa | 131 | 697-pt-pc-do-b-pv-convencao.pdf |
| Senador (2º suplente) | Marcelo De Souza Leite | 222 | 1924-pl-executiva.pdf |
| Senador (2º suplente) | Maria De Lourdes Do Carmo | 500 | 551-psol-rede-convencao.pdf |
| Senador (2º suplente) | Ricardo Da Silva Fernandes | 280 | 1942-prtb-executiva.pdf |
| Senador (2º suplente) | Sávio Luis Ferreira Neves Filho | 555 | 1350-psd-executiva.pdf |
| Senador (2º suplente) | José Augusto Nalin | 221 | 1924-pl-executiva.pdf |

