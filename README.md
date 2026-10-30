# Simulador Eleitoral Legislativo (SEL)

**SimulaLEGIS** — começou como simulador de projeção eleitoral 2026 para
cargos legislativos (Deputado Estadual, Deputado Federal, Senador, com base
nos dados reais de 2022 do TSE) e, desde outubro/2026, abre pelos **painéis
parlamentares** (pasta `painel/`): Parlamentares, Ranking/“Santa Catarina em
pontos”, Gabinete e Corrida da Mesa. Foco em Santa Catarina (ALESC, 40
vagas), com parte dos painéis também para SP. Site estático (HTML + `.js`/
`.css`), sem build step, hospedado no GitHub Pages, com contas de usuário e
dados compartilhados via Supabase.

**"SEL" é só um apelido curto** pra facilitar conversa e nome de pasta —
não muda o nome público do site, que continua "Simulador Eleitoral —
Legislativo 2026" (sem nenhum vínculo com a ALESC de verdade — ver
`PROJETO.md`).

Para a visão de produto (usuários, objetivos, roteiro de fases, decisões
em aberto), veja [`PROJETO.md`](PROJETO.md).

Para assumir o projeto ou montar um computador novo (serviços, contas,
o que não está no GitHub e precisa de backup, Supabase), veja
[`TRANSFERENCIA.md`](TRANSFERENCIA.md).

## Como abrir

Dê duplo-clique em `index.html` (o simulador) ou em `painel/novos.html`
(Parlamentares). Algumas telas leem arquivos de `dados/` e funcionam melhor
com o servidor local do preview — ver `TRANSFERENCIA.md`, seção 4. O site
publicado fica em `netofloripabr.github.io/simulador-legislativo`; o
endereço sem parâmetros redireciona para os painéis.

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
│   └── 00-estado.js … 99-inicio.js → telas do simulador, um arquivo por
│                            tela (divididas em 07/09/2026; ordem no
│                            index.html): acesso, painel da conta, admin,
│                            listas, grupos, duelos, seleção, revisão,
│                            resultados. (O antigo app.js foi removido em
│                            18/08/2026.)
├── painel/                → painéis parlamentares, páginas próprias:
│   ├── novos.html/.js     → Parlamentares (Eleitoral, Legislativo,
│   │                        Administrativo de cada eleito)
│   ├── index.html, painel.js → "Santa Catarina em pontos" e Ranking
│   ├── gabinete.*         → Gabinete · Controle de Recursos (emendas)
│   ├── mesa.html/.js      → Corrida da Mesa (chapa e comissões)
│   └── relatorio.js, uf.js, sino-menu.js, topo.css → comuns aos painéis
│                            (mesa-*.html soltos são protótipos locais)
├── testes/                → testes automáticos da regra eleitoral e da
│                            pontuação (node testes/eleitoral.test.js)
├── nuvem/
│   ├── cliente.js, config.js → conexão com o Supabase (banco de dados)
│   ├── autenticacao.js   → cadastro/login/CPF
│   ├── palpites.js       → salvar o palpite da pessoa, calcular médias
│   │                        públicas
│   ├── salvamentos.js    → "Minhas Listas" (várias listas nomeadas,
│   │                        salvar/editar/depositar)
│   ├── grupos.js          → criar grupo, entrar com código, comparação
│   ├── creditos.js        → sistema de créditos (2ª lista/grupo em diante)
│   ├── edge-functions/, funcoes/ → código das funções da nuvem
│   │                        (apuração, pagamentos, bots — hoje desligadas)
│   └── migracao-N-*.sql  → histórico de mudanças no banco de dados
│                            (numeração cronológica; aplicadas pelo MCP do
│                            Supabase — ver CLAUDE.md)
├── ferramentas/           → scripts (Python/Node) que baixam e tratam
│                            dados do TSE, atas, emendas e conferem o
│                            projeto
├── .github/workflows/     → rotina diária de emendas (GitHub Actions)
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

- O cálculo de vagas segue a regra de 2026: sobras pelo método das médias
  sem piso de votos (o STF derrubou o piso de 80%/20% do QE em fev/2024).
  O mínimo nominal de 10% do QE (art. 108) existe no cálculo como opção,
  mas o app não liga. Detalhes no CLAUDE.md e em `testes/eleitoral.test.js`.
- Nomes de candidatos vêm do arquivo bruto do TSE (nome de registro, nem
  sempre o "nome de urna"). Alguns já foram corrigidos manualmente (ver
  `dados/correcoes-nomes.md`); se achar outro estranho, avise.
- Fora de Santa Catarina, boa parte dos candidatos de 2026 ainda é
  fictícia (sem ata de convenção real processada ainda) — a interface já
  marca isso visualmente.
