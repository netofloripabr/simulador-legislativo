# Padrões da Capa do Gabinete — mapa 3D + vidro (identidade 3.0)

Documento de **referência técnica e de design** da capa do Gabinete (protótipo aprovado em 14–16/11/2026; **no site
desde 16/11/2026**, em `painel/gabinete.html`).
Serve para três coisas:

1. **Construir** qualquer tela nova do Gabinete no mesmo padrão (tokens, componentes, comportamentos).
2. **Garantir** que a configuração aprovada não se perca: cada decisão abaixo foi pedida ou aprovada pelo usuário,
   com a data. Antes de mudar um item marcado como *decisão*, confirme com o usuário.
3. **Conferir** uma mudança: a §10 traz o roteiro de verificação e os erros que já aconteceram.

Regra de ouro (a mesma do `DESIGN.md`): todo valor aqui foi copiado do código em 16/11/2026. **Se o código e este
documento divergirem, o código manda** — e este arquivo deve ser atualizado na mesma mudança.

O `DESIGN.md` continua valendo para o simulador (identidade 2.0 "Fader"). Este arquivo cobre o **Gabinete**.

---

## 0. Onde está cada coisa

| O quê | Onde |
|---|---|
| Protótipo navegável (sempre o mesmo link) | Artifact privado **Capa do Gabinete v2** — https://claude.ai/artifact/FKr8X3amqheSdw6ERpTBat |
| Código do protótipo (fora do git) | `prototipos/capa-3d/capa-v2.html` (capa) e `prototipos/capa-3d/mapa/mapa-sc.html` (mapa) |
| Imagens de comparação de cada etapa | `prototipos/capa-3d/*.jpg` |
| Mosaicos de relevo e satélite (≈ 28 MB, fora do git) | `prototipos/capa-3d/mapa/relevo-{4,7,10-a,10-b}.png`, `satelite-{4,7,10}.jpg` |
| Ferramentas de captura (no git) | `ferramentas/capa3d/foto-tela.mjs`, `ferramentas/capa3d/avalia.mjs` (§10) |
| **Capa no site (16/11/2026)** | `painel/gabinete-capa.js` + `painel/gabinete-capa.css` (capa), `painel/mapa-capa.html` (mapa, em iframe), `painel/gabinete.js` (`selReg`, `rankReg`, `itensCapa`, `avisoCota`) |
| Pedaços do mapa no site (≈ 35 MB, 833 de 256 px) | `dados/mapas/capa-3d/{rel,sat}/{4,7,8,10}/x-y.{png,jpg}` + `indice.json`, contornos/terra/vias; gerados por `ferramentas/capa3d/fatiar.swift` |

O protótipo (`prototipos/` + Artifact) continua sendo o lugar de **testar ideias**; o que for aprovado é levado para
os arquivos do site acima. As diferenças do site para o protótipo estão na §1.2-site.

---

## 1. Arquitetura

```
capa-v2.html  (página: cabeçalho, cartão, painel do mandato, controles, quadros)
 └─ <iframe id="mapa" src="mapa/mapa-sc.html?fundo=1&tema=escuro&dado=nenhum&marcas=disco&cid=1&esq=.12&dir=.07&topo=.14&baixo=.19">
      mapa-sc.html (Three.js r128 + OrbitControls; o mapa inteiro)
```

- **Mesma origem**: a capa fala com o mapa direto por `document.getElementById("mapa").contentWindow.__v4` (não por
  postMessage). O mapa avisa que terminou de montar com `parent.postMessage({ mapa3d: "pronto" })`; só depois disso a
  capa aplica as escolhas guardadas (`aplica(true)`).
- **Modo FUNDO** (`?fundo=1`): o mapa vira fundo de página — sem título, busca, tabela ou painel próprios; enquadra o
  contorno de SC dentro das margens `esq/dir/topo/baixo` (frações da tela). Toda regra "só na capa" no código do mapa
  está atrás de `FUNDO`.
- Bibliotecas: Three.js r128 (cdnjs) e OrbitControls 0.128 (jsdelivr). Fonte: Inter (Google Fonts) — no site, usar a
  Inter local do repositório (`fontes/InterVariable.woff2`, ver `DESIGN.md` §1.2).

### 1.1 Parâmetros da URL do mapa

