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
