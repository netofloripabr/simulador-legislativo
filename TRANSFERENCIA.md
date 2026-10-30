# Transferência e manutenção do projeto

Guia para quem assume o SEL (ou para um computador novo): onde cada parte
vive, o que precisa ser entregue além do GitHub, como montar o ambiente e o
que conferir. Nasceu do checkup geral de 29/10/2026 — os achados daquele dia
estão no fim. **Este repositório é público**: nenhuma senha, token ou chave
secreta entra aqui, só onde cada coisa está guardada.

## 1. Mapa: onde cada parte vive

| Parte | Onde | Observação |
|---|---|---|
| Código do site + dados públicos | GitHub `netofloripabr/simulador-legislativo`, ramo `main` | Fonte da verdade do código |
| Site publicado | GitHub Pages — `netofloripabr.github.io/simulador-legislativo` | Publica sozinho a cada push no `main` |
| Emendas (dados públicos SC) | GitHub, ramo `dados-emendas` | Sobrescrito todo dia pela rotina (seção 6); localmente fica em `dados/gabinete/` (fora do git) |
| Banco, contas de usuário, regras de acesso | Supabase, projeto `uxqxhvzeptuedyggwguh`, organização **SimulaLEGIS** (plano gratuito) | O endereço e a chave pública estão em `nuvem/config.js` |
| Projeto Supabase antigo | `qgjfkpsjveatonziwkvj` | **Bloqueado** (egress e logs). Não usar; só referência histórica |
| Funções da nuvem (Edge Functions) | Código em `nuvem/funcoes/` e `nuvem/edge-functions/` | **Não estão publicadas no projeto novo** (seção 5) |
| Pagamentos | Mercado Pago (token nas *Secrets* das Edge Functions do Supabase) | Economia desligada desde a migração 53 |
| Material interno | Só no computador: `marketing/`, `nuvem/backup/`, `Outros documentos/`, `apresentacao/`, logo | Fora do GitHub (seção 3) |

## 2. Contas e acessos a transferir

Cada uma é entregue **pelo dono da conta**, no próprio serviço — nunca por
arquivo ou mensagem com senha.

- [ ] **GitHub** — conta `netofloripabr`. Adicionar o novo responsável como
  colaborador do repositório (Settings → Collaborators) ou transferir o
  repositório. Atenção: transferir muda o endereço do GitHub Pages.
- [ ] **Supabase** — organização SimulaLEGIS. Convidar o novo responsável
  como membro (Organization → Team). A senha do banco fica só no painel
  (Project Settings → Database).
- [ ] **Admin do app** — o painel do administrador vale para quem está na
  tabela `admins` do banco. Incluir o novo responsável lá.
- [ ] **Login com Google** — o provedor Google está configurado no Supabase
  (Authentication → Providers), com um cliente OAuth no Google Cloud do dono
  atual. Se a conta Google mudar, recriar o cliente e atualizar no Supabase.
- [ ] **Mercado Pago** — credenciais de produção da conta do dono. Só importa
  se a economia for religada.
- [ ] **Claude** — os conectores (Supabase, GitHub) são por conta; quem
  assumir conecta os seus.

## 3. O que NÃO está no GitHub — precisa de backup separado

Conferido em 29/10/2026 (cerca de 130 MB não versionados + pastas ignoradas
de propósito). Para transferir, copie a pasta `SEL` inteira para um HD externo
ou uma nuvem **privada** — não basta clonar o GitHub.

| Pasta / arquivo | Tamanho | Por que está fora | Cuidado |
|---|---|---|---|
| `marketing/` | ~249 MB | Estratégia interna; repositório é público (decisão 28/08) | Privado |
| `nuvem/backup/` | ~33 MB | Cópia do banco de 18/10 (estrutura, dados **e contas**) | **Sensível** — dado pessoal (LGPD). Só em lugar criptografado |
| `dados/fotos/sc-2024/` | ~19 MB, 2.423 fotos | Nunca foi versionada | A tela de Resultados procura `dados/fotos/sc-{ano}/`; sem elas o site mostra só a inicial |
| `Outros documentos/` | ~64 MB | Cadernos, boas-vindas, cenários, prints | — |
| `apresentacao/` (PDFs AMFRI, AMVE, cadernos) | parte de ~31 MB | Material de apresentação | — |
| `Logo.ai`, `Logo/` | — | Arquivos de design | — |
| `_proto-*.html`, `painel/mesa-*.html`, `cmp-live-*.png` | — | Protótipos e prints de estudo | Podem ser descartados |
| `copiar-supabase.command`, `restaurar-no-novo.command` | — | Scripts da migração de 18/10 | Ver seção 5 |
| `dados/gabinete/` | ~6 MB | Vem do ramo `dados-emendas` | Recuperável do GitHub |

Para conferir de novo o que está fora do git:
```bash
git status --short
```

### Como fazer o backup (recomendação de 29/10/2026)

O disco deste Mac é criptografado (FileVault ligado), então as cópias locais
já estão protegidas. Falta uma **segunda cópia fora do computador**. O jeito
recomendado é uma imagem de disco criptografada (AES-256) da pasta `SEL`
inteira (~1 GB, inclui o histórico do git):

