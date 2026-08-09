# Simulador Eleitoral Legislativo (SEL)

Simulador de projeção eleitoral 2026 para cargos legislativos — hoje só
Santa Catarina (Deputado Estadual, Deputado Federal, Senador) — com base
nos dados reais de 2022 (TSE). Site estático (`index.html` + arquivos
`.js`/`.css`), sem build step, hospedado no GitHub Pages, com contas de
usuário e dados compartilhados reais via Supabase.

**"SEL" é só um apelido curto** pra facilitar conversa e nome de pasta —
não muda o nome público do site, que continua "Simulador Eleitoral —
Legislativo 2026" (sem nenhum vínculo com a ALESC de verdade — ver
`PROJETO.md`).

Para a visão de produto (usuários, objetivos, roteiro de fases, decisões
em aberto), veja [`PROJETO.md`](PROJETO.md).

## Como abrir

Dê duplo-clique em `index.html`. Ele abre no seu navegador normalmente —
não precisa instalar nada nem rodar servidor. O site publicado de verdade
fica em `netofloripabr.github.io/simulador-legislativo`.

## Estrutura das pastas

```
SEL/
├── index.html            → estrutura da página + a ordem de carregamento
│                            de todos os scripts (a ordem importa)
├── css/
│   └── estilo.css        → cores, fontes, layout (tema escuro verde-neon)
├── dados/
│   ├── base-2022.js      → resultado oficial de 2022 pra SC (fonte: TSE)
│   ├── candidatos-extra-2022.js → mais candidatos de 2022 (partidos sem
│   │                        cadeira eleita, mesma fonte)
│   ├── estados-brasil.js, partidos-brasil.js → listas de referência
│   │                        (todos os 27 estados, todos os partidos)
│   ├── correcoes-nomes.md → registro manual de nomes de candidato
│   │                        corrigidos, com a fonte de cada correção
│   └── estados/           → 1 arquivo por estado com a lista de
│                            candidatos 2026 daquele estado (ex.:
│                            sc-2026-provisorio.js) + os arquivos com o
│                            resultado real de 2022 de cada estado
├── calculo/
│   └── eleitoral.js      → só a regra eleitoral: quociente eleitoral,
│                            quociente partidário, sobras (D'Hondt) —
│                            nada de tela aqui
├── interface/
│   ├── app.js             → tela do "modo simulador" original (mais
│   │                         simples, sem conta/nuvem)
│   └── prospeccao.js      → tela do modo principal de hoje: cadastro,
│                             login, seleção de candidatos, revisão,
│                             Minhas Listas, Grupos, Médias — é o maior
│                             arquivo do projeto, onde a maioria das
│                             mudanças acontece
├── nuvem/
│   ├── cliente.js, config.js → conexão com o Supabase (banco de dados)
│   ├── autenticacao.js   → cadastro/login/CPF
│   ├── palpites.js       → salvar o palpite da pessoa, calcular médias
│   │                        públicas
│   ├── salvamentos.js    → "Minhas Listas" (várias listas nomeadas,
│   │                        salvar/editar/depositar)
│   ├── grupos.js          → criar grupo, entrar com código, comparação
│   ├── creditos.js        → sistema de créditos (2ª lista/grupo em diante)
│   └── migracao-N-*.sql  → histórico de mudanças no banco de dados, na
│                            ordem que devem ser coladas no SQL Editor do
│                            Supabase (a numeração é cronológica)
├── ferramentas/           → scripts Python que baixam e processam atas
│                            de convenção do TSE (rodados pelas rotinas
│                            automáticas diárias/semanais)
└── ATAS/                  → PDFs baixados das atas de convenção,
                             1 pasta por estado
```

A ideia da separação: **dados** é o que é fato (resultado real); **cálculo**
é a regra eleitoral (como voto vira vaga); **interface** é a tela; **nuvem**
é tudo que fala com o banco de dados compartilhado. Se um dia a lei
eleitoral mudar, só mexe em `calculo/`. Se sair um dado oficial novo, só
mexe em `dados/`.

## Como pedir alterações

Descreva o que você quer em português normal, do jeito que já vinha
fazendo aqui no chat — por exemplo: "muda a cor do partido X", "adiciona
um filtro por região". Não precisa entender o código.

## Sobre salvar e depositar

Hoje existem duas coisas diferentes, de propósito:

- **Salvar** — grava sua lista com um nome, editável quando quiser. Não é
  definitivo.
- **Depositar a cédula** — trava aquela lista pra sempre (nem você
  consegue editar depois), e é isso que passa a contar na Médias/Ranking
  público.

Se você estiver logado, isso fica salvo na nuvem (Supabase) — acessa de
qualquer computador/navegador. Sem conta (convidado), fica só no
navegador daquele computador.

## Limitações conhecidas

- O cálculo de vagas (QP + sobras) não verifica o mínimo de votação
  nominal por candidato (10%/20% do QE) exigido por lei — em disputas
  muito apertadas pela última cadeira, pode divergir em 1 vaga do
  resultado oficial.
- Nomes de candidatos vêm do arquivo bruto do TSE (nome de registro, nem
  sempre o "nome de urna"). Alguns já foram corrigidos manualmente (ver
  `dados/correcoes-nomes.md`); se achar outro estranho, avise.
- Fora de Santa Catarina, boa parte dos candidatos de 2026 ainda é
  fictícia (sem ata de convenção real processada ainda) — a interface já
  marca isso visualmente.
