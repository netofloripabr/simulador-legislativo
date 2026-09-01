# Conferência contra o RRC oficial — candidatos 2026 DF

Gerado em 2026-09-01 por `ferramentas/conferir_rrc.py`. Cruza `df-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **191** confirmados, **0** divergência(s) de partido, **10** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 11 | 13 | 13 |
| Vice-Governador | 11 | 13 | 0 |
| Senador | 13 | 16 | 14 |
| Deputado Federal | 167 | 170 | 164 |
| Deputado Estadual | 0 | 434 | 0 |
| Senador (1º suplente) | 13 | 16 | 0 |
| Senador (2º suplente) | 14 | 16 | 0 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Candidatos no RRC sem entrada correspondente no nosso arquivo

Registrado oficialmente mas não achado por número em nenhuma ata processada — pode ser candidato que a ata não cobriu, ou número novo por retificadora que ainda não baixamos. Revisar manualmente antes de adicionar (ver `ferramentas/tratar_atas.py`).

| Cargo | Número | Nome (RRC) | Coligação/Partido |
|---|---|---|---|
| Vice-Governador | 28 | CRISTIANE BARROS DA SILVA SANTOS | PRTB |
| Deputado Federal | 2900 | AGUIDA MARIA LIMA BOTELHO | PCO |
| Deputado Federal | 7777 | MARIA GERCIANE DA CONCEIÇÃO LIMA | FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA(PRD/SOLIDARIEDADE) |
| Deputado Federal | 5577 | JÚLIO CESAR FLORENCIO ISIDRO | PSD |
| Deputado Federal | 3550 | LEANDRO PEREIRA SANCHES GOMES | DEMOCRATA |
| Deputado Federal | 2211 | PAULO ULISSIS BATISTA LIMA | PL |
| Senador (1º suplente) | 300 | WILBERT GOLDEN BATISTA | NOVO |
| Senador (1º suplente) | 360 | THIAGO LUIZ DA SILVA MELO | AGIR |
| Senador (1º suplente) | 800 | TADEU BERNARDES DE SOUZA TONIATTI | UP |
| Senador (2º suplente) | 800 | IVONE DE PINHO MINEIRO OLIVEIRA | UP |

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Rafael De Sá Sampaio | 30 | 1166-novo-executiva.pdf |
| Vice-Governador | Maria Das Dores Gomes Da Silva Santos | 13 | 1988-pt-pc-do-b-pv-executiva.pdf |
| Vice-Governador | Antonio Ricardo Martins Guillen | 16 | 783-pstu-convencao.pdf |
| Vice-Governador | Gustavo Do Vale Rocha | 11 | 1934-44-uniao-11-pp-retificadora.pdf |
| Vice-Governador | Everardo Alves Ribeiro | 45 | 2083-psdb-cidadania-executiva.pdf |
| Vice-Governador | Luiz Carlos Pietschmann | 55 | 1117-psd-executiva.pdf |
| Vice-Governador | Sofia Martins Carvalho | 40 | 1759-psb-executiva.pdf |
| Vice-Governador | Sergio Prado Tomaz | 36 | 1782-agir-retificadora.pdf |
| Vice-Governador | Thaís Oliveira Silva | 80 | 271-up-convencao.pdf |
| Vice-Governador | Valmir Barbosa Da Silva | 29 | 1273-pco-convencao.pdf |
| Senador (1º suplente) | Diego Ricardo Marques | 700 | 1422-avante-executiva.pdf |
| Senador (1º suplente) | Diego Torres Dourado | 222 | 1960-pl-executiva.pdf |
| Senador (1º suplente) | Edson Da Silva | 161 | 783-pstu-convencao.pdf |
| Senador (1º suplente) | Giulia Eleonora Tadini | 131 | 1988-pt-pc-do-b-pv-executiva.pdf |
| Senador (1º suplente) | Luciana Brito Loureiro | 456 | 2083-psdb-cidadania-executiva.pdf |
| Senador (1º suplente) | Marco Aurélio Angelo Rosa | 355 | 451-democrata-convencao.pdf |
| Senador (1º suplente) | Mauro Sousa De Moura | 290 | 1273-pco-convencao.pdf |
| Senador (1º suplente) | Eunice De Oliveira Ferreira Santos | 555 | 2098-psd-executiva.pdf |
| Senador (1º suplente) | Raphael Sodré Cittadino | 123 | 585-psol-rede-executiva.pdf |
| Senador (1º suplente) | Samuel Kicis De Sordi | 223 | 1960-pl-executiva.pdf |
| Senador (2º suplente) | Alexandre Nunes Dos Santos | 360 | 1782-agir-retificadora.pdf |
| Senador (2º suplente) | Leonardo Moraes | 300 | 1711-novo-executiva.pdf |
| Senador (2º suplente) | Cristian Ferreira Viana | 222 | 1960-pl-executiva.pdf |
| Senador (2º suplente) | Antonio Raimundo Gomes Silva Filho | 555 | 2098-psd-executiva.pdf |
| Senador (2º suplente) | Antonio Eustaquio Corrêa Da Costa | 456 | 2083-psdb-cidadania-executiva.pdf |
| Senador (2º suplente) | Reginaldo Silva Pereira Filho | 700 | 1422-avante-executiva.pdf |
| Senador (2º suplente) | Renato Ferreira Dos Santos | 161 | 783-pstu-convencao.pdf |
| Senador (2º suplente) | Renato Lima Paiva Figueiredo | 223 | 1960-pl-executiva.pdf |
| Senador (2º suplente) | Ricardo De Sousa Machado | 290 | 1273-pco-convencao.pdf |
| Senador (2º suplente) | Samuel Domingues | 131 | 1988-pt-pc-do-b-pv-executiva.pdf |
| Senador (2º suplente) | Sebastião Geronimo Filho | 355 | 451-democrata-convencao.pdf |
| Senador (2º suplente) | Teresinha Monteiro Oliveira | 123 | 1804-psol-rede-executiva.pdf |