```bash
hdiutil create -encryption AES-256 -srcfolder ~/Desktop/SEL -volname "SEL-backup" -format UDZO ~/Documents/SEL-backup-$(date +%Y-%m-%d).dmg
```

- O comando pede uma senha **duas vezes**. Guarde essa senha num gerenciador
  de senhas (ex.: Senhas do macOS / iCloud). **Sem ela, o backup não abre
  nunca mais** — não há como recuperar.
- Depois, copie o arquivo `.dmg` gerado em `Documentos` para **dois lugares**:
  um HD/pendrive externo e uma nuvem (Google Drive ou iCloud Drive). Como o
  arquivo é criptografado, pode ficar na nuvem sem expor as contas de usuários.
- Para abrir: dois cliques no `.dmg` e digitar a senha.
- Refazer depois de mudanças grandes, ou uma vez por mês. Pode apagar as
  imagens antigas quando a nova estiver nos dois lugares.

`nuvem/backup/` só é necessário para restaurar o banco de 18/10/2026. Se o
Supabase novo seguir saudável, o dono pode decidir apagá-lo do computador
depois que estiver dentro do backup criptografado.

## 4. Montar um computador novo (Mac)

1. Ferramentas de desenvolvimento (git e Python 3):
   ```bash
   xcode-select --install
   ```
