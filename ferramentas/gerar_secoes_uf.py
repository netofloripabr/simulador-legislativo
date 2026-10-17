# Votos por seção de um estado além de SC (17/10/2026, começando por SP), no mesmo formato
# dos arquivos de SC (dados/resultados/sc-2026/secoes/{municipio}.json):
#   {cargo: {numero: {"zona::secao": votos}}, "_secoes": {"zona::secao": local}, "_bairroSec": {zs: bairro},
#    "_part": {cargo: {zs: [aptos, comparecimento, abstenção, brancos, nulos, válidos]}}}
# Fontes (TSE, dados abertos): votacao_secao_2026_UF.zip e eleitorado_local_votacao_2026.zip (aptos, bairro).
# Uso: python3 ferramentas/gerar_secoes_uf.py sp /pasta/com/os/zips
import csv, io, json, os, sys, zipfile, collections, unicodedata
UF = sys.argv[1].lower(); P = sys.argv[2]
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
CARGO = {"Deputado Estadual": "estadual", "Deputado Federal": "federal", "Senador": "senador", "Governador": "governador", "Presidente": "presidente"}
norm = lambda s: " ".join(unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().upper().split())
slug = lambda s: "-".join("".join(c if c.isalnum() else " " for c in norm(s)).split()).lower()
tit = lambda s: " ".join(w.capitalize() if len(w) > 2 or i == 0 else w.lower() for i, w in enumerate((s or "").lower().split()))
base = json.load(open(R + f"dados/painel/{UF}-base.json"))
nomeTse = {m["tse"].lstrip("0"): m["n"] for m in base["mun"]}
# aptos, local e bairro de cada seção
aptos, bairro, local = {}, {}, {}
with zipfile.ZipFile(f"{P}/eleitorado_local_votacao_2026.zip") as z:
    for r in csv.DictReader(io.TextIOWrapper(z.open(f"eleitorado_local_votacao_2026_{UF.upper()}.csv"), encoding="latin-1"), delimiter=";"):
        if r["NR_TURNO"] != "1": continue
        k = (r["CD_MUNICIPIO"].lstrip("0"), f"{int(r['NR_ZONA'])}::{int(r['NR_SECAO'])}")
        aptos[k] = int(r["QT_ELEITOR_SECAO"] or 0); bairro[k] = tit(r["NM_BAIRRO"]); local[k] = tit(r["NM_LOCAL_VOTACAO"])
print("seções no cadastro:", len(aptos))
D = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(dict)))
PT = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0, 0, 0, 0])))
LOC = collections.defaultdict(dict)
with zipfile.ZipFile(f"{P}/votacao_secao_2026_{UF.upper()}.zip") as z:
    nome = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
    for i, r in enumerate(csv.DictReader(io.TextIOWrapper(z.open(nome), encoding="latin-1"), delimiter=";")):
        if r["NR_TURNO"] != "1": continue
        cg = CARGO.get(r["DS_CARGO"]);
        if not cg: continue
        mun = r["CD_MUNICIPIO"].lstrip("0"); zs = f"{int(r['NR_ZONA'])}::{int(r['NR_SECAO'])}"; n = r["NR_VOTAVEL"]; v = int(r["QT_VOTOS"] or 0)
        p = PT[mun][cg][zs]; p[1] += v
        if n == "95": p[3] += v
        elif n == "96" or n == "97": p[4] += v
        else:
            p[5] += v
            if len(n) > 2 or cg in ("governador", "presidente"): D[mun][cg][n][zs] = D[mun][cg][n].get(zs, 0) + v
        if zs not in LOC[mun]: LOC[mun][zs] = local.get((mun, zs)) or tit(r["NM_LOCAL_VOTACAO"])
        if i % 5_000_000 == 0: print("linhas", i, flush=True)
out = R + f"dados/resultados/{UF}-2026/secoes/"; os.makedirs(out, exist_ok=True); tot = 0
for mun, cgs in D.items():
    nm = nomeTse.get(mun)
    if not nm: print("sem município", mun); continue
    o = {cg: {n: dict(sec) for n, sec in cand.items()} for cg, cand in cgs.items()}
    o["_secoes"] = LOC[mun]; o["_bairroSec"] = {zs: bairro.get((mun, zs), "") for zs in LOC[mun]}
    for cg, secs in PT[mun].items():
        for zs, p in secs.items(): p[0] = aptos.get((mun, zs), p[1]); p[2] = max(0, p[0] - p[1])
    o["_part"] = {cg: dict(secs) for cg, secs in PT[mun].items()}
    json.dump(o, open(out + slug(nm) + ".json", "w"), ensure_ascii=False, separators=(",", ":")); tot += 1
print("municípios gravados:", tot)
# formato compacto (capital passa de 60 MB): índice das seções em "_z" e, por cargo, um arquivo
# {municipio}~{cargo}.json com {numero: [indice, votos, indice, votos, ...]}; painel/uf.js (lerSecoes) expande.
import glob
for f in glob.glob(out + "*.json"):
    if "~" in f: continue
    o = json.load(open(f)); Z = sorted(o["_secoes"].keys(), key=lambda s: tuple(map(int, s.split("::")))); ix = {z: i for i, z in enumerate(Z)}
    for cg in CARGO.values():
        if cg in o: json.dump({n: [x for zs, v in sec.items() if zs in ix for x in (ix[zs], v)] for n, sec in o[cg].items()}, open(f[:-5] + "~" + cg + ".json", "w"), separators=(",", ":"))
    json.dump({"_z": Z, "_secoes": [o["_secoes"][z] for z in Z], "_bairroSec": [o["_bairroSec"].get(z, "") for z in Z], "_part": {cg: [x for zs, p in sec.items() if zs in ix for x in [ix[zs]] + p] for cg, sec in o["_part"].items()}}, open(f, "w"), separators=(",", ":"), ensure_ascii=False)
print("compactado")