| Parâmetro | Valores | Efeito |
|---|---|---|
| `fundo` | `1` | modo capa (ver acima) |
| `tema` | `escuro` | paleta escura do entorno (filtros `FILT_FORA`, `VEU`, `NEV`, `AGUA`) |
| `dado` | `nenhum` (capa) | pintura padrão do mapa original; na capa fica `nenhum` e quem pinta são os marcadores |
| `marcas` | `disco`, `pinta`, `relevo` (combináveis, ex. `disco,pinta`) | marcadores ligados ao abrir |
| `cid` | `1` | camada Cidades ligada ao abrir |
| `esq` `dir` `topo` `baixo` | fração 0–1 | margens do enquadramento (capa: .12 / .07 / .14 / .19) |
| `base` | `neutro` | abre na base Neutro |
| `img` | `esri` | satélite Esri em vez do EOxCloudless (só comparação local) |

### 1.2 Interface do mapa (`window.__v4`)

| Função | O que faz |
|---|---|
| `marcadores(lente, rec)` | redesenha conforme a lente (`voto`, `v22`, `var`, `rec`) e os recursos por município |
| `marcas({disco, pinta, relevo})` | liga/desliga os três marcadores (independentes) |
| `tema(campo \| null)` | pinta os municípios por um dado social/econômico (`sc-social.json`) |
| `analise({id, cores, rotulos} \| null)` | modo análise: limpa o mapa e pinta só as cidades da análise; `null` devolve o estado anterior |
| `destaca([[nome, texto]])` | rótulos de municípios com texto livre |
| `reserva(px)` | reserva largura à direita (quadro aberto) para os rótulos não ficarem embaixo |
| `base("sat" \| "gesso")`, `vista(nome)`, `camada(c, on)`, `recentra()` | base, vista, camadas, câmera |
| `busca(texto)`, `nomes()`, `inicio()`, `onde()`, `abre(nome)` | recortes (cidade/região), sugestões da busca, volta a SC, recorte atual, balão de uma cidade |
| `dados()` | lista `{nome, vot, v22, el, pct, regiao}` de todos os municípios (usada pelas análises) |
| `painel(on)` | (legado) rótulos de análise do protótipo original |

---

### 1.2-site Como a capa entrou no site (16/11/2026)

- **A capa fica fora de `#app`**, num `<div id="capa3d">` logo antes dele. `desenhar()` redesenha `#app` a cada clique;
  se a capa estivesse dentro, o iframe seria recriado e o 3D recarregaria. `capa3d()` monta a capa **uma vez por
  parlamentar** e, nas outras chamadas, só atualiza o painel do mandato, a faixa da equipe e o aviso da cota.
  `escolha()` e `restrito()` tiram a capa da tela (`c3Fora()`).
- **CSS isolado**: tudo preso a `.g3d` (`gabinete-capa.css`); ids com prefixo `c3` (`c3mapa`, `c3painel`…). A legenda
  em faixas usa `.lfx` (a página já tem `.fx`). As escolhas ficam em `gab_capa_ferr` e `gab_capa_painel_mini`.
- **Dados reais**: recursos de `itensCapa()` (no próprio gabinete, o Controle inteiro; fora dele, as impositivas do
  portal); votos de `PARL.v` / `PARL.v22` (sem 2022, somem o 2022, a Variação e as análises que dependem dele). O mapa
  recebe `{município: [indicado, pago]}` com a chave igual ao nome em `BASE.mun`. O balão pega a lista de emendas em
  `parent.emendasPorMunicipio()`, montada de `E0` (texto já escapado).
- **Recorte ligado nos dois sentidos**: o mapa avisa `postMessage({ mapa3d: "recorte", niv, nome })` ao mudar de área;
  a capa chama `selReg(r, false)` (painel e ranking `#grank` seguem). Clicar num município do ranking chama
  `selReg(r)`, que leva o mapa ao mesmo recorte (`v.busca`).
- **Trocar o parlamentar**: clicar no nome chama `escolha(true)` (troca o vínculo). O link "Alterar o parlamentar
  vinculado" saiu. Explorando outro gabinete (`?d=`), aparece "voltar ao seu" abaixo do cartão.