2. **Node.js** (versão LTS) — usado pelos testes e por
   `ferramentas/conferir_split_interface.js`. Ou o instalador `.pkg` de
   nodejs.org (pede a senha do Mac), ou — como no Mac atual, 29/10/2026,
   v26.13.0 — o arquivo `node-vXX-darwin-arm64.tar.xz` de nodejs.org/dist,
   conferido contra o `SHASUMS256.txt` oficial e extraído em
   `~/.local/node` (sem senha), com esta linha no `~/.zprofile`:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH"
   ```
3. Acesso ao GitHub por SSH: gerar a chave (`ssh-keygen -t ed25519`) e
   cadastrar a parte pública (`~/.ssh/id_ed25519.pub`) em
   github.com/settings/ssh/new, na conta dona do repositório. Conferir com
   `ssh -T git@github.com`.
4. Clonar o repositório:
   ```bash
   git clone git@github.com:netofloripabr/simulador-legislativo.git ~/Desktop/SEL
   ```
5. Copiar por cima, do backup, as pastas da seção 3.
6. Abrir localmente: dois cliques em `index.html`, ou o servidor do preview
   (`.claude/launch.json`, porta 8765):
   ```bash
   python3 -m http.server 8765
   ```
7. Só se for restaurar ou copiar banco: `libpq` (psql/pg_dump), que os scripts
   `.command` esperam em `/opt/homebrew/opt/libpq/bin` (Homebrew).
8. Conferir que tudo funciona:
   ```bash
   node testes/eleitoral.test.js
   ```
   ```bash
   node testes/pontuacao.test.js
   ```

## 5. Supabase — estado atual e o que está desligado

Em 18/10/2026 o banco foi copiado do projeto antigo (bloqueado) para o novo
com `copiar-supabase.command` / `restaurar-no-novo.command`. Essa cópia levou
**só o schema `public` e as contas**. Por isso:

- **Migrações 2 a 70** existem de fato no banco, mas não aparecem no histórico
  do Supabase (vieram pela cópia). As 71 a 88 foram aplicadas pelo MCP e
  aparecem. A aba **Rotinas** do painel admin confere objeto por objeto, então
  mostra o estado real.
- **Ficou de fora da cópia** (conferido em 29/10/2026):
  - bucket de arquivos `apuracao` e a regra `apuracao_bucket_leitura`
    (migração 54);
  - extensões `pg_cron` e `pg_net` e o agendamento `apuracao-tse`;
  - as 4 Edge Functions: `apuracao-tse`, `bots-aplicar`, `criar-pagamento`,
    `webhook-mercadopago`;
  - a URL da rotina de apuração em `config_privada` ainda aponta para o
    **projeto antigo**.

**Decisão do dono (29/10/2026): fica tudo desligado** — a apuração ao vivo
não tem função por enquanto. Conferido no banco: `apuracao_ativa = false` e
`economia_ativa = false` (créditos/pagamentos também desligados), então
nada no site depende das peças acima. Não reativar sem novo pedido.

Para reativar a apuração ao vivo numa próxima eleição:
1. Reaplicar a parte de bucket/cron das migrações 54, 56, 58 e 59 (pelo MCP do
   Supabase, `apply_migration`).
2. Publicar `nuvem/funcoes/apuracao-tse/index.ts` como Edge Function.
3. Atualizar `apuracao_rotina_url` em `config_privada` para o projeto novo.
4. Seguir `nuvem/funcoes/apuracao-tse/LEIA-ME.md`.
5. **Antes de ligar, dimensionar logs e chamadas** (REGRA DE OURO do
   CLAUDE.md): o cron de 20 s foi o que bloqueou o projeto antigo por logs.
   Ligar só durante a apuração e desligar em seguida.

Funções de pagamento e bots: instruções no topo de cada `index.ts`. As de
pagamento precisam da secret `MERCADOPAGO_ACCESS_TOKEN`; a
`webhook-mercadopago` precisa de "Verify JWT" desligado.

**Tabelas novas** criadas a partir de 30/10/2026 precisam de GRANT explícito
(ver CLAUDE.md). Se o banco for recriado do zero pelos arquivos
`nuvem/migracao-*.sql`, rodar os GRANTs de todas as tabelas antes de abrir o app.

**Limites do plano gratuito:** 500 MB de banco (em 29/10 usava 36 MB), 1 GB de
storage, 5 GB de egress/mês, 1 GB de logs.

## 6. Rotinas automáticas

| Rotina | Onde roda | Frequência |
|---|---|---|
| Sincronizar emendas | GitHub Actions (`.github/workflows/sync-emendas.yml`) → ramo `dados-emendas` | Diária, 06:30 (Brasília). Usa só o token automático do GitHub — não precisa de segredo |
| Atas de convenção SC | Agente `.claude/agents/atualizador-atas-2026.md` | Era diária no período de convenções |
| Atas dos demais estados | Agente `.claude/agents/atualizador-atas-nacional-2026.md` | Era semanal |
| Apuração TSE | pg_cron + Edge Function | **Desligada por decisão** (seção 5) |

Em 29/10/2026 nenhuma tarefa agendada do Claude estava cadastrada neste
computador. Se as rotinas de atas voltarem a ser necessárias, recriá-las a
partir dos arquivos dos agentes.

## 7. Qual documento ler para quê

| Arquivo | Para quê |
|---|---|
| `CLAUDE.md` | Regras de trabalho: estrutura, regras eleitorais, checklist antes de entregar, Supabase, permissões |
| `README.md` | Visão geral, como abrir, pastas |
| `PROJETO.md` | Visão de produto, tipos de usuário, roteiro, decisões em aberto |
| `TRANSFERENCIA.md` | Este guia: serviços, contas, backups, ambiente |
| `BACKLOG.md`, `STATUS.md` | Pendências por tela e status do redesenho |
| `DESIGN.md` | Padrões visuais |
| `ENGENHARIA.md`, `ORIENTACAO.md` | Lógica dos faders e do preenchimento guiado |
| `MONETIZACAO.md`, `RANQUEAMENTO.md` | Economia de créditos e pontuação |
| `TESTES.md` | Roteiro de testes manuais por tipo de usuário |
| `dados/correcoes-nomes.md`, `ferramentas/LEIA-ME-dados-2022.md` | Origem e correções dos dados oficiais |
| `.claude/agents/*.md` | Agentes de apoio (checklist de entrega, conferência de dados, revisão da regra eleitoral, verificação visual) |

Situação dos documentos (29/10/2026): `README.md` foi atualizado (inclui os
painéis de outubro). `PROJETO.md` guarda a visão de produto até 07/09 e
`STATUS.md` está arquivado — os dois têm um aviso no topo. Em caso de
conflito, vale o `CLAUDE.md` e este guia.

## 8. Checklist de transferência

- [ ] Backup completo da pasta `SEL` (seção 3), com `nuvem/backup/` em lugar
  criptografado.
- [ ] `git status` sem commits pendentes de envio (`git log origin/main..HEAD`
  vazio).
- [ ] Acessos da seção 2 concedidos e testados pelo novo responsável.
- [ ] Novo responsável incluído na tabela `admins` e vendo o painel admin.
- [ ] Computador novo montado (seção 4) e os dois testes passando.
- [ ] Painel admin → **Rotinas**: migrações todas aplicadas (exceto as "sem
  verificação").
- [ ] Painel admin → **Erros**: nenhum erro aberto relevante.
- [x] Decisão registrada sobre a apuração ao vivo e as funções de pagamento:
  desligadas (29/10/2026, seção 5).

## 9. Checkup de 29/10/2026 — resultado

- Código: 10.682 arquivos versionados idênticos ao último envio ao GitHub;
  nada alterado ou apagado.
- `index.html`: 97 arquivos referenciados, todos existem; `?cb=972` em todas
  as tags.
- Testes `eleitoral` e `pontuacao`: passaram.
- Sintaxe: 110 arquivos JS sem erro (`interface/`, `nuvem/`, `calculo/`,
  `dados/`, `painel/`, `dados/estados/`).
- Banco: 40 tabelas, 99 contas, 36 MB. Dos objetos das migrações 2–88, só
  falta `apuracao_bucket_leitura` (ver seção 5).
- Segurança: só a chave pública (`sb_publishable_…`) aparece no repositório.
- Numeração das migrações: 21–24 têm dois arquivos cada e não existe a 44 —
  histórico, tratado pelo índice (`nuvem/migracoes-index.js`).
- Pendência aberta: o backup criptografado da seção 3. Apuração e funções da
  nuvem: desligadas por decisão (seção 5).
