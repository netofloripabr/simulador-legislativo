# Conferência contra o RRC oficial — candidatos 2026 SC

Gerado em 2026-08-22 por `ferramentas/conferir_rrc.py`. Cruza `sc-2026-provisorio.js` (baseado em Atas de Convenção) contra o Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.

**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece no RRC não é erro, é normal (ainda não se registrou formalmente).

**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo princípio de `*-conferencia.md`: divergência aqui é para revisão humana.

Resumo: **672** confirmados, **0** divergência(s) de partido, **0** candidato(s) no RRC sem entrada correspondente no nosso arquivo.

## Cobertura por cargo

| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |
|---|---|---|---|
| Governador | 8 | 10 | 9 |
| Vice-Governador | 8 | 12 | 2 |
| Senador | 13 | 16 | 15 |
| Deputado Federal | 230 | 245 | 232 |
| Deputado Estadual | 408 | 435 | 410 |
| Senador (1º suplente) | 13 | 19 | 2 |
| Senador (2º suplente) | 13 | 15 | 2 |

## Divergências de partido

Nenhuma — todo número que bate entre os dois arquivos também bate o partido.

## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)

Ata não deu número individual (comum em vice/suplente, cujo número no anexo é o da chapa do titular); RRC já tem o registro. Conferir e preencher manualmente se fizer sentido — não é preenchido sozinho.

| Cargo | Nome | Número no RRC | Nossa fonte |
|---|---|---|---|
| Vice-Governador | Adriano Bornschein Silva | 22 | 680-pl-convencao.pdf |
| Vice-Governador | Angela Albino | 40 | 1148-psb-retificadora.pdf |
| Vice-Governador | Carlos Alberto Souza Bordin | 25 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Vice-Governador | Flávio Ferreira Amaral | 29 | 2099-pco-retificadora.pdf |
| Vice-Governador | Nathália Tarses Gomes De Melo | 80 | 189-up-convencao.pdf |
| Vice-Governador | Tatiane Pasdiora | 16 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Adriana Alves Da Silva | 808 | 189-up-convencao.pdf |
| Senador (1º suplente) | Camila Guimaraes Moreira Zimmer | 250 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Senador (1º suplente) | Clenilton Carlos Pereira | 155 | 769-44-união-11-pp-convencao.pdf |
| Senador (1º suplente) | Domingos Luiz Prestes | 290 | 2099-pco-retificadora.pdf |
| Senador (1º suplente) | Elaine Cristina Huber | 133 | 1235-pt-pc-do-b-pv-retificadora.pdf |
| Senador (1º suplente) | Geraldo Wetzel Neto | 221 | 1533-agir-executiva.pdf |
| Senador (1º suplente) | Jaqueline Almeida Camargo | 800 | 189-up-convencao.pdf |
| Senador (1º suplente) | Jocemir Adenilson De Souza | 160 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Marcos Becker | 161 | 347-pstu-convencao.pdf |
| Senador (1º suplente) | Rafael Caleffi | 222 | 680-pl-convencao.pdf |
| Senador (1º suplente) | Volnei Weber | 111 | 1683-44-união-11-pp-executiva.pdf |
| Senador (2º suplente) | Adriana Farias Pereira | 160 | 347-pstu-convencao.pdf |
| Senador (2º suplente) | Andrey Otavio Tomazi | 221 | 680-pl-convencao.pdf |
| Senador (2º suplente) | Balduino Rodrigues Ferreira | 222 | 680-pl-convencao.pdf |
| Senador (2º suplente) | Aparecida Da Silva | 500 | 1748-psol-rede-retificadora.pdf |
| Senador (2º suplente) | Eni José Voltolini | 111 | 1683-44-união-11-pp-executiva.pdf |
| Senador (2º suplente) | Fernanda Klitzke | 133 | 1235-pt-pc-do-b-pv-retificadora.pdf |
| Senador (2º suplente) | Genesio Moises Spillere | 155 | 769-44-união-11-pp-convencao.pdf |
| Senador (2º suplente) | Gilberto Silveira Dos Santos | 290 | 2099-pco-retificadora.pdf |
| Senador (2º suplente) | Jeann Souza Lisboa | 250 | 1810-25-prd-77-solidariedade-executiva.pdf |
| Senador (2º suplente) | Jorge Luiz Adão | 800 | 189-up-convencao.pdf |
| Senador (2º suplente) | Jacson Da Silva Dos Santos | 808 | 189-up-convencao.pdf |
| Senador (2º suplente) | Wagner Luiz Betto | 161 | 347-pstu-convencao.pdf |


## Decisões aplicadas (21-22/08/2026, com aval do usuário)

- **8 números atualizados pelo RRC** (mesmo cargo): Alan Alves Moreira (PSB 4033), Cleber Santana (PRD/SOL 7777), Diego Machado (PSD 55100), Inajara Rodrigues (MDB 15180), Joao do Posto (PRD/SOL 25123), Karine Muller (PSDB/CID 45888), Lucas Melo (PODE 20316), Neuri Mantelli (PSD 55007).
- **Sadi Miguel Ribeiro (AVANTE)**: Estadual 70111 → **Federal 7020** (registro oficial).
- **Ediane Aparecida Folle (PSD)**: Estadual 55333 → **Federal 5533** (registro oficial; uma remoção por engano em 21/08 foi corrigida no mesmo dia).
- **Neuri Luiz Mantelli (PSD, Estadual 55007): DESISTIU** — fica no elenco com `status:"desistencia"` (etiqueta branca + célula congelada, sem votos, sem pontos).

*(Arquivo regenerado por `conferir_rrc.py` — esta seção precisa ser re-anexada após cada regeração; a história completa está nos commits.)*
