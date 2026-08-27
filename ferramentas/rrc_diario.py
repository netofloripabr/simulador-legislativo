#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rrc_diario.py — pesquisa diária do RRC oficial do TSE, pros 27 estados,
com retorno no painel do administrador (aba Rotinas).

POR QUE EXISTE (pedido do usuário, 26/08/2026)
-----------------------------------------------
O RRC (Registro de Candidatura) é a fonte mais autoritativa até o
resultado da eleição — ver ferramentas/conferir_rrc.py, que já cruza o
RRC de UMA UF contra o nosso provisório. Este script orquestra a rodada
NACIONAL diária: roda a conferência pra cada UF que tiver cache baixado,
agrega um resumo do país e registra a execução na tabela
public.execucoes_rotina do Supabase (migração 18) — que é exatamente o
que a aba Rotinas do painel admin lê.

COMO OS DADOS DO TSE CHEGAM ATÉ AQUI (o problema do 403)
---------------------------------------------------------
Desde 21/08/2026 o Akamai do TSE devolve 403 pra qualquer cliente fora
de navegador (curl, urllib, Actions — testado de novo em 26/08: segue
bloqueado; header de navegador não engana, o bloqueio é por impressão
digital de TLS). O único caminho que funciona é fetch same-origin DENTRO
de um navegador real na página do divulgacandcontas — que é como a
rotina agendada opera: o agente abre o site, baixa os JSONs por UF e
salva em --cache-raiz/{UF}/{codigo_cargo}.json, e então roda este script.

Aceita tanto o JSON CRU da API (objeto com "candidatos") quanto o
formato já convertido de conferir_rrc.py (lista) — a rotina salva o cru,
sem pós-processamento no navegador.

O QUE ESTE SCRIPT NUNCA FAZ
----------------------------
- NUNCA escreve nos *-2026-provisorio.js (mesma política de
  conferir_rrc.py: conferência aponta, humano decide).
- NUNCA faz git commit/push (rotinas concorrentes no mesmo repositório
  já causaram incidente em 18/08/2026 — quem commita é o usuário ou a
  sessão principal, nunca a rotina).
- NUNCA registra no Supabase sem a chave service_role — que vive FORA
  do repositório (ver --chave), porque a tabela execucoes_rotina não tem
  policy de insert pra authenticated (migração 18, de propósito).

Uso:
    python3 ferramentas/rrc_diario.py --cache-raiz /tmp/rrc-cache
    python3 ferramentas/rrc_diario.py --cache-raiz /tmp/rrc-cache \
        --chave ~/.config/sel/service-role.key   # também registra no painel
"""

import argparse
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import conferir_rrc  # noqa: E402  (reusa parse/cruzar/relatório da UF)

SUPABASE_URL = "https://qgjfkpsjveatonziwkvj.supabase.co"
UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG",
       "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR",
       "RS", "SC", "SE", "SP", "TO"]


def normalizar_cache(cache_uf_dir):
    """Converte JSON cru da API ({"candidatos":[...]}) pro formato de lista
    que conferir_rrc.buscar_rrc devolve — in place, uma vez só. Idempotente:
    arquivo que já é lista fica como está."""
    for arq in Path(cache_uf_dir).glob("*.json"):
        dado = json.loads(arq.read_text(encoding="utf-8"))
        if isinstance(dado, list):
            continue
        candidatos = []
        for c in dado.get("candidatos") or []:
            candidatos.append({
                "numero": c.get("numero"),
                "nome": c.get("nomeCompleto") or "",
                "coligacao": c.get("nomeColigacao"),
                "partido": (c.get("partido") or {}).get("sigla"),
                "situacao": c.get("descricaoSituacao"),
            })
        arq.write_text(json.dumps(candidatos, ensure_ascii=False), encoding="utf-8")


def rodar_uf(uf, cache_uf_dir, saida):
    provisorio = f"{saida}/{uf.lower()}-2026-provisorio.js"
    if not Path(provisorio).exists():
        return None
    normalizar_cache(cache_uf_dir)
    nosso = conferir_rrc.parse_provisorio(provisorio)
    conferir_rrc.CACHE_DIR = str(cache_uf_dir)
    resultado = conferir_rrc.cruzar(nosso, uf)
    conferir_rrc.escrever_relatorio(resultado, uf, saida)
    return {
        "uf": uf,
        "rrc": sum(r["total_rrc"] for r in resultado.values()),
        "confirmados": sum(r["confirmados"] for r in resultado.values()),
        "divergencias": sum(len(r["divergencias"]) for r in resultado.values()),
        "so_no_rrc": sum(len(r.get("rrc_so_no_rrc", [])) for r in resultado.values()),
    }


def registrar_no_painel(chave, sucesso, detalhe):
    """Insere a linha em public.execucoes_rotina via PostgREST com a
    service_role (única credencial com insert — ver migração 18)."""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/execucoes_rotina",
        data=json.dumps({
            "rotina": "pesquisa-rrc-diaria",
            "sucesso": sucesso,
            "detalhe": detalhe,
        }).encode("utf-8"),
        headers={
            "apikey": chave,
            "Authorization": f"Bearer {chave}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status in (200, 201, 204)


def main():
    parser = argparse.ArgumentParser(description="Rodada nacional diária de conferência do RRC do TSE.")
    parser.add_argument("--cache-raiz", required=True,
                        help="Diretório com um subdiretório por UF ({UF}/{codigo_cargo}.json) baixado via navegador")
    parser.add_argument("--saida", default="dados/estados")
    parser.add_argument("--chave", default=None,
                        help="Arquivo com a service_role do Supabase (fora do repo). Sem ele, só gera os relatórios.")
    args = parser.parse_args()

    raiz = Path(args.cache_raiz)
    resumos, sem_cache = [], []
    for uf in UFS:
        cache_uf = raiz / uf
        if not cache_uf.is_dir() or not any(cache_uf.glob("*.json")):
            sem_cache.append(uf)
            continue
        print(f"[{uf}] cruzando contra o RRC ...")
        r = rodar_uf(uf, cache_uf, args.saida)
        if r:
            resumos.append(r)
            print(f"     RRC={r['rrc']} confirmados={r['confirmados']} "
                  f"divergências={r['divergencias']} só-no-RRC={r['so_no_rrc']}")

    tot = {k: sum(r[k] for r in resumos) for k in ("rrc", "confirmados", "divergencias", "so_no_rrc")}
    ufs_com_pendencia = [f"{r['uf']}({r['divergencias']}+{r['so_no_rrc']})"
                         for r in resumos if r["divergencias"] or r["so_no_rrc"]]
    detalhe = (f"{date.today().isoformat()} · {len(resumos)}/27 UFs · "
               f"RRC {tot['rrc']} · confirmados {tot['confirmados']} · "
               f"divergências {tot['divergencias']} · só no RRC {tot['so_no_rrc']}"
               + (f" · pendências: {', '.join(ufs_com_pendencia)}" if ufs_com_pendencia else " · sem pendências")
               + (f" · sem cache: {', '.join(sem_cache)}" if sem_cache else ""))
    sucesso = len(resumos) > 0

    print("\n== RESUMO NACIONAL ==")
    print(detalhe)

    if args.chave:
        chave = Path(args.chave).expanduser().read_text(encoding="utf-8").strip()
        ok = registrar_no_painel(chave, sucesso, detalhe)
        print("Registrado no painel admin (execucoes_rotina)." if ok else "FALHA ao registrar no painel.")
    else:
        print("(sem --chave: execução NÃO registrada no painel admin)")

    sys.exit(0 if sucesso else 1)


if __name__ == "__main__":
    main()
