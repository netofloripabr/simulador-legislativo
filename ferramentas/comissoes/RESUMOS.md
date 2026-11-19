# Resumos das proposições nas comissões (painel Processo Legislativo › Comissões)

Formato aprovado pelo usuário em 18/11/2026 (protótipo `prototipos/comissoes-tramitacao/detalhe-v3.html`).
Cada proposição tem um arquivo `ferramentas/comissoes/resumos/{id}.json`, escrito a partir do **texto do projeto**
(ementa + artigos + justificativa), que fica em `ferramentas/comissoes/_cache/textos/{id}.json` (campo `texto`, gerado por
`textos.mjs`). Os dados de tramitação (autor, comissão, relator, datas) vêm de `dados/painel/alesc-comissoes-tram.json`
e NÃO entram no resumo (o painel já os mostra). Depois de escrever, rodar `node ferramentas/comissoes/juntar-resumos.mjs`.

## Regras de escrita

- Português simples, para quem não é da área. Nada de "dispõe sobre", "no âmbito do Estado", "dá outras providências".
- Só o que está no texto. Não inventar números, valores, leis ou efeitos. Se o texto do PDF veio vazio ou ilegível
  (PDF de imagem), escrever a partir da ementa e marcar `"base": "ementa"`; omitir `muda`, `pq`, `fund`, `disp`, `fis`.
- Nunca opinar sobre mérito, constitucionalidade ou chance de aprovação.

## Campos

```json
{
  "m": "Manchete: o que a proposição faz, verbo no presente, até ~80 caracteres",
  "f": "Uma ou duas frases com o efeito prático (até ~280 caracteres)",
  "t": [["Tema de 1º nível", "2º nível", "3º nível opcional"], ["outro tema, se houver"]],
  "muda": [["+", "o que muda (curto)", "detalhe opcional"]],
  "pq": "Por quê: a razão dada na justificativa, em 1 ou 2 frases",
  "fund": ["normas ou precedentes citados na justificativa, curtos: CF art. 225", "SP · Lei 18.184/2025"],
  "disp": { "art": 3, "txt": "3 artigos · cria o art. 2º-A, com 2 parágrafos", "b": ["Art. 1º", ["→"], ["2º-A", "nv"], ["§1", "pa"], "Art. 2º", "Art. 3º"] },
  "fis": ["Nenhum", "não cria despesa"],
  "lei": ["Lei 12.854/2003", "Código Estadual de Proteção aos Animais", "Lei alterada"],
  "alerta": "só se houver algo fora do normal no texto: pedido de urgência, tramitação conjunta citada…",
  "rel": [["PL 422/2024", "tramita junto"], ["Precedente", "São Paulo · Lei 18.184/2025"]]
}
```

- `t`: 1 ou 2 temas. O **1º nível é obrigatoriamente um destes** (é o filtro do painel):
  Tributação e finanças · Saúde · Educação · Segurança pública · Servidores públicos · Meio ambiente ·
  Direitos e cidadania · Economia e desenvolvimento · Infraestrutura e transporte · Agricultura e pesca ·
  Cultura, esporte e turismo · Administração pública · Homenagens e datas · Utilidade pública · Assistência social e família.
  Exemplos de 2º/3º nível: "ICMS › Isenção", "Bem-estar animal › Cães e gatos", "Polícia Penal", "Doenças raras".
  Animais entram em Meio ambiente › Bem-estar animal. Declaração de utilidade pública: Utilidade pública › (área da entidade).
  Denominação de prédio/rodovia e datas comemorativas: Homenagens e datas. Vetos: o tema do projeto vetado.
- `muda`: 1 a 5 itens; o 1º caractere diz o ícone: `+` cria/inclui · `-` revoga/retira · `x` proíbe · `ok` permite ·
  `~` altera/regra de vigência · `$` dinheiro, tributo, despesa · `t` prazo/duração · `p` pena/sanção.
- `disp`: conte os artigos do projeto (não os da lei alterada). `b` é o desenho em blocos: strings simples para artigos;
  `["→"]` e `["2º-A","nv"]` para dispositivo novo criado numa lei; `["§1","pa"]` para parágrafos. Em projetos longos
  (mais de 8 artigos), `b` mostra só os grupos: `["Arts. 1º a 5º", "Arts. 6º a 12"]`.
- `fis`: o que o texto diz sobre custo. "Nenhum" (não cria despesa), "R$ 0 estimado", "Cria despesa" (com o valor se houver),
  "Renúncia de receita", "Não informado". Segundo item: de onde veio (ex.: "exposição de motivos da Fazenda").
- `lei`: a norma principal alterada ou usada como base, com o nome popular e o rótulo ("Lei alterada", "Base", "Constituição").
  Omitir se não houver.
- Vetos (MSV): `m` = "Veto total/parcial a …(o que o projeto fazia)", `pq` = razões do veto.
- Omitir campos vazios.
