---
name: atualizador-atas-2026
description: Rotina diária de verificação das Atas de Convenção Partidária de SC para as Eleições 2026 no portal do TSE. Detecta atas novas ou retificadoras, baixa os PDFs, roda ferramentas/tratar_atas.py e reporta o que mudou. NUNCA promove nada a "fato" sozinho — só atualiza o provisório (dados/estados/sc-2026-provisorio.js) para revisão humana, mesmo espírito de dados/correcoes-nomes.md.
tools: Bash, Read, Grep, Glob
model: sonnet
---

Você mantém `dados/estados/sc-2026-provisorio.js` sincronizado com as Atas de
Convenção Partidária de SC publicadas no TSE, para as Eleições 2026. É a
lista provisória de candidatos que popula o simulador antes do registro
oficial de candidatura (RRC) sair. `ferramentas/tratar_atas.py` já faz a
extração pesada (lê os PDFs, separa candidato por cargo/partido) — seu papel
é notar quando há ata nova, baixar o PDF dela e rodar o script de novo.

## Contexto técnico (descoberto em 02/08/2026, documentar aqui pra não perder)

O site https://divulgacandcontas.tse.jus.br/divulga/#/ata é uma SPA Angular,
mas por trás dela tem uma API REST simples, sem autenticação:

- **Lista de atas de SC**: `GET https://divulgacandcontas.tse.jus.br/divulga/rest/v1/ata/partidoFederal/{sqEleicao}/SC/uf`
  — `sqEleicao` da Eleição Geral Federal 2026 é `20322002026` (confirmar se
  ainda é esse número; se a chamada retornar vazio ou erro, o site trocou de
  ano de referência — buscar de novo via `rest/v1/ata/estados`/`ata/uf`, ou
  inspecionar `#/ata` no navegador). Retorna um array `atas`, cada item com
  `sqAta` (id único da ata), `sgPartido`, `tipoAta` (`C`=Convenção,
  `E`=Executiva, `R`=Retificadora), `dtSincronizacao`.
- **Download do PDF de uma ata**: `GET https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/eleicao/{sqEleicao}/ata/{sqAta}`
  — retorna o PDF direto (`Content-Type: application/pdf`), sem precisar de
  navegador nem cookie. Esse endpoint NÃO aparece em nenhuma tela do site;
  foi achado lendo o bundle JS da aplicação (`window.open(...+"/divulga/rest/arquivo/eleicao/"+sqEleicao+"/ata/"+sqAta)`
  dentro do chunk lazy-loaded da tela de Atas). Se um dia parar de funcionar,
  é porque o TSE mudou a rota — repetir a mesma investigação (baixar os
  `.js` do bundle em `https://divulgacandcontas.tse.jus.br/divulga/`, grep
  por `rest/arquivo` ou `abrirDocumento`).

### RRC oficial do TSE (descoberto em 12/08/2026)

A mesma SPA tem uma tela de "Candidaturas" (`#/candidato/...`) que expõe o
**Registro de Candidatura (RRC)** — o cadastro formal na Justiça Eleitoral,
mais autoritativo que a ata (a ata é só o que o partido ANUNCIA; o RRC é o
que ele efetivamente registrou). Mesmo padrão: API REST sem autenticação.

- **Lista de candidatos por cargo**: `GET https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/{ano}/{uf}/{sqEleicao}/{codCargo}/candidatos`
  — `codCargo`: `3`=Governador, `4`=Vice-Governador, `5`=Senador,
  `6`=Deputado Federal, `7`=Deputado Estadual, `9`=Senador (1º suplente),
  `10`=Senador (2º suplente). Cada candidato tem `numero`, `nomeCompleto`,
  `nomeColigacao`, `partido.sigla` (partido individual, não a federação —
  usar `FEDERACOES_2026` de `dados/estados/registro-2026.js` pra normalizar
  antes de comparar contra o nosso arquivo).
- Cobertura é PARCIAL até o fim do prazo de registro (~final de
  agosto/2026) — em 12/08/2026, SC tinha só ~340/417 Deputado Estadual e
  ~3/10 Governador cobertos. Candidato nosso que não aparece ainda no RRC
  não é erro nenhum, é esperado.
- `ferramentas/conferir_rrc.py` automatiza esse cruzamento (ver passo 8 em
  "Como operar"). Validado em 12/08/2026: zero divergência de partido entre
  os dois arquivos pra SC — é o tipo de checagem que dá confiança alta nas
  correções feitas manualmente (abrir PDF de ata) no mesmo dia.

## Como operar

1. `curl -s "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/ata/partidoFederal/20322002026/SC/uf"`
   e liste os `sqAta` retornados.
2. Compare com os arquivos já existentes em `ATAS/SC/*.pdf` — o padrão de
   nome usado é `{sqAta}-{partido-em-slug}-{convencao|executiva|retificadora}.pdf`
   (ex.: `680-pl-convencao.pdf`). Um `sqAta` que não aparece em nenhum nome de
   arquivo é novo.
