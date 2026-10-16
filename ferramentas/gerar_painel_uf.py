# Painel de um estado além de SC (16/10/2026, começando por SP): mesma saída de
# gerar_painel_sc.py, mas direto das fontes oficiais, sem os arquivos por seção:
#   2026: API de divulgação do TSE (resultados.tse.jus.br), estado + cada município × 5 cargos
#   2022: dados abertos do TSE (votacao_candidato_munzona_2022_UF.csv e detalhe_votacao_munzona_2022_UF.csv)
#   mapa: malha municipal do IBGE; regiões: localidades do IBGE (meso, micro, região intermediária)
# Saídas em dados/painel/: {uf}-base.json e {uf}-{cargo}.json; fotos em dados/fotos/{uf}-2026/{cargo}/.
# Uso: python3 ferramentas/gerar_painel_uf.py sp /caminho/dos/csv-2022
import json, os, sys, csv, io, gzip, collections, urllib.request, concurrent.futures as cf, unicodedata
UF = sys.argv[1].lower(); PASTA22 = sys.argv[2] if len(sys.argv) > 2 else "/tmp/sp"
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
B = "https://resultados.tse.jus.br/oficial/ele2026"
CARGOS = {"estadual": ("7", "6259", "Deputado Estadual"), "federal": ("6", "6259", "Deputado Federal"), "senador": ("5", "6259", "Senador"), "governador": ("3", "6259", "Governador"), "presidente": ("1", "6257", "Presidente")}
CD_UF = {"sp": "35"}[UF]
norm = lambda s: " ".join(unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().upper().split())
n = lambda s: int(float(str(s or "0").replace(".", "").replace(",", ".")))
def get(u, js=True):
    for _ in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
            if r[:2] == b"\x1f\x8b": r = gzip.decompress(r)
            return json.loads(r) if js else r
        except Exception: pass
    return None

# ---- municípios: TSE (código TSE ↔ IBGE) + IBGE (regiões) + malha ----
cm = get(f"{B}/6259/config/mun-e006259-cm.json")
tse_mun = [m for a in cm["abr"] if a["cd"] == UF for m in a["mu"]]
loc = {str(m["id"]): m for m in get(f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{CD_UF}/municipios")}
malha = get(f"https://servicodados.ibge.gov.br/api/v3/malhas/estados/{CD_UF}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=intermediaria")
geo = {f["properties"]["codarea"]: f["geometry"] for f in malha["features"]}
def centro(g):
    aneis = g["coordinates"] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
    r = max(aneis, key=len); a = cx = cy = 0
    for (x0, y0), (x1, y1) in zip(r, r[1:]):
        k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k
    return [round(cx / (3 * a), 4), round(cy / (3 * a), 4)] if a else list(r[0])
def simp(r, tol=.012):
    out = [r[0]]
    for p in r[1:]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) > tol: out.append(p)
    return [[round(x, 3), round(y, 3)] for x, y in out]
tse_mun.sort(key=lambda m: norm(m["nm"]))
mun, cont = [], []
for m in tse_mun:
    L = loc[m["cdi"]]; g = geo[m["cdi"]]; lon, lat = centro(g)
    mun.append({"k": norm(m["nm"]).lower().replace(" ", "-"), "n": L["nome"], "lon": lon, "lat": lat, "el": 0,
                "meso": L["microrregiao"]["mesorregiao"]["nome"], "micro": L["microrregiao"]["nome"],
                "assoc": L["regiao-imediata"]["regiao-intermediaria"]["nome"], "tse": m["cd"], "ibge": m["cdi"]})
    aneis = g["coordinates"] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
    cont.append([simp(a) for a in aneis if len(a) > 3])
N = len(mun); idx_tse = {m["tse"]: i for i, m in enumerate(mun)}
print("municípios:", N)

# ---- 2026: estado + municípios ----
def ler(d):
    cg = d["carg"][0]; fed = {str(f["n"]): f.get("sg", "") for f in cg.get("fed", [])}
    cands, legenda = {}, collections.Counter()
    for a in cg["agr"]:
        for p in a["par"]:
            sig = (p.get("nfed") and fed.get(str(p["nfed"]))) or p.get("sg") or ""
            legenda[sig] += n(p.get("tvtl"))
            for c in p["cand"]:
                cands[str(c["n"])] = {"nome": c.get("nm"), "urna": c.get("nmu") or c.get("nm"), "votos": n(c.get("vap")), "st": c.get("st", ""), "dvt": c.get("dvt", ""), "partido": sig, "sq": c.get("sqcand")}
    E, V = d.get("e", {}), d.get("v", {})
    return {"cands": cands, "legenda": dict(legenda), "part": [n(E.get("te")), n(E.get("c")), n(E.get("a")), n(V.get("vb")), n(V.get("tvn")), n(V.get("vv"))], "vagas": n(cg.get("nv"))}
T26 = {}
for cargo, (cc, cd, _) in CARGOS.items():
    pad = cd.zfill(6)
    est = ler(get(f"{B}/{cd}/dados/{UF}/{UF}-c000{cc}-e{pad}-u.json"))
    with cf.ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda m: get(f"{B}/{cd}/dados/{UF}/{UF}{m['tse']}-c000{cc}-e{pad}-u.json"), mun))
    falta = [mun[i]["n"] for i, d in enumerate(res) if not d]
    T26[cargo] = {"estado": est, "mun": [ler(d) if d else None for d in res]}
    print(cargo, "2026 municípios ok:", N - len(falta), "faltando:", falta[:5])
