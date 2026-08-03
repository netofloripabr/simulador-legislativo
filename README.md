# Simulador Eleitoral ALESC — 40 Vagas

Simulador de projeção de cenário eleitoral 2026 para a Assembleia Legislativa de
Santa Catarina, com base nos dados reais de 2022 (TSE).

Para a visão de produto (usuários, objetivos, roteiro de fases, decisões em
aberto), veja [`PROJETO.md`](PROJETO.md).

## Como abrir

Dê duplo-clique em `index.html`. Ele abre no seu navegador normalmente — não
precisa instalar nada nem rodar servidor.

## Estrutura das pastas

```
alesc-simulador/
├── index.html              → estrutura da página (o que você vê)
├── css/
│   └── estilo.css          → cores, fontes, layout
├── dados/
│   └── base-2022.js        → dados reais de 2022 (TSE): 13 partidos, 396
│                              candidatos, votos oficiais, referência TRE-SC
├── calculo/
│   └── eleitoral.js        → regras eleitorais: quociente eleitoral (QE),
│                              quociente partidário (QP), método das médias
│                              (sobras), auto-balanceamento de votos
└── interface/
    └── app.js               → tudo que aparece na tela: tabelas, hemiciclo,
                                 modal de novo candidato, botões
```

A ideia da separação: **dados** é o que é fato (resultado de 2022); **cálculo**
é a regra (como se transforma voto em vaga); **interface** é a apresentação
(como isso vira tela). Se um dia a lei eleitoral mudar, só mexe em `calculo/`.
Se sair um novo dado oficial, só mexe em `dados/`. A tela pode mudar sem
tocar em nenhum dos dois.

## Como pedir alterações

Abra esta pasta no Claude Code ou no Cowork e descreva o que você quer em
português normal, do jeito que já vinha fazendo aqui no chat — por exemplo:
"muda a cor do partido X", "adiciona um filtro por região", "quero exportar
a lista de eleitos em PDF". Não precisa entender o código.

## Sobre o "Salvar cenário"

Esse recurso guarda o que você editou no navegador (localStorage), então ele
lembra o cenário **nesse mesmo navegador, nesse mesmo computador**. Se você
abrir em outro navegador ou computador, começa do zero (a base 2022 continua
lá, só o que você personalizou em cima que não viaja junto).

## Limitações conhecidas (herdadas do simulador original)

- O cálculo de vagas (QP + sobras) não verifica o mínimo de votação nominal
  por candidato (10%/20% do QE) exigido por lei — em disputas muito
  apertadas pela última cadeira, pode divergir em 1 vaga do resultado oficial.
- ~14 partidos que concorreram em 2022 mas não elegeram ninguém não estão
  na base de dados (só os 13 que têm cadeira hoje). Se quiser incluí-los,
  é só pedir.
- Nomes de candidatos vêm do arquivo bruto do TSE (nome de registro, não
  sempre o "nome de urna"/apelido). Alguns já foram corrigidos manualmente;
  se achar outro estranho, avise.