- **Aviso da cota**: faixa no alto da capa (`avisoCota`); o cartão desce a altura da faixa.
- **Tela estreita (< 760px)**: o painel do mandato começa minimizado (só "R$ … · … votos"), para o mapa aparecer.
- **Download** (medido em 16/11/2026, primeira visita, Chrome sem cache): o mapa acrescenta ≈ 4,2 MB de pedaços
  (rel 8: 1,4 · sat 7: 1,3 · sat 8: 0,6 · rel 7: 0,5 · rel 4: 0,3 · sat 4: 0,1) + ≈ 0,4 MB de contornos e terra
  (comprimidos pelo GitHub Pages) + Three.js 0,1 MB. Rodovias e rios (0,2 MB comprimidos) só baixam quando a camada é
  ligada.

## 2. Tokens

### 2.1 Cor (capa)

| Token | Valor | Uso |
|---|---|---|
| `--fundo` | `#0B0F0D` | fundo da página |
| `--texto` | `#F2F4F5` | texto principal; fundo do botão ativo |
| `--sec` | `#A9AEB3` | texto secundário |
| `--ter` | `#6B7178` | rótulos em caixa-alta, legendas |
| `--linha` | `rgba(242,244,245,.12)` | filetes |
| `--or` | `#E8822A` | **só** a cota/prazo (ponto, botão "Indicar") e o chip de variação negativa |
| `--vd` | `#34E84A` | "Legis" da marca e "pago" — mesma regra de escassez do verde vivo do `DESIGN.md` |
| `--az` | `#5B83F0` | apoio (a pagar, legendas) |
| `--vidro` | `rgba(22,27,30,.42)` | fundo do vidro |
| `--vidro-b` | `rgba(255,255,255,.14)` | borda do vidro |

### 2.2 Vidro (glassmorphism) — classe `.vidro`

```css
background: rgba(22,27,30,.42);
backdrop-filter: blur(18px) saturate(1.3);
border: 1px solid rgba(255,255,255,.14);
box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 20px 50px -24px rgba(0,0,0,.7);
```

- Quadros que ficam **sobre** o mapa por mais tempo (ferramentas, análises) usam o vidro mais opaco
  `rgba(18,22,26,.88–.93)` — com o mapa colorido por baixo, o vidro leve perde a leitura.
- **Não aninhar** `backdrop-filter` (um vidro dentro de outro): o de dentro fica transparente. Subpainel dentro de
  quadro usa fundo sólido.

### 2.3 Tipografia

Uma família: **Inter**. Pesos usados: 400, 500, 600, 700, 800, 900.

| Elemento | Especificação |
|---|---|
| Nome do parlamentar | 900, caixa-alta, `line-height:.9`, `letter-spacing:-.02em`; 1ª linha (NAPOLEÃO) com tamanho fixo `clamp(24px, 2.4vw, 34px)`; 2ª linha (BERNARDES) **com a mesma largura da 1ª** (o tamanho é calculado no JS); 2ª linha com degradê `#FFFFFF → #B9BEC2 → #8A9096` |
| Rótulo de seção | 9.5–10.5px, 600, caixa-alta, `letter-spacing:.16–.2em`, cor `--ter` |
| Valor grande | 22px, 700, `letter-spacing:-.02em` |
| Botões em pílula | 11.5–12.5px, 600 |
| Números | `font-variant-numeric: tabular-nums` onde há contagem (cronômetro, tabelas) |

### 2.4 Forma

| Elemento | Raio |
|---|---|
| Pílulas (menu, cota, botões, seletor) | `999px` |
| Cartões e quadros | `18–20px` |
| Botões redondos de ação (busca, ferramentas, análise) | círculo de `42px` |
| Botão minimizar | círculo de `24px` (no topo do quadro) / `28px` quando fica no canto |

---

## 3. Layout da capa

