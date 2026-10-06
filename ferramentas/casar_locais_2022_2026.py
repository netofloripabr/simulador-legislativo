#!/usr/bin/env python3
"""Casa as escolas (locais de votação) de 2022 com as de 2026 para a comparação
2022 × 2026 por escola na tela de Resultado (pedido do usuário, 06/10/2026:
"essa é a ideia central").

Problema: o TSE escreve o nome do local diferente em cada ano (2022 abreviado,
2026 por extenso) e o bairro às vezes muda de grafia. Solução: usa o cadastro
oficial de locais de votação dos dois anos (eleitorado_local_votacao_{ano}.zip)
e, para cada local de 2022, acha o mesmo local em 2026 no mesmo município por:
  1) mesma zona + mesmo nº do local (NR_LOCAL_VOTACAO), confirmado por
     distância < 500 m ou nome parecido;
  2) coordenadas a menos de 150 m;
  3) mesmo endereço (normalizado);
  4) nome parecido (palavras em comum ≥ 60%).
Depois reescreve, nos arquivos dados/resultados/{uf}-2022/secoes/*.json, o nome
(_secoes) e o bairro (_bairroSec) de cada seção de 2022 com os do local de
2026 correspondente — os votos não mudam. Seção sem par fica como estava.

Uso: python3 ferramentas/casar_locais_2022_2026.py <pasta com os 2 zips> SC
Gera também ferramentas/verificacao/casamento-locais-{uf}.csv (auditoria).
"""
import csv, io, json, math, os, re, sys, unicodedata, zipfile, glob, collections
def norm(s): return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn").upper().strip()
def tit(s): return " ".join(w if w in ("de", "da", "do", "das", "dos", "e") else w.capitalize() for w in (s or "").lower().split())
def slug(s): return re.sub(r"[^A-Z0-9]+", "-", norm(s)).strip("-").lower()
PARADA = {"DE", "DA", "DO", "DAS", "DOS", "E", "ESCOLA", "ESC", "EEB", "EBM", "EM", "EE", "BASICA", "BAS", "EDUCACAO", "ED", "MUNICIPAL", "MUN", "ESTADUAL", "CENTRO", "COLEGIO", "COL", "GRUPO", "ESCOLAR", "E.E.B", "E.B.M", "SALAO", "COMUNITARIO", "COMUNIDADE", "LINHA", "PAVILHAO", "CAPELA", "IGREJA", "CATOLICA", "PAROQUIAL", "CLUBE", "SOCIEDADE", "GINASIO", "NUCLEO", "ASSOCIACAO", "MORADORES", "BAIRRO", "SALA"}
def toks(s): return {t for t in re.split(r"[^A-Z0-9]+", norm(s)) if len(t) > 2 and t not in PARADA}
def endn(s): return re.sub(r"[^A-Z0-9]", "", norm(s).replace("RUA", "R").replace("AVENIDA", "AV").replace("RODOVIA", "ROD").replace("ESTRADA", "EST"))
def num(x):
    try: return float(str(x).replace(",", "."))
    except: return None
def dist(a, b):
    if None in (a[0], a[1], b[0], b[1]) or a[0] == -1 or b[0] == -1: return 1e9
    dx = (a[1] - b[1]) * 111320 * math.cos(math.radians(a[0])); dy = (a[0] - b[0]) * 110540
    return math.hypot(dx, dy)
def ler(zp, ano, uf):
    z = zipfile.ZipFile(zp); nm = [n for n in z.namelist() if n.endswith(f"_{uf}.csv")] or [n for n in z.namelist() if n.endswith(".csv")]
    sec, loc = {}, {}
    for r in csv.DictReader(io.TextIOWrapper(z.open(nm[0]), encoding="latin-1"), delimiter=";"):
        if r["SG_UF"] != uf: continue
        m, zn, lc = r["CD_MUNICIPIO"], str(int(r["NR_ZONA"])), r["NR_LOCAL_VOTACAO"]
        sec[(m, zn, str(int(r["NR_SECAO"])))] = (m, zn, lc)
        loc[(m, zn, lc)] = dict(nome=r["NM_LOCAL_VOTACAO"], bairro=r["NM_BAIRRO"], end=r["DS_ENDERECO"], ll=(num(r["NR_LATITUDE"]), num(r["NR_LONGITUDE"])))
    return sec, loc