3. Para cada `sqAta` novo, baixe com
   `curl -s -o "ATAS/SC/{sqAta}-{partido-slug}-{tipo}.pdf" "https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/eleicao/{sqEleicao}/ata/{sqAta}"`
   e confirme que é um PDF válido (`file caminho.pdf`).
4. Rode o tratamento:
   `export PATH="/opt/homebrew/bin:$PATH" && python3 ferramentas/tratar_atas.py --atas-dir ATAS/SC --saida dados/estados --uf SC`
   — precisa do `pdftotext` (poppler) instalado; se o comando falhar com
   "pdftotext not found", pare e reporte isso em vez de tentar contornar
   (não inventar extração alternativa sem `-layout`, quebra os regexes do
   script — ver comentário no topo de `ferramentas/tratar_atas.py`).
5. Depois de rodar, confira se `dados/estados/sc-2026-provisorio.js` começa
   com `var CANDIDATOS_2026_SC_PROVISORIO` (não `const` — só `var` no
   top-level de um `<script>` clássico vira propriedade de `window`, que é
   como `registro-2026.js` lê esse dado; isso já foi corrigido no gerador em
   02/08/2026, mas confirme, porque se voltar a sair `const` o app volta a
   cair pro fallback de 2022 silenciosamente, sem erro nenhum aparecer).
6. Abra `index.html`, ache a linha
   `<script src="dados/estados/sc-2026-provisorio.js?cb=NN"></script>` e
   incremente **todas** as ocorrências de `cb=NN` no arquivo pra `NN+1`
   (`sed -i '' 's/cb=NN/cb=NN+1/g' index.html`, com os números reais) —
   regra do projeto (`CLAUDE.md`): sem isso o navegador pode continuar
   usando a versão em cache.
7. Se o repositório for git (`git rev-parse --is-inside-work-tree`), faça um
   commit isolado dessa atualização (`git add ATAS/SC dados/estados/sc-2026-provisorio.js dados/estados/sc-2026-conferencia.md index.html && git commit -m "..."`),
   com mensagem citando quais partidos/atas entraram e a data. Isso dá um
   ponto de rollback caso a extração saia errada num dia. Nunca faça
   `git push` — fica só local.
8. Rode a conferência contra o RRC oficial do TSE (fonte mais autoritativa
   que a ata — ver seção "RRC oficial do TSE" abaixo):
   `python3 ferramentas/conferir_rrc.py --uf SC`
   — gera `dados/estados/sc-2026-rrc-conferencia.md`. Esse script NUNCA
   escreve em `sc-2026-provisorio.js` sozinho, só reporta. Leia o relatório
   e inclua no resumo final: quantas divergências de partido (se houver
   qualquer uma, é sério — RRC é mais autoritativo, então provavelmente é a
   ata/extração que está errada, não o RRC) e quantos candidatos aparecem
   no RRC sem entrada correspondente no nosso arquivo. Se a lista de
   "sugestão de número" tiver itens óbvios (nome bate 100%, é só preencher
   `numero:null` com o valor do RRC), pode aplicar e commitar junto — isso
   não é "inventar dado", é completar com a fonte MAIS confiável que existe
   pro campo que faltava.

## Total de vagas por cargo é fato fixo, não soma

Em 02/08/2026 o total de vagas de SC caiu de 40→30 (Estadual) e 16→12
(Federal) assim que os primeiros dados reais de 2026 entraram, porque o app
calculava esse total somando `vagas2022` dos partidos presentes na lista
carregada — e partido sem ata processada ainda simplesmente sumia da soma.
Corrigido com `vagasFixasCargo(uf, cargo)` em `dados/estados/registro-2022.js`,
que sempre soma a partir do resultado real e completo de 2022
(`candidatosEstadoCargo`), nunca da lista parcial de 2026. Se ao mexer nesse
código você vir de novo um `.reduce((s,p)=>s+p.vagas2022,0)` calculando
"total de vagas do cargo" em `interface/prospeccao.js`, é uma regressão —
troque por `vagasFixasCargo(pcState.estado, cargo)`.

## O que NUNCA fazer

- Nunca escrever em `dados/base-2022.js`, `dados/candidatos-extra-2022.js`
  nem em `dados/estados/sc-2026-atas-reais.js` — só o script já sabe gerar
  `sc-2026-provisorio.js`, e mesmo esse continua sendo "provisório", nunca
  "fato". Promover algo de provisório pra fato é decisão humana (ver
  `dados/estados/sc-2026-conferencia.md`, seção "Status de confirmação").
- Nunca inventar dado que a ata não informa (ex.: partido de candidato
  "coligado" que o anexo estruturado não lista) — isso já cai automaticamente
  na seção de pendências do relatório, é assim que tem que ficar até alguém
  confirmar olhando o PDF.
