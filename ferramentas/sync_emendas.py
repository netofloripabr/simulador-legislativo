#!/usr/bin/env python3
"""Sincroniza dados PÚBLICOS de emendas parlamentares estaduais de SC.

Fontes:
  A) Power BI da SEF "2023 em diante" (publish-to-web, API querydata anônima)
  B) API do Portal da Transparência SC (exercício corrente: 2026)

Saída (JSON minificado) em dados/gabinete/:
  emendas-AAAA.json, pagamentos-AAAA.json, mandato-napoleao.json,
  meta.json, conferencia.json

Só biblioteca padrão (Python 3.9). Uso: python3 ferramentas/sync_emendas.py
Falha de uma fonte não apaga arquivos anteriores (grava só o que veio OK).
Dados bancários (banco/agência/conta/domicílio) são omitidos de propósito.
"""
import datetime as dt
import gzip
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "dados", "gabinete")
ANOS = [2023, 2024, 2025, 2026]
ANO_PORTAL = 2026
DEPUTADO = "NAPOLEAO BERNARDES"  # comparação sem acento, em maiúsculas
OBJ_MAX = 300

PBI_BASE = "https://wabi-brazil-south-b-primary-api.analysis.windows.net/public/reports/"
PBI_KEY = "cd153507-3216-4721-9c42-b900a95507d9"
PBI_PAUSA = 1.0
PBI_TOP = 30000

PORTAL = "https://api-portal-transparencia.apps.sm.okd4.ciasc.sc.gov.br/api"
PORTAL_PAUSA = 0.3

T_CAD = "CadastroEmendasParlamentares"
T_COMPL = "EmendasImpositivasapartir2023 - Compl Cadastro"
T_PAG = "Base tabela Visão Pagamentos"

COLS_CAD = ["num_ano", "num_emenda_parlamentar", "dsc_objeto", "nom_parlamentar",
            "nom_beneficiario", "num_documento_beneficiario", "nom_tipo_beneficiario",
            "nom_localidade", "Código IBGE", "Associação", "dsc_modalidade_emenda",
            "val_emenda_parlamentar", "val_emenda_atualizado", "dsc_situacao"]
COLS_COMPL = ["Nº Emenda", "SGPe", "Link SGPe", "Tipo Emenda", "Situação Emendas",
              "Observação Situação"]
COLS_PAG = ["N° Emenda", "Ano Emenda", "NE", "NL", "PP", "OB", "DT_PAGTO_PP", "Pagamento"]

CAMPOS = ["k", "n", "dep", "mod", "tipo", "sit", "imped", "mun", "ibge", "assoc", "benef",
          "doc", "tben", "obj", "v", "va", "ve", "vl", "vp", "sgpe", "lsgpe"]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def agora():
    return dt.datetime.now(dt.timezone.utc).astimezone(
        dt.timezone(dt.timedelta(hours=-3))).strftime("%Y-%m-%dT%H:%M:%S-03:00")