for i, d in enumerate(T26["estadual"]["mun"]):
    if d: mun[i]["el"] = d["part"][0]

# ---- 2022: CSV dos dados abertos ----
def csv22(nome):
    with open(f"{PASTA22}/{nome}_2022_{UF.upper()}.csv", encoding="latin1") as f:
        yield from csv.DictReader(f, delimiter=";")
V22 = collections.defaultdict(lambda: collections.defaultdict(lambda: {"v": [0] * N, "urna": "", "nome": "", "n": ""}))
for r in csv22("votacao_candidato_munzona"):
    if r["NR_TURNO"] != "1": continue
    cargo = {"Deputado Estadual": "estadual", "Deputado Federal": "federal", "Senador": "senador", "Governador": "governador", "Presidente": "presidente"}.get(r["DS_CARGO"])
    i = idx_tse.get(r["CD_MUNICIPIO"].zfill(5))
    if cargo is None or i is None: continue
    c = V22[cargo][r["SQ_CANDIDATO"]]; c["v"][i] += int(r["QT_VOTOS_NOMINAIS_VALIDOS"] or 0); c["urna"] = r["NM_URNA_CANDIDATO"]; c["nome"] = r["NM_CANDIDATO"]; c["n"] = r["NR_CANDIDATO"]
VAL22 = collections.defaultdict(lambda: [0] * N); PART22 = collections.defaultdict(lambda: [0] * 6)
for r in csv22("detalhe_votacao_munzona"):
    if r["NR_TURNO"] != "1": continue
    cargo = {"Deputado Estadual": "estadual", "Deputado Federal": "federal", "Senador": "senador", "Governador": "governador", "Presidente": "presidente"}.get(r["DS_CARGO"])
    i = idx_tse.get(r["CD_MUNICIPIO"].zfill(5))
    if cargo is None or i is None: continue
    VAL22[cargo][i] += int(r["QT_TOTAL_VOTOS_VALIDOS"] or 0)
    p = PART22[cargo]
    for k, col in enumerate(["QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS_BRANCOS", "QT_TOTAL_VOTOS_NULOS", "QT_TOTAL_VOTOS_VALIDOS"]): p[k] += int(r[col] or 0)

