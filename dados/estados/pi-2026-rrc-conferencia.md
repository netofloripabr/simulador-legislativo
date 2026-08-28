# Conferência contra o RRC oficial — candidatos 2026 PI

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `pi-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **391** confirmados, **13** divergência(s) de partido, **17** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 11 | 13 | 12 |
| Vice-Governador | 11 | 13 | 0 |
| Senador | 20 | 23 | 21 |
| Deputado Federal | 164 | 190 | 170 |
| Deputado Estadual | 151 | 195 | 188 |
| Senador (1º suplente) | 20 | 25 | 0 |
| Senador (2º suplente) | 20 | 26 | 0 |

## Divergências de partido (revisar — RRC é mais autoritativo)

| Cargo | Nome (nosso) | Número | Nosso partido | Partido no RRC | Nome no RRC |
|---|---|---|---|---|---|
| Governador | Francisco José Martins Jurity | 27 | DEMOCRACIA | DC | FRANCISCO JOSÉ MARTINS JURITY |
| Senador | Dionisio Carvalho Neto | 277 | DEMOCRACIA | DC | DIONISIO CARVALHO NETO |
| Senador | Evandro Marques Cunha | 278 | DEMOCRACIA | DC | EVANDRO MARQUES CUNHA |
| Deputado Federal | Adão Roberto Lima Da Silva | 2777 | DEMOCRACIA | DC | ADÃO ROBERTO LIMA DA SILVA |
| Deputado Federal | Antonio De Deus Neto | 2727 | DEMOCRACIA | DC | ANTONIO DE DEUS NETO |
| Deputado Federal | Carlos Alberto Carcara Da Silva | 2755 | DEMOCRACIA | DC | CARLOS ALBERTO CARCARA DA SILVA |
| Deputado Federal | Denilson Barbosa Da Silva | 2799 | DEMOCRACIA | DC | DENILSON BARBOSA DA SILVA |
| Deputado Federal | Francisco Das Chagas Pereira De Sousa | 2700 | DEMOCRACIA | DC | FRANCISCO DAS CHAGAS PEREIRA DE SOUSA |
| Deputado Federal | Gisele Maria Dos Santos Silva | 2738 | DEMOCRACIA | DC | GISELE MARIA DOS SANTOS SILVA |
| Deputado Federal | Jair Sampaio Da Silva | 2788 | DEMOCRACIA | DC | JAIR SAMPAIO DA SILVA |
| Deputado Federal | Josefa Gonçalves Da Silva | 2710 | DEMOCRACIA | DC | JOSEFA GONCALVES DA SILVA |
| Deputado Federal | Leônidas Pinto Firmesa | 2773 | DEMOCRACIA | DC | LEONIDAS PINTO FIRMESA |
| Deputado Federal | Tatiana Maria Lima Cruz | 2722 | DEMOCRACIA | DC | TATIANA MARIA LIMA CRUZ |

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 29 | ZEFERINO DA SILVA BRASIL | PCO |
| Deputado Federal | 5511 | DEUSIMAR DO SOCORRO BRITO DE FARIAS | PSD |
| Deputado Federal | 2911 | DEUZELIA MARIA LOPES DE OLIVEIRA | PCO |
| Deputado Federal | 7007 | FÁBIO JÚNIOR DE SOUSA LIMA | AVANTE |
| Deputado Federal | 2929 | ITALLO LAMBERTINY ARCANJO SANTOS SÁ | PCO |
| Deputado Federal | 7010 | MARCOS AURELIO DA FONSECA | AVANTE |
| Deputado Estadual | 13771 | ELIZANGELA DO NASCIMENTO PEREIRA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Senador (1º suplente) | 278 | JOSÉ AFONSO VIEIRA | DC |
| Senador (1º suplente) | 291 | GEORGIA KARYNNE ARAGAO DE ANDRADE | PCO |
| Senador (1º suplente) | 338 | GERSILDA TEIXEIRA DE ARAUJO | MOBILIZA |
| Senador (1º suplente) | 500 | LAUDECI SILVA SOUZA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Senador (1º suplente) | 555 | MARIA DO ROSÁRIO DE FATIMA BISERRA RODRIGUES | A FORÇA DO POVO |
| Senador (1º suplente) | 505 | DEUSANTINA MARIA RIBEIRO DE SOUSA | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Senador (2º suplente) | 355 | ANTONIO JOSÉ VISGUEIRA DE SOUZA | DEMOCRATA |
| Senador (2º suplente) | 291 | GRAZIELLE ALVES DA SILVA | PCO |
| Senador (2º suplente) | 500 | JUCILEIDE HONORATO DA SILVA LEAO | FEDERAÇÃO PSOL REDE(PSOL/REDE) |
| Senador (2º suplente) | 505 | MARIA AIRES CHAVES | FEDERAÇÃO PSOL REDE(PSOL/REDE) |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Paulo Eudes Carneiro | 45 | 1909-psdb-cidadania-retificadora.pdf |
| Vice-Governador | Francisca Edilene Pinho Gomes Barbosa | 50 | 719-psol-rede-convencao.pdf |
| Vice-Governador | João Gervásio Dos Santos Neto | 16 | 554-pstu-convencao.pdf |
| Vice-Governador | Ismar Aguiar Marques | 30 | 1215-novo-executiva.pdf |
| Vice-Governador | Jeová Barbosa De Carvalho Alencar | 11 | 738-44-uniao-11-pp-convencao.pdf |
| Vice-Governador | João Ricardo Soares Da Silva | 35 | 1017-democrata-retificadora.pdf |
| Vice-Governador | Lucas Veras De Moraes | 70 | 1891-avante-executiva.pdf |
| Vice-Governador | Pedro Pereira Dos Santos Filho | 27 | 532-dc-retificadora.pdf |
| Vice-Governador | Thays Dias De Morais | 80 | 672-up-convencao.pdf |
| Vice-Governador | Francisco Washington Bandeira Santos Filho | 13 | 1801-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Carlos Alberto Cardoso Azevedo | 333 | 1045-mobiliza-retificadora.pdf |
| Senador (1º suplente) | Diego Mendes Sousa | 456 | 1909-psdb-cidadania-retificadora.pdf |
| Senador (1º suplente) | Dilcon Afonso Santos Carvalho | 277 | 532-dc-retificadora.pdf |
| Senador (1º suplente) | Felipe De Souza Rezende Sampaio | 151 | 400-mdb-retificadora.pdf |
| Senador (1º suplente) | Geovanni Santos Do Nascimento | 355 | 1017-democrata-retificadora.pdf |
| Senador (1º suplente) | Guilherme Ferreira Da Cunha Rocha | 700 | 2034-avante-executiva.pdf |
| Senador (1º suplente) | Jhamya Weline Vasconcelos Junqueira | 222 | 746-pl-convencao.pdf |
| Senador (1º suplente) | Francisco De Assis Soares Júnior | 166 | 554-pstu-convencao.pdf |
| Senador (1º suplente) | Marília Mendes De Carvalho Bomfim | 300 | 1215-novo-executiva.pdf |
| Senador (1º suplente) | Glaydston Michel Saldanha Moura Lira | 700 | 1707-avante-retificadora.pdf |
| Senador (1º suplente) | Raimunda Nonata Belizário | 800 | 672-up-convencao.pdf |
| Senador (1º suplente) | Raimundo Neto E Silva Nogueira Lima | 111 | 738-44-uniao-11-pp-convencao.pdf |
| Senador (1º suplente) | Stanley Pereira Meireles | 707 | 2034-avante-executiva.pdf |
| Senador (1º suplente) | Sebastiana Maria Craveiro Da Rocha | 350 | 1017-democrata-retificadora.pdf |
| Senador (2º suplente) | Alexsandro De Oliveira Pinto | 350 | 1017-democrata-retificadora.pdf |
| Senador (2º suplente) | Ana Alice Barbosa Alencar Câmpelo Mendes | 700 | 2194-avante-retificadora.pdf |
| Senador (2º suplente) | Angélica Maria Araujo Almeida De Sousa | 338 | 1045-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Francisco Erivaldo Leite De Araújo | 300 | 1215-novo-executiva.pdf |
| Senador (2º suplente) | Carlos Augusto Teixeira Nunes | 222 | 746-pl-convencao.pdf |
| Senador (2º suplente) | Dário De Paulo Castro | 151 | 400-mdb-retificadora.pdf |
| Senador (2º suplente) | Dyego Soares Estevão | 333 | 1045-mobiliza-retificadora.pdf |
| Senador (2º suplente) | Francisco Das Chagas Da Silva | 277 | 1019-dc-executiva.pdf |
| Senador (2º suplente) | Ivanildo Mesquita Lopes | 707 | 2034-avante-executiva.pdf |
| Senador (2º suplente) | José Carlos Lima Da Silva | 700 | 2034-avante-executiva.pdf |
| Senador (2º suplente) | Mikahil Fernando Santos Mendes | 278 | 532-dc-retificadora.pdf |
| Senador (2º suplente) | Milton Nonato Da Silva Filho | 456 | 1909-psdb-cidadania-retificadora.pdf |
| Senador (2º suplente) | Ricardo Saraiva De Oliveira Sobrinho Braz | 111 | 738-44-uniao-11-pp-convencao.pdf |
| Senador (2º suplente) | Pedro Alves De Carvalho Rocha Filho | 555 | 1801-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Rosa Maria Meireles Nascimento | 166 | 554-pstu-convencao.pdf |
| Senador (2º suplente) | Francisco Samuel Lima Dos Santos | 800 | 672-up-convencao.pdf |