```
┌ topo: marca · menu (pílula vidro) ············· cota (pílula vidro) · ☰ ┐
│ ┌ cartão do parlamentar ┐                                               │
│ └───────────────────────┘                                               │
│ DEPUTADO ESTADUAL · SC · PSD                                            │
│                         [ mapa 3D de fundo ]                            │
│                                                       legenda (direita) │
│ ┌ painel do mandato ┐        [pílula da análise]   (🔍)(🔧)(▥) [Votos|Recursos] │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Cartão do parlamentar**: alto à esquerda; no máximo 30% da largura (`max-width:30vw`, mínimo 230px); foto redonda
  com a **mesma altura das duas linhas do nome**; "Deputado estadual · SC · PSD" **abaixo** do cartão, em uma linha.
  Trocar o parlamentar = clicar no nome (abre a lista). *Decisão 15/11.*
- **Painel do mandato**: embaixo à esquerda. Largo por padrão (`min(600px, 46vw)`), **Recursos à esquerda e Votos à
  direita**; abaixo de 1100px empilha. Votos em **duas colunas: 2026 | 2022**, com "−5,3% vs 2022" abaixo de 2026.
  Minimizável (lembrado em `capa_painel_mini`); minimizado vira a linha "R$ 82,05 mi · 34.949 votos". *Decisões 15–16/11.*
- **Linha de controles**: embaixo à direita, na ordem **busca · ferramentas · análise · Votos/Recursos**. A legenda
  fica **acima** da linha, alinhada à direita (fora da grade, para a linha não esticar). *Decisão 16/11.*
- **Cabeçalho**: menu em pílula transparente; a cota aberta é uma pílula discreta na continuação do cabeçalho.

---

## 4. Componentes

### 4.1 Botão redondo de ação
Círculo de 42px, vidro; ícone de traço 1.5px, 15px. Ativo: fundo `--texto`, ícone escuro.
Busca: só o ícone; ao clicar expande para 280px com o campo e as sugestões (cidades e regiões).

### 4.2 Interruptor Votos | Recursos (`.sw`)
Pílula de vidro com segmentos; ativo = fundo `--texto`. *Decisão 20/11 (2ª versão do dia; substitui "só Votos").*
- Duas **vertentes**. **Votos**: opções 2026 · 2022 · Variação. **Recursos**: opções **só com ícones** — ↑ mais recurso ·
  ↓ menos recurso · R$/V (R$ por voto) · +pago · −pago (falta pagar); o nome aparece ao passar o mouse. Pintam o mapa como
  em §4.3, Outros › Recursos. *Decisão 20/11.*
- Tocar na vertente já ativa abre ou fecha as opções; trocar de vertente abre as opções da nova (fechado por padrão).
- A vertente muda também as **ferramentas**: em Recursos, Outros mostra a seção Recursos (leitura, ano, origem, lista) e
  esconde os dados sociais/econômicos; em Votos, o contrário. Camadas valem nas duas.

### 4.3 Quadro de ferramentas (`.ferr`)
Abre acima da linha de controles, colado à direita; 330px; vidro opaco. Conteúdo, nesta ordem:
1. **Cabeçalho**: "Ferramentas do mapa" · "Restaurar padrão" · botão minimizar.
2. **Marcadores · ligue e desligue** — três botões independentes: **Disco**, **Votos** (municípios pintados),
   **Relevo do eleitorado**. Qualquer combinação. *Decisão 16/11.*
3. **Base** — Satélite / Neutro.
4. **Vista** — um botão só que **alterna** a cada toque: Automática → Isométrica → Alta → Do sul → De cima (mostra
   "1/5"); ao lado, o botão de câmera, que **trava a vista**: o usuário ajusta o mapa e clica; a partir daí abrir quadros
   ou trocar ferramentas não mexe na câmera. Escolher outro recorte (busca, cidade, região) enquadra normalmente e solta a
   trava. *Decisões 16/11 e 17/11.*
5. **Alça "Outros"** no pé do quadro (seta para baixo). Abre **para baixo, dentro do quadro**, com: **Recursos** (abaixo),
   **Camadas**
   (Rodovias, Rios, Cidades — combináveis), **Sociais** (População, População urbana, Evangélicos, Católicos),
   **Econômicos** (Renda per capita, Bolsa Família), **Demais** (Eleitoras, Jovens 16–24, Eleitores 60+, Ensino
   superior; Redes femininas e Vereadores mirins desligados até haver lista). Um dado por vez; tocar de novo volta à
   votação; o dado ligado aparece na própria alça. *Decisões 16/11.*
   **Recursos** (*decisão 20/11*; só aparece na vertente Recursos do interruptor): pinta os municípios por **Total indicado** (rampa `voto`), **Falta pagar** (`apagar`),
   **% pago** (`pago`) ou **R$ por voto** (`up`; só cidades com ≥ 50 votos; menor = melhor = mais escuro). Uma leitura por
   vez (tocar de novo desliga); ao ligar, aparecem **o ano** (Todos os anos, 2023…) e **a origem** (Todas · Emendas
   impositivas · Convênios e outros — só quando há as duas) e a **lista dos 10 primeiros** (toque abre a cidade). O mapa
   pinta como uma análise (os 10 primeiros com rótulo, sem cor = sem emenda) e a legenda diz a leitura e o recorte. Ligar
   um dado de Sociais/Econômicos/Demais ou uma análise pronta desliga a leitura de recursos, e vice-versa; "Restaurar
   padrão" também desliga. Impositivas = cotas LOA, Adicional 0,55% e Excesso; Convênios e outros = Bancada e Convênios.

### 4.3b Comportamentos da capa (17/11/2026)
- **Espaço livre**: com o quadro de ferramentas ou de análises aberto, o mapa se enquadra na área que sobra ao lado
  dele (`__v4.vao(px)`); ao fechar, volta. Com a vista travada, não se mexe. *Decisão 17/11.*
- **Trocar o parlamentar**: clicar no nome abre uma lista com busca e rolagem embaixo do cartão (como na capa antiga),
  não a página inteira "Qual é o seu gabinete?". *Decisão 17/11.*
- **Esc**: em qualquer lugar da página fecha a lista de troca; senão desfaz o recorte e volta a SC inteira. *17/11.*

### 4.4 Padrão (estado inicial) e escolhas guardadas
- **Padrão**: marcador **Disco**, base **Satélite**, vista **Automática**, camada **Cidades** ligada, sem tema.
  *Decisão 16/11.*
- Tudo o que o usuário liga fica guardado no navegador (`localStorage["capa_ferr3"]`) e continua depois de recarregar.
  "Restaurar padrão" volta ao padrão e a SC inteira.
- **Ao mudar o padrão, trocar o nome da chave** (`capa_ferr` → `capa_ferr2` → `capa_ferr3`…), senão quem já usou
  continua vendo o padrão antigo.

### 4.5 Botão minimizar
- Seta para baixo (traço 2px), **no canto superior direito, metade para fora da caixa** (padrão Claude): círculo de
  28px, fundo `#1B2022`, borda `rgba(255,255,255,.28)`, sombra. Vale para painel do mandato, ferramentas e análises.
  *Decisão 16/11 — não usar "×" para minimizar.*
