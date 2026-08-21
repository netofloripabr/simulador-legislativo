# Sistema de pontuação e ranqueamento — RASCUNHO (não implementado)

Documento de design, escrito em 18/08/2026 a pedido do usuário, pra
começar a discussão de como pontuar e ranquear quem preencheu uma
cédula. **Nada aqui está implementado ou decidido** — é ponto de
partida pra revisão. Fórmulas exatas (pesos, faixas) são a parte mais
fácil de ajustar depois; a estrutura de quatro eixos é o que precisa de
aval primeiro.

## Por que 4 eixos, não 1 número só

O pedido original citava quatro critérios: acertos, proximidade,
momento de apresentação da cédula, cumprimento de tarefas. Cada um mede
uma coisa diferente e nenhum sozinho conta a história toda:

| Eixo | O que mede | Por que importa |
|---|---|---|
| **Acertos** | Quantos dos eleitos reais a pessoa marcou como eleito | O núcleo do "jogo" — acertar quem se elege |
| **Proximidade** | Quão perto o NÚMERO de votos ficou do resultado real | Recompensa quem entende a MAGNITUDE, não só a ordem — alguém pode acertar o eleito por sorte de ranking sem entender a força real do voto |
| **Momento da cédula** | Quando a pessoa fechou/travou a lista, em relação ao prazo | Prestígio de quem "comprou" a previsão cedo, antes de ter mais informação disponível (pesquisas, notícias) — trava especulação de última hora |
| **Tarefas cumpridas** | Completude do perfil/engajamento (todos os cargos preenchidos, convites, etc.) | Gamificação — mantém gente voltando, não é sobre acerto político |

## Eixo 1 — Acertos (peso sugerido: maior do grupo)

Compara `marcadoEleito` do palpite salvo contra o resultado oficial
(quando existir, Fase 6). Proposta de pontuação por CARGO:

- **Acerto exato de posição** (ex.: marcou a pessoa X como 1ª mais
  votada do partido, e ela foi mesmo a mais votada): pontuação cheia.
- **Acerto de "está eleito", posição errada**: pontuação parcial —
  ainda importa mais do que zero, já que "vai se eleger" é a pergunta
  principal do produto.
- **Falso positivo** (marcou eleito quem não se elegeu): não subtrai
  pontos por padrão (evita desincentivar ousadia/palpites de underdog)
  — MAS isso é uma decisão de produto explícita a confirmar; a
  alternativa (penalizar) favorece quem "joga seguro" copiando
  pesquisas.

Question em aberto: pontuação por cargo (Estadual/Federal/Senador)
soma pra um ranking único, ou existem rankings SEPARADOS por cargo? O
modelo Fader já trata os 3 cargos como abas independentes — faz
sentido o ranking espelhar isso, com um "ranking geral" agregado como
resumo.

## Eixo 2 — Proximidade numérica

Usa a distância entre o voto PREVISTO e o voto REAL de cada candidato,
normalizada (não em votos absolutos — um erro de 5 mil votos é grave
pra um candidato pequeno e irrelevante pra um grande). Proposta:

```
erro_relativo(candidato) = |votos_previsto − votos_real| / votos_real_do_cargo_inteiro
```

Pontuação inversamente proporcional ao erro médio — quanto menor o
erro médio dos candidatos da pessoa, mais pontos. Precisa de um piso
(erro acima de X% não desconta mais, pra não punir infinitamente um
palpite ousado num candidato marginal).

## Eixo 3 — Momento da cédula

Cada lista salva já tem timestamp (`agendarAutoSaveRascunho`,
`executarSalvarLista`). A pontuação de timing pode ser:

- **Janela de prestígio**: cédulas fechadas ("Avançar" apertado, não só
  salvas em rascunho) MUITO antes do prazo final ganham um multiplicador
  pequeno; quem trava em cima da hora não ganha bônus nem é punido —
  só não leva o extra.
- Precisa decidir: uma vez travada (depositada), a pessoa pode editar
  de novo? Se não pode, o timestamp de bloqueio é limpo e serve de
  prova; se pode, precisa decidir se o timing conta pelo PRIMEIRO
  depósito ou pelo ÚLTIMO.

## Eixo 4 — Cumprimento de tarefas

Separado dos outros três por natureza — não é sobre acerto político,
é engajamento. Candidatas a "tarefa":
- Completar as 3 cédulas (Estadual + Federal + Senador), não só uma.
- Completar o perfil (CPF, gênero, etc. já pedidos no cadastro).
- Convidar/trazer um amigo que também complete uma cédula.
- Responder a mini-pesquisa (feature hoje pausada, ver memória).

Pontuação de tarefas pode ser um selo/troféu separado do ranking
numérico principal (não misturar "eu sou bom em política" com "eu uso
muito o app") — dois sistemas de reconhecimento diferentes, não um só.

## Combinando os eixos — proposta de estrutura, não de números

```
pontuacao_final = f(acertos, proximidade) × bonus_timing
selo_engajamento = independente, não entra na conta acima
```

Acertos e proximidade combinados (não dá pra ranquear só por um dos
dois — ver tabela acima); timing como multiplicador pequeno (não deve
ser possível vencer só por ter sido rápido, com um palpite ruim);
tarefas como reconhecimento à parte.

## Perguntas em aberto pro usuário decidir

1. Ranking por cargo separado ou só um geral combinado?
2. Falso positivo (marcar eleito quem não se elegeu) desconta ponto ou não?
3. Depois de "depositar" a cédula, dá pra editar? Se sim, qual timestamp
   conta pro Eixo 3?
4. O ranking fica público (qualquer um vê a posição de todo mundo) ou
   só a própria posição + top N anônimo? (toca na Fase de privacidade,
   ponto em aberto do PROJETO.md)
5. Existe prêmio/reconhecimento real pro topo do ranking (Fase 6,
   "divulgar resultados e vencedores") ou é só bragging right dentro do
   app?

## Validade de candidatura na pontuação — POLÍTICA DEFINIDA (21/08/2026)

Decisões do usuário (não são mais rascunho):

1. **A cédula depositada é IMUTÁVEL.** Nenhuma correção de elenco, retirada
   ou invalidação altera o conteúdo depositado — ele é o retrato histórico
   do palpite. Quem muda é a INTERPRETAÇÃO na apuração:
2. **Candidatura retirada ou invalidada não gera ponto.** Na apuração
   final, a linha da cédula que aponta pra um candidato cuja candidatura
   foi retirada/indeferida/cassada simplesmente não pontua (nem positivo
   nem negativo).
3. **Candidato *sub judice* também não pontua.** Só candidatura
   definitivamente válida na apuração gera ponto. (Fonte do status: RRC do
   TSE, campo `descricaoSituacao` — hoje tudo "Aguardando julgamento"; a
   régua se aplica com os status finais, na apuração.)
4. **Lista salva com a base errada não é lista.** Lista da "era antiga"
   (elenco de 2022 embutido, anterior às atas) é INVÁLIDA para edição e
   para depósito — bloqueada na interface com aviso (implementado em
   21/08/2026: `listaEhDaEraAntiga` em interface/prospeccao.js, aplicada no
   Editar e no Depositar). Cédulas antigas JÁ depositadas permanecem
   imutáveis e são tratadas pela régua dos itens 2-3 na apuração.
