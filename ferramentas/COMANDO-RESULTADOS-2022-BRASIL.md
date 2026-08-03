# Comando para o CoWork — resultados oficiais 2022 (Brasil inteiro)

> Cole este arquivo (ou o resumo do fim) como instrução pro CoWork. Espelha o
> mesmo padrão de rigor já usado em `ferramentas/tratar_atas.py` — só muda a
> natureza do dado: aqui é **resultado histórico** (votos, eleito/não eleito),
> não candidatura futura.

## O que isto NÃO é

Não confundir com o pipeline de `tratar_atas.py` (Atas de Convenção,
candidatura **2026**, ainda sem resultado). Isto aqui é o **resultado real
da eleição de 2022**, já apurado e definitivo — o mesmo tipo de dado que já
existe em `dados/base-2022.js`, só que hoje limitado a Deputado Estadual de
Santa Catarina. O objetivo é estender essa mesma cobertura pros 27
estados + DF, e pros 3 cargos que o simulador já modela.

## Objetivo

Baixar e tratar os resultados oficiais de 2022 de **todos os estados**, pros
cargos de **Deputado Estadual, Deputado Federal e Senador**, extraindo por
candidato: nome completo, nome de urna, partido, número, município de maior
votação, gênero, votos nominais e situação final (eleito, suplente, não
eleito etc).

## Fonte

Portal de Dados Abertos do TSE — `https://dadosabertos.tse.jus.br/` —
dataset de resultados de 2022, arquivo `votacao_candidato_munzona_2022_<UF>.csv`
(um por UF, dentro do pacote de resultados por candidato/município/zona).
Campos oficiais relevantes:

| Campo TSE | Uso |
|---|---|
| `NR_CANDIDATO` | número |
| `NM_CANDIDATO` | nome completo |
| `NM_URNA_CANDIDATO` | nome de urna |
| `SG_PARTIDO` | partido |
| `DS_CARGO` | cargo (filtrar só Deputado Estadual / Deputado Federal / Senador) |
| `SG_UF` | estado |
| `NM_MUNICIPIO` | município (agregar pelo de maior votação, já que o dado bruto vem por município+zona) |
| `DS_GENERO` | gênero |
| `QT_VOTOS_NOMINAIS` | votos (somar entre municípios/zonas) |
| `DS_SIT_TOT_TURNO` | situação final — copiar o texto oficial do TSE, não simplificar pra "eleito/não eleito" |

Mesma fonte/metodologia já usada pra Santa Catarina no início deste projeto
(arquivo `votacao_secao_2022_SC.csv`) — só generalizando pra todo o Brasil.

## Regra de ouro (não negociável)

**Nada disso vira dado "oficial" do projeto sem revisão humana.** Mesmo
princípio de `dados/correcoes-nomes.md` e de `tratar_atas.py`:
- Gera só arquivo `-provisorio`, nunca escreve em `dados/base-2022.js` nem em
  qualquer arquivo que o app já lê hoje.
- Cada UF processada gera também um relatório de conferência em Markdown,
  com uma tabela de confirmação vazia (preenchida por humano depois).
- Cita a fonte exata (nome do arquivo CSV) em cada candidato, não só "TSE".
- Não captura CPF nem título de eleitor — não é usado pelo simulador e é
  dado mais sensível que o necessário.

## Saída esperada, por UF

```
dados/estados/{uf}-2022-resultado-provisorio.js
dados/estados/{uf}-2022-conferencia.md
```

Processar **um estado por vez**, incrementalmente — mesmo fluxo já adotado
pro pipeline de 2026 (SC primeiro, depois os outros conforme o tempo
permitir). Reexecutável sem duplicar nem sobrescrever confirmação humana já
feita.

## Schema por candidato

```js
{
  id: "pl-sc-ana-caroline-campagnolo-galvao", // ver regra abaixo — nunca regenerar depois de criado
  nome: "Ana Caroline Campagnolo Galvao",
  nomeUrna: "Ana Caroline Campagnolo",
  numero: 12345,
  partido: "PL",
  cargo: "Deputado Estadual", // ou "Deputado Federal" / "Senador"
  uf: "SC",
  municipio: "Joinville",
  genero: "FEMININO",
  votos: 196571,
  situacao: "ELEITO POR QP", // texto oficial do TSE (DS_SIT_TOT_TURNO)
  fonteArquivo: "votacao_candidato_munzona_2022_SC.csv",
}
```

### Regra do `id` (crítica)

`slugify(partido + "-" + uf + "-" + nome completo)`, com a mesma função
`slugify()` já usada em `ferramentas/tratar_atas.py` (minúsculas, sem
acento, espaços/pontuação viram `-`). A diferença pro `id` que já existe em
`dados/base-2022.js` hoje (ex.: `"pl-ana-caroline-campagnolo-galvao"`) é que
**agora entra a UF** — sem isso, candidatos de nome igual em estados
diferentes colidem. Uma vez gerado, o `id` nunca é recalculado — é a mesma
identidade estável que sustenta os palpites salvos no app (ver comentário em
`nuvem/palpites.js`).

## Script já pronto

`ferramentas/tratar_resultados_2022.py` já existe no projeto, com as três
rotinas (tratar/verificar/alimentar) implementadas seguindo exatamente este
comando. O CoWork só precisa:

1. Baixar o CSV de resultados 2022 da UF desejada em
   `https://dadosabertos.tse.jus.br/` e salvar em algo como `RESULTADOS/2022/`.
2. Rodar `python3 ferramentas/tratar_resultados_2022.py --csv-dir RESULTADOS/2022 --uf SC`
   (trocar `SC` pela UF de cada vez, uma por execução).
3. Repetir pra cada UF — gera `dados/estados/{uf}-2022-resultado-provisorio.js`
   + `dados/estados/{uf}-2022-conferencia.md` a cada rodada.

## Fora de escopo por enquanto

Presidente e Governador (2022) não entram aqui — o simulador ainda não
modela esses cargos como base de projeção, só a mini pesquisa (2026) pede
opinião sobre eles. Se algum dia forem necessários, é um pedido separado.