- Para isso, as caixas têm `overflow:visible`; a rolagem fica nas listas internas ("Outros", Ranking).
- Painel minimizado: a seta gira para cima e fica dentro da linha.

### 4.6 Balão do município (`.cl.ab`)
Branco opaco, sombra `0 8px 28px rgba(0,0,0,.35)`, 190px (330px com a lista de emendas). Abre **ao lado da própria
cidade** (à direita; se não couber, à esquerda), nunca sobre o cartão, o painel ou os controles.
Linhas: Votos 2026, Votos 2022, Diferença (verde/vermelho), % dos válidos, Eleitores, **Recursos indicados ▸**
(clicável), Já pago, o dado do tema ligado, e o botão "ver o recorte".
- **Recursos indicados ▸** abre a lista de emendas daquela cidade: ano · objeto, entidade, valor e etiqueta de
  situação — `pago` (verde), `x% pago` (âmbar), `a pagar` (vermelho claro), `inativa` (cinza).
- Rótulos de análise (sem balão aberto): branco opaco, nome em `#3B2F27`, valor em `#1E3A9C`.

### 4.7 Quadro de análises e pílula
- O botão de barras abre **Análises prontas** (380px, à direita). Ao escolher uma análise:
  - o mapa **limpa** o que estava ligado (discos, votos, relevo, tema) e **pinta só as cidades (ou regiões) dela**;
    os 10 municípios ganham rótulo com o valor;
  - o botão de barras **vira uma pílula** centralizada embaixo: `▥ ‹ nome curto › ×`. As setas passam de uma análise
    para outra; tocar no nome abre/fecha o quadro; **×** sai e devolve o mapa exatamente como estava;
  - **recolhem**: busca e ferramentas somem; o painel do mandato vira **uma esfera** (toque abre o painel normal);
    o seletor fica "Votos" compacto. *Decisões 16/11; Recursos saiu em 20/11.*
- O ranking não aparece aberto: fica numa **alça "Ranking"** no pé do quadro.

