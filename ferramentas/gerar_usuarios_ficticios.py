#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gerar_usuarios_ficticios.py — cria contas fictícias PERMANENTES no
Supabase pra popular o Quadro de Médias no lançamento ("cold start"),
com palpite variando até ±20% por candidato em cima de uma lista de
referência (o palpite real de alguém). Ver nuvem/migracao-21-usuarios-
ficticios.sql e BACKLOG.md (seção "Ranking", item "155 usuários
fictícios") pra especificação completa.

Cada conta fictícia:
  1. Cadastra via Supabase Auth (signup) com e-mail sintético único.
  2. Cria a linha em "perfis" com eh_ficticio=true, indice_ficticio=N.
  3. Cria a linha em "palpites" com rascunho_<cargo> variando ±20% por
     candidato em cima da referência.

NÃO deposita cédula (não entra em "salvamentos"/Ranking) — só popula o
Quadro de Médias. Decisão de escopo fechada com o usuário em 15/08/2026.

Formato do arquivo de referência (--referencia, JSON): um objeto por
cargo que você quiser popular, cada um uma lista de partidos no formato
{"nome": "PL", "candidatos": [{"nome": "Fulano", "votos": 12345}, ...]}.
Exemplo mínimo (só estadual):
{
  "estadual": [
    {"nome": "PL", "candidatos": [{"nome": "Fulano", "votos": 12345}]}
  ]
}

Uso:
  python3 ferramentas/gerar_usuarios_ficticios.py --referencia ref.json --quantidade 5 --indice-inicial 151
  python3 ferramentas/gerar_usuarios_ficticios.py --referencia ref.json --quantidade 5 --indice-inicial 151 --dry-run
"""

import argparse
import hashlib
import json
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

SUPABASE_URL = "https://qgjfkpsjveatonziwkvj.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eQbVaB7fNEjgEtfat2AGyA_f4uRVPpg"
SAL_CPF = "alesc-simulador-sal-v1"  # mesmo sal de nuvem/autenticacao.js (hashCPF) — não mudar sem mudar lá também

NOMES_MASCULINOS = [
    "José", "João", "Antônio", "Francisco", "Marcos", "Paulo", "Carlos", "Luiz",
    "Pedro", "Rafael", "Rodrigo", "Fábio", "Gustavo", "André", "Bruno", "Daniel",
    "Felipe", "Diego", "Leandro", "Thiago",
]
NOMES_FEMININOS = [
    "Maria", "Ana", "Francisca", "Adriana", "Márcia", "Juliana", "Fernanda", "Patrícia",
    "Aline", "Camila", "Bruna", "Larissa", "Vanessa", "Tatiane", "Simone", "Renata",
    "Priscila", "Débora", "Cristina", "Sandra",
]
SOBRENOMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira",
    "Cardoso", "Teixeira", "Correia", "Machado", "Farias", "Pinto",
]


def gerar_cpf():
    def dv(nums, pesos):
        s = sum(n * p for n, p in zip(nums, pesos))
        r = (s * 10) % 11
        return 0 if r >= 10 else r

    base = [random.randint(0, 9) for _ in range(9)]
    d1 = dv(base, range(10, 1, -1))
    d2 = dv(base + [d1], range(11, 1, -1))
    return "".join(map(str, base + [d1, d2]))


def hash_cpf(cpf):
    return hashlib.sha256((cpf + SAL_CPF).encode()).hexdigest()


def http(method, path, body=None, token=None, upsert=False):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", SUPABASE_PUBLISHABLE_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + (token or SUPABASE_PUBLISHABLE_KEY))
    if method in ("POST", "PATCH"):
        prefer = "return=representation"
        # upsert: retomar um lote parado no meio sem quebrar em "duplicate
        # key" quando perfis/palpites já tinham sido gravados numa rodada
        # anterior (id/perfil_id são chave primária nas duas tabelas).
        if upsert:
            prefer += ",resolution=merge-duplicates"
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req) as resp:
            body_bytes = resp.read()
            return resp.status, (json.loads(body_bytes.decode()) if body_bytes else None)
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        try:
            parsed = json.loads(body_bytes.decode()) if body_bytes else None
        except json.JSONDecodeError:
            parsed = body_bytes.decode(errors="replace")
        return e.code, parsed


def variar_referencia(partidos, pct=0.20):
    resultado = []
    for p in partidos:
        candidatos = []
        for c in p["candidatos"]:
            fator = 1 + random.uniform(-pct, pct)
            votos = max(0, round(c["votos"] * fator))
            candidatos.append({
                "nome": c["nome"], "votos": votos,
                "marcadoEleito": False, "fonte": "real",
            })
        resultado.append({"nome": p["nome"], "candidatos": candidatos})
    return resultado


def criar_ficticio(indice, referencia_por_cargo, estado, dominio_email, dry_run):
    genero = random.choice(["Masculino", "Feminino"])
    primeiro_nome = random.choice(NOMES_MASCULINOS if genero == "Masculino" else NOMES_FEMININOS)
    nome = "%s %s" % (primeiro_nome, random.choice(SOBRENOMES))
    email = "ficticio.sel.%d@%s" % (indice, dominio_email)
    # Senha determinística (email+índice) de propósito: permite retomar um
    # lote que falhou no meio (ex.: signup criou a conta mas perfis/
    # palpites falhou por algum motivo) sem precisar guardar senha em
    # arquivo nenhum — só rodar de novo com o mesmo índice já resolve.
    senha = hashlib.sha256(("%s-%d-seed" % (email, indice)).encode()).hexdigest()[:20] + "!Aa1"
    cpf = gerar_cpf()
    rascunhos = {cargo: variar_referencia(partidos) for cargo, partidos in referencia_por_cargo.items()}

    if dry_run:
        resumo_votos = {c: sum(cand["votos"] for p in ps for cand in p["candidatos"]) for c, ps in rascunhos.items()}
        print("[dry-run] indice=%d nome=%r email=%s genero=%s soma_votos_por_cargo=%s" % (
            indice, nome, email, genero, resumo_votos))
        return True

    status, data = http("POST", "/auth/v1/signup", {"email": email, "password": senha})
    if status not in (200, 201) or not data or not data.get("access_token"):
        # Conta já existe (retomando um lote que parou no meio, ex.: signup
        # foi criado numa rodada anterior mas perfis/palpites falhou) — cai
        # pra login com a mesma senha determinística em vez de desistir.
        msg = json.dumps(data) if not isinstance(data, str) else data
        if status in (400, 422) and "already registered" in (msg or "").lower():
            status, data = http("POST", "/auth/v1/token?grant_type=password", {"email": email, "password": senha})
        if status not in (200, 201) or not data or not data.get("access_token"):
            print("ERRO signup/login indice %d (%s): %s %s" % (indice, email, status, data), file=sys.stderr)
            return False
    token = data["access_token"]
    user_id = data["user"]["id"]

    perfil = {
        "id": user_id,
        "nome": nome,
        "escopo": "assembleia",
        "partido_escopo": None,
        "modo_preenchimento": "detalhado",
        "mostrar_nome": True,
        "cpf_hash": hash_cpf(cpf),
        "lgpd_aceite_em": datetime.now(timezone.utc).isoformat(),
        "cep": "88000000",
        "municipio_residencia": "Florianópolis",
        "uf_residencia": estado,
        "genero": genero,
        "eh_ficticio": True,
        "indice_ficticio": indice,
    }
    status, data = http("POST", "/rest/v1/perfis", perfil, token=token, upsert=True)
    if status not in (200, 201):
        print("ERRO perfis indice %d (%s): %s %s" % (indice, email, status, data), file=sys.stderr)
        return False

    palpite = {"perfil_id": user_id, "candidatos": []}
    for cargo, partidos in rascunhos.items():
        palpite["rascunho_%s" % cargo] = partidos
    status, data = http("POST", "/rest/v1/palpites", palpite, token=token, upsert=True)
    if status not in (200, 201):
        print("ERRO palpites indice %d (%s): %s %s" % (indice, email, status, data), file=sys.stderr)
        return False

    print("OK indice=%d nome=%r email=%s user_id=%s" % (indice, nome, email, user_id))
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--referencia", required=True, help="Caminho do JSON de referência (ver docstring)")
    ap.add_argument("--quantidade", type=int, required=True)
    ap.add_argument("--indice-inicial", type=int, required=True, help="Primeiro índice (1-155) deste lote")
    ap.add_argument("--estado", default="SC")
    ap.add_argument("--dominio-email", default="ficticios.simulalegis.com.br",
                     help="Domínio sintético dos e-mails gerados — não precisa ser caixa real, só único e válido sintaticamente")
    ap.add_argument("--dry-run", action="store_true", help="Só mostra o que faria, não cria nada no Supabase")
    args = ap.parse_args()

    with open(args.referencia, encoding="utf-8") as f:
        referencia_por_cargo = json.load(f)

    sucesso, falha = 0, 0
    for i in range(args.quantidade):
        indice = args.indice_inicial + i
        ok = criar_ficticio(indice, referencia_por_cargo, args.estado, args.dominio_email, args.dry_run)
        if ok:
            sucesso += 1
        else:
            falha += 1
        if not args.dry_run:
            time.sleep(0.3)  # evita bater rate-limit do endpoint de signup

    print("\nResumo: %d ok, %d falha, de %d pedidos." % (sucesso, falha, args.quantidade))
    sys.exit(1 if falha else 0)


if __name__ == "__main__":
    main()