def sem_acento(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper().strip()


def num(x):
    if x is None or x == "":
        return None
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return int(f) if f == int(f) else round(f, 2)


def chave(n):
    """Normaliza nº da emenda para 'AAAA-NNNNNN'.
    Aceita '2026EP003464', '3464/2026', '0001/2023', '2026/3464'."""
    if n is None:
        return None
    s = str(n).strip().upper()
    m = re.match(r"^(\d{4})\D+(\d+)$", s)
    if m and int(m.group(1)) > 2000 and "/" not in s:
        return "%s-%06d" % (m.group(1), int(m.group(2)))
    m = re.match(r"^(\d+)\s*/\s*(\d{4})$", s)
    if m:
        return "%s-%06d" % (m.group(2), int(m.group(1)))
    m = re.match(r"^(\d{4})\s*/\s*(\d+)$", s)
    if m:
        return "%s-%06d" % (m.group(1), int(m.group(2)))
    return s


# ---------------------------------------------------------------- HTTP

def http(url, body=None, headers=None, tentativas=4):
    h = {"Accept-Encoding": "gzip", "User-Agent": "Mozilla/5.0 (sync_emendas; dados publicos)",
         "Accept": "application/json"}
    if headers:
        h.update(headers)
    dados = None
    if body is not None:
        dados = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    erro = None
    for i in range(tentativas):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, data=dados, headers=h), timeout=180)
            b = r.read()
            if b[:2] == b"\x1f\x8b":
                b = gzip.decompress(b)
            return json.loads(b.decode("utf-8"))
        except urllib.error.HTTPError as e:
            erro = e
            espera = 60 if e.code == 429 else 3 * (i + 1)
            log("  HTTP %s em %s; nova tentativa em %ss" % (e.code, url[:90], espera))
            time.sleep(espera)
        except Exception as e:  # rede, timeout, JSON
            erro = e
            log("  erro %r; nova tentativa" % e)
            time.sleep(3 * (i + 1))
    raise RuntimeError("falha em %s: %r" % (url, erro))


# ---------------------------------------------------------------- Power BI

class PowerBI:
    def __init__(self):
        self.h = {"X-PowerBI-ResourceKey": PBI_KEY}
        m = http(PBI_BASE + PBI_KEY + "/modelsAndExploration?preferReadOnlySession=true", headers=self.h)
        mod = m["models"][0]
        self.model_id = mod["id"]
        self.last_refresh = mod.get("LastRefreshTime")
        time.sleep(PBI_PAUSA)
        s = http(PBI_BASE + "conceptualschema", {"modelIds": [self.model_id]}, headers=self.h)
        self.tipos = {}
        for ent in s["schemas"][0]["schema"]["Entities"]:
            for p in ent["Properties"]:
                col = p.get("Column") or {}
                self.tipos[(ent["Name"], p["Name"])] = col.get("DataType")
        time.sleep(PBI_PAUSA)
        for t, cols in ((T_CAD, COLS_CAD), (T_COMPL, COLS_COMPL), (T_PAG, COLS_PAG)):
            for c in cols:
                if (t, c) not in self.tipos:
                    raise RuntimeError("coluna ausente no schema (painel republicado?): %s[%s]" % (t, c))

    def _literal(self, ent, col, valor):
        tp = self.tipos.get((ent, col))
        if isinstance(valor, int) and tp not in (2048, 1):  # 2048 = texto
            return "%dL" % valor
        return "'%s'" % str(valor).replace("'", "''")

    def consulta(self, ent, cols, filtros=None, top=PBI_TOP):
        """filtros: lista de (coluna, [valores]). Retorna (linhas, truncado)."""
        src = {"SourceRef": {"Source": "t"}}
        sel = [{"Column": {"Expression": src, "Property": c}, "Name": "t.%s" % c} for c in cols]
        q = {"Version": 2, "From": [{"Name": "t", "Entity": ent, "Type": 0}], "Select": sel}
        if filtros:
            q["Where"] = [{"Condition": {"In": {
                "Expressions": [{"Column": {"Expression": src, "Property": c}}],
                "Values": [[{"Literal": {"Value": self._literal(ent, c, v)}}] for v in vals]}}}
                for c, vals in filtros]
        body = {"version": "1.0.0", "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
            "Query": q,
            "Binding": {"Primary": {"Groupings": [{"Projections": list(range(len(cols)))}]},
                        "DataReduction": {"DataVolume": 3, "Primary": {"Top": {"Count": top}}},
                        "Version": 1}}}]}}],
            "cancelQueries": [], "modelId": self.model_id}
        r = http(PBI_BASE + "querydata?synchronous=true", body, headers=self.h)
        time.sleep(PBI_PAUSA)
        res = r["results"][0]["result"]
        data = res.get("data") or {}
        if "dsr" not in data or "DataShapes" in data.get("dsr", {}):
            raise RuntimeError("erro na consulta Power BI: %s" % json.dumps(res)[:500])
        linhas, truncado = decodifica_dsr(data["dsr"], data["descriptor"]["Select"], len(cols))
        if len(linhas) >= top:
            truncado = True
        return linhas, truncado

    def tabela_por_ano(self, ent, cols, col_ano, ano, col_part=None):
        linhas, trunc = self.consulta(ent, cols, [(col_ano, [ano])])
        if not trunc:
            return linhas
        if not col_part:
            raise RuntimeError("%s %s passou de %d linhas e não há coluna para paginar" % (ent, ano, PBI_TOP))
        log("  %s %s truncado; paginando por %s" % (ent, ano, col_part))
        parts, t2 = self.consulta(ent, [col_part], [(col_ano, [ano])])
        tudo = []
        for (p,) in parts:
            l, t3 = self.consulta(ent, cols, [(col_ano, [ano]), (col_part, [p])])
            if t3:
                raise RuntimeError("%s %s %s ainda truncado" % (ent, ano, p))
            tudo.extend(l)
        return tudo


