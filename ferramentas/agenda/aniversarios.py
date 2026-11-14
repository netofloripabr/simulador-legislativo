# Aniversário dos municípios de SC, para a Agenda do Gabinete (bases eleitorais). 14/11/2026.
# Fonte: ficha (infobox) de cada município na Wikipédia em português — campo "aniversário"; quando vazio, a data de
# "fundação" ou "emancipação" (dia e mês). Não há lista oficial única; em SC o aniversário costuma ser feriado municipal,
# e algumas cidades comemoram em data diferente da lei de criação. Complemento inicial: Wikidata (P571).
#
# Modo noturno (decisão do usuário, 14/11/2026: "aos poucos, toda noite"): a Wikipédia limita consultas seguidas, então
# cada noite lê só algumas cidades que faltam (padrão 12, uma a cada 6 s), na ordem: primeiro as que são uma das 5
# maiores bases de algum deputado eleito, depois as demais. Se a Wikipédia recusar, para na hora e tenta na noite
# seguinte (sem insistir). Cidade cuja ficha não tem data fica marcada e só é tentada de novo depois de 30 dias.
#   python3 -I ferramentas/agenda/aniversarios.py            → rodada da noite (12 cidades)
#   python3 -I ferramentas/agenda/aniversarios.py --n 30     → outra quantidade
# Grava dados/painel/sc-aniversarios.json; quem publica é o agenda.mjs (mesma tarefa das 22h30).
import json, re, time, urllib.request, urllib.error, urllib.parse, datetime, os, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ARQ = os.path.join(RAIZ, "dados/painel/sc-aniversarios.json")
LOG = os.path.join(RAIZ, "ferramentas/diario/_cache/rotina.log")
N = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 12
MUN = [m["n"] for m in json.load(open(os.path.join(RAIZ, "dados/painel/sc-base.json")))["mun"]]
MESES = {m: i + 1 for i, m in enumerate("janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
def log(s):
    l = f"[{datetime.datetime.now().strftime('%d/%m/%Y, %H:%M:%S')}] aniversários: {s}"; print(l)
    try: open(LOG, "a").write(l + "\n")
    except Exception: pass
class Recusou(Exception): pass
def wikitext(t):
    u = "https://pt.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "parse", "page": t, "prop": "wikitext", "format": "json", "section": 0, "redirects": 1})
    r = urllib.request.Request(u, headers={"User-Agent": "SimulaLEGIS-pesquisa/1.0 (aniversarios de municipios; poucas consultas por dia)"})
    try: raw = urllib.request.urlopen(r, timeout=30).read()
    except urllib.error.HTTPError as e:
        if e.code in (403, 429, 503): raise Recusou(f"HTTP {e.code}")
        if e.code == 404: return ""
        raise
    try: d = json.loads(raw)
    except ValueError: raise Recusou("página de erro da Wikimedia")
    return d.get("parse", {}).get("wikitext", {}).get("*", "")
def data(v):
    m = re.search(r"dtlink\|(\d{1,2})\|(\d{1,2})\|(\d{3,4})", v, re.I)
    if m: return [int(m[1]), int(m[2]), int(m[3])]
    m = re.search(r"(\d{1,2})º?\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?", v, re.I)
    if m and m[2].lower() in MESES: return [int(m[1]), MESES[m[2].lower()], int(m[3]) if m[3] else None]
    return None
def ler(n):
    w = ""
    for t in (n + " (Santa Catarina)", n):
        w = wikitext(t)
        if "Santa Catarina" in w and re.search(r"\{\{Info/Munic", w, re.I): break
        time.sleep(3)
    campos = {k.lower(): v for k, v in re.findall(r"\|\s*(aniversário|fundação|emancipação)\s*=\s*([^\n]*)", w, re.I)}
    for k in ("aniversário", "fundação", "emancipação"):
        v = campos.get(k, "")
        if v.strip().startswith("|"): v = ""
        d = data(v) if v else None
        if d: return d + [k]
    return None

J = json.load(open(ARQ)) if os.path.exists(ARQ) else {"m": {}}
OUT, SEM = J.get("m", {}), J.get("sem_data", {})   # sem_data: cidade → data da última tentativa sem achar
# prioridade: as 5 maiores bases de cada deputado eleito
EST = json.load(open(os.path.join(RAIZ, "dados/painel/sc-estadual.json")))
pri = []
for c in EST["c"]:
    if not str(c.get("s", "")).lower().startswith("eleito") or not isinstance(c.get("v"), list): continue
    for i in sorted(range(len(MUN)), key=lambda i: -(c["v"][i] or 0))[:5]:
        if MUN[i] not in pri: pri.append(MUN[i])
hoje = datetime.date.today()
def pode(n): return n not in OUT and (n not in SEM or (hoje - datetime.date.fromisoformat(SEM[n])).days >= 30)
fila = [n for n in pri if pode(n)] + [n for n in MUN if n not in pri and pode(n)]
lidas, achadas = 0, []
try:
    for n in fila[:N]:
        r = ler(n); lidas += 1
        if r: OUT[n] = r; SEM.pop(n, None); achadas.append(n)
        else: SEM[n] = hoje.isoformat()
        time.sleep(6)
except Recusou as e: log(f"Wikipédia recusou ({e}); para hoje, continua amanhã")
except Exception as e: log(f"erro ({e}); continua amanhã")
falta = [n for n in MUN if n not in OUT]
J.update({"fonte": "Wikipédia (pt), ficha do município: aniversário; se vazio, fundação ou emancipação · complemento: Wikidata (P571). Completado aos poucos, toda noite.", "gerado": hoje.isoformat(), "faltam": falta, "m": OUT, "sem_data": SEM})
json.dump(J, open(ARQ, "w"), ensure_ascii=False, separators=(",", ":"))
log(f"{lidas} lidas, {len(achadas)} com data{(' (' + ', '.join(achadas) + ')') if achadas else ''}; total {len(OUT)}/{len(MUN)}; faltam {len(falta)} (bases dos eleitos que faltam: {sum(1 for n in pri if n not in OUT)})")
