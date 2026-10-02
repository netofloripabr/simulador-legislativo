#!/usr/bin/env python3
"""Governador e Presidente na tela de Apuração (02/10/2026).

Gera, para um ano, no mesmo formato dos cargos do legislativo:
  dados/resultados/{uf}-{ano}/governador.json, presidente.json   (candidatos + municípios)
  dados/resultados/{uf}-{ano}/governador-zonas.json, presidente-zonas.json
  acrescenta "governador"/"presidente" em cada secoes/{município}.json (votos por seção)
  acrescenta os dois cargos em participacao.json (estado/município/zona)
Só 1º turno. Lê os zips do TSE (mesmos de tratar_resultados_municipio.py),
ignorando cópias "arquivo (1).zip".

Uso: python3 ferramentas/tratar_majoritarios.py ~/Downloads 2022 SC
"""
import csv, glob, io, json, os, re, sys, unicodedata, zipfile

CARGO = {"3": "governador", "1": "presidente"}

def norm(s): return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper().strip()
def slug(s): return re.sub(r"[^A-Z0-9]+", "-", norm(s)).strip("-").lower()

def linhas(pasta, prefixo, ano, uf):
    for z in [z for z in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.zip")) if not re.search(r" \(\d+\)\.zip$", z)]:
        with zipfile.ZipFile(z) as zf:
            nomes = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            # Presidente vem no CSV "_BR" (abrangência nacional), filtrado por SG_UF
            so_uf = [n for n in nomes if f"_{uf}." in n or n.endswith("_BR.csv")]
            for n in (so_uf or [n for n in nomes if "_BRASIL." in n]):
                print("lendo", n)
                with zf.open(n) as f:
                    for r in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
                        yield r

def i(r, k):
    try: return int(r.get(k) or 0)
    except ValueError: return 0

def main():
    pasta, ano, uf = os.path.expanduser(sys.argv[1]), sys.argv[2], sys.argv[3].upper()
    base = f"dados/resultados/{uf.lower()}-{ano}"
    cands = {c: {} for c in CARGO.values()}
    for r in linhas(pasta, "votacao_candidato_munzona", ano, uf):
        if r.get("SG_UF") != uf or r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        sq = r["SQ_CANDIDATO"]; chave = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"
        v = i(r, "QT_VOTOS_NOMINAIS_VALIDOS") or i(r, "QT_VOTOS_NOMINAIS")
        c = cands[cargo].setdefault(sq, {"sq": sq, "nome": r["NM_CANDIDATO"].title(), "nomeUrna": r["NM_URNA_CANDIDATO"].title(),
            "numero": r["NR_CANDIDATO"], "partido": r["SG_PARTIDO"], "situacao": (r.get("DS_SIT_TOT_TURNO") or "").upper(),
            "total": 0, "municipios": {}, "_z": {}})
        c["total"] += v
        c["municipios"][chave] = c["municipios"].get(chave, 0) + v
        k = f"{chave}::{zona}"; c["_z"][k] = c["_z"].get(k, 0) + v
    for cargo, d in cands.items():
        if not d: print("sem dados de", cargo); continue
        lista = sorted(d.values(), key=lambda c: -c["total"])
        zonas = {c["sq"]: c.pop("_z") for c in lista}
        json.dump({"ano": int(ano), "cargo": cargo, "candidatos": lista}, open(f"{base}/{cargo}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        json.dump(zonas, open(f"{base}/{cargo}-zonas.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(cargo, len(lista), "candidatos; 1º:", lista[0]["nomeUrna"], lista[0]["total"])

    # participação (estado/município/zona)
    arq = f"{base}/participacao.json"
    part = json.load(open(arq, encoding="utf-8")) if os.path.exists(arq) else {}
    novo = {c: {"estado": [0] * 6, "mun": {}, "zona": {}} for c in CARGO.values()}
    tem = False
    for r in linhas(pasta, "detalhe_votacao_munzona", ano, uf):
        if r.get("SG_UF") != uf or r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        p = [i(r, "QT_APTOS"), i(r, "QT_COMPARECIMENTO"), i(r, "QT_ABSTENCOES"), i(r, "QT_VOTOS_BRANCOS"), i(r, "QT_TOTAL_VOTOS_NULOS") or i(r, "QT_VOTOS_NULOS"), i(r, "QT_TOTAL_VOTOS_VALIDOS")]
        chave = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"; o = novo[cargo]
        for dst in (o["estado"], o["mun"].setdefault(chave, [0] * 6), o["zona"].setdefault(f"{chave}::{zona}", [0] * 6)):
            for j, x in enumerate(p): dst[j] += x
        tem = True
    if tem:
        part.update(novo); json.dump(part, open(arq, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print("participação ok")

    # seções
    pasta_sec = f"{base}/secoes"
    if not os.path.isdir(pasta_sec): return
    por_mun = {}
    for r in linhas(pasta, "votacao_secao", ano, uf):
        if r.get("SG_UF") != uf or r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        nr = r.get("NR_VOTAVEL", "")
        if not nr or nr in ("95", "96", "97"): continue
        k = f'{r["NR_ZONA"].lstrip("0") or "0"}::{r["NR_SECAO"].lstrip("0") or "0"}'
        d = por_mun.setdefault(slug(r["NM_MUNICIPIO"]), {}).setdefault(cargo, {}).setdefault(nr, {})
        d[k] = d.get(k, 0) + i(r, "QT_VOTOS")
    part_sec = {}
    for r in linhas(pasta, "detalhe_votacao_secao", ano, uf):
        if r.get("SG_UF") != uf or r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        p = [i(r, "QT_APTOS"), i(r, "QT_COMPARECIMENTO"), i(r, "QT_ABSTENCOES"), i(r, "QT_VOTOS_BRANCOS"), i(r, "QT_VOTOS_NULOS"), i(r, "QT_VOTOS_NOMINAIS") + i(r, "QT_VOTOS_LEGENDA")]
        k = f'{r["NR_ZONA"].lstrip("0") or "0"}::{r["NR_SECAO"].lstrip("0") or "0"}'
        dst = part_sec.setdefault(slug(r["NM_MUNICIPIO"]), {}).setdefault(cargo, {}).setdefault(k, [0] * 6)
        for j, x in enumerate(p): dst[j] += x
    n = 0
    for sl, d in por_mun.items():
        f = f"{pasta_sec}/{sl}.json"
        if not os.path.exists(f): continue
        j = json.load(open(f, encoding="utf-8"))
        j.update(d)
        if sl in part_sec: j.setdefault("_part", {}).update(part_sec[sl])
        json.dump(j, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":")); n += 1
    print("seções:", n, "municípios")

if __name__ == "__main__":
    main()
