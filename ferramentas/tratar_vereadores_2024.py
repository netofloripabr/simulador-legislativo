# Vereadores eleitos em SC em 2024 (07/10/2026), para o duelo da aba Mapa.
# Entradas (dados abertos do TSE, pasta passada como argumento):
#   votacao_secao_2024_SC.zip, consulta_cand_2024.zip, eleitorado_local_votacao_2024.zip,
#   eleitorado_local_votacao_2026.zip, foto_cand2024_SC_div.zip
# Saídas:
#   dados/resultados/sc-2024/vereadores.json  {municipio: {validos, eleitos:[{numero,nomeUrna,partido,total,sit,locais:{local2026: votos}}]}}
#   dados/fotos/sc-2024/vereador/{slug-municipio}-{numero}.jpg
# O local de votação de 2024 é casado com o de 2026 (mesma zona + nº do local
# a menos de 500 m, ou coordenada a menos de 150 m); sem par, fica o nome de 2024.
import sys, os, json, csv, io, zipfile, math, unicodedata, collections
T = sys.argv[1].rstrip('/') + '/'; R = os.path.join(os.path.dirname(__file__), '..') + '/'
norm = lambda s: ' '.join(unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper().replace("'", ' ').split())
slug = lambda s: '-'.join(''.join(c if c.isalnum() else ' ' for c in norm(s)).split()).lower()
MUN = json.load(open(R + 'dados/resultados/sc-2022/municipios.json'))['municipios']
chaveTse = {str(int(m['tse'])): k for k, m in MUN.items()}
rd = lambda z, n: csv.DictReader(io.TextIOWrapper(zipfile.ZipFile(T + z).open(n), encoding='latin-1'), delimiter=';')
# eleitos
el = {}
for r in rd('consulta_cand_2024.zip', 'consulta_cand_2024_SC.csv'):
  if r['DS_CARGO'].upper() == 'VEREADOR' and r['DS_SIT_TOT_TURNO'].startswith('ELEITO'):
    el[r['SQ_CANDIDATO']] = {'numero': r['NR_CANDIDATO'], 'nomeUrna': r['NM_URNA_CANDIDATO'].title(), 'partido': r['SG_PARTIDO'], 'sit': r['DS_SIT_TOT_TURNO'].capitalize(), 'mun': chaveTse.get(str(int(r['SG_UE']))), 'total': 0, 'locais': collections.Counter()}
# locais 2024 e 2026 com coordenada
def locais(z, n, ano):
  o = {}
  for r in rd(z, n):
    if r['SG_UF'] != 'SC': continue
    try: ll = (float(r['NR_LATITUDE'].replace(',', '.')), float(r['NR_LONGITUDE'].replace(',', '.')))
    except ValueError: ll = None
    if ll and -1 in ll: ll = None
    o[(r['CD_MUNICIPIO'], r['NR_ZONA'], r['NR_LOCAL_VOTACAO'])] = (r['NM_LOCAL_VOTACAO'], ll)
  return o
L24 = locais('eleitorado_local_votacao_2024.zip', 'eleitorado_local_votacao_2024.csv', 2024)
L26 = locais('eleitorado_local_votacao_2026.zip', 'eleitorado_local_votacao_2026_SC.csv', 2026)
dist = lambda a, b: 6371000 * math.hypot(math.radians(b[0] - a[0]), math.radians(b[1] - a[1]) * math.cos(math.radians(a[0])))
por26 = collections.defaultdict(list)
for (m, z, n), (nm, ll) in L26.items(): por26[m].append((z, n, nm, ll))
casa = {}
def par(k):
  if k in casa: return casa[k]
  nm, ll = L24.get(k, (None, None)); res = None
  o = L26.get(k)
  if o and (not ll or not o[1] or dist(ll, o[1]) < 500): res = o[0]
  elif ll:
    c = [(dist(ll, x[3]), x[2]) for x in por26[k[0]] if x[3]]
    if c and min(c)[0] < 150: res = min(c)[1]
  casa[k] = res; return res
val = collections.Counter()
for r in rd('votacao_secao_2024_SC.zip', 'votacao_secao_2024_SC.csv'):
  if r['DS_CARGO'] != 'Vereador' or r['NR_TURNO'] != '1': continue
  v = int(r['QT_VOTOS']); m = chaveTse.get(str(int(r['CD_MUNICIPIO'])))
  if r['NR_VOTAVEL'] not in ('95', '96'): val[m] += v
  e = el.get(r['SQ_CANDIDATO'])
  if not e: continue
  k = (r['CD_MUNICIPIO'], r['NR_ZONA'], r['NR_LOCAL_VOTACAO'])
  e['total'] += v; e['locais'][par(k) or r['NM_LOCAL_VOTACAO'].title()] += v
out = collections.defaultdict(lambda: {'validos': 0, 'eleitos': []})
for e in el.values():
  if not e['mun']: continue
  m = e.pop('mun'); e['locais'] = dict(e['locais'].most_common()); out[m]['eleitos'].append(e); out[m]['validos'] = val[m]
for m in out.values(): m['eleitos'].sort(key=lambda e: -e['total'])
os.makedirs(R + 'dados/resultados/sc-2024', exist_ok=True)
json.dump(out, open(R + 'dados/resultados/sc-2024/vereadores.json', 'w'), ensure_ascii=False, separators=(',', ':'))
ok = sum(1 for v in casa.values() if v); print(len(el), 'eleitos ·', len(out), 'municípios · locais casados', ok, '/', len(casa))
# fotos
fz = zipfile.ZipFile(T + 'foto_cand2024_SC_div.zip'); nomes = {n.split('_')[0][3:]: n for n in fz.namelist() if n.endswith('.jpg')}
d = R + 'dados/fotos/sc-2024/vereador/'; os.makedirs(d, exist_ok=True); nf = 0
for m, o in out.items():
  for e in o['eleitos']:
    sq = next(k for k, v in el.items() if v is e)
    if sq in nomes: open(d + f"{slug(MUN[m]['nome'])}-{e['numero']}.jpg", 'wb').write(fz.read(nomes[sq])); nf += 1
print(nf, 'fotos')
