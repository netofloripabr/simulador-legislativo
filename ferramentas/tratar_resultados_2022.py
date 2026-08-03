#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tratar_resultados_2022.py — trata os dados abertos do TSE de 2022 (votação +
cadastro de candidatos + motivo de cassação) em arquivos leves, um por
estado, no formato que o projeto já usa em dados/base-2022.js.

IMPORTANTE (leia antes de rodar): este script foi escrito no Cowork, sem
acesso aos arquivos reais do TSE (cdn.tse.jus.br é bloqueado nesse ambiente).
A lógica segue o layout público e estável dos arquivos do TSE (SEAD/ODS-ELE),
mas não foi testada contra o CSV de verdade. Ele detecta colunas pelo nome do
cabeçalho (não por posição fixa) e loga o que encontrou, exatamente para
tornar o primeiro ajuste rápido se algum nome de coluna vier diferente do
esperado. Ver ferramentas/LEIA-ME-dados-2022.md para onde baixar os arquivos
e o roteiro de uso (primeiro só --uf SC, comparar com base-2022.js já
validado, só depois rodar os outros estados).

ENTRADA (dentro de --dados-dir):
  - votação por candidato/município/zona (ex.: votacao_candidato_munzona_2022_BRASIL.csv)
  - cadastro de candidatos (ex.: consulta_cand_2022_BRASIL.csv)
  - motivo de cassação (ex.: motivo_cassacao_2022_BRASIL.csv)
O script procura por esses três por padrão de nome de arquivo (não precisa
bater o nome exato, ver `PADROES_ARQUIVO` abaixo) — se não achar um dos três,
avisa e segue sem aquele dado (ex.: sem cassação, só não preenche invalidado2022).

SAÍDA: dados/estados/{uf}-2022.js — um por estado, mesmo formato de
dados/base-2022.js (agrupado por partido, vagas2022 + candidatos[]), mais
nascimento/genero/grauInstrucao/corRaca/ocupacao e invalidado2022/motivoInvalidacao
vindos do dado oficial (não mais conferência manual). eleito2022 vem do campo
oficial de situação de totalização, não da fórmula de quociente — resolve a
limitação conhecida do simulador (ver PROJETO.md).