### 4.8 Legenda
**Visual por padrão** (*decisão 20/11*): a legenda mostra só as cores (a barra de 7 níveis ou os pontos) e o mapa não
põe os nomes das cidades. O botão **Nomes**, ao lado da legenda, mostra os textos da legenda e os rótulos dos 10 primeiros
(análises e Recursos); tocar de novo esconde. A escolha fica guardada no navegador (`gab_capa_nomes`).

Texto 11px `--sec`, com amostras de cor em retângulos de 14×8px. Sempre explica o "sem cor"
("sem cor = sem voto", "sem cor = sem emenda").

---

## 5. Mapa 3D

### 5.1 Bloco e entorno
- O bloco de SC é um terreno com relevo (exagero vertical), parede de solo e tampa. **Na capa só o território de SC
  aparece no bloco**; todo o resto é o **entorno**.
- **Entorno**: terreno 6× maior que o bloco, com a mesma escala de altura, ligeiramente abaixo; textura desfocada em
  anéis (o desfoque cresce com a distância), névoa na cor do fundo e borda que some. *Decisão 14/11 ("fluidez", sem a
  marca do quadrado).*
- Mosaicos embutidos (o Artifact não acessa servidores de mapa): z4, z7 e z10 para relevo (AWS Terrain) e satélite
  (EOxCloudless 2016, CC BY 4.0). Montagem do mais grosso para o mais fino.
- **O entorno usa só os mosaicos até z7** (`satelite(bb, w, h, 7)`): o z10 só cobre SC e tem outro tom — a emenda
  aparecia como um retângulo escuro.
- **O entorno não recebe sombra** (`ent.receiveShadow = false`): a sombra criava quadrados com listras diagonais e uma
  "borda fantasma" do litoral no mar.
- **Recorte (região/cidade) na capa**: os municípios vizinhos somem aos poucos na borda (máscara desfocada ∩ SC), sem o
  quadrado.
- **Base Neutro**: só o estado fica neutro (`#F3EFE8`, sombreado suave); **o entorno continua satélite**.
  *Decisão 16/11.*
- **Cidade escolhida** (busca ou "ver o recorte"): abre **sempre em satélite**, com o balão aberto; ao voltar a SC,
  a base escolhida volta. *Decisão 16/11.*
- Zoom: aproxima até `0,3×` da distância do enquadramento (`ctr.minDistance = r * .3`).

### 5.2 Marcadores (independentes e combináveis)
| Marcador | Especificação |
|---|---|
| **Disco** | disco plano deitado no terreno, textura 512px com anisotropia e mipmaps; miolo translúcido, aro branco fino, ponto central; tamanho `R0 × (.12 + .88 × √(v/vmax))`, `R0 = 10%` do maior lado do bloco; os maiores por baixo; `depthTest:false` (o relevo nunca corta); em Recursos, arco verde por fora = % pago (passos de 5%) |
| **Votos** (municípios pintados) | cada município pintado em **7 níveis** (posição do município entre os que têm valor); tom claro = mais transparente, escuro = mais opaco |
| **Relevo do eleitorado** | o terreno sobe em picos de altura proporcional ao eleitorado; a cor continua a da lente |

### 5.3 Rampas de cor (7 níveis, do menor para o maior) — `window.__rampas`

| Rampa | Cores |
|---|---|
| `voto` (votos) | `#CFEFFA #A6DDF5 #7CC4EE #559FE3 #3A7AD6 #2A57C0 #1E3A9C` |
| `up` / `pago` (cresceu, pago, bom) | `#DDF5E0 #BCEBC4 #94DCA2 #66C97D #3FB25D #259445 #16722F` |
| `dn` (caiu, ruim) | `#FDE3DA #F9C3B2 #F49E86 #EA765C #D9553D #BB3A26 #922818` |
| `apagar` (recursos mais a pagar) | `#FDEBD2 #FBD3A3 #F8B771 #F29A45 #E37E26 #C76416 #9E4D10` |
| `tema` (dados de "Outros") | `#EEE6FB #DACCF6 #C0ABEE #A288E2 #8467D2 #6849BB #4D3399` |

