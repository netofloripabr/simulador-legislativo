#!/usr/bin/env python3
"""Acrescenta a LOCALIDADE (bairro por zona, escola por seção) aos arquivos
já existentes em dados/resultados/{uf}-{ano}/secoes/*.json — sem mexer nos
votos que já estão lá.

Achado do usuário em 22/09/2026: os zips que ele já tinha baixado pra tratar
os resultados por seção (votacao_secao_{ano}_{UF}.zip) JÁ trazem o nome e o
endereço do local de votação por zona/seção (NM_LOCAL_VOTACAO,
DS_LOCAL_VOTACAO_ENDERECO) — não tem em 2014. Pra bairro, ele também já
tinha baixado eleitorado_local_votacao_{ano}.zip (dataset separado do TSE,
com NM_BAIRRO, endereço, lat/long por local). Zona não tem "o" bairro dela
(reúne vários locais) — usa-se o bairro do local mais votado (cargo
estadual) como referência, igual combinado no protótipo aprovado.

Uso (mesma pasta com os zips de ambos os datasets, ex. ~/Downloads):
  python3 ferramentas/tratar_locais_votacao.py ~/Downloads 2022 SC
  python3 ferramentas/tratar_locais_votacao.py ~/Downloads 2018 SC

Escreve em cada dados/resultados/{uf}-{ano}/secoes/{município}.json:
  "_zonas":  { "<zona>": "Bairro" }
  "_secoes": { "<zona>::<seção>": "Nome curto da escola" }
  "_bairroSec": { "<zona>::<seção>": "Bairro do local" }  (filtro Bairro/Local)
"""
import csv, glob, io, json, os, re, sys, unicodedata, zipfile

CARGO_REF = "7"  # estadual — usado só pra achar o local mais votado de cada zona

def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper().strip()

def slug(s):
    s = norm(s)
    s = re.sub(r"[^A-Z0-9]+", "-", s).strip("-")
    return s.lower()

def nome_curto(nome):
    n = (nome or "").strip()
    if not n: return n
    if len(n) <= 6 and n.upper() == n:
        return n  # sigla (FURB, CDL...)
    t = n.title()
    t = re.sub(r"^Escola (De Educa[cç][aã]o B[aá]sica |B[aá]sica Municipal |Municipal De Educa[cç][aã]o B[aá]sica |Estadual De Educa[cç][aã]o B[aá]sica |Municipal |Estadual |De Ensino Fundamental E M[eé]dio |De Educa[cç][aã]o Infantil |Comunit[aá]ria )?", "Esc. ", t)
    t = re.sub(r"^Centro De Educa[cç][aã]o Infantil( Municipal)? ", "CEI ", t)
    t = re.sub(r"^Col[eé]gio ", "Col. ", t)
    return t

