# Conferência contra o RRC oficial — candidatos 2026 SE

Gerado em 2026-08-28 por `ferramentas/conferir_rrc.py`. Cruza `se-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **373** confirmados, **0** divergência(s) de partido, **5** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 6 | 6 | 6 |
| Vice-Governador | 7 | 6 | 0 |
| Senador | 11 | 11 | 10 |
| Deputado Federal | 139 | 142 | 138 |
| Deputado Estadual | 220 | 223 | 219 |
| Senador (1º suplente) | 11 | 12 | 0 |
| Senador (2º suplente) | 12 | 16 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Senador | 221 | HENRIQUE ALVES DA ROCHA | FÉ E CORAGEM PRA MUDAR |
| Deputado Federal | 4588 | EVANDRO TADEU FONTES SILVA | FEDERAÇÃO PSDB CIDADANIA(PSDB/CIDADANIA) |
| Deputado Estadual | 22345 | GEYVSON CARDOSO VARJAO | PL |
| Deputado Estadual | 22800 | ALEXANDRE SOARES DA SILVA | PL |
| Deputado Estadual | 70789 | MANUELA GOMES DE OLIVEIRA | AVANTE |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Maria Izaltina Silva Santos | 50 | 2199-psol-rede-retificadora.pdf |
| Vice-Governador | Jeferson Luiz De Andrade | 55 | 1264-psd-convencao.pdf |
| Vice-Governador | Salete Fernandes Da Silva | 22 | 967-pl-retificadora.pdf |
| Vice-Governador | Priscila Dias Silva Felizola | 10 | 744-republicanos-retificadora.pdf |
| Vice-Governador | Simeão Barbosa De Souza | 27 | 685-dc-convencao.pdf |
| Vice-Governador | Suely Chaves Barreto | 45 | 842-psdb-cidadania-convencao.pdf |
| Senador (1º suplente) | Adailton Resende Sousa | 100 | 744-republicanos-retificadora.pdf |
| Senador (1º suplente) | Adriana Gomes Menezes Carvalho | 155 | 311-mdb-convencao.pdf |
| Senador (1º suplente) | Bruno Costa Nunes | 131 | 1268-pt-pc-do-b-pv-convencao.pdf |
| Senador (1º suplente) | Geivisson Vieira Dos Anjos | 270 | 685-dc-convencao.pdf |
| Senador (1º suplente) | Maria Da Glória Gomes Sena | 222 | 1616-pode-retificadora.pdf |
| Senador (1º suplente) | Joaquim Da Silva Ferreira | 123 | 600-pdt-convencao.pdf |
| Senador (1º suplente) | José Olívio Calasans Do Nascimento | 221 | 967-pl-retificadora.pdf |
| Senador (1º suplente) | Carlos Antônio De Magalhães | 500 | 2199-psol-rede-retificadora.pdf |
| Senador (1º suplente) | Vaneide Alves Dos Santos | 277 | 685-dc-convencao.pdf |
| Senador (1º suplente) | Rebeka Da Silva Maia | 101 | 1126-republicanos-executiva.pdf |
| Senador (1º suplente) | Ricardo Vasconcelos Silva | 444 | 1264-psd-convencao.pdf |
| Senador (2º suplente) | Cristian Araujo Teixeira | 123 | 1838-pdt-executiva.pdf |
| Senador (2º suplente) | Danilo Alves De Carvalho | 100 | 744-republicanos-retificadora.pdf |
| Senador (2º suplente) | Fabiano Luis De Almeida Oliveira | 131 | 1268-pt-pc-do-b-pv-convencao.pdf |
| Senador (2º suplente) | Joao Araujo De Menezes Sobrinho | 155 | 311-mdb-convencao.pdf |
| Senador (2º suplente) | Márcio Vieira Dos Santos | 270 | 685-dc-convencao.pdf |
| Senador (2º suplente) | Marina Araujo Ferraz De Castro | 222 | 911-pl-convencao.pdf |
| Senador (2º suplente) | Núzia Campos Nascimento Costa | 500 | 2199-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Selma Bispo Dos Santos | 277 | 685-dc-convencao.pdf |
| Senador (2º suplente) | Regina Selma França Cruz | 444 | 1264-psd-convencao.pdf |
| Senador (2º suplente) | Krisvania Barbosa Da Silva | 221 | 967-pl-retificadora.pdf |
| Senador (2º suplente) | Iris Lessy Santos Gomes | 101 | 1766-republicanos-executiva.pdf |

