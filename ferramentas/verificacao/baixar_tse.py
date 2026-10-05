# Baixa do TSE (fonte oficial) o resultado 2026 de SC: estado + 295 municípios × 5 cargos.
# Saída: tse-2026.json  (usado por conferir_app.js)
import json, urllib.request, concurrent.futures as cf
B = "https://resultados.tse.jus.br/oficial/ele2026"
CARGOS = {"estadual": ("7", "6259"), "federal": ("6", "6259"), "senador": ("5", "6259"), "governador": ("3", "6259"), "presidente": ("1", "6257")}
n = lambda s: int(float(str(s or "0").replace(".", "").replace(",", ".")))
def get(u):
    for _ in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40))
        except Exception: pass
    return None
def ler(d):
    cg = d["carg"][0]; fed = {str(f["n"]): f.get("sg", "") for f in cg.get("fed", [])}
    cands, legenda = {}, {}
    for a in cg["agr"]:
        for p in a["par"]:
            sig = (p.get("nfed") and fed.get(str(p["nfed"]))) or p.get("sg") or ""
            legenda[sig] = legenda.get(sig, 0) + n(p.get("tvtl"))
            for c in p["cand"]:
                cands[str(c["n"])] = {"nome": c.get("nmu") or c.get("nm"), "votos": n(c.get("vap")), "st": c.get("st", ""), "dvt": c.get("dvt", ""), "partido": p.get("sg", "")}
    E, V = d.get("e", {}), d.get("v", {})
    part = [n(E.get("te")), n(E.get("c")), n(E.get("a")), n(V.get("vb")), n(V.get("tvn")), n(V.get("vv"))]
    return {"cands": cands, "legenda": legenda, "part": part, "vagas": n(cg.get("nv")), "final": d.get("tf") == "s"}
out = {}
for cargo, (cc, cd) in CARGOS.items():
    pad = cd.zfill(6)
    est = get(f"{B}/{cd}/dados/sc/sc-c000{cc}-e{pad}-u.json")
    ab = get(f"{B}/{cd}/dados/sc/sc-e{pad}-ab.json")
    cods = [m["cdabr"] for m in ab["abr"] if m["tpabr"] == "mun"]
    with cf.ThreadPoolExecutor(12) as ex:
        res = dict(zip(cods, ex.map(lambda c: get(f"{B}/{cd}/dados/sc/sc{c}-c000{cc}-e{pad}-u.json"), cods)))
    falta = [c for c, d in res.items() if not d]
    out[cargo] = {"estado": ler(est), "mun": {c: ler(d) for c, d in res.items() if d}, "falta": falta}
    print(cargo, "municípios:", len(res) - len(falta), "faltando:", falta)
json.dump(out, open("tse-2026.json", "w"), ensure_ascii=False)
