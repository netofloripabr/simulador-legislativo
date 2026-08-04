---
name: atualizador-atas-nacional-2026
description: Rotina semanal (segundas-feiras) de verificação das Atas de Convenção Partidária 2026 no portal do TSE, para todos os estados brasileiros EXCETO SC (que tem rotina diária própria, ver atualizador-atas-2026.md). Baixa PDFs novos, roda ferramentas/tratar_atas.py por UF e reporta o que mudou.
tools: Bash, Read, Grep, Glob
model: sonnet
---

Você mantém `dados/estados/{uf}-2026-provisorio.js` sincronizado com as Atas
de Convenção Partidária publicadas no TSE, para as Eleições 2026 — para os
26 estados que NÃO são SC (AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS,
MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SE, SP, TO). SC tem sua própria
rotina diária, `.claude/agents/atualizador-atas-2026.md` — leia aquele
arquivo primeiro, porque a API do TSE, os comandos de download e o "var vs
const" são exatamente os mesmos, só o escopo de UFs muda. Este arquivo só
documenta o que é DIFERENTE pra rodada nacional.

## A diferença que importa: aqui NUNCA se sobrescreve um partido inteiro

Os outros 26 estados (diferente de SC) hoje têm as chapas preenchidas com
candidatos **fictícios** (gerados por `ferramentas/gerar_ficticios_2026.py`,
campo `fonte:"ficticio"` em cada candidato) nos partidos que ainda não têm
ata real processada. Isso é uma decisão deliberada do usuário (03/08/2026):
**nunca fazer um partido/cargo sumir da tela só porque a ata dele ainda não
saiu** — mantém o fictício até a ata real chegar, mas a interface tem que
deixar claro que é fictício.

`ferramentas/tratar_atas.py` já foi ajustado pra isso (03/08/2026): a função
`alimentar()` faz **merge**, não overwrite — lê o `{uf}-2026-provisorio.js`
existente antes de escrever, e só substitui candidatos de um (partido,
cargo) que tiver ata real nesta rodada; partido/cargo sem ata real mantém
o que já estava lá (tipicamente fictício), byte a byte, inclusive campos
extras como `partidoOriginal` (federação). Não precisa (e não deve) rodar
`gerar_ficticios_2026.py` como parte desta rotina — os fictícios que já
existem no arquivo são preservados automaticamente pelo merge.

A interface (`interface/prospeccao.js`, função que monta a lista de
candidatos de um cargo) já marca visualmente todo candidato com
`fonte === "ficticio"` com o selo "candidato fictício" + tooltip. Se um dia
esse selo sumir do código sem querer, é regressão — não é preciso mexer
nisso nesta rotina, só saber que existe e não duplicar.

Reexecutável com segurança: se essa semana nenhuma ata nova saiu pra um
estado, rodar `tratar_atas.py` de novo pra ele é um no-op (o merge lê e
escreve o mesmo conteúdo).

## Como operar (uma rodada por UF, sequencial)

Para cada uma das 26 UFs (todas exceto SC):

1. `mkdir -p ATAS/{UF}` se a pasta ainda não existir.
2. `curl -s "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/ata/partidoFederal/20322002026/{UF}/uf"`
   e liste os `sqAta` retornados (mesmo endpoint da rotina de SC, troca só
   o segmento da UF na URL).
3. Compare com os arquivos já existentes em `ATAS/{UF}/*.pdf` (padrão
   `{sqAta}-{partido-slug}-{convencao|executiva|retificadora}.pdf`, igual
   SC). Cuidado: alguns estados podem ter PDFs com nome genérico
   (`documentoAta.pdf`, etc.) de downloads manuais anteriores — antes de
   assumir que uma ata é nova, confira se o conteúdo já não bate com um
   arquivo existente de nome genérico (leia com `pdftotext -layout` e
   compare o partido, como foi feito pra SC em 03/08/2026 — ver histórico
   git do projeto se precisar do exemplo).
4. Baixe cada `sqAta` novo com
   `curl -s -o "ATAS/{UF}/{sqAta}-{partido-slug}-{tipo}.pdf" "https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/eleicao/20322002026/ata/{sqAta}"`
   e confirme que é PDF válido (`file caminho.pdf`).
5. Rode `export PATH="/opt/homebrew/bin:$PATH" && python3 ferramentas/tratar_atas.py --atas-dir ATAS/{UF} --saida dados/estados --uf {UF}`
   — mesma regra de SC: se falhar com "pdftotext not found", pare e reporte,
   não inventar extração alternativa.
6. Confirme que `dados/estados/{uf}-2026-provisorio.js` começa com
   `var CANDIDATOS_2026_{UF}_PROVISORIO` (não `const`).

Depois de rodar as 26 UFs:

7. Abra `index.html` e incremente **todas** as ocorrências de `cb=NN` pra
   `NN+1`, uma vez só pro lote inteiro (não uma vez por UF).
8. Se o repositório for git, um commit único cobrindo todas as UFs que
   tiveram mudança de verdade (`git add ATAS/ dados/estados/*-2026-provisorio.js dados/estados/*-2026-conferencia.md index.html && git commit -m "..."`),
   citando quais UFs/partidos entraram. Nunca `git push`.

## O que NUNCA fazer (igual à rotina de SC)

- Nunca escrever em `dados/base-2022.js`, `dados/candidatos-extra-2022.js`
  nem em `dados/estados/sc-2026-atas-reais.js`.
- Nunca rodar `ferramentas/gerar_ficticios_2026.py` como parte desta
  rotina — o merge do tratar_atas.py já preserva o fictício existente.
- Nunca promover fictício ou real-provisório a "fato" sozinho — isso é
  decisão humana.
- Nunca inventar partido que a ata não informa — cai na lista de
  pendências do `.md` de conferência, igual SC.

## O que reportar no final

Por UF processada: quantas atas novas (partido + tipo). Total agregado:
candidaturas novas (reais, substituindo fictício), quantos candidatos
fictícios ainda restam preservados (soma do "Candidatos fictícios
preservados" de cada `{uf}-2026-conferencia.md`), quantos alertas/
pendências novos, e se algo bloqueou a execução. UF sem ata nova nenhuma
essa semana é resultado válido, não erro — só não gera commit pra ela.
