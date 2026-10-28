#!/usr/bin/env python3
"""Conferência do Controle de Recursos (gab_recursos) × portal da SEF (dados/gabinete/mandato-napoleao.json).

Uso: python3 ferramentas/conferir_controle.py CONTROLE.json ESTADO.json > acoes.json
  CONTROLE.json: lista de linhas de gab_recursos {id, numero, ano, municipio, valor, modalidade}
  ESTADO.json:   foto anterior da execução por chave (criada/atualizada por este script; fica FORA do repositório)
Saída (JSON): ligar   = [{id, chave, numero, municipio, valor}] (gravar gab_recursos.numero = numero)  correspondência única e exata → pode ligar sozinho
              sugerir = [{id, municipio, valor, candidatos:[chave...]}]  mais de uma possibilidade → usuário confirma
              novas   = emendas da SEF do deputado sem linha no Controle
              mudou   = execução que avançou desde a última conferência (empenhado/liquidado/pago)
              diverge = ligadas com valor ou município diferente do portal
Regra de casamento: mesmo ano, mesmo município, valor igual (±R$ 1) e mesma modalidade (TE/CO/ED pelo nome da SEF).
"""
import json, sys, unicodedata, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda t: unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode().lower().strip()
def sig(m):
  m = norm(m)
  return "TE" if "transferencia especial" in m or m == "te" else "ED" if "execucao direta" in m or m == "ed" else "CO" if m.startswith("conv") or "termo" in m or m in ("co", "cs", "tf", "tc") else m.upper()
ctl = json.load(open(sys.argv[1])); est_path = sys.argv[2]
# o Controle liga à SEF pelo "numero" (código SEF, ex. 3540 → chave 2025-003540), como o painel faz; "chave" é legado
def kde(r):
  n = str(r.get("numero") or "").strip()
  return f'{r["ano"]}-{int(n):06d}' if n.isdigit() and r.get("ano") else None
for r in ctl: r["chave"] = kde(r)
est = json.load(open(est_path)) if os.path.exists(est_path) else {}
sef = json.load(open(os.path.join(RAIZ, "dados", "gabinete", "mandato-napoleao.json")))["emendas"]
S = {e["k"]: e for e in sef}
ligadas = {r["chave"] for r in ctl if r.get("chave")}
livres = [e for e in sef if e["k"] not in ligadas]
out = {"ligar": [], "sugerir": [], "novas": [], "mudou": [], "diverge": []}
usadas = set()
for r in ctl:
  if r.get("chave") or not r.get("ano") or not r.get("valor"): continue
  c = [e for e in livres if e["ano"] == int(r["ano"]) and norm(e["mun"]) == norm(r["municipio"]) and abs((e["v"] or 0) - float(r["valor"])) <= 1 and sig(e["mod"]) == sig(r.get("modalidade"))]
  if len(c) == 1:
    # única também do lado da SEF: nenhuma outra linha do Controle sem chave casa com ela
    rivais = [o for o in ctl if not o.get("chave") and o is not r and o.get("ano") == r["ano"] and norm(o.get("municipio")) == norm(r["municipio"]) and o.get("valor") and abs(float(o["valor"]) - float(r["valor"])) <= 1 and sig(o.get("modalidade")) == sig(r.get("modalidade"))]
    if not rivais and c[0]["k"] not in usadas: out["ligar"].append({"id": r["id"], "chave": c[0]["k"], "numero": str(int(c[0]["k"].split("-")[1])), "municipio": r["municipio"], "valor": float(r["valor"])}); usadas.add(c[0]["k"]); continue
  if c: out["sugerir"].append({"id": r["id"], "municipio": r["municipio"], "valor": float(r["valor"]), "candidatos": [e["k"] for e in c]})
ligadas |= usadas
out["novas"] = [{"chave": e["k"], "municipio": e["mun"], "valor": e["v"], "objeto": e["obj"]} for e in sef if e["k"] not in ligadas and e["ano"] >= 2025]
for r in ctl:
  k = r.get("chave") or next((l["chave"] for l in out["ligar"] if l["id"] == r["id"]), None); e = S.get(k)
  if not e: continue
  agora = {"ve": e.get("ve") or 0, "vl": e.get("vl") or 0, "vp": e.get("vp") or 0}; antes = est.get(k)
  if antes and any(agora[x] > antes.get(x, 0) + .5 for x in agora): out["mudou"].append({"chave": k, "municipio": e["mun"], "antes": antes, "agora": agora})
  est[k] = agora
  if r.get("chave") and (abs((e["v"] or 0) - float(r.get("valor") or 0)) > 1 or norm(e["mun"]) != norm(r.get("municipio"))):
    out["diverge"].append({"id": r["id"], "chave": k, "controle": [r.get("municipio"), r.get("valor")], "sef": [e["mun"], e["v"]]})
json.dump(est, open(est_path, "w"))
print(json.dumps(out, ensure_ascii=False, indent=1))