def decodifica_dsr(dsr, select, ncols):
    """Decodifica o formato DSR (Power BI) de um agrupamento primário plano.
    - S: schema das colunas (N=nome Gx, DN=dicionário)
    - C: valores presentes (omitindo repetidos e nulos)
    - R: bitmask de colunas que repetem o valor da linha anterior
    - Ø: bitmask de colunas nulas
    - ValueDicts: índices inteiros em colunas com DN; string literal = valor novo
    Retorna (linhas na ordem do Select, truncado)."""
    ds = dsr["DS"][0]
    if "odata.error" in ds or "Error" in ds:
        raise RuntimeError("DSR com erro: %s" % json.dumps(ds)[:400])
    dicts = ds.get("ValueDicts", {})
    truncado = bool(ds.get("RT"))
    dm = ds["PH"][0].get("DM0", []) if ds.get("PH") else []
    nomes = [s["Value"] for s in select]  # G0, G1...
    fmt = {s["Value"]: s.get("Format") for s in select}
    schema = None
    ant = None
    out = []
    for row in dm:
        if "S" in row:
            schema = row["S"]
            ant = [None] * len(schema)
        rep = row.get("R", 0)
        nul = row.get("Ø", 0)
        vals = iter(row.get("C", []))
        atual = []
        for i, col in enumerate(schema):
            if (rep >> i) & 1:
                v = ant[i]
            elif (nul >> i) & 1:
                v = None
            else:
                v = next(vals, None)
                dn = col.get("DN")
                if dn and isinstance(v, int):
                    d = dicts.get(dn, [])
                    v = d[v] if 0 <= v < len(d) else None
            atual.append(v)
        ant = atual
        por_nome = {schema[i]["N"]: atual[i] for i in range(len(schema))}
        linha = []
        for g in nomes:
            v = por_nome.get(g)
            if v is not None and fmt.get(g) and isinstance(v, (int, float)) and v > 10 ** 11:
                v = dt.datetime.fromtimestamp(v / 1000, dt.timezone.utc).strftime("%Y-%m-%d")
            linha.append(v)
        out.append(linha)
    return out, truncado


def coleta_powerbi():
    pbi = PowerBI()
    log("Power BI: modelo %s, atualizado %s" % (pbi.model_id, pbi.last_refresh))
    cad, pag = {}, {}
    for ano in ANOS:
        cad[ano] = pbi.tabela_por_ano(T_CAD, COLS_CAD, "num_ano", ano, "nom_parlamentar")
        log("  cadastro %s: %d" % (ano, len(cad[ano])))
        pag[ano] = pbi.tabela_por_ano(T_PAG, COLS_PAG, "Ano Emenda", ano, "N° Emenda")
        log("  pagamentos %s: %d" % (ano, len(pag[ano])))
    compl, trunc = pbi.consulta(T_COMPL, COLS_COMPL)
    if trunc:
        raise RuntimeError("Compl Cadastro passou de %d linhas" % PBI_TOP)
    log("  compl cadastro: %d" % len(compl))
    return {"last_refresh": pbi.last_refresh, "model_id": pbi.model_id,
            "cad": cad, "pag": pag, "compl": compl}