def main():
    pasta, uf = sys.argv[1], sys.argv[2].upper()
    s22, l22 = ler(os.path.join(pasta, "eleitorado_local_votacao_2022.zip"), 2022, uf)
    s26, l26 = ler(os.path.join(pasta, "eleitorado_local_votacao_2026.zip"), 2026, uf)
    por_mun = collections.defaultdict(list)
    for k, v in l26.items(): por_mun[k[0]].append((k, v))
    par, como = {}, collections.Counter()
    for k, a in l22.items():
        cand = por_mun.get(k[0], []); best = None
        b = l26.get(k)
        if b:
            dd = dist(a["ll"], b["ll"]); ta, tb = toks(a["nome"]), toks(b["nome"]); jac = len(ta & tb) / max(1, len(ta | tb))
            # nº do local é reaproveitado pelo TSE: só vale perto (< 500 m) ou, sem coordenada, com nome parecido
            if dd < 500 or (dd >= 1e8 and jac >= .5) or endn(a["end"]) == endn(b["end"]): best, how = k, "nº do local"
        if not best:
            d = min(cand, key=lambda kv: dist(a["ll"], kv[1]["ll"]), default=None)
            if d and dist(a["ll"], d[1]["ll"]) < 150: best, how = d[0], "coordenadas"
        if not best:
            e = [kv for kv in cand if endn(kv[1]["end"]) and endn(kv[1]["end"]) == endn(a["end"])]
            if e: best, how = e[0][0], "endereço"
        if not best:
            ta = toks(a["nome"])
            sc = max(((len(ta & toks(kv[1]["nome"])) / max(1, len(ta | toks(kv[1]["nome"]))), kv) for kv in cand), default=(0, None), key=lambda x: x[0])
            if sc[0] >= .6: best, how = sc[1][0], "nome"
        if best:
            c = l26[best]; dd = dist(a["ll"], c["ll"]); ta, tb = toks(a["nome"]), toks(c["nome"])
            # trava final: longe (> 1 km, com as duas coordenadas) só vale se o nome também for parecido
            if 1000 < dd < 1e8 and len(ta & tb) / max(1, len(ta | tb)) < .5: best = None
        if best: par[k] = best; como[how] += 1
        else: como["sem par"] += 1
    print("locais 2022:", len(l22), dict(como))
    raiz = os.path.join(os.path.dirname(__file__), "..", "dados", "resultados", f"{uf.lower()}-2022", "secoes")
    mun22 = json.load(open(os.path.join(raiz, "..", "municipios.json")))["municipios"]
    porTse = {str(int(m["tse"])): k for k, m in mun22.items() if m.get("tse")}
    sec_por_mun = collections.defaultdict(dict)
    for (m, zn, se), lk in s22.items(): sec_por_mun[porTse.get(str(int(m)))][f"{zn}::{se}"] = lk
    mudou = 0
    aud = open(os.path.join(os.path.dirname(__file__), "verificacao", f"casamento-locais-{uf.lower()}.csv"), "w", encoding="utf-8")
    w = csv.writer(aud); w.writerow(["municipio", "zona", "local_2022", "nome_2022", "endereco_2022", "local_2026", "nome_2026", "endereco_2026", "bairro_2026", "distancia_m"])
    for k, b in par.items():
        a, c = l22[k], l26[b]; w.writerow([k[0], k[1], k[2], a["nome"], a["end"], b[2], c["nome"], c["end"], c["bairro"], round(dist(a["ll"], c["ll"])) if dist(a["ll"], c["ll"]) < 1e8 else ""])
    for mun, secs in sec_por_mun.items():
        if not mun: continue
        f = os.path.join(raiz, slug(mun) + ".json")
        if not os.path.exists(f): continue
        d = json.load(open(f)); ns = d.setdefault("_secoes", {}); nb = d.setdefault("_bairroSec", {})
        for zs, lk in secs.items():
            b = par.get(lk)
            if not b: continue
            ns[zs] = tit(l26[b]["nome"]); nb[zs] = tit(l26[b]["bairro"]); mudou += 1
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("seções de 2022 renomeadas:", mudou, "de", len(s22))
if __name__ == "__main__": main()
