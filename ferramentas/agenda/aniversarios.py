# Aniversário dos 295 municípios de SC (14/11/2026), para a Agenda do Gabinete (bases eleitorais).
# Fonte: ficha (infobox) de cada município na Wikipédia em português — campo "aniversário"; quando vazio, a data de
# "fundação" (dia e mês). Não há lista oficial única; em SC o aniversário costuma ser feriado municipal, e algumas
# cidades comemoram em data diferente da lei de criação. Roda uma vez (295 consultas à API da Wikipédia, 1 a cada 3 s,
# respeitando o limite de consultas dela; ~15 min).
# Saída: dados/painel/sc-aniversarios.json  {"fonte":..., "gerado":..., "m": {"Blumenau": [2, 9, 1850, "fundação"], ...}}
import json, re, time, urllib.request, urllib.error, urllib.parse, datetime, os, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
MUN = [m["n"] for m in json.load(open(os.path.join(RAIZ, "dados/painel/sc-base.json")))["mun"]]
MESES = {m: i + 1 for i, m in enumerate("janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
def wikitext(t):
    u = "https://pt.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "parse", "page": t, "prop": "wikitext", "format": "json", "section": 0, "redirects": 1})
    r = urllib.request.Request(u, headers={"User-Agent": "SimulaLEGIS-pesquisa/1.0 (agenda de aniversarios de municipios)"})
    for t in range(4):
        try: d = json.load(urllib.request.urlopen(r, timeout=30)); return d.get("parse", {}).get("wikitext", {}).get("*", "")
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(int(e.headers.get("Retry-After") or 30) + 5); continue
            raise
        except ValueError: time.sleep(30)   # página de erro (limite de consultas): espera e tenta de novo
    raise RuntimeError("Wikipédia recusou repetidamente")
def data(v):
    m = re.search(r"dtlink\|(\d{1,2})\|(\d{1,2})\|(\d{3,4})", v, re.I)
    if m: return [int(m[1]), int(m[2]), int(m[3])]
    m = re.search(r"(\d{1,2})º?\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?", v, re.I)
    if m and m[2].lower() in MESES: return [int(m[1]), MESES[m[2].lower()], int(m[3]) if m[3] else None]
    return None
OUT, falta = {}, []
for i, n in enumerate(MUN):
    w = ""
    for t in (n + " (Santa Catarina)", n):
        try: w = wikitext(t)
        except Exception: w = ""
        if "Santa Catarina" in w and re.search(r"\{\{Info/Munic", w, re.I): break
    campos = {k.lower(): v for k, v in re.findall(r"\|\s*(aniversário|fundação|emancipação)\s*=\s*([^\n]*)", w, re.I)}
    r = None
    for k in ("aniversário", "fundação", "emancipação"):
        v = campos.get(k, "")
        if v.strip().startswith("|"): v = ""
        d = data(v) if v else None
        if d: r = d + [k]; break
    if r: OUT[n] = r
    else: falta.append(n)
    print(f"{i+1}/{len(MUN)} {n}: {r}", file=sys.stderr); time.sleep(3)
json.dump({"fonte": "Wikipédia (pt), ficha de cada município: campo aniversário; se vazio, fundação", "gerado": datetime.date.today().isoformat(), "faltam": falta, "m": OUT}, open(os.path.join(RAIZ, "dados/painel/sc-aniversarios.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(f"ok: {len(OUT)} com data, {len(falta)} sem: {falta}")