# ---------------------------------------------------------------- Portal

def coleta_portal():
    carga = None
    try:
        c = http(PORTAL + "/processo-carga?contexto=EMENDAPARLAMENTAR")
        carga = c["status"]["EMENDAPARLAMENTAR"]["dataexecucao"]
    except Exception as e:
        log("  processo-carga falhou: %r" % e)
    lista, pagina, ultima, totais = [], 1, None, None
    while True:
        r = http(PORTAL + "/emendaparlamentar?page=%d&nuanoinifiltro=%d&nuanofimfiltro=%d"
                 % (pagina, ANO_PORTAL, ANO_PORTAL))
        l = r["lista"]
        ultima = l.get("last_page") or ultima
        totais = r.get("totais", totais)
        lista.extend(l.get("data") or [])
        if not l.get("data") or (ultima and pagina >= int(ultima)):
            break
        pagina += 1
        time.sleep(PORTAL_PAUSA)
    total = l.get("total")
    if total and int(total) != len(lista):
        raise RuntimeError("Portal: lista incompleta (%d de %s)" % (len(lista), total))
    log("Portal: %d emendas %d (%d páginas), carga %s" % (len(lista), ANO_PORTAL, pagina, carga))
    extratos = {}
    for it in lista:
        if DEPUTADO not in sem_acento(it.get("nmparlamentar")):
            continue
        n = it["nuemendaparlamentar"]
        q = urllib.parse.urlencode({"nuemendaparlamentarfiltro[]": n})
        time.sleep(PORTAL_PAUSA)
        e = http(PORTAL + "/emendaparlamentar/extratoemenda?" + q)
        e = e.get("emenda", e)
        ident = e.get("emendaIdentificacao") or {}
        if isinstance(ident, dict):
            for k in ("cdbanco", "cdagencia", "nuconta"):
                ident.pop(k, None)
        extratos[n] = e
    log("  extratos do deputado: %d" % len(extratos))
    return {"carga": carga, "lista": lista, "extratos": extratos, "totais": totais}


# ---------------------------------------------------------------- junção

