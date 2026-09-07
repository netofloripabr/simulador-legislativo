#!/usr/bin/env python3
"""Cruza o JSON bruto do TSE (divulgacandcontas) com o elenco 2026 do app e
gera os batches SQL de upsert em candidato_links (Instagram, total de bens,
total recebido). Usado pela rotina agendada "tse-financeiro-semanal" (05/09/2026)
e pela importacao manual estado a estado feita em 04-05/09/2026.

Entrada:  /tmp/sel-tse/tse-{uf}.json  — [[cargoNome, numero, nomeCompleto, tseId,
          instagram, totalDeBens, totalRecebido], ...] (cargoNome: "Senador" /
          "Deputado Federal" / "Deputado Estadual"), coletado no NAVEGADOR
          (o TSE devolve 403 pra qualquer chamada de servidor).
Saida:    /tmp/sel-tse/sql-{uf}/batch_NN.sql — executar cada um no Supabase.
Uso:      python3 ferramentas/tse_financeiro_processar.py SC
"""
import json, re, unicodedata, sys, subprocess, os

SCRATCH = "/tmp/sel-tse"  # entrada tse-{uf}.json e saida sql-{uf}/ ficam fora do repositorio
SEL = "/Users/neto/Desktop/SEL"

CARGO_MAP = {"Senador": "senador", "Deputado Federal": "federal", "Deputado Estadual": "estadual"}

def norm(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Z0-9 ]", "", s.upper())
    return re.sub(r"\s+", " ", s).strip()

URL_RE = re.compile(r"https?://[^\s]*instagram\.com/[^\s]*", re.I)
def limpar_insta(ig):
    if not ig:
        return None
    m = URL_RE.search(ig)
    if not m:
        return None
    return m.group(0).rstrip(").,;")

def carregar_app(uf):
    out = subprocess.run(
        ["node", "-e", f"""
const vm = require('vm');
const fs = require('fs');
const code = fs.readFileSync('{SEL}/dados/estados/{uf.lower()}-2026-provisorio.js','utf8');
const sandbox = {{}};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const key = Object.keys(sandbox)[0];
console.log(JSON.stringify(sandbox[key]));
"""],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)

def processar(uf, tse_rows):
    """tse_rows: list of [cargo, numero, nomeCompleto, tse_id, instagram, bens, receb] (raw TSE, cargo in
    ['Senador','Deputado Federal','Deputado Estadual'])."""
    app = carregar_app(uf)
    by_cargo = {}
    for row in tse_rows:
        cargo, numero, nomeCompleto = row[0], row[1], row[2]
        tse_id, insta, bens, receb = row[3], row[4], row[5], row[6]
        by_cargo.setdefault(cargo, []).append({
            "numero": numero, "nomeCompleto": nomeCompleto, "id": tse_id,
            "instagram": insta, "bens": bens, "receb": receb,
            "norm_nome": norm(nomeCompleto), "usado": False,
        })

    matched = []
    unmatched = []
    for cargo, slug in CARGO_MAP.items():
        cands = app.get(cargo, [])
        tse_list = by_cargo.get(cargo, [])
        for c in cands:
            found = None
            if c.get("numero"):
                for t in tse_list:
                    if not t["usado"] and t["numero"] == c["numero"]:
                        found = t
                        break
            if not found:
                nn = norm(c["nome"])
                for t in tse_list:
                    if not t["usado"] and t["norm_nome"] == nn:
                        found = t
                        break
            if not found:
                nu = norm(c.get("nomeUrna", ""))
                for t in tse_list:
                    if not t["usado"] and norm(t.get("nomeUrna", "") or "") == nu:
                        found = t
                        break
            if found:
                found["usado"] = True
                matched.append({
                    "chave": c["id"], "cargo": slug,
                    "instagram": limpar_insta(found["instagram"]),
                    "bens": found["bens"], "receb": found["receb"], "tse_id": found["id"],
                })
            else:
                unmatched.append({"cargo": cargo, "id": c["id"], "nome": c["nome"]})
    return matched, unmatched

