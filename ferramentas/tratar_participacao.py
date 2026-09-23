#!/usr/bin/env python3
"""Participação eleitoral (aptos, comparecimento, abstenção, brancos, nulos,
válidos) pro cabeçalho da tela de Resultados — modelo de referência aprovado
em 23/09/2026 (Apurados · Abstenção · Br/Nulos · Válidos em todo recorte).

Entrada (dados abertos do TSE, baixados pelo usuário em ~/Downloads):
  detalhe_votacao_munzona_{ANO}.zip   estado, município e zona
  detalhe_votacao_secao_{ANO}.zip     seção (opcional; alimenta bairro/local/seção)

Uso:
  python3 ferramentas/tratar_participacao.py ~/Downloads 2022 SC

Saída:
  dados/resultados/{uf}-{ano}/participacao.json
    { cargo: { "estado": P, "mun": { chave: P }, "zona": { "chave::zona": P } } }
  e em cada dados/resultados/{uf}-{ano}/secoes/{município}.json:
    "_part": { cargo: { "zona::seção": P } }
  P = [aptos, comparecimento, abstenções, brancos, nulos, válidos]
"""
import csv, glob, io, json, os, re, sys, unicodedata, zipfile

CARGO = {"7": "estadual", "6": "federal", "5": "senador"}

def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper().strip()

def slug(s):
    return re.sub(r"[^A-Z0-9]+", "-", norm(s)).strip("-").lower()

def linhas(pasta, prefixo, ano, uf):
    for z in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.zip")):
        with zipfile.ZipFile(z) as zf:
            nomes = [n for n in zf.namelist() if n.endswith(f"_{uf}.csv")]
            for n in nomes:
                print("lendo", n)
                with zf.open(n) as f:
                    for r in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
                        yield r

def i(r, k):
    try: return int(r.get(k) or 0)
    except ValueError: return 0

def soma(dest, p):
    for j, v in enumerate(p): dest[j] += v

def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    pasta, ano, uf = os.path.expanduser(sys.argv[1]), sys.argv[2], sys.argv[3].upper()
    base = f"dados/resultados/{uf.lower()}-{ano}"

    out = {c: {"estado": [0] * 6, "mun": {}, "zona": {}} for c in CARGO.values()}
    n = 0
    for r in linhas(pasta, "detalhe_votacao_munzona", ano, uf):
        if r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        p = [i(r, "QT_APTOS"), i(r, "QT_COMPARECIMENTO"), i(r, "QT_ABSTENCOES"), i(r, "QT_VOTOS_BRANCOS"),
             i(r, "QT_TOTAL_VOTOS_NULOS") or i(r, "QT_VOTOS_NULOS"), i(r, "QT_TOTAL_VOTOS_VALIDOS")]
        chave = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"
        o = out[cargo]
        soma(o["estado"], p)
        soma(o["mun"].setdefault(chave, [0] * 6), p)
        soma(o["zona"].setdefault(f"{chave}::{zona}", [0] * 6), p)
        n += 1
    if not n:
        print("Nenhuma linha de detalhe_votacao_munzona — confira a pasta."); sys.exit(2)
    json.dump(out, open(f"{base}/participacao.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for c, o in out.items():
        print(c, "estado:", o["estado"], "municípios:", len(o["mun"]))

    # seções → _part em cada arquivo de município
    por_mun = {}
    for r in linhas(pasta, "detalhe_votacao_secao", ano, uf):
        if r.get("NR_TURNO") not in ("1", "", None): continue
        cargo = CARGO.get(r.get("CD_CARGO"))
        if not cargo: continue
        # válidos da seção = nominais + legenda (o arquivo de seção não traz o total)
        p = [i(r, "QT_APTOS"), i(r, "QT_COMPARECIMENTO"), i(r, "QT_ABSTENCOES"), i(r, "QT_VOTOS_BRANCOS"),
             i(r, "QT_VOTOS_NULOS"), i(r, "QT_VOTOS_NOMINAIS") + i(r, "QT_VOTOS_LEGENDA")]
        k = f'{r["NR_ZONA"].lstrip("0") or "0"}::{r["NR_SECAO"].lstrip("0") or "0"}'
        soma(por_mun.setdefault(slug(r["NM_MUNICIPIO"]), {}).setdefault(cargo, {}).setdefault(k, [0] * 6), p)
    tocados = 0
    for sl, d in por_mun.items():
        arq = f"{base}/secoes/{sl}.json"
        if not os.path.exists(arq): continue
        j = json.load(open(arq, encoding="utf-8"))
        j["_part"] = d
        json.dump(j, open(arq, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        tocados += 1
    print(f"seções: {tocados} municípios com _part")

if __name__ == "__main__":
    main()