# ---- saída por cargo (mesmo formato de SC) ----
os.makedirs(R + "dados/painel", exist_ok=True)
json.dump({"mun": mun, "contorno": cont}, open(R + f"dados/painel/{UF}-base.json", "w"), ensure_ascii=False, separators=(",", ":"))
FOTOS = []
for cargo in CARGOS:
    E = T26[cargo]["estado"]; M26 = T26[cargo]["mun"]
    val = [(d["part"][5] if d else 0) for d in M26]
    por22 = {}
    for c in V22[cargo].values(): por22.setdefault(norm(c["urna"]), c); por22.setdefault("N:" + norm(c["nome"]), c)
    out = []
    for num, t in E["cands"].items():
        if not str(t.get("dvt", "Válido")).startswith("Válido"): continue
        v = [(d["cands"].get(num, {}).get("votos", 0) if d else 0) for d in M26]
        c = {"n": num, "u": t["urna"].title() if t["urna"].isupper() else t["urna"], "nome": (t["nome"] or "").title(), "p": t["partido"], "s": t["st"], "t": t["votos"], "v": v}
        o = por22.get(norm(t["urna"])) or por22.get("N:" + norm(t["nome"]))
        if o: c["v22"] = o["v"]; c["t22"] = sum(o["v"]); c["n22"] = o["n"]
        out.append(c)
        if cargo in ("estadual", "federal") and str(t["st"]).lower().startswith("eleito") or (cargo not in ("estadual", "federal") and len(out) <= 12) or (cargo in ("estadual", "federal") and len(out) <= 200):
            FOTOS.append((cargo, num, t["sq"], CARGOS[cargo][1]))
    out.sort(key=lambda c: -c["t"])
    meta = {"part": E["part"]}
    if cargo in ("estadual", "federal"):
        vagas = E["vagas"]; validos = E["part"][5]; q = validos / vagas; qe = int(q) + (1 if q - int(q) > .5 else 0)
        g = collections.defaultdict(lambda: {"v": 0, "c": []})
        for c in out: g[c["p"]]["v"] += c["t"]; g[c["p"]]["c"].append(c)
        for k, v in E["legenda"].items(): g[k]["v"] += v
        cad = {k: x["v"] // qe for k, x in g.items()}
        for k, x in g.items():
            x["c"].sort(key=lambda c: -c["t"])
            for c in x["c"][:min(cad[k], len(x["c"]))]: c["r"] = 0
        sob = vagas - sum(min(cad[k], len(x["c"])) for k, x in g.items()); nn = dict(cad); rod = 0
        while sob > 0:
            rod += 1; k = max((k for k in g if nn[k] < len(g[k]["c"])), key=lambda k: g[k]["v"] / (nn[k] + 1)); g[k]["c"][nn[k]]["r"] = rod; nn[k] += 1; sob -= 1
        meta.update({"vagas": vagas, "validos": validos, "qe": qe, "grupos": {k: {"v": x["v"], "qp": cad[k], "cad": nn[k]} for k, x in g.items() if x["v"]}})
        el = sum(1 for c in out if str(c["s"]).lower().startswith("eleito")); calc = sum(1 for c in out if "r" in c)
        bate = sum(1 for c in out if ("r" in c) == str(c["s"]).lower().startswith("eleito"))
        print(cargo, "vagas", vagas, "QE", qe, "· eleitos TSE", el, "· calculados", calc, "· conferem", bate, "/", len(out))
    meta["part22"] = PART22[cargo]
    json.dump({"val": val, "val22": VAL22[cargo], "meta": meta, "c": out}, open(R + f"dados/painel/{UF}-{cargo}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    print(cargo, len(out), "candidatos ·", sum(1 for c in out if sum(c["v"]) == c["t"]), "com soma = TSE ·", sum(1 for c in out if "v22" in c), "com 2022")

# ---- fotos (eleitos dos proporcionais, os mais votados e os majoritários) ----
def foto(x):
    cargo, num, sq, cd = x; arq = R + f"dados/fotos/{UF}-2026/{cargo}/{num}.jpg"
    if os.path.exists(arq) or not sq: return 0
    b = get(f"{B}/{cd}/fotos/{UF if cargo != 'presidente' else 'br'}/{sq}.jpeg", js=False)
    if b: os.makedirs(os.path.dirname(arq), exist_ok=True); open(arq, "wb").write(b); return 1
    return 0
with cf.ThreadPoolExecutor(16) as ex: print("fotos baixadas:", sum(ex.map(foto, FOTOS)), "de", len(FOTOS))