Opacidade por nível: `.62 .68 .74 .80 .86 .91 .96` (2022 a 85% disso).
**Régua da cor = a área na tela** (*decisão 20/11*): cada município é comparado só com os do recorte (ou do estado
inteiro, sem recorte); o nível é a posição do valor entre eles, em 7 faixas — o maior da área fica no tom mais escuro.
Recursos (Outros › Recursos, 20/11): Total indicado = `voto`; Falta pagar = `apagar`; % pago = `pago`; R$ por voto =
`up`. O nível vem da posição no ranking da leitura (7 faixas iguais, a 1ª é a mais escura).
*Decisão 16/11: manter o azul; 7 níveis; roxo para temas. 20/11: o "Recursos" do seletor (≥ 50% pago = `pago`, senão
`apagar`) saiu.*

---

## 6. Análises prontas

| Análise | Regra | Corte (dados irrisórios) | Cor |
|---|---|---|---|
| R$ por voto · melhor retorno | recurso indicado ÷ votos 2026, menor primeiro | ≥ 50 votos e com recurso | verde |
| R$ por voto · pior retorno | o mesmo, maior primeiro | ≥ 50 votos | vermelho |
| 10 maiores aumentos | votos 2026 − 2022 | — | verde |
| 10 maiores quedas | votos 2026 − 2022 | — | vermelho |
| Regiões: maior aumento × maior queda | soma por associação; 5 + 5 | — | verde / vermelho na região inteira |
| Potencial: muito eleitor, pouco voto | menor % dos válidos | > 30 mil eleitores | roxo |
| Bases mais fiéis | maior % dos válidos | ≥ 100 votos | azul |

O 1º colocado leva o tom mais forte, o 10º o mais claro. O corte de cada análise aparece escrito no quadro, e a
"média geral" do R$ por voto é total de recursos ÷ total de votos dentro do corte. *Pedido do usuário 16/11:
"elimine sempre aqueles dados irrisórios que desconfiguram a média".*

---

## 7. Dados usados

| Arquivo (no protótipo) | Origem | Observação |
|---|---|---|
| `mapa/dados/sc-base.json`, `sc-estadual.json`, `regioes-sc.js` | `dados/painel/` e `dados/regioes-sc.js` do repositório | resultado 2022/2026 por município, regiões |
| `mapa/dados/sc-social.json` | `dados/painel/sc-social.json` (IBGE Censo 2022, Bolsa Família, TSE) | temas de "Outros" |
| `recursos-mun.json` | somado de `dados/gabinete/mandato-napoleao.json` (**fora do git**) | `{município: [indicado, pago]}` |
| `mapa/dados/emendas-mun.json` | `dados/gabinete/mandato-napoleao.json` (**fora do git**) | lista de emendas por município; **não subir ao repositório público** sem decidir antes |
| `sc-municipios-detalhe.geojson`, `sc-terra.json`, `sc-vias-rios.json` | já usados pelo mapa original | contornos, terra, rodovias e rios |

No site, `recursos-mun.json` e `emendas-mun.json` **não existem**: a capa monta os dois na hora, a partir dos dados
que a página já carrega (`itensCapa()` e `E0`) — nada novo foi publicado.

Redes Femininas e Vereadores Mirins: **sem dado** — os botões ficam desligados até chegar a lista (cidade + nome da
presidente). Não inventar cidades nem nomes.

---

## 8. Comportamentos (resumo para conferir)

- Escolhas das ferramentas guardadas no navegador; "Restaurar padrão" volta a Disco + Satélite + Automática + Cidades.
- Marcadores independentes; um tema de "Outros" sempre pinta os municípios.
- Interruptor Votos | Recursos: cada vertente tem as suas opções e muda as ferramentas (Outros › Recursos × dados sociais).
- Outros › Recursos: uma leitura por vez (total, falta pagar, % pago, R$ por voto), com ano e origem; lista dos 10
  primeiros abre a cidade; desliga temas e análises (e é desligada por eles).
- Análise: limpa o mapa, pinta as cidades, vira pílula central com ‹ › ×, recolhe busca/ferramentas, painel vira esfera.
- Cidade escolhida abre em satélite com o balão; "Recursos indicados ▸" abre as emendas.
- Balão nunca cobre o cartão, o painel ou os controles; rótulos respeitam o quadro aberto.
- Num recorte, só aparecem os discos da própria região.

---

## 9. Regras de construção

- **Capa = mapa + vidro.** Nada de cartões opacos sobre o mapa, a não ser balões e quadros de leitura longa.
- **Uma cor de destaque por significado**: laranja = prazo/cota e queda; verde = pago/cresceu; azul = votos;
  roxo = dados de contexto. Não reutilizar uma cor fora do seu significado.