def abrir_csvs(pasta, prefixo, ano, uf):
    alvos = []
    for z in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.zip")):
        with zipfile.ZipFile(z) as zf:
            nomes = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            so_uf = [n for n in nomes if f"_{uf}." in n or f"_{uf}.csv" in n.upper()]
            for n in (so_uf or nomes):
                alvos.append((z, n))
    for c in glob.glob(os.path.join(pasta, f"{prefixo}_{ano}*.csv")):
        alvos.append((None, c))
    for z, n in alvos:
        if z:
            with zipfile.ZipFile(z) as zf, zf.open(n) as f:
                yield n, list(csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"))
        else:
            with open(n, encoding="latin-1") as f:
                yield n, list(csv.DictReader(f, delimiter=";"))

def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    pasta, ano, uf = sys.argv[1], sys.argv[2], sys.argv[3].upper()
    pasta = os.path.expanduser(pasta)

    escola_de = {}          # (municipio, zona, secao) -> nome do local
    local_da_secao = {}     # (municipio, zona, secao) -> nr_local
    votos_local = {}        # (municipio, zona, nr_local) -> votos (cargo estadual)
    nome_local_de = {}      # (municipio, zona, nr_local) -> nome do local

    lidas = 0
    for nome, linhas in abrir_csvs(pasta, "votacao_secao", ano, uf):
        print("lendo", nome, "—", len(linhas), "linhas")
        for r in linhas:
            if r.get("SG_UF") != uf: continue
            if r.get("NR_TURNO") not in (None, "", "1"): continue
            if not r.get("NM_LOCAL_VOTACAO"): continue  # 2014 não tem essa coluna
            muni = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"; sec = r["NR_SECAO"].lstrip("0") or "0"
            nrlocal = r.get("NR_LOCAL_VOTACAO", "")
            k = (muni, zona, sec)
            if k not in escola_de:
                escola_de[k] = nome_curto(r["NM_LOCAL_VOTACAO"])
                local_da_secao[k] = nrlocal
            if r.get("CD_CARGO") == CARGO_REF:
                kl = (muni, zona, nrlocal)
                votos_local[kl] = votos_local.get(kl, 0) + int(r.get("QT_VOTOS") or 0)
                nome_local_de[kl] = r["NM_LOCAL_VOTACAO"]
            lidas += 1
    if not lidas:
        print(f"Sem votacao_secao_{ano}_{uf}.zip com NM_LOCAL_VOTACAO (normal em 2014) — nada a fazer."); return

    # bairro por (município, nr_local), do dataset de eleitorado por local
    bairro_de = {}
    for nome, linhas in abrir_csvs(pasta, "eleitorado_local_votacao", ano, uf):
        print("lendo", nome, "—", len(linhas), "linhas")
        for r in linhas:
            if r.get("SG_UF") != uf: continue
            # NR_LOCAL_VOTACAO só é único DENTRO da zona — chave inclui a zona.
            muni = norm(r["NM_MUNICIPIO"]); zona = r["NR_ZONA"].lstrip("0") or "0"; nrlocal = r.get("NR_LOCAL_VOTACAO", "")
            bairro_de.setdefault((muni, zona, nrlocal), r.get("NM_BAIRRO", "").title())

    # bairro por (município, zona) = bairro do local mais votado da zona
    melhor_por_zona = {}
    for (muni, zona, nrlocal), v in votos_local.items():
        k = (muni, zona)
        if k not in melhor_por_zona or v > melhor_por_zona[k][1]:
            melhor_por_zona[k] = (nrlocal, v)
    bairro_por_zona = {}
    for (muni, zona), (nrlocal, _) in melhor_por_zona.items():
        b = bairro_de.get((muni, zona, nrlocal))
        if b: bairro_por_zona[(muni, zona)] = b

    # aplica em cada dados/resultados/{uf}-{ano}/secoes/{slug}.json
    pasta_secoes = f"dados/resultados/{uf.lower()}-{ano}/secoes"
    if not os.path.isdir(pasta_secoes):
        print("Não achei", pasta_secoes, "— rode antes o tratar_resultados_municipio.py pra esse ano."); return
    municipios_por_slug = {}
    for (muni, zona, sec) in escola_de:
        municipios_por_slug.setdefault(slug(muni), muni)
    for (muni, zona) in bairro_por_zona:
        municipios_por_slug.setdefault(slug(muni), muni)

    tocados = 0
    for arq in glob.glob(os.path.join(pasta_secoes, "*.json")):
        sl = os.path.splitext(os.path.basename(arq))[0]
        muni = municipios_por_slug.get(sl)
        if not muni: continue
        d = json.load(open(arq, encoding="utf-8"))
        zonas = {}
        for (m, zona), b in bairro_por_zona.items():
            if m == muni: zonas[zona] = b
        secoes = {}
        for (m, zona, sec), nomeesc in escola_de.items():
            if m == muni: secoes[f"{zona}::{sec}"] = nomeesc
        bairros = {}
        for (m, zona, sec), nrl in local_da_secao.items():
            if m == muni:
                b = bairro_de.get((m, zona, nrl))
                if b: bairros[f"{zona}::{sec}"] = b
        if not zonas and not secoes: continue
        d["_zonas"] = zonas; d["_secoes"] = secoes; d["_bairroSec"] = bairros
        json.dump(d, open(arq, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        tocados += 1
    print(f"Pronto: {tocados} municípios de {uf}-{ano} com _zonas/_secoes (bairro/escola).")

if __name__ == "__main__":
    main()