NÃO sobrescreve dados/base-2022.js (SC, já validado à mão) — só compara,
quando --uf inclui SC, e avisa as diferenças (não decide sozinho qual está
certo).
"""

import argparse
import csv
import glob
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

CARGOS_ALVO = {"DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "SENADOR"}  # cargos que o projeto modela

PADROES_ARQUIVO = {
    "votacao": ["votacao_candidato_munzona", "votacao_candidato_munzona_2022"],
    "cadastro": ["consulta_cand_2022", "consulta_cand"],
    "cassacao": ["motivo_cassacao"],
}

# nomes de coluna esperados (TSE costuma variar acentuação/maiúsculas entre
# exports — comparamos normalizado). Cada campo lógico tem uma lista de
# possíveis nomes de coluna, na ordem de preferência.
COLUNAS_VOTACAO = {
    "uf": ["SG_UF"],
    "municipio": ["NM_MUNICIPIO"],
    "cargo": ["DS_CARGO"],
    "sqCandidato": ["SQ_CANDIDATO"],
    "numero": ["NR_CANDIDATO"],
    "nome": ["NM_CANDIDATO"],
    "nomeUrna": ["NM_URNA_CANDIDATO"],
    "partido": ["SG_PARTIDO"],
    "votos": ["QT_VOTOS_NOMINAIS_VALIDOS", "QT_VOTOS_NOMINAIS"],
    "situacaoTurno": ["DS_SIT_TOT_TURNO"],
    "turno": ["NR_TURNO"],
}

COLUNAS_CADASTRO = {
    "uf": ["SG_UF"],
    "cargo": ["DS_CARGO"],
    "sqCandidato": ["SQ_CANDIDATO"],
    "nome": ["NM_CANDIDATO"],
    "nomeUrna": ["NM_URNA_CANDIDATO"],
    "nomeSocial": ["NM_SOCIAL_CANDIDATO"],
    "partido": ["SG_PARTIDO"],
    "nascimento": ["DT_NASCIMENTO"],
    "genero": ["DS_GENERO"],
    "grauInstrucao": ["DS_GRAU_INSTRUCAO"],
    "corRaca": ["DS_COR_RACA"],
    "ocupacao": ["DS_OCUPACAO"],
    "situacaoCandidatura": ["DS_SITUACAO_CANDIDATURA"],
    "situacaoTurno": ["DS_SIT_TOT_TURNO"],
}

COLUNAS_CASSACAO = {
    "uf": ["SG_UF"],
    "sqCandidato": ["SQ_CANDIDATO"],
    "nome": ["NM_CANDIDATO"],
    "motivo": ["DS_MOTIVO_CASSACAO", "DS_MOTIVO", "DS_DECISAO", "DS_TIPO_DECISAO"],
}

SITUACOES_ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA", "ELEITO POR MEDIA"}


def normalizar_cabecalho(nome):
    return nome.strip().upper().lstrip("﻿")


def mapear_colunas(cabecalho, colunas_desejadas, rotulo_arquivo):
    cabecalho_norm = {normalizar_cabecalho(c): c for c in cabecalho}
    mapa = {}
    faltando = []
    for campo, candidatos in colunas_desejadas.items():
        achou = None
        for cand in candidatos:
            if cand in cabecalho_norm:
                achou = cabecalho_norm[cand]
                break
        if achou:
            mapa[campo] = achou
        else:
            faltando.append(campo)
    print(f"    [{rotulo_arquivo}] colunas mapeadas: {len(mapa)}/{len(colunas_desejadas)}"
          + (f" — faltando: {', '.join(faltando)}" if faltando else ""))
    return mapa


def achar_arquivo(dados_dir, chave):
    padroes = PADROES_ARQUIVO[chave]
    candidatos = []
    for p in padroes:
        candidatos += glob.glob(os.path.join(dados_dir, f"*{p}*.csv"))
        candidatos += glob.glob(os.path.join(dados_dir, f"*{p}*.CSV"))
    candidatos = sorted(set(candidatos))
    return candidatos[0] if candidatos else None


def abrir_csv(caminho):
    """CSVs do TSE costumam ser Latin-1 (ISO-8859-1) separados por ';'."""
    return open(caminho, "r", encoding="latin-1", newline="")


def slugify(texto):
    nfkd = unicodedata.normalize("NFKD", texto or "")
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    sem_acento = sem_acento.lower()
    return re.sub(r"[^a-z0-9]+", "-", sem_acento).strip("-")


# Conectores que ficam minúsculos em nome próprio brasileiro (exceto quando
# são a primeira palavra) — sem isso, str.title() gera "Adriana De Cássia"
# em vez de "Adriana de Cássia", o que faz um mesmo candidato parecer
# "diferente" na hora de comparar com dados/base-2022.js (feito à mão).
CONECTORES_NOME = {"de", "da", "do", "das", "dos", "e"}


def titulo(nome):
    palavras = (nome or "").strip().title().split(" ")
    return " ".join(
        p.lower() if i > 0 and p.lower() in CONECTORES_NOME else p
        for i, p in enumerate(palavras)
    )


def ler_votacao(caminho, ufs_alvo):
    """Agrega votos por candidato (SQ_CANDIDATO), somando todos os
    município/zona, e guarda o município de maior votação — mesma
    metodologia descrita em dados/base-2022.js. Uma chave por (cargo,
    sqCandidato): o SQ_CANDIDATO já é único por candidatura/cargo no TSE,
    mas separar explicitamente evita qualquer ambiguidade entre os 3 cargos
    que o projeto modela."""
    with abrir_csv(caminho) as f:
        leitor = csv.reader(f, delimiter=";")
        cabecalho = next(leitor)
        mapa = mapear_colunas(cabecalho, COLUNAS_VOTACAO, "votação")
        idx = {campo: cabecalho.index(col) for campo, col in mapa.items()}

        agregados = {}  # (cargo, sqCandidato) -> dict
        for linha in leitor:
            try:
                uf = linha[idx["uf"]].strip().upper()
                if ufs_alvo and uf not in ufs_alvo:
                    continue
                cargo = linha[idx["cargo"]].strip().upper()
                if cargo not in CARGOS_ALVO:
                    continue
                if "turno" in idx and linha[idx["turno"]].strip() != "1":
                    continue
                sq = linha[idx["sqCandidato"]].strip()
                votos = int(linha[idx["votos"]].strip() or 0)
                municipio = linha[idx["municipio"]].strip() if "municipio" in idx else ""
            except (IndexError, ValueError):
                continue

            chave = (cargo, sq)
            if chave not in agregados:
                agregados[chave] = {
                    "uf": uf,
                    "cargo": cargo,
                    "numero": linha[idx["numero"]].strip() if "numero" in idx else None,
                    "nome": linha[idx["nome"]].strip() if "nome" in idx else "",
                    "nomeUrna": linha[idx["nomeUrna"]].strip() if "nomeUrna" in idx else "",
                    "partido": linha[idx["partido"]].strip() if "partido" in idx else "",
                    "votos": 0,
                    "municipioTop": municipio,
                    "votosMunicipioTop": -1,
                    "situacaoTurno": linha[idx["situacaoTurno"]].strip() if "situacaoTurno" in idx else "",
                }
            agregados[chave]["votos"] += votos
            if votos > agregados[chave]["votosMunicipioTop"]:
                agregados[chave]["votosMunicipioTop"] = votos
                agregados[chave]["municipioTop"] = municipio

        return agregados


def ler_cadastro(caminho, ufs_alvo):
    with abrir_csv(caminho) as f:
        leitor = csv.reader(f, delimiter=";")
        cabecalho = next(leitor)
        mapa = mapear_colunas(cabecalho, COLUNAS_CADASTRO, "cadastro")
        idx = {campo: cabecalho.index(col) for campo, col in mapa.items()}

        registro = {}
        for linha in leitor:
            try:
                uf = linha[idx["uf"]].strip().upper()
                if ufs_alvo and uf not in ufs_alvo:
                    continue
                cargo = linha[idx["cargo"]].strip().upper()
                if cargo not in CARGOS_ALVO:
                    continue
                sq = linha[idx["sqCandidato"]].strip()
            except (IndexError, KeyError):
                continue

            def pega(campo):
                return linha[idx[campo]].strip() if campo in idx and idx[campo] < len(linha) else None

            registro[(cargo, sq)] = {
                "nascimento": pega("nascimento"),
                "genero": pega("genero"),
                "grauInstrucao": pega("grauInstrucao"),
                "corRaca": pega("corRaca"),
                "ocupacao": pega("ocupacao"),
                "situacaoCandidatura": pega("situacaoCandidatura"),
                "situacaoTurno": pega("situacaoTurno"),
                "nomeSocial": pega("nomeSocial"),
            }
        return registro


def ler_cassacao(caminho, ufs_alvo):
    if not caminho:
        return {}
    with abrir_csv(caminho) as f:
        leitor = csv.reader(f, delimiter=";")
        cabecalho = next(leitor)
        mapa = mapear_colunas(cabecalho, COLUNAS_CASSACAO, "cassação")
        idx = {campo: cabecalho.index(col) for campo, col in mapa.items()}
        if "sqCandidato" not in idx:
            print("    [cassação] sem coluna de SQ_CANDIDATO identificável — pulando esse arquivo.")
            return {}

        motivos = {}
        for linha in leitor:
            try:
                if "uf" in idx:
                    uf = linha[idx["uf"]].strip().upper()
                    if ufs_alvo and uf not in ufs_alvo:
                        continue
                sq = linha[idx["sqCandidato"]].strip()
                motivo = linha[idx["motivo"]].strip() if "motivo" in idx else "cassado (motivo não especificado no arquivo)"
            except (IndexError, KeyError):
                continue
            motivos[sq] = motivo
        return motivos


def montar_estado(uf, votacao, cadastro, cassacao):
    """Junta os três dados por (cargo, SQ_CANDIDATO) e agrupa por cargo ->
    partido, no mesmo formato de dados/base-2022.js (um grupo por partido
    dentro de cada cargo)."""
    por_cargo_partido = defaultdict(lambda: defaultdict(list))
    ids_vistos = defaultdict(int)

    for (cargo, sq), v in votacao.items():
        if v["uf"] != uf:
            continue
        cad = cadastro.get((cargo, sq), {})
        situacao_turno = (cad.get("situacaoTurno") or v.get("situacaoTurno") or "").strip().upper()
        # comparação EXATA, não substring — "ELEITO" é substring de "NÃO ELEITO"/
        # "NAO ELEITO", então checar com "in" dava falso positivo pra não-eleitos.
        eleito = situacao_turno in SITUACOES_ELEITO
        motivo_cass = cassacao.get(sq)

        nome = titulo(v["nome"])
        partido = v["partido"] or "?"
        # id inclui a UF (não só partido+nome) — sem isso, candidatos de nome
        # igual em estados diferentes colidiam (ver COMANDO-RESULTADOS-2022-BRASIL.md).
        base_id = slugify(f"{partido}-{uf}-{nome}")
        ids_vistos[base_id] += 1
        cand_id = base_id if ids_vistos[base_id] == 1 else f"{base_id}-{ids_vistos[base_id]}"

        candidato = {
            "nome": nome,
            "municipio": titulo(v["municipioTop"]),
            "votos": v["votos"],
            "fonte": "oficial",
            "id": cand_id,
            "eleito2022": eleito,
        }
        if motivo_cass:
            candidato["invalidado2022"] = True
            candidato["motivoInvalidacao"] = motivo_cass
        if cad.get("nascimento"):
            candidato["nascimento"] = cad["nascimento"]
        if cad.get("genero"):
            candidato["genero"] = cad["genero"]
        if cad.get("grauInstrucao"):
            candidato["grauInstrucao"] = cad["grauInstrucao"]
        if cad.get("corRaca"):
            candidato["corRaca"] = cad["corRaca"]
        if cad.get("ocupacao"):
            candidato["ocupacao"] = cad["ocupacao"]
        if cad.get("nomeSocial"):
            candidato["nomeUrna"] = titulo(cad["nomeSocial"])
        elif v.get("nomeUrna"):
            candidato["nomeUrna"] = titulo(v["nomeUrna"])

        por_cargo_partido[cargo][partido].append(candidato)

    resultado_por_cargo = {}
    for cargo, por_partido in por_cargo_partido.items():
        grupos = []
        for partido, candidatos in sorted(por_partido.items()):
            candidatos.sort(key=lambda c: -c["votos"])
            vagas = sum(1 for c in candidatos if c["eleito2022"])
            grupos.append({"nome": partido, "vagas2022": vagas, "candidatos": candidatos})
        grupos.sort(key=lambda g: -g["vagas2022"])
        resultado_por_cargo[cargo] = grupos
    return resultado_por_cargo


def js_valor(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return json.dumps(v, ensure_ascii=False)


def escrever_js(uf, resultado_por_cargo, caminho_saida):
    linhas = [
        f"// Candidatos a Deputado Estadual, Deputado Federal e Senador — {uf} — 2022,",
        "// tratado a partir dos dados abertos do TSE (votação por candidato/",
        "// município/zona + cadastro de candidatos + motivo de cassação —",
        "// https://dadosabertos.tse.jus.br/dataset/resultados-2022 e",
        "// https://dadosabertos.tse.jus.br/dataset/candidatos-2022).",
        "//",
        "// PROVISÓRIO — não é lido pelo app ainda. Revisar contra o relatório de",
        "// conferência (mesmo arquivo, sufixo -conferencia.md) antes de renomear pra",
        "// dados/estados/{uf}-2022.js (ou substituir dados/base-2022.js, no caso de SC).",
        "//",
        "// eleito2022 vem do campo oficial de situação de totalização do TSE (não da",
        "// fórmula de quociente+sobras) — mais confiável que recalcular.",
        "// invalidado2022/motivoInvalidacao vem do arquivo oficial de motivo de",
        "// cassação, quando existe.",
        "//",
        "// Gerado por ferramentas/tratar_resultados_2022.py.",
        f"const RESULTADO_2022_{uf}_PROVISORIO = {{",
    ]
    for cargo in sorted(resultado_por_cargo.keys()):
        linhas.append(f'  {js_valor(titulo(cargo))}: [')
        for g in resultado_por_cargo[cargo]:
            linhas.append(f'    {{ nome:{js_valor(g["nome"])}, vagas2022:{g["vagas2022"]}, candidatos:[')
            for c in g["candidatos"]:
                campos = ", ".join(f"{k}:{js_valor(v)}" for k, v in c.items())
                linhas.append(f"      {{ {campos} }},")
            linhas.append("    ]},")
        linhas.append("  ],")
    linhas.append("};")
    Path(caminho_saida).write_text("\n".join(linhas) + "\n", encoding="utf-8")


def escrever_conferencia(uf, resultado_por_cargo, caminho_saida, fonte_arquivo):
    linhas = [
        f"# Conferência — resultado oficial 2022, {uf} (Deputado Estadual, Deputado Federal, Senador)",
        "",
        f"Gerado por `ferramentas/tratar_resultados_2022.py`, a partir de `{fonte_arquivo}`",
        "(TSE — votação de candidato por município e zona, 2022, 1º turno).",
        "",
        "**Nenhum dado aqui vira arquivo oficial do projeto sem confirmação humana.**",
        "",
        "## Resumo por cargo",
        "",
        "| Cargo | Partidos | Candidatos | Eleitos |",
        "|---|---|---|---|",
    ]
    for cargo in sorted(resultado_por_cargo.keys()):
        grupos = resultado_por_cargo[cargo]
        total_cand = sum(len(g["candidatos"]) for g in grupos)
        total_eleitos = sum(g["vagas2022"] for g in grupos)
        linhas.append(f"| {titulo(cargo)} | {len(grupos)} | {total_cand} | {total_eleitos} |")
    linhas += [
        "",
        "## Status de confirmação",
        "",
        "_(nenhuma linha confirmada ainda — preencher conforme for revisando, mesmo",
        "formato de dados/correcoes-nomes.md)_",
        "",
        "| Nome | Cargo | Partido | Status | Fonte |",
        "|---|---|---|---|---|",
    ]
    Path(caminho_saida).write_text("\n".join(linhas) + "\n", encoding="utf-8")


def comparar_com_sc_manual(resultado_por_cargo, caminho_base_2022):
    """Se o usuário rodou --uf SC, compara Deputado Estadual (único cargo que
    dados/base-2022.js cobre hoje) com o arquivo feito à mão — não decide
    sozinho qual está certo."""
    if not Path(caminho_base_2022).exists():
        return
    grupos_auto = resultado_por_cargo.get("DEPUTADO ESTADUAL", [])
    texto = Path(caminho_base_2022).read_text(encoding="utf-8")
    nomes_manual = set(re.findall(r'nome:"([^"]+)"', texto)) - set(re.findall(r'\{\s*nome:"([^"]+)",\s*vagas2022', texto))
    nomes_auto = {c["nome"] for g in grupos_auto for c in g["candidatos"]}
    so_manual = nomes_manual - nomes_auto
    so_auto = nomes_auto - nomes_manual
    print(f"\n  Comparação com base-2022.js (SC, validado à mão):")
    print(f"    Nomes só no manual (possível diferença de grafia/candidato ausente no oficial): {len(so_manual)}")
    print(f"    Nomes só no automático (possível candidato novo ou grafia diferente): {len(so_auto)}")
    if so_manual:
        print(f"    Amostra só-manual: {sorted(so_manual)[:10]}")
    if so_auto:
        print(f"    Amostra só-automático: {sorted(so_auto)[:10]}")


def main():
    parser = argparse.ArgumentParser(description="Trata dados abertos do TSE 2022 em dados/estados/{uf}-2022.js")
    parser.add_argument("--dados-dir", required=True, help="Pasta com os CSVs descompactados")
    parser.add_argument("--uf", default="", help="UF ou lista separada por vírgula (ex.: SC ou SC,PR,RS). Vazio = todas.")
    parser.add_argument("--saida", default="dados/estados")
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    ufs_alvo = set(u.strip().upper() for u in args.uf.split(",") if u.strip())

    caminho_votacao = achar_arquivo(args.dados_dir, "votacao")
    caminho_cadastro = achar_arquivo(args.dados_dir, "cadastro")
    caminho_cassacao = achar_arquivo(args.dados_dir, "cassacao")

    print("Arquivos encontrados:")
    print(f"  votação:  {caminho_votacao or '(NÃO ENCONTRADO)'}")
    print(f"  cadastro: {caminho_cadastro or '(não encontrado — genero/grauInstrucao/corRaca/ocupacao não serão preenchidos)'}")
    print(f"  cassação: {caminho_cassacao or '(não encontrado — invalidado2022 não será preenchido)'}")

    if not caminho_votacao:
        print("\nFalta o arquivo essencial (votação de candidato por município e zona). "
              "Confira ferramentas/LEIA-ME-dados-2022.md e o conteúdo de --dados-dir.")
        sys.exit(1)

    print("\n[1/3] Lendo votação (pode demorar — arquivo grande) ...")
    votacao = ler_votacao(caminho_votacao, ufs_alvo)
    print(f"      {len(votacao)} candidaturas (Dep. Estadual + Dep. Federal + Senador, 1º turno) agregadas.")

    cadastro = {}
    if caminho_cadastro:
        print("[2/3] Lendo cadastro de candidatos ...")
        cadastro = ler_cadastro(caminho_cadastro, ufs_alvo)
        print(f"      {len(cadastro)} registros de cadastro cruzáveis.")
    else:
        print("[2/3] Sem arquivo de cadastro — seguindo só com o que vem da votação (nome, nome de urna, partido, votos, situação).")

    print("[3/3] Lendo motivo de cassação ...")
    cassacao = ler_cassacao(caminho_cassacao, ufs_alvo)
    print(f"      {len(cassacao)} candidaturas com motivo de cassação encontrado.")

    ufs_presentes = sorted({v["uf"] for v in votacao.values()})
    if not ufs_presentes:
        print("\nNenhuma candidatura encontrada com esses filtros — "
              "confira se o CSV é mesmo de 2022/1º turno e se a UF existe no arquivo.")
        sys.exit(1)

    Path(args.saida).mkdir(parents=True, exist_ok=True)
    for uf in ufs_presentes:
        resultado_por_cargo = montar_estado(uf, votacao, cadastro, cassacao)
        caminho_js = Path(args.saida) / f"{uf.lower()}-2022-resultado-provisorio.js"
        caminho_md = Path(args.saida) / f"{uf.lower()}-2022-conferencia.md"
        escrever_js(uf, resultado_por_cargo, caminho_js)
        escrever_conferencia(uf, resultado_por_cargo, caminho_md, Path(caminho_votacao).name)

        print(f"\n{uf}:")
        for cargo in sorted(resultado_por_cargo.keys()):
            grupos = resultado_por_cargo[cargo]
            total_cand = sum(len(g["candidatos"]) for g in grupos)
            total_vagas = sum(g["vagas2022"] for g in grupos)
            print(f"    {titulo(cargo)}: {total_cand} candidatos, {len(grupos)} partidos, {total_vagas} eleitos")
        print(f"    -> {caminho_js}")
        print(f"    -> {caminho_md}")

        if uf == "SC":
            comparar_com_sc_manual(resultado_por_cargo, Path(args.saida).parent / "base-2022.js")

    if args.debug:
        print("\n(--debug ligado, mas este script já loga o mapeamento de colunas por padrão)")


if __name__ == "__main__":
    main()
