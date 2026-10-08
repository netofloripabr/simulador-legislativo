# Painel analítico de SC (07/10/2026): base enxuta para o painel de pontos
# (um ponto por município), qualquer candidato de qualquer cargo, 2026 e 2022.
# Saídas em dados/painel/:
#   sc-base.json      municípios (nome, chave, lat/lon do centro, eleitorado, meso, assoc) + contorno de SC
#   sc-{cargo}.json   {val:[válidos 2026 por mun], val22:[...], c:[{n,u,p,s,t,v:[...],t22,v22:[...]}]}
# Votos 2026 somados dos arquivos por seção (dados/resultados/sc-2026/secoes);
# 2022 do arquivo estadual de 2022, casando o candidato pelo nome de urna.
import json, os, re, math, unicodedata, collections
R = os.path.join(os.path.dirname(__file__), '..') + '/'
norm = lambda s: ' '.join(unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().upper().split())
slug = lambda s: '-'.join(''.join(c if c.isalnum() else ' ' for c in norm(s)).split()).lower()
reg = [dict(zip(('ibge', 'nome', 'chave', 'meso', 'micro', 'assoc'), m)) for m in re.findall(r'ibge:"(\d+)", nome:"([^"]+)", chave:"([^"]+)", meso:"([^"]+)", micro:"([^"]+)", assoc:"([^"]+)"', open(R + 'dados/regioes-sc.js').read())]
geo = {f['properties']['ibge']: f['geometry'] for f in json.load(open(R + 'dados/mapas/sc-municipios.geojson'))['features']}
part = json.load(open(R + 'dados/resultados/sc-2026/participacao.json'))
def centro(g):
  aneis = g['coordinates'] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
  r = max(aneis, key=len) if g['type'] == 'Polygon' else max(aneis, key=len)
  a = cx = cy = 0
  for (x0, y0), (x1, y1) in zip(r, r[1:]):
    k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k
  return [round(cx / (3 * a), 4), round(cy / (3 * a), 4)] if a else list(r[0])
mun = []
for m in reg:
  lon, lat = centro(geo[m['ibge']])
  el = (part['estadual']['mun'].get(m['chave']) or [0])[0]
  mun.append({'k': m['chave'], 'n': m['nome'], 'lon': lon, 'lat': lat, 'el': el, 'meso': m['meso'], 'micro': m['micro'], 'assoc': m['assoc']})
# contorno: todos os municípios simplificados (o painel desenha bem translúcido)
def simp(r, tol=.01):
  out = [r[0]]
  for p in r[1:]:
    if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) > tol: out.append(p)
  return [[round(x, 3), round(y, 3)] for x, y in out]
cont = []
for m in reg:
  g = geo[m['ibge']]; aneis = g['coordinates'] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
  cont.append([simp(a) for a in aneis if len(a) > 3])
os.makedirs(R + 'dados/painel', exist_ok=True)
json.dump({'mun': mun, 'contorno': cont}, open(R + 'dados/painel/sc-base.json', 'w'), ensure_ascii=False, separators=(',', ':'))
idx = {m['k']: i for i, m in enumerate(mun)}; N = len(mun)
TSE = json.load(open(R + 'ferramentas/verificacao/tse-2026.json'))
for cargo in ('estadual', 'federal', 'senador', 'governador', 'presidente'):
  votos = collections.defaultdict(lambda: [0] * N); val = [0] * N
  for m in mun:
    s = json.load(open(R + f"dados/resultados/sc-2026/secoes/{slug(m['n'])}.json"))
    i = idx[m['k']]
    for num, secs in (s.get(cargo) or {}).items(): votos[num][i] += sum(secs.values())
    val[i] = sum(x[5] for x in (s.get('_part', {}).get(cargo) or {}).values())
  meta = {str(c['numero']): c for c in json.load(open(R + f'dados/resultados/sc-2026/{cargo}.json'))['candidatos']}
  tse = TSE[cargo]['estado']['cands']
  a22 = json.load(open(R + f'dados/resultados/sc-2022/{cargo}.json')); a22 = a22['candidatos'] if isinstance(a22, dict) else a22
  por22 = {norm(c.get('nomeUrna') or c.get('nome')): c for c in a22}
  p22 = json.load(open(R + 'dados/resultados/sc-2022/participacao.json')).get(cargo, {}).get('mun', {})
  val22 = [(p22.get(m['k']) or [0] * 6)[5] for m in mun]
  out = []
  for num, t in tse.items():
    if not str(t.get('dvt', 'Válido')).startswith('Válido'): continue
    v = votos.get(num, [0] * N); mt = meta.get(num, {})
    u = mt.get('nomeUrna') or t['nome'].title()
    c = {'n': num, 'u': u, 'nome': mt.get('nome') or t['nome'].title(), 'p': mt.get('partido') or t.get('partido'), 's': t.get('st', ''), 't': t['votos'], 'v': v}
    o = por22.get(norm(u)) or por22.get(norm(t['nome']))
    if o and o.get('municipios'):
      c['v22'] = [o['municipios'].get(m['k'], 0) for m in mun]; c['t22'] = sum(c['v22']); c['n22'] = str(o.get('numero', ''))
    out.append(c)
  out.sort(key=lambda c: -c['t'])
  # proporcionais: QE, QP e rodada das sobras (D'Hondt, sem piso — regra 2026) por grupo
  meta = {'part': TSE[cargo]['estado'].get('part')}
  if cargo in ('estadual', 'federal'):
    E = TSE[cargo]['estado']; vagas = E['vagas']; validos = E['part'][5]
    q = validos / vagas; qe = int(q) + (1 if q - int(q) > .5 else 0)
    g = collections.defaultdict(lambda: {'v': 0, 'c': []})
    for c in out: g[c['p']]['v'] += c['t']; g[c['p']]['c'].append(c)
    for k, v in E.get('legenda', {}).items(): g[k]['v'] += v
    cad = {k: x['v'] // qe for k, x in g.items()}
    for k, x in g.items(): x['c'].sort(key=lambda c: -c['t'])
    for k, x in g.items():
      for c in x['c'][:min(cad[k], len(x['c']))]: c['r'] = 0
    sob = vagas - sum(min(cad[k], len(x['c'])) for k, x in g.items()); n = dict(cad); rod = 0
    while sob > 0:
      rod += 1; k = max((k for k in g if n[k] < len(g[k]['c'])), key=lambda k: g[k]['v'] / (n[k] + 1)); g[k]['c'][n[k]]['r'] = rod; n[k] += 1; sob -= 1
    meta.update({'vagas': vagas, 'validos': validos, 'qe': qe, 'grupos': {k: {'v': x['v'], 'qp': cad[k], 'cad': n[k]} for k, x in g.items() if x['v']}})
    ok = sum(1 for c in out if ('r' in c) == str(c['s']).lower().startswith('eleito') and (('r' in c) <= 0 or (c['r'] == 0) == ('qp' in c['s'].lower())))
    print(cargo, 'QE', qe, '· conferência eleito/QP/média com TSE:', ok, '/', len(out))
  p22e = json.load(open(R + 'dados/resultados/sc-2022/participacao.json')).get(cargo, {}).get('estado')
  meta['part22'] = p22e
  json.dump({'val': val, 'val22': val22, 'meta': meta, 'c': out}, open(R + f'dados/painel/sc-{cargo}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
  ok = sum(1 for c in out if sum(c['v']) == c['t'])
  print(cargo, len(out), 'candidatos ·', ok, 'com soma = TSE ·', sum(1 for c in out if 'v22' in c), 'com 2022')