def monta(pbi, portal):
    """Retorna dict ano -> {k: registro}, e pagamentos ano -> linhas."""
    emendas = {}
    pagamentos = {}
    compl = {}
    if pbi:
        for nr, sgpe, lsgpe, tipo, situ, obs in pbi["compl"]:
            k = chave(nr)
            if k:
                compl[k] = {"sgpe": sgpe, "lsgpe": lsgpe, "tipo": tipo,
                            "imped": " ".join(x for x in (situ, obs) if x) or None}
        for ano in ANOS:
            d = emendas.setdefault(ano, {})
            for (a, nr, obj, dep, benef, doc, tben, mun, ibge, assoc, mod, v, va, sit) in pbi["cad"][ano]:
                k = chave(nr)
                c = compl.get(k, {})
                d[k] = {"k": k, "n": nr, "dep": dep, "mod": mod, "tipo": c.get("tipo"), "sit": sit,
                        "imped": c.get("imped"), "mun": mun, "ibge": ibge, "assoc": assoc,
                        "benef": benef, "doc": doc, "tben": tben,
                        "obj": (obj or "")[:OBJ_MAX] or None, "v": num(v), "va": num(va),
                        "ve": None, "vl": None, "vp": None, "sgpe": c.get("sgpe"),
                        "lsgpe": c.get("lsgpe"), "_vp_pbi": 0, "_fontes": ["pbi"]}
            pl = []
            for (nr, a, ne, nl, pp, ob, data, valor) in pbi["pag"][ano]:
                k = chave(nr)
                pl.append([k, ne, nl, pp, ob, data, num(valor)])
                if k in d and valor:
                    d[k]["_vp_pbi"] += float(valor)
            pl.sort(key=lambda x: (x[0] or "", x[5] or "", x[3] or ""))
            pagamentos[ano] = pl
            for r in d.values():
                r["vp"] = num(r["_vp_pbi"])
    if portal:
        d = emendas.setdefault(ANO_PORTAL, {})
        for it in portal["lista"]:
            k = chave(it["nuemendaparlamentar"])
            r = d.get(k)
            if r is None:
                r = {c: None for c in CAMPOS}
                r.update({"k": k, "_vp_pbi": None, "_fontes": []})
                d[k] = r
                c = compl.get(k, {})
                for f in ("tipo", "sgpe", "lsgpe"):
                    r[f] = c.get(f)
            r["_fontes"].append("portal")
            r["n"] = it["nuemendaparlamentar"]
            r["dep"] = r["dep"] or it.get("nmparlamentar")
            r["mod"] = it.get("demodalidadeemenda") or r["mod"]
            r["sit"] = it.get("nmsituacao") or r["sit"]
            lib = (it.get("deliberadoexecucao") or "").strip()
            if lib and lib != "Sim":
                r["imped"] = lib
            r["_portal"] = {"v": num(it.get("vlemendaparlamentar")), "ve": num(it.get("vlempenhado")),
                            "vl": num(it.get("vlliquidado")), "vp": num(it.get("vlpago"))}
            if r["v"] is None:
                r["v"] = r["_portal"]["v"]
            r["ve"], r["vl"], r["vp"] = r["_portal"]["ve"], r["_portal"]["vl"], r["_portal"]["vp"]
            ex = portal["extratos"].get(it["nuemendaparlamentar"])
            if ex:
                ide = ex.get("emendaIdentificacao") or {}
                r["mun"] = r["mun"] or ide.get("nmlocalidade")
                r["obj"] = r["obj"] or (ide.get("deobjeto") or "")[:OBJ_MAX] or None
                r["tben"] = r["tben"] or ide.get("detipocredor")
                r["va"] = r["va"] if r["va"] is not None else num(ide.get("vlemendaatualizado"))
                cred = ide.get("identificacaocredor") or ""
                m = re.match(r"^\s*([\d./-]{11,})\s+(.*)$", cred)
                if m:
                    r["doc"] = r["doc"] or m.group(1)
                    r["benef"] = r["benef"] or m.group(2).strip()
    return emendas, pagamentos


def limpo(v):
    return None if isinstance(v, str) and not v.strip() else v


def colunar(ano, d):
    linhas = [[limpo(r.get(c)) for c in CAMPOS] for r in sorted(d.values(), key=lambda r: r["k"])]
    return {"ano": ano, "campos": CAMPOS, "linhas": linhas}


def mandato(emendas, pagamentos, portal):
    out = []
    for ano in sorted(emendas):
        pag_ano = {}
        for p in pagamentos.get(ano, []):
            pag_ano.setdefault(p[0], []).append(p[1:])
        for k, r in sorted(emendas[ano].items()):
            if DEPUTADO not in sem_acento(r.get("dep")):
                continue
            item = {c: limpo(r.get(c)) for c in CAMPOS}
            item["ano"] = ano
            item["pagamentos_sef"] = pag_ano.get(k, [])
            if portal and r.get("n") in portal["extratos"]:
                item["extrato_portal"] = portal["extratos"][r["n"]]
            out.append(item)
    return {"deputado": "NAPOLEAO BERNARDES NETO",
            "campos_pagamentos_sef": ["ne", "nl", "pp", "ob", "data", "valor"],
            "emendas": out}


