# Conferência contra o RRC oficial — candidatos 2026 PE

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `pe-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **913** confirmados, **0** divergência(s) de partido, **30** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 9 | 9 |
| Vice-Governador | 8 | 7 | 0 |
| Senador | 12 | 12 | 12 |
| Deputado Federal | 390 | 409 | 392 |
| Deputado Estadual | 517 | 520 | 500 |
| Senador (1º suplente) | 12 | 12 | 0 |
| Senador (2º suplente) | 12 | 13 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 35 | CARLOS ALBERTO DE BRITO JUNIOR | DEMOCRATA |
| Vice-Governador | 14 | LUCAS XAVIER BEZERRA DOS SANTOS | MISSÃO |
| Senador | 111 | EDUARDO HENRIQUE DA FONTE DE ALBUQUERQUE SILVA | PERNAMBUCO DE CORAÇÃO |
| Deputado Federal | 2300 | AGENOR JULIO XAVIER | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Federal | 2210 | JOSÉ CARLOS DE BRITO | PL |
| Deputado Federal | 4411 | DANIEL PONCELL SANTOS | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 1244 | JOSÉ WARTON DE BRITO CAVALCANTI | PDT |
| Deputado Federal | 4444 | JULIANA BARBOSA DA SILVA AGUIAR | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 4444 | RAFAEL CARDOSO DA SILVA | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Federal | 2900 | MARIA HOSANA RIBEIRO DOS ANJOS | PCO |
| Deputado Estadual | 33117 | ADRANA VIEIRA DA SILVA NASCIMENTO | MOBILIZA |
| Deputado Estadual | 15111 | ALBERI MAGNO DE OLIVEIRA | MDB |
| Deputado Estadual | 33043 | ANA ALAIDE COSTA MONCLAIR | MOBILIZA |
| Deputado Estadual | 40777 | CANDIDA VALERIA SANTOS BOMFIM | PSB |
| Deputado Estadual | 44454 | LUCIANA WILSON DE VASCONCELOS | FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP) |
| Deputado Estadual | 33563 | CÉLIO CARNEIRO DE OLIVEIRA | MOBILIZA |
| Deputado Estadual | 33202 | LUIS AUGUSTO MARTINS CORREIA | MOBILIZA |
| Deputado Estadual | 33100 | MARCIO CARDOSO DE OLIVEIRA | MOBILIZA |
| Deputado Estadual | 40140 | MARIA LEAL ARRAES DE ALENCAR FORTALEZA | PSB |
| Deputado Estadual | 43000 | MARIO PEREIRA DA SILVA | FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV) |
| Deputado Estadual | 33460 | MOABE JOSE DA SILVA | MOBILIZA |
| Deputado Estadual | 33243 | MOURACIA TORRES DANTAS FIGUEIRÔA | MOBILIZA |
| Deputado Estadual | 33007 | PAULA ROBERTA DA CUNHA PEREIRA SILVA | MOBILIZA |
| Deputado Estadual | 70077 | PAULO HENRIQUE GUERRA ALVES | AVANTE |
| Deputado Estadual | 20445 | RINALDO EDUARDO TAVARES | PODE |
| Deputado Estadual | 33737 | SANDRA FLORENCIO DOS SANTOS | MOBILIZA |
| Deputado Estadual | 33858 | WALDECK SANDRO BATISTA DE OLIVEIRA | MOBILIZA |
| Senador (1º suplente) | 111 | CARLOS ANTONIO GOMES DE ANDRADE LIMA | PERNAMBUCO DE CORAÇÃO |
| Senador (2º suplente) | 111 | JANE CLEIDE SILVA SANTOS | PERNAMBUCO DE CORAÇÃO |
| Senador (2º suplente) | 355 | SIMEIA SILVA CARVALHO MORAES | DEMOCRATA |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Alice Dos Santos Gabino | 50 | 1416-psol-rede-retificadora.pdf |
| Vice-Governador | Carlos Antonio Da Costa Cavalcanti Neto | 40 | 1747-psb-retificadora.pdf |
| Vice-Governador | Marcelo Pessoa Da Silva | 80 | 224-up-convencao.pdf |
| Vice-Governador | Priscila Krause Branco | 55 | 1313-psd-retificadora.pdf |
| Vice-Governador | Roberta Rita Cavalcanti Pereira | 29 | 1423-pco-convencao.pdf |
| Vice-Governador | Valéria Do Nascimento Félix | 16 | 343-pstu-convencao.pdf |
| Senador (1º suplente) | Abel Antonio Dos Santos Neto | 123 | 1634-pdt-executiva.pdf |
| Senador (1º suplente) | Adriana Karla Ferreira Carneiro De Lima | 222 | 1833-pl-retificadora.pdf |
| Senador (1º suplente) | Carla De Oliveira Pinheiro Silva | 300 | 226-novo-convencao.pdf |
| Senador (1º suplente) | José Cristiano Teodósio Romão | 180 | 1416-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Maria Das Graças Oliveira Silva | 800 | 224-up-convencao.pdf |
| Senador (1º suplente) | Maria Dulcicleide Macedo Coelho Amorim | 555 | 1994-psd-retificadora.pdf |
| Senador (1º suplente) | Estelita Medeiros Moes E Silva | 290 | 1423-pco-convencao.pdf |
| Senador (1º suplente) | Jonas Ferreira Da Silva | 161 | 343-pstu-convencao.pdf |
| Senador (1º suplente) | Laelson Oliveira Costa | 355 | 452-democrata-retificadora.pdf |
| Senador (1º suplente) | Luciano Caldas Bivar | 130 | 194-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Antonio Natanael Martins Sarmento | 801 | 224-up-convencao.pdf |
| Senador (2º suplente) | Alcides José De Albuquerque Cardoso | 222 | 1180-pl-executiva.pdf |
| Senador (2º suplente) | Francisca Edjane Rodrigues De Figueiredo | 123 | 1634-pdt-executiva.pdf |
| Senador (2º suplente) | Gilberto Ferreira Da Silva | 290 | 1423-pco-convencao.pdf |
| Senador (2º suplente) | Hermes Alves Dias Souza | 300 | 226-novo-convencao.pdf |
| Senador (2º suplente) | Marcelo Teixeira Da Silva | 161 | 343-pstu-convencao.pdf |
| Senador (2º suplente) | Marcelo Gomes Monteiro Luz | 555 | 1994-psd-retificadora.pdf |
| Senador (2º suplente) | Bruno Abreu De Melo | 800 | 224-up-convencao.pdf |
| Senador (2º suplente) | Manoel Severino Moraes De Almeida | 130 | 502-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Rafaela Do Nascimento Ramos | 180 | 1416-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Sandra Maria Ramos Florentino França | 801 | 224-up-convencao.pdf |

