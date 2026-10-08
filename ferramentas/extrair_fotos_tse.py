# Fotos oficiais dos candidatos (07/10/2026), usadas no duelo da aba Mapa.
# Entrada: consulta_cand_2026.zip e foto_cand2026_SC_div.zip (dados abertos do TSE:
#   cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip
#   cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_SC_div.zip)
# Saída: dados/fotos/sc-2026/{cargo}/{numero}.jpg
import sys, os, zipfile, csv, io
R = os.path.join(os.path.dirname(__file__), '..') + '/'
CARGO = {'DEPUTADO ESTADUAL': 'estadual', 'DEPUTADO FEDERAL': 'federal', 'SENADOR': 'senador', 'GOVERNADOR': 'governador'}
cand = zipfile.ZipFile(sys.argv[1]); fotos = zipfile.ZipFile(sys.argv[2])
nomes = {n.split('_')[0][3:]: n for n in fotos.namelist() if n.endswith('.jpg')}
n = 0
for r in csv.DictReader(io.TextIOWrapper(cand.open('consulta_cand_2026_SC.csv'), encoding='latin-1'), delimiter=';'):
  cg = CARGO.get(r['DS_CARGO'].upper()); f = nomes.get(r['SQ_CANDIDATO'])
  if not cg or not f: continue
  d = R + f'dados/fotos/sc-2026/{cg}/'; os.makedirs(d, exist_ok=True)
  open(d + r['NR_CANDIDATO'] + '.jpg', 'wb').write(fotos.read(f)); n += 1
print(n, 'fotos')

# Presidente (08/10/2026): candidatura nacional, fica no arquivo BR, não no de SC.
#   3º argumento opcional: foto_cand2026_BR_div.zip (cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/)
if len(sys.argv) > 3:
  fb = zipfile.ZipFile(sys.argv[3]); nb = {n.split('_')[0][3:]: n for n in fb.namelist() if n.endswith('.jpg')}
  d = R + 'dados/fotos/sc-2026/presidente/'; os.makedirs(d, exist_ok=True); k = 0
  for r in csv.DictReader(io.TextIOWrapper(cand.open('consulta_cand_2026_BR.csv'), encoding='latin-1'), delimiter=';'):
    if r['DS_CARGO'].upper() == 'PRESIDENTE' and r['SQ_CANDIDATO'] in nb: open(d + r['NR_CANDIDATO'] + '.jpg', 'wb').write(fb.read(nb[r['SQ_CANDIDATO']])); k += 1
  print(k, 'fotos de presidente')