def esc(s):
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"

def num(v):
    return "null" if v is None else repr(v)

def gerar_sql(uf, matched, batch_size=90):
    sqls = []
    for i in range(0, len(matched), batch_size):
        batch = matched[i:i + batch_size]
        rows = []
        for r in batch:
            rows.append(f"({esc(uf.upper())},{esc(r['cargo'])},{esc(r['chave'])},{num(r['tse_id'])},{num(r['bens'])},{num(r['receb'])},{esc(r['instagram'])})")
        values = ",\n  ".join(rows)
        sql = f"""insert into candidato_links (estado, cargo, chave, tse_id, total_de_bens, total_recebido, financeiro_atualizado_em, instagram)
select v.estado, v.cargo, v.chave, v.tse_id, v.total_de_bens, v.total_recebido, now(), coalesce(cl.instagram, v.instagram)
from (values
  {values}
) as v(estado, cargo, chave, tse_id, total_de_bens, total_recebido, instagram)
left join candidato_links cl on cl.estado=v.estado and cl.cargo=v.cargo and cl.chave=v.chave
on conflict (estado, cargo, chave) do update set
  tse_id = excluded.tse_id,
  total_de_bens = excluded.total_de_bens,
  total_recebido = excluded.total_recebido,
  financeiro_atualizado_em = excluded.financeiro_atualizado_em,
  instagram = coalesce(candidato_links.instagram, excluded.instagram);
"""
        sqls.append(sql)
    return sqls

def gerar_sql_compacto(uf, matched, batch_size=300):
    """Versão mais compacta: JSON.dumps + jsonb_to_recordset, poucos bytes
    de overhead por linha (sem repetir aspas/vírgulas do VALUES) — permite
    lotes maiores por chamada, MENOS chamadas de tool no total."""
    sqls = []
    for i in range(0, len(matched), batch_size):
        batch = matched[i:i + batch_size]
        arr = [{"e": uf.upper(), "c": r["cargo"], "k": r["chave"], "t": r["tse_id"], "b": r["bens"], "r": r["receb"], "i": r["instagram"]} for r in batch]
        payload = json.dumps(arr, ensure_ascii=False, separators=(",", ":"))
        payload_sql = payload.replace("'", "''")
        sql = f"""insert into candidato_links (estado, cargo, chave, tse_id, total_de_bens, total_recebido, financeiro_atualizado_em, instagram)
select v.e, v.c, v.k, v.t, v.b, v.r, now(), coalesce(cl.instagram, v.i)
from jsonb_to_recordset('{payload_sql}'::jsonb)
  as v(e text, c text, k text, t bigint, b numeric, r numeric, i text)
left join candidato_links cl on cl.estado=v.e and cl.cargo=v.c and cl.chave=v.k
on conflict (estado, cargo, chave) do update set
  tse_id = excluded.tse_id,
  total_de_bens = excluded.total_de_bens,
  total_recebido = excluded.total_recebido,
  financeiro_atualizado_em = excluded.financeiro_atualizado_em,
  instagram = coalesce(candidato_links.instagram, excluded.instagram);
"""
        sqls.append(sql)
    return sqls

if __name__ == "__main__":
    uf = sys.argv[1]
    with open(f"{SCRATCH}/tse-{uf.lower()}.json") as f:
        tse_rows = json.load(f)
    matched, unmatched = processar(uf, tse_rows)
    print(f"{uf}: matched={len(matched)} unmatched={len(unmatched)}", file=sys.stderr)
    sqls = gerar_sql_compacto(uf, matched, batch_size=180)
    os.makedirs(f"{SCRATCH}/sql-{uf.lower()}", exist_ok=True)
    for i, sql in enumerate(sqls):
        with open(f"{SCRATCH}/sql-{uf.lower()}/batch_{i:02d}.sql", "w") as f:
            f.write(sql)
    print(f"{len(sqls)} batches written to {SCRATCH}/sql-{uf.lower()}/", file=sys.stderr)