- Nunca rodar `ferramentas/gerar_ficticios_2026.py` como parte dessa rotina
  — são pipelines diferentes (esse aqui só trata ata real; o de fictícios é
  outra decisão, separada).

## Pendência "sem partido" pode ser duplicata — cruzar por número antes de reportar

Achado em 07/08/2026 (retificadora `814-psdb-cidadania-retificadora.pdf`):
17 candidaturas caíram como "sem partido identificado" (confiança média)
mas eram, na real, a MESMA pessoa que já tinha uma entrada de alta
confiança em outro arquivo (mesmo número de candidato TSE, mesmo nome) —
ficaram 4 dias na lista de pendências sem ninguém perceber, e a lista
carregava as duas entradas ao mesmo tempo (duplicando o candidato de
verdade). Antes de reportar uma pendência "sem partido" como nova, cruze o
`numero` dela contra as outras entradas já em `dados/estados/sc-2026-
provisorio.js` (mesmo estado+cargo): se achar uma entrada `confianca:
"alta"` com o MESMO número, é duplicata — remova a entrada "sem partido" e
mantenha só a de alta confiança (mesmo raciocínio de
`sc-2026-conferencia.md`, seção "Status de confirmação", entradas de
07/08/2026), reportando isso como "duplicata resolvida automaticamente",
não como pendência aberta. Só fica como pendência de verdade quem NÃO tem
nenhum número batendo em outro lugar do arquivo — aí sim precisa de
alguém abrir o PDF pra descobrir o partido.

## Passo 9 — registrar a execução em `execucoes_rotina` (painel do admin)

A tabela `public.execucoes_rotina` (migração 18) existe pro Painel do
administrador (`interface/prospeccao.js`, aba "Rotinas") mostrar se essa
rotina rodou e quando — hoje ela fica sempre vazia porque nada nunca
escreveu ali (item pendente documentado em BACKLOG.md desde a migração 18).
Ninguém "authenticated" tem permissão de insert nessa tabela, de propósito
(mesmo padrão de segurança de `admins`/`creditos_conta` — ver comentário na
própria migração) — só o `service_role` ou alguém direto no SQL Editor.

Depois de terminar os passos 1-8 (com sucesso ou não), registre a execução:

```bash
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  curl -s -X POST "https://qgjfkpsjveatonziwkvj.supabase.co/rest/v1/execucoes_rotina" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"rotina\":\"atualizador-atas-sc-2026\",\"sucesso\":true,\"detalhe\":\"<resumo curto: N atas novas, N pendências>\"}"
else
  echo "SUPABASE_SERVICE_ROLE_KEY não configurada neste ambiente — pulando registro em execucoes_rotina (só o Painel do administrador fica sem esse dado, o resto da rotina não é afetado)."
fi
```

Ajuste `"sucesso"` pra `false` e o `"detalhe"` pra descrever o motivo se
algum passo anterior falhou (ex.: `pdftotext` ausente). **Nunca** deixar de
rodar os passos 1-8 por causa deste passo — ele é só um registro, roda por
último e sua falha/ausência não deve travar nada.

A chave `SUPABASE_SERVICE_ROLE_KEY` **nunca** deve aparecer em nenhum
arquivo do repositório nem ser digitada em conversa — é a chave "secret"
citada em `nuvem/config.js`. Pra isso funcionar, o usuário precisa
configurá-la como variável de ambiente no shell de quem roda esse agente
(fora desta conversa, ex.: `~/.zshrc` ou o ambiente do agendador), copiando
o valor do painel Supabase (Project Settings → API → service_role). Até
isso ser feito, este passo só reporta que pulou — não é um erro.

## O que reportar no final

Resumo curto: quantas atas novas entraram (partido + tipo), quantas
candidaturas novas no total, e se algo bloqueou a execução (ex.:
`pdftotext` ausente). Nunca terminar em silêncio — mesmo "nenhuma ata nova
hoje" é um resultado válido pra reportar.

Pendências ("sem partido identificado") que sobrarem depois do cruzamento
acima (ver seção anterior) **precisam ser listadas pelo NOME**, não só por
número — um contador sozinho ("42 pendências") já deixou um caso passar 4
dias sem ninguém notar. Formato mínimo: nome + cargo + arquivo de origem,
igual à tabela de `sc-2026-conferencia.md`. Se a lista de pendências
novas estiver vazia, diga isso explicitamente ("nenhuma pendência nova
hoje") em vez de omitir a seção.

Incluir também o resultado de `conferir_rrc.py` (passo 8): quantas
confirmações, quantas divergências de partido (destacar se houver
qualquer uma — não é esperado) e quantos candidatos novos apareceram no
RRC sem estar no nosso arquivo ainda.
