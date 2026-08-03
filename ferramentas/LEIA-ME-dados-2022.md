# Como baixar e processar os dados de 2022 (todos os estados)

Este documento é o elo entre o Claude Code (que baixa, porque tem acesso de
rede irrestrito na sua máquina) e este script (que trata). O Cowork não
consegue baixar `cdn.tse.jus.br` — bloqueado pela rede do ambiente.

## 1. O que baixar

Só **3 arquivos**, todos do Brasil inteiro num arquivo só cada (não precisa
baixar os 27 arquivos "por seção eleitoral" — são enormes e mais granulares
do que o projeto precisa; usamos os já agregados por candidato/município/zona,
que têm o mesmo nível de detalhe que `dados/base-2022.js` já usa pra SC):

| O que é | Link | Por quê |
|---|---|---|
| Votação por candidato, município e zona | https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip | Votos de cada candidato — a mesma agregação que já usamos em SC |
| Cadastro de candidatos (dados pessoais + situação) | https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip | Nome, nome de urna, data de nascimento, gênero, grau de instrução, cor/raça, ocupação, situação de totalização (eleito/não eleito/suplente) |
| Motivo da cassação | https://cdn.tse.jus.br/estatistica/sead/odsele/motivo_cassacao/motivo_cassacao_2022.zip | Candidaturas invalidadas/cassadas e o motivo — resolve a pendência de "voto invalidado" que hoje é preenchida à mão em `dados/base-2022.js` |

(Se quiser bens/coligações/redes sociais depois, tem mais recursos na mesma
página do dataset — https://dadosabertos.tse.jus.br/dataset/candidatos-2022 —
mas os 3 acima bastam pro que o projeto usa hoje.)

## 2. Onde colocar — FORA da pasta do projeto

Para manter o projeto leve (é o objetivo aqui: só os arquivos tratados e
pequenos entram em `alesc-simulador`), descompacte os 3 ZIPs em qualquer
pasta temporária **fora** de `alesc-simulador` — por exemplo:

```
~/Downloads/tse-2022/
  votacao_candidato_munzona_2022_BRASIL.csv   (ou os .csv por UF, se vier separado)
  consulta_cand_2022_BRASIL.csv
  motivo_cassacao_2022_BRASIL.csv
```

Os CSVs do TSE costumam vir em Latin-1 (ISO-8859-1) separados por `;` — o
script já espera isso, não precisa converter nada manualmente.

Os 3 ZIPs somados dão dezenas de MB (bem menos que os arquivos "por seção
eleitoral"), mas ainda assim não há necessidade de guardar isso dentro do
projeto — depois de rodar o script (passo 3), essa pasta pode ser apagada
(passo 5). O único arquivo grande que fica de fato é o de votação nacional
(todos os cargos, todo o Brasil, porque o TSE não separa por cargo no
download) — não tem como reduzir isso no download, só descartar depois de
extrair o que interessa.

## 3. Rodar

```
cd alesc-simulador
python3 ferramentas/tratar_resultados_2022.py --dados-dir ~/Downloads/tse-2022 --uf SC --debug
```

**Primeiro rodar só `--uf SC`** e comparar a saída com `dados/base-2022.js`
(que já foi verificado à mão) — é o teste de confiança do pipeline antes de
rodar pros outros 26 estados. Só depois disso rodar sem `--uf` (todos os
estados) ou uma lista (`--uf SC,PR,RS,...`).

Esse script eu (Cowork) escrevi e testei com dados fictícios no formato do
TSE (achei e corrigi um bug real nesse teste), mas **não testei contra o
arquivo oficial de verdade** — não tenho como baixar aqui. É possível que
precise de ajuste fino nos nomes de coluna na primeira rodada real — o
script já loga quais colunas encontrou/mapeou pra facilitar esse ajuste.
Roda, me manda o que der de erro (ou volta pro Cowork com o log) que eu
conserto.

## 5. Limpar (depois que os `.js` estiverem gerados e conferidos)

Apague a pasta temporária (`~/Downloads/tse-2022/` ou onde você descompactou
os ZIPs, e os próprios ZIPs) — ela não é mais necessária. Só os arquivos
`dados/estados/{uf}-2022.js` (pequenos, texto) ficam no projeto de fato.

## Resumo passo a passo

1. Baixar os 3 ZIPs (links da seção 1) numa pasta fora do projeto (ex.:
   `~/Downloads/tse-2022/`).
2. Descompactar os 3 ali.
3. `cd alesc-simulador && python3 ferramentas/tratar_resultados_2022.py --dados-dir ~/Downloads/tse-2022 --uf SC`
4. Comparar a saída (`dados/estados/sc-2022.js`) com `dados/base-2022.js` —
   o próprio script já mostra as diferenças no terminal.
5. Se estiver bom, rodar de novo sem `--uf` (ou com a lista dos estados que
   quiser) pra gerar os outros.
6. Apagar a pasta `~/Downloads/tse-2022/` e os ZIPs baixados.

## 4. O que sai

Um arquivo por estado, `dados/estados/{uf}-2022.js`, no mesmo formato de
`dados/base-2022.js` (agrupado por partido, com `vagas2022` e lista de
`candidatos`), mais os campos novos:

- `nascimento`, `genero`, `grauInstrucao`, `corRaca`, `ocupacao` — dados
  pessoais do cadastro de candidatura (dado público do TSE, mas ainda assim:
  pense antes de exibir tudo isso na tela do simulador — o projeto até agora
  só mostra nome/partido/votos).
- `invalidado2022` / `motivoInvalidacao` — agora vem do arquivo oficial de
  cassação, não precisa mais conferir residual de votos à mão (ver pendência
  "conferência de candidaturas invalidadas" no `PROJETO.md`).
- `eleito2022` — vem direto do campo oficial de situação de totalização do
  TSE (`DS_SIT_TOT_TURNO`), não da fórmula de quociente+sobras — resolve a
  limitação conhecida do simulador (1 vaga podendo divergir em disputas
  apertadas).

Propositalmente **não incluí CPF nem título de eleitor** no arquivo de saída
— é dado público, mas mais sensível do que o simulador precisa mostrar. Se
quiser mesmo assim, é só pedir que eu adiciono.

`dados/base-2022.js` (SC, já validado à mão) **não é sobrescrito** por esse
processo — só comparado.