def resumo_ano(d, fonte):
    regs = [r for r in d.values() if fonte in r.get("_fontes", [])]
    if fonte == "pbi":
        return {"n": len(regs), "v": round(sum(r["v"] or 0 for r in regs), 2),
                "vp": round(sum(r["_vp_pbi"] or 0 for r in regs), 2)}
    return {"n": len(regs), "v": round(sum(r["_portal"]["v"] or 0 for r in regs), 2),
            "ve": round(sum(r["_portal"]["ve"] or 0 for r in regs), 2),
            "vl": round(sum(r["_portal"]["vl"] or 0 for r in regs), 2),
            "vp": round(sum(r["_portal"]["vp"] or 0 for r in regs), 2)}


def conferencia(emendas, contagens, meta_ant, ok_pbi, ok_portal):
    conf = {"gerado_em": agora(), "ano": ANO_PORTAL, "alertas": []}
    if ok_pbi and ok_portal:
        d = emendas.get(ANO_PORTAL, {})
        so_portal = sorted(k for k, r in d.items() if r["_fontes"] == ["portal"])
        so_pbi = sorted(k for k, r in d.items() if r["_fontes"] == ["pbi"])
        div = []
        for k, r in sorted(d.items()):
            if len(r["_fontes"]) < 2:
                continue
            p = r["_portal"]
            dv = round((p["v"] or 0) - (r["v"] or 0), 2)
            dp = round((p["vp"] or 0) - (r["_vp_pbi"] or 0), 2)
            if abs(dv) >= 0.01 or abs(dp) >= 0.01:
                div.append({"k": k, "dep": r["dep"], "v_portal": p["v"], "v_pbi": r["v"],
                            "vp_portal": p["vp"], "vp_pbi": num(r["_vp_pbi"]),
                            "ve_portal": p["ve"]})
        conf["so_portal"] = so_portal
        conf["so_powerbi"] = so_pbi
        conf["divergentes"] = div
        tp = contagens["portal"].get(str(ANO_PORTAL), {})
        tb = contagens["powerbi"].get(str(ANO_PORTAL), {})
        conf["totais"] = {"portal": tp, "powerbi": tb,
                          "dif_v": round(tp.get("v", 0) - tb.get("v", 0), 2),
                          "dif_vp": round(tp.get("vp", 0) - tb.get("vp", 0), 2),
                          "n_so_portal": len(so_portal), "n_so_powerbi": len(so_pbi),
                          "n_divergentes": len(div)}
        conf["obs"] = ("O Power BI não traz valor empenhado nas tabelas coletadas; "
                       "ve_portal é informativo. vp_pbi = soma da 'Base tabela Visão Pagamentos'.")
    else:
        conf["obs"] = "Conferência entre fontes não feita: uma das fontes falhou nesta execução."
    hist = []
    ant = (meta_ant or {}).get("contagens", {})
    for fonte in ("powerbi", "portal"):
        for ano, atual in contagens.get(fonte, {}).items():
            velho = ant.get(fonte, {}).get(ano)
            if not velho:
                continue
            reg = {"fonte": fonte, "ano": ano, "n_antes": velho.get("n"), "n_agora": atual.get("n"),
                   "v_antes": velho.get("v"), "v_agora": atual.get("v"),
                   "vp_antes": velho.get("vp"), "vp_agora": atual.get("vp")}
            hist.append(reg)
            for campo in ("n", "v", "vp"):
                a, b = velho.get(campo) or 0, atual.get(campo) or 0
                if a and not b:
                    conf["alertas"].append("%s %s: %s caiu a zero" % (fonte, ano, campo))
                elif a and abs(b - a) / a > 0.2:
                    conf["alertas"].append("%s %s: %s variou %.1f%% (%s -> %s)"
                                           % (fonte, ano, campo, 100 * (b - a) / a, a, b))
    for fonte, ok in (("powerbi", ok_pbi), ("portal", ok_portal)):
        if not ok:
            conf["alertas"].append("%s: coleta falhou nesta execução" % fonte)
        elif ok and not any((c or {}).get("n") for c in contagens.get(fonte, {}).values()):
            conf["alertas"].append("%s: nenhuma emenda retornada" % fonte)
    conf["historico"] = hist
    return conf


