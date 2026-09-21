#!/usr/bin/env python3
"""Trata a votação por MUNICÍPIO/ZONA (e opcionalmente por SEÇÃO) de um ano
eleitoral pra tela de Resultados (mapa de calor, variação entre eleições,
filtros município → zona → seção).

Entrada (baixar do portal de dados abertos do TSE — a máquina do Claude
está bloqueada pelo CDN do TSE, então é o usuário quem baixa):
  votacao_candidato_munzona_{ANO}.zip  (Brasil inteiro; o script usa só a UF)
  votacao_secao_{ANO}_{UF}.zip          (opcional — por seção)

Uso:
  python3 ferramentas/tratar_resultados_municipio.py ~/Downloads/tse-resultados 2022 SC
  python3 ferramentas/tratar_resultados_municipio.py ~/Downloads/tse-resultados 2018 SC

Saída (pequena, entra no repositório):
  dados/resultados/{uf}-{ano}-municipios.json
    { ano, uf, cargos: { estadual|federal|senador: { candidatos: [
        { sq, nome, nomeUrna, numero, partido, situacao, total,
          municipios: { "<chave IBGE do município>": votos, ... },
          zonas: { "<chave>::<zona>": votos } } ] } },
      municipios: { "<chave>": { nome, ibge, aptos?, comparecimento? } } }
  dados/resultados/{uf}-{ano}-secoes.json (se o zip por seção existir)
    { cargos: { cargo: { "<sq>": { "<chave>::<zona>::<secao>": votos } } } }

`chave` do município = NM_MUNICIPIO do TSE (sem acento, maiúsculo) — a
mesma de dados/regioes-sc.js, que liga ao código IBGE e à malha do mapa.
"""
import csv, glob, io, json, os, sys, unicodedata, zipfile

CARGO = {"7": "estadual", "6": "federal", "5": "senador"}  # CD_CARGO do TSE

def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper().strip()

def abrir_csvs(pasta, prefixo, ano, uf):
    """Devolve iteradores de linhas (dict) dos CSVs que casam, abrindo zip ou csv solto."""
    alvos = []
    for z in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.zip")):
        with zipfile.ZipFile(z) as zf:
            nomes = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            # O zip do Brasil traz o CSV por UF E o BRASIL inteiro — ler os
            # dois duplicava tudo (Ana Campagnolo saía com 393 mil). Prefere
            # o da UF; só cai pro BRASIL se não houver o da UF.
            so_uf = [n for n in nomes if f"_{uf}." in n]
            for n in (so_uf or [n for n in nomes if "_BRASIL." in n or n.endswith(f"{ano}.csv")]):
                alvos.append((z, n))
    for c in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.csv")):
        alvos.append((None, c))
    for z, n in alvos:
        if z:
            with zipfile.ZipFile(z) as zf, zf.open(n) as f:
                yield n, csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";")
        else:
            with open(n, encoding="latin-1") as f:
                yield n, csv.DictReader(f, delimiter=";")

def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    pasta, ano, uf = sys.argv[1], sys.argv[2], sys.argv[3].upper()
    cargos = {v: {} for v in CARGO.values()}
    municipios = {}
    n = 0
    for nome, rd in abrir_csvs(pasta, "votacao_candidato_munzona", ano, uf):
        print("lendo", nome)
        for r in rd:
            if r.get("SG_UF") != uf: continue
            cargo = CARGO.get(r.get("CD_CARGO"))
            if not cargo: continue
            if r.get("NR_TURNO") not in (None, "", "1"): continue
            sq = r["SQ_CANDIDATO"]
            chave = norm(r["NM_MUNICIPIO"])
            zona = r["NR_ZONA"].lstrip("0") or "0"
            votos = int(r.get("QT_VOTOS_NOMINAIS_VALIDOS") or r.get("QT_VOTOS_NOMINAIS") or 0)
            municipios.setdefault(chave, {"nome": r["NM_MUNICIPIO"].title(), "tse": r["CD_MUNICIPIO"]})
            c = cargos[cargo].setdefault(sq, {
                "sq": sq, "nome": r["NM_CANDIDATO"].title(), "nomeUrna": r["NM_URNA_CANDIDATO"].title(),
                "numero": r["NR_CANDIDATO"], "partido": r["SG_PARTIDO"],
                "situacao": (r.get("DS_SIT_TOT_TURNO") or "").upper(), "total": 0, "municipios": {}, "zonas": {},
            })
            c["total"] += votos
            c["municipios"][chave] = c["municipios"].get(chave, 0) + votos
            k = f"{chave}::{zona}"
            c["zonas"][k] = c["zonas"].get(k, 0) + votos
            n += 1
    if not n:
        print("Nenhuma linha lida — confira a pasta e o nome do zip (votacao_candidato_munzona_%s.zip)." % ano); sys.exit(2)
    saida = {"ano": int(ano), "uf": uf, "fonte": f"TSE votacao_candidato_munzona_{ano}", "municipios": municipios,
             "cargos": {k: {"candidatos": sorted(v.values(), key=lambda c: -c["total"])} for k, v in cargos.items()}}
    os.makedirs("dados/resultados", exist_ok=True)
    out = f"dados/resultados/{uf.lower()}-{ano}-municipios.json"
    json.dump(saida, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(out, "→", {k: len(v["candidatos"]) for k, v in saida["cargos"].items()}, "municípios:", len(municipios), "KB:", round(os.path.getsize(out) / 1024))

    # seções (opcional)
    secoes = {v: {} for v in CARGO.values()}; ns = 0
    for nome, rd in abrir_csvs(pasta, "votacao_secao", ano, uf):
        print("lendo", nome)
        for r in rd:
            if r.get("SG_UF") != uf: continue
            cargo = CARGO.get(r.get("CD_CARGO"))
            if not cargo or r.get("NR_TURNO") not in (None, "", "1"): continue
            nr = r.get("NR_VOTAVEL", "")
            if not nr or len(nr) < 3 or nr in ("95", "96", "97"): continue  # branco/nulo/legenda
            chave = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"; sec = r["NR_SECAO"].lstrip("0") or "0"
            k = f"{chave}::{zona}::{sec}"
            d = secoes[cargo].setdefault(nr, {})
            d[k] = d.get(k, 0) + int(r.get("QT_VOTOS") or 0); ns += 1
    if ns:
        out2 = f"dados/resultados/{uf.lower()}-{ano}-secoes.json"
        json.dump({"ano": int(ano), "uf": uf, "porNumero": True, "cargos": secoes}, open(out2, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(out2, "KB:", round(os.path.getsize(out2) / 1024))
    else:
        print("(sem arquivo de seção pra", ano, "— ok, opcional)")

if __name__ == "__main__":
    main()
