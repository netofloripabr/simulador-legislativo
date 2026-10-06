#!/usr/bin/env python3
"""Gera o detalhe de 2026 (zona, seção, escola/bairro e participação) a partir
dos dados abertos do TSE, no MESMO formato que já existe para 2022
(dados/resultados/sc-2022/), preenchendo as lacunas da tela de Resultado 2026.

Entrada (dados abertos do TSE, ver leiame dos datasets):
  bweb_1t_{UF}_*.zip                 Boletim de urna, 1º turno (voto por seção)
  eleitorado_local_votacao_2026.zip  Locais de votação (escola, bairro, lat/long)

Uso:
  python3 ferramentas/tratar_bu_2026.py <pasta com os 2 zips> SC

Saída em dados/resultados/{uf}-2026/:
  secoes/{municipio}.json  { cargo: { numero: { "zona::secao": votos } },
                             _zonas, _secoes, _bairroSec, _part: { cargo: { "zona::secao": [aptos, comp, abst, brancos, nulos, validos] } } }
  {cargo}-zonas.json       { numero: { "MUNICIPIO::zona": votos } }   (chave = número do candidato)
  participacao.json        { cargo: { estado, mun, zona } }           (mesmo vetor de 6 posições)
Votos "anulados sub judice" ficam nos arquivos do candidato (o TSE os registra
no BU), mas NÃO entram em "válidos" da participação.
"""
import csv, glob, io, json, os, re, sys, unicodedata, zipfile, collections
CARGOS = {"DEPUTADO ESTADUAL": "estadual", "DEPUTADO FEDERAL": "federal", "SENADOR": "senador", "GOVERNADOR": "governador", "PRESIDENTE": "presidente"}
def norm(s): return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper().strip()
def slug(s): return re.sub(r"[^A-Z0-9]+", "-", norm(s)).strip("-").lower()
def tit(s):
    return " ".join(w if w in ("de", "da", "do", "das", "dos", "e") else w.capitalize() for w in s.lower().split())
def main():
    pasta, uf = sys.argv[1], sys.argv[2].upper()
    raiz = os.path.join(os.path.dirname(__file__), "..", "dados", "resultados", f"{uf.lower()}-2026")
    mun22 = json.load(open(os.path.join(raiz, "..", f"{uf.lower()}-2022", "municipios.json")))["municipios"]
    porTse = {str(int(m["tse"])): k for k, m in mun22.items() if m.get("tse")}
    # locais de votação: (mun, zona, seção) -> (escola, bairro)
    lv = {}
    with zipfile.ZipFile(glob.glob(os.path.join(pasta, "*local_votacao_2026*.zip"))[0]) as z:
        nm = [n for n in z.namelist() if n.endswith(f"_{uf}.csv")][0]
        for r in csv.DictReader(io.TextIOWrapper(z.open(nm), encoding="latin-1"), delimiter=";"):
            lv[(r["CD_MUNICIPIO"], r["NR_ZONA"], r["NR_SECAO"])] = (tit(r["NM_LOCAL_VOTACAO"]), tit(r["NM_BAIRRO"]))
    # situação de cada número (válido / anulado sub judice) — tse-2026.json (ferramentas/verificacao/baixar_tse.py)
    TSE = json.load(open(os.path.join(os.path.dirname(__file__), "verificacao", "tse-2026.json")))
    dvt = {c: {n: str(x.get("dvt") or "Válido") for n, x in TSE[c]["estado"]["cands"].items()} for c in TSE}
    votos = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(dict)))  # mun -> cargo -> num -> zs -> v
    zonas = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.Counter()))       # cargo -> num -> MUN::zona
    part = collections.defaultdict(lambda: collections.defaultdict(dict))                                 # mun -> cargo -> zs -> [6]
    secLoc = collections.defaultdict(dict)
    vistos = set()
    bu = sorted(glob.glob(os.path.join(pasta, f"bweb_1t_{uf}_*.zip")))[-1]
    with zipfile.ZipFile(bu) as z:
        nm = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
        for r in csv.DictReader(io.TextIOWrapper(z.open(nm), encoding="latin-1"), delimiter=";"):
            cargo = CARGOS.get(norm(r["DS_CARGO_PERGUNTA"]))
            if not cargo: continue
            mun = porTse.get(str(int(r["CD_MUNICIPIO"])))
            if not mun: continue
            zs = f'{int(r["NR_ZONA"])}::{int(r["NR_SECAO"])}'
            n = int(r["QT_VOTOS"]); tipo = norm(r["DS_TIPO_VOTAVEL"])
            p = part[mun][cargo].get(zs)
            if p is None:
                p = part[mun][cargo][zs] = [int(r["QT_APTOS"]), int(r["QT_COMPARECIMENTO"]), int(r["QT_ABSTENCOES"]), 0, 0, 0]
            if tipo == "BRANCO": p[3] += n
            elif tipo == "NULO": p[4] += n
            elif tipo == "LEGENDA": p[5] += n
            elif tipo == "NOMINAL":
                num = r["NR_VOTAVEL"]; sit = dvt.get(cargo, {}).get(num)
                if sit is None: p[4] += n            # número sem candidato: o TSE conta como nulo
                else:
                    if sit.startswith("Válido"): p[5] += n   # anulado sub judice: nem válido nem nulo

                    votos[mun][cargo][num][zs] = votos[mun][cargo][num].get(zs, 0) + n
                    zonas[cargo][num][f'{mun}::{int(r["NR_ZONA"])}'] += n
            loc = lv.get((r["CD_MUNICIPIO"], r["NR_ZONA"], r["NR_SECAO"]))
            if loc: secLoc[mun][zs] = loc
    os.makedirs(os.path.join(raiz, "secoes"), exist_ok=True)
    for mun in votos:
        d = {c: {num: dict(v) for num, v in votos[mun][c].items()} for c in votos[mun]}
        sl = secLoc.get(mun, {})
        d["_secoes"] = {k: v[0] for k, v in sl.items()}
        d["_bairroSec"] = {k: v[1] for k, v in sl.items()}
        # bairro de referência da zona = bairro do local com mais votos estaduais
        porZona = collections.defaultdict(collections.Counter)
        for zs, p in part[mun].get("estadual", {}).items():
            if zs in sl: porZona[zs.split("::")[0]][sl[zs][1]] += p[1]
        d["_zonas"] = {z: c.most_common(1)[0][0] for z, c in porZona.items()}
        d["_part"] = {c: v for c, v in part[mun].items()}
        json.dump(d, open(os.path.join(raiz, "secoes", slug(mun) + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for c, nums in zonas.items():
        json.dump({num: dict(v) for num, v in nums.items()}, open(os.path.join(raiz, f"{c}-zonas.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    P = {}
    for c in CARGOS.values():
        est = [0] * 6; mm = {}; zz = {}
        for mun in part:
            for zs, p in part[mun].get(c, {}).items():
                for t in (est, mm.setdefault(mun, [0] * 6), zz.setdefault(f'{mun}::{zs.split("::")[0]}', [0] * 6)):
                    for i in range(6): t[i] += p[i]
        if mm: P[c] = {"estado": est, "mun": mm, "zona": zz}
    json.dump(P, open(os.path.join(raiz, "participacao.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("municípios", len(votos), "| cargos", list(P), "| estadual válidos", P.get("estadual", {}).get("estado"))
if __name__ == "__main__": main()