- **Sem cor também é informação**: toda pintura diz o que significa "sem cor" na legenda.
- **Tudo que liga, desliga**; toda escolha pode ser desfeita (× da análise devolve o mapa; "Restaurar padrão").
- Quadros abrem **acima da linha de controles, colados à direita**; minimizar fica no canto, com a seta.
- Em tela estreita, recolher primeiro o que é secundário (busca, ferramentas, segmentação) antes de sobrepor.

---

## 10. Como conferir uma mudança

1. Sintaxe dos scripts (o protótipo não tem build):
   `node -e "…new Function(script)…"` em cada `<script>` (ou abra no navegador e veja o console).
2. Capturas com o Chrome sem janela (precisa de um servidor local servindo a pasta do protótipo):
   - `ferramentas/capa3d/foto-tela.mjs <url> <saida.jpg> [largura] [altura] [js]` — espera o mapa montar (40 s),
     roda o JS opcional e salva a tela;
   - `ferramentas/capa3d/avalia.mjs` — igual, mas imprime o resultado do JS e **os erros do console** (use para testar
     cliques: o seletor, as análises, o balão).
   - O Chrome precisa de `--headless=new --remote-debugging-port=9334 --use-angle=metal --enable-webgl
     --ignore-gpu-blocklist`.
3. Conferir **em imagem** pelo menos: padrão, ferramentas abertas com "Outros", uma análise ativa, uma cidade
   escolhida com as emendas abertas, base Neutro e tela estreita (≈ 1180px).
4. Publicar o Artifact (mesmo link) e copiar os arquivos para `prototipos/capa-3d/`.
5. **No site**: servidor local em `127.0.0.1` (o Gabinete libera o modo de teste) com `localStorage.gab_vinc_local =
   "55777"`, abrir `painel/gabinete.html` e conferir o mesmo roteiro, mais: um recorte de região (painel e ranking
   seguem) e o console sem erros. Subir o `?cb=` de `gabinete-capa.js`/`.css` em `gabinete.html` a cada mudança.

### Erros que já aconteceram (não repetir)
| Erro | Causa | Como evitar |
|---|---|---|
| Seletor Votos/Recursos parou | comentário `//` no meio de uma linha de código "engoliu" o resto da linha | comentário de linha só no fim; no meio, `/* … */`; testar com `avalia.mjs` |
| Botões foram parar ao lado do seletor | um `</div>` a menos ao trocar um bloco de HTML | comparar a estrutura depois de substituir HTML |
| Painel de análise não aparecia | regra `body.capa>*:not(#cena){display:none!important}` vence por especificidade | para reexibir, usar seletor com `:not(#x)` |
| Subpainel transparente | `backdrop-filter` aninhado | fundo sólido em painel dentro de vidro |
| Quadrados listrados e borda fantasma no mar | entorno recebendo sombra | `ent.receiveShadow = false` |
| Retângulo escuro a sudoeste | emenda do mosaico z10 com o z7 | entorno só até z7 |
| Padrão novo não aparecia | escolhas antigas guardadas no navegador | trocar o nome da chave do `localStorage` |
| Capa recarregando o 3D a cada clique | iframe dentro de `#app`, que `desenhar()` refaz | capa fora de `#app` (§1.2-site) |
| Estilo da página vazando na capa | classes iguais (`.fx`, `.leg`, `.cab`…) | tudo preso a `.g3d`; trocar o nome quando a página já usa |
| Cabeçalho vazio de tabela num recorte | a tabela da região é criada mesmo sem cidades listadas na capa | só criar o cabeçalho se houver linhas |
| Balão translúcido sobre o cartão | coluna lateral de rótulos + degradê escuro da capa | balão ao lado da cidade e zonas proibidas (`bate`) |

---

## 11. O que falta

- ~~Levar a capa para o site~~ — feito em 16/11/2026 (§1.2-site).
- Listas de **Redes Femininas** e **Vereadores Mirins**.
- Cruzar com a **lista de contatos**, **prefeito (partido)** e **vereadores** no balão.
- Versão para celular: no site, abaixo de 760px o painel começa minimizado e os quadros encolhem; um desenho próprio
  para celular ainda não foi feito.
- Rótulos de análise muito próximos ainda podem se sobrepor um pouco.
