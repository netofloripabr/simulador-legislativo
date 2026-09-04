#!/usr/bin/env python3
"""Gera nuvem/migracoes-index.js a partir dos arquivos nuvem/migracao-*.sql.

Rodar sempre que criar uma migração nova:

    python3 ferramentas/gerar_indice_migracoes.py

O índice lista, por migração, os objetos que ela cria (tabelas, funções,
views, índices, policies, triggers e colunas). O painel admin (aba Rotinas)
manda essa lista pra função admin_migracoes_status() no Supabase, que
confere se cada objeto existe — assim o status "aplicada / pendente" vem
do banco de verdade, não de uma marcação manual que alguém esquece de
fazer (decisão de 04/09/2026, item "controle de migrações").

Limites conhecidos: migração que só faz UPDATE/INSERT/DROP (sem criar
nada) não tem objeto detectável e aparece como "sem verificação" — hoje só
a migracao-3-partido-escopo-todos.sql. Uma migração que apenas ALTERA o
corpo de uma função existente conta como aplicada se a função existe
(não dá pra saber a versão do corpo por aqui).
"""
import glob
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PADRAO = os.path.join(RAIZ, "nuvem", "migracao-*.sql")
SAIDA = os.path.join(RAIZ, "nuvem", "migracoes-index.js")

RE_CREATE = re.compile(
    r"create\s+(?:or\s+replace\s+)?(table|function|view|index|policy|trigger|unique\s+index)\s+"
    r"(?:if\s+not\s+exists\s+)?(?:public\.)?\"?([a-z_0-9]+)\"?", re.I)
RE_ADD_COL = re.compile(
    r"alter\s+table\s+(?:public\.)?\"?([a-z_0-9]+)\"?\s+add\s+column\s+"
    r"(?:if\s+not\s+exists\s+)?\"?([a-z_0-9]+)\"?", re.I)


def numero(caminho):
    return int(re.search(r"migracao-(\d+)", caminho).group(1))


def objetos_de(sql):
    sql = re.sub(r"--[^\n]*", "", sql)
    vistos, objs = set(), []
    for m in RE_CREATE.finditer(sql):
        t = m.group(1).lower().replace("unique index", "index")
        chave = (t, m.group(2).lower())
        if chave not in vistos:
            vistos.add(chave); objs.append([t, chave[1]])
    for m in RE_ADD_COL.finditer(sql):
        chave = ("column", m.group(1).lower() + "." + m.group(2).lower())
        if chave not in vistos:
            vistos.add(chave); objs.append(["column", chave[1]])
    return objs


def main():
    itens = []
    for caminho in sorted(glob.glob(PADRAO), key=numero):
        with open(caminho, encoding="utf-8") as f:
            sql = f.read()
        primeira = next((l.strip("- ").strip() for l in sql.splitlines() if l.strip().startswith("--")), "")
        itens.append({
            "num": numero(caminho),
            "arquivo": os.path.basename(caminho),
            "descricao": primeira[:110],
            "objetos": objetos_de(sql),
        })
    corpo = json.dumps(itens, ensure_ascii=False, indent=1)
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("// GERADO por ferramentas/gerar_indice_migracoes.py — não editar à mão.\n")
        f.write("// Rode o script de novo sempre que criar uma migração em nuvem/.\n")
        f.write("const MIGRACOES_INDEX = " + corpo + ";\n")
    sem = [i["arquivo"] for i in itens if not i["objetos"]]
    print(f"{len(itens)} migrações → {os.path.relpath(SAIDA, RAIZ)}")
    if sem:
        print("sem objeto verificável (vão aparecer como 'sem verificação'):", ", ".join(sem))


if __name__ == "__main__":
    main()