def grava(nome, obj):
    caminho = os.path.join(SAIDA, nome)
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, caminho)
    log("  gravado %s (%.1f KB)" % (nome, os.path.getsize(caminho) / 1024))


def main():
    os.makedirs(SAIDA, exist_ok=True)
    meta_path = os.path.join(SAIDA, "meta.json")
    meta_ant = None
    if os.path.exists(meta_path):
        try:
            meta_ant = json.load(open(meta_path, encoding="utf-8"))
        except Exception:
            pass
    erros = {}
    pbi = portal = None
    try:
        pbi = coleta_powerbi()
    except Exception as e:
        erros["powerbi"] = repr(e)
        log("FALHA Power BI: %r" % e)
    try:
        portal = coleta_portal()
    except Exception as e:
        erros["portal"] = repr(e)
        log("FALHA Portal: %r" % e)
    if not pbi and not portal:
        log("Nenhuma fonte respondeu; nada gravado.")
        if meta_ant is not None:
            meta_ant["ultima_tentativa"] = {"em": agora(), "erros": erros}
            grava("meta.json", meta_ant)
        return 1

    emendas, pagamentos = monta(pbi, portal)
    contagens = {"powerbi": {}, "portal": {}}
    for ano, d in emendas.items():
        if pbi:
            contagens["powerbi"][str(ano)] = resumo_ano(d, "pbi")
            contagens["powerbi"][str(ano)]["pagamentos"] = len(pagamentos.get(ano, []))
        if portal and ano == ANO_PORTAL:
            contagens["portal"][str(ano)] = resumo_ano(d, "portal")
    # se uma fonte falhou, mantém contagens anteriores dela no meta
    if meta_ant:
        for fonte, ok in (("powerbi", pbi), ("portal", portal)):
            if not ok:
                contagens[fonte] = meta_ant.get("contagens", {}).get(fonte, {})

    # arquivos por ano: se o Power BI falhou, só o ano do Portal poderia ser refeito,
    # mas sem o cadastro ficaria incompleto -> não sobrescreve emendas/pagamentos.
    if pbi:
        for ano in ANOS:
            grava("emendas-%d.json" % ano, colunar(ano, emendas.get(ano, {})))
            grava("pagamentos-%d.json" % ano, {"ano": ano,
                                                "campos": ["k", "ne", "nl", "pp", "ob", "data", "valor"],
                                                "linhas": pagamentos.get(ano, [])})
    if pbi and portal:
        grava("mandato-napoleao.json", mandato(emendas, pagamentos, portal))
    elif os.path.exists(os.path.join(SAIDA, "mandato-napoleao.json")):
        log("  mandato-napoleao.json mantido (fonte incompleta)")
    else:
        grava("mandato-napoleao.json", mandato(emendas, pagamentos, portal))

    conf = conferencia(emendas, contagens, meta_ant, bool(pbi), bool(portal))
    ant_m = meta_ant or {}
    meta = {
        "coletado_em": agora(),
        "fontes": {
            "powerbi": {"ok": bool(pbi), "erro": erros.get("powerbi"),
                        "last_refresh": pbi["last_refresh"] if pbi else
                        ant_m.get("fontes", {}).get("powerbi", {}).get("last_refresh"),
                        "model_id": pbi["model_id"] if pbi else None,
                        "resource_key": PBI_KEY},
            "portal": {"ok": bool(portal), "erro": erros.get("portal"),
                       "carga": portal["carga"] if portal else
                       ant_m.get("fontes", {}).get("portal", {}).get("carga"),
                       "extratos": len(portal["extratos"]) if portal else None,
                       "totais_api": portal["totais"] if portal else None},
        },
        "contagens": contagens,
        "alertas": conf["alertas"],
    }
    grava("conferencia.json", conf)
    grava("meta.json", meta)
    for a in conf["alertas"]:
        log("ALERTA: " + a)
    return 0 if not erros else 2


if __name__ == "__main__":
    sys.exit(main())
