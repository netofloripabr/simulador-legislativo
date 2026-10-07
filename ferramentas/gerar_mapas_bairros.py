# Mini mapa de bairros por município (06/10/2026): limites oficiais do IBGE
# (malha de bairros do Censo 2022) + posição de cada local de votação 2026
# (cadastro eleitorado_local_votacao_2026 do TSE). Saída já projetada em
# coordenadas de tela (largura 700) pra o app só desenhar o SVG.
#   python3 ferramentas/gerar_mapas_bairros.py <SC_bairros_CD2022 sem extensão> <eleitorado_local_votacao_2026.zip>
# Município sem bairro no IBGE: usa o contorno de dados/mapas/sc-municipios.geojson.
import sys, os, json, csv, io, zipfile, math, unicodedata, collections
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ibge')); import shp
R = os.path.join(os.path.dirname(__file__), '..') + '/'
IB, ZIP = sys.argv[1], sys.argv[2]
norm = lambda s: ' '.join(unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper().replace("'", ' ').split())
slug = lambda s: '-'.join(x for x in ''.join(c if c.isalnum() else ' ' for c in norm(s)).split()).lower()
MUN = json.load(open(R + 'dados/resultados/sc-2022/municipios.json'))['municipios']
tse2nome = {str(int(m['tse'])): m['nome'] for m in MUN.values()}
dbf, geom = shp.ler_dbf(IB + '.dbf'), shp.ler_shp(IB + '.shp')
bairrosMun = collections.defaultdict(list)
for d, g in zip(dbf, geom): bairrosMun[norm(d['NM_MUN'])].append((d['NM_BAIRRO'], g))
contorno = {}
for f in json.load(open(R + 'dados/mapas/sc-municipios.geojson'))['features']:
  g = f['geometry']; contorno[f['properties']['ibge']] = g['coordinates'] if g['type'] == 'Polygon' else [r for p in g['coordinates'] for r in p]
import re
cdIbge = {norm(n): c for c, n in re.findall(r'ibge:"(\d+)", nome:"([^"]+)"', open(R + 'dados/regioes-sc.js').read())}
# coordenada de cada seção 2026
geo = collections.defaultdict(dict)
with zipfile.ZipFile(ZIP) as z:
  for r in csv.DictReader(io.TextIOWrapper(z.open('eleitorado_local_votacao_2026_SC.csv'), encoding='latin-1'), delimiter=';'):
    try: la, lo = float(r['NR_LATITUDE'].replace(',', '.')), float(r['NR_LONGITUDE'].replace(',', '.'))
    except ValueError: continue
    if la == -1 or lo == -1: continue
    geo[str(int(r['CD_MUNICIPIO']))][f"{int(r['NR_ZONA'])}::{int(r['NR_SECAO'])}"] = (lo, la)
def dp(pts, tol):
  if len(pts) < 4: return pts
  (x0, y0), (x1, y1) = pts[0], pts[-1]; dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1e-9
  i, m = 0, -1
  for k in range(1, len(pts) - 1):
    d = abs(dy * (pts[k][0] - x0) - dx * (pts[k][1] - y0)) / L if L > 1e-6 else math.hypot(pts[k][0] - x0, pts[k][1] - y0)  # anel fechado
    if d > m: i, m = k, d
  return dp(pts[:i + 1], tol)[:-1] + dp(pts[i:], tol) if m > tol else [pts[0], pts[-1]]
def pip(x, y, ring):
  c, j = False, len(ring) - 1
  for i in range(len(ring)):
    (xi, yi), (xj, yj) = ring[i], ring[j]
    if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
    j = i
  return c
OUT = R + 'dados/mapas/bairros-sc/'; os.makedirs(OUT, exist_ok=True); n = nb = 0
for cod, nome in tse2nome.items():
  sec = json.load(open(R + f'dados/resultados/sc-2026/secoes/{slug(nome)}.json'))
  bs = bairrosMun.get(norm(nome), [])
  aneis = [r for _, g in bs for r in g] or contorno.get(cdIbge.get(norm(nome), ''), [])
  pts = [p for r in aneis for p in r]
  if not pts: print('sem geometria', nome); continue
  x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
  k = math.cos(math.radians((y0 + y1) / 2)); W = 700; H = W * (y1 - y0) / ((x1 - x0) * k)
  P = lambda lo, la: ((lo - x0) / (x1 - x0) * W, (y1 - la) / (y1 - y0) * H)
  path = lambda g: ''.join('M' + 'L'.join('%d,%d' % (round(a), round(b)) for a, b in dp([P(*q) for q in r], .7)) + 'Z' for r in g)
  saida = {'w': W, 'h': round(H), 'fonte': 'IBGE Censo 2022' if bs else 'contorno', 'b': [], 'l': {}}
  if bs: saida['b'] = [[nm, path(g), [round(v) for v in P(sum(q[0] for q in max(g, key=len)) / len(max(g, key=len)), sum(q[1] for q in max(g, key=len)) / len(max(g, key=len)))]] for nm, g in bs]
  else: saida['c'] = path(aneis)
  for zs, loc in sec['_secoes'].items():
    if loc in saida['l'] or zs not in geo[cod]: continue
    lo, la = geo[cod][zs]; bi = -1
    for i, (_, g) in enumerate(bs):
      if sum(pip(lo, la, r) for r in g) % 2: bi = i; break
    x, y = P(lo, la); saida['l'][loc] = [round(x), round(y), bi]
  json.dump(saida, open(OUT + slug(nome) + '.json', 'w'), ensure_ascii=False, separators=(',', ':')); n += 1; nb += bool(bs)
print(n, 'municípios gerados,', nb, 'com bairros do IBGE')
