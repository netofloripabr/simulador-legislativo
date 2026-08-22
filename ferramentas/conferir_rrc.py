#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
conferir_rrc.py — cruza o provisório de candidatos 2026 (gerado por
tratar_atas.py a partir das Atas de Convenção) contra o Registro de
Candidatura (RRC) oficial do TSE.

O QUE É O RRC E POR QUE CRUZAR CONTRA ELE
------------------------------------------
A Ata de Convenção (ver tratar_atas.py) é o que o PARTIDO anuncia em
julho/agosto — ainda pode mudar até o registro formal na Justiça Eleitoral
(RRC = Registro de Candidatura). O RRC é o dado mais autoritativo que existe
até o resultado da eleição em si: uma vez registrado, o candidato está
formalmente concorrendo com aquele número e partido.

Descoberto em 12/08/2026 (junto com o usuário, inspecionando a tela
"Candidaturas" do mesmo portal onde já líamos as atas): o RRC tem uma API
REST pública, sem autenticação, no mesmo padrão do endpoint de atas
(ver tratar_atas.py e o arquivo .claude/agents/atualizador-atas-2026.md):

    GET https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/{ano}/{uf}/{sqEleicao}/{codCargo}/candidatos

Devolve um objeto com "cargo" e uma lista "candidatos", cada um com
"numero", "nomeCompleto", "nomeUrna", "nomeColigacao" e "partido":{"sigla":...}.
Códigos de cargo (validados em SC, devem valer pra qualquer UF):
  3=Governador  4=Vice-Governador  5=Senador  6=Deputado Federal
  7=Deputado Estadual  9=Senador (1º suplente)  10=Senador (2º suplente)

Achado importante: candidatos a suplente de Senador aparecem no RRC com o
MESMO número da chapa do titular (ex.: Geraldo Wetzel Neto, 1º suplente de
Caroline Rodrigues De Toni, está registrado com número 221 — o mesmo dela).
Isso é dado que a ata muitas vezes NÃO informa (o anexo estruturado da ata
deixa `numero:null` pra suplente) — então o RRC é estritamente melhor pra
essa informação específica, quando já existe.

Cobertura no dia em que foi descoberto (12/08/2026, SC): o RRC ainda está
BEM atrás da ata pra Deputado Estadual/Federal (~340/417 e ~191/230 —
resto ainda não se registrou formalmente) e MUITO atrás pra cargos
majoritários (Governador: 3 no RRC contra ~10 na ata — a maioria dos
partidos menores ainda não fechou coligação/registro). Isso é esperado até
o fim do prazo de registro (~final de agosto/2026) — não é bug nem motivo
pra achar que a ata está errada quando o RRC ainda não tem o candidato.

O QUE ESTE SCRIPT FAZ (e o que NUNCA faz)
------------------------------------------
1. Busca o RRC de todos os cargos pra uma UF.
2. Cruza contra dados/estados/{uf}-2026-provisorio.js por NÚMERO dentro do
   mesmo cargo (retificadora de número, como Marcos Vinícius Sodré em
   12/08/2026, é exatamente o tipo de coisa que isso pega).
3. Reporta em dados/estados/{uf}-2026-rrc-conferencia.md:
   - partido bate (confirmação) — só contagem, não lista um por um;
   - partido NÃO bate — lista candidato a candidato, é sempre acionável;
   - candidato no RRC que não existe em NENHUM cargo do nosso provisório
     por número — pode ser candidato que a ata não pegou, listar pra
     revisão humana;
   - números de suplente que o RRC tem e nosso arquivo está com null —
     listar como sugestão de preenchimento, não preencher sozinho.
4. NUNCA escreve em sc-2026-provisorio.js. Esse arquivo continua sendo
   gerado só por tratar_atas.py + revisão humana documentada em
   sc-2026-conferencia.md — este script é só mais uma fonte de conferência,
   no mesmo espírito (não promove nada a "fato" sozinho).

A tabela FEDERACOES_2026 abaixo é uma cópia da de
dados/estados/registro-2026.js (precisa ficar em sincronia manualmente —
são poucas linhas, não vale a complexidade de ler o .js de dentro do
Python só por isso).

Uso:
    python3 conferir_rrc.py --uf SC --provisorio dados/estados/sc-2026-provisorio.js --saida dados/estados
"""

import argparse
import json
import re
import urllib.request
import unicodedata
from pathlib import Path
from datetime import date

SQ_ELEICAO = 20322002026
ANO = 2026

CARGO_RRC_PARA_LABEL = {
    3: "Governador",
    4: "Vice-Governador",
    5: "Senador",
    6: "Deputado Federal",
    7: "Deputado Estadual",
    9: "Senador (1º suplente)",
    10: "Senador (2º suplente)",
}

# Mesma tabela de dados/estados/registro-2026.js (FEDERACOES_2026.NACIONAL)
# — manter em sincronia manualmente se aquele arquivo mudar.
FEDERACOES_2026 = {
    "PT": "PT/PC do B/PV", "PC do B": "PT/PC do B/PV", "PCDOB": "PT/PC do B/PV", "PV": "PT/PC do B/PV",
    "PSOL": "PSOL/REDE", "REDE": "PSOL/REDE",
    "UNIÃO": "UNIÃO/PP", "UNIAO": "UNIÃO/PP", "PP": "UNIÃO/PP",
    "PSDB": "PSDB/CIDADANIA", "CIDADANIA": "PSDB/CIDADANIA",
    "PRD": "PRD/SOLIDARIEDADE", "SOLIDARIEDADE": "PRD/SOLIDARIEDADE",
}


def normaliza_partido(sigla):
    """Aplica a mesma normalização de federação que registro-2026.js aplica
    em tempo de leitura — pra comparar o `partido` do nosso arquivo (que já
    usa nome de federação) contra o `partido.sigla` cru do RRC."""
    if not sigla:
        return sigla
    return FEDERACOES_2026.get(sigla.upper(), sigla)


CACHE_DIR = None  # setado por --cache; ver main()


def buscar_rrc(uf, cargo_codigo):
    # --cache DIR: lê {cargo_codigo}.json salvo previamente (lista já no
    # formato de saída desta função). Necessário desde 21/08/2026: o Akamai
    # do TSE passou a devolver 403 pra clientes fora de navegador — os
    # arquivos de cache são gerados navegando a API num navegador real
    # (fetch same-origin na aba do divulgacandcontas) e salvando o JSON.
    if CACHE_DIR:
        arq = Path(CACHE_DIR) / f"{cargo_codigo}.json"
        return json.loads(arq.read_text(encoding="utf-8"))
    url = (f"https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/"
           f"listar/{ANO}/{uf.upper()}/{SQ_ELEICAO}/{cargo_codigo}/candidatos")
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.load(resp)
    candidatos = []
    for c in data.get("candidatos") or []:
        candidatos.append({
            "numero": c.get("numero"),
            "nome": c.get("nomeCompleto") or "",
            "coligacao": c.get("nomeColigacao"),
            "partido": (c.get("partido") or {}).get("sigla"),
            "situacao": c.get("descricaoSituacao"),
        })
    return candidatos


ENTRY_RE = re.compile(
    r'\{ id:"(?P<id>[^"]*)", nome:"(?P<nome>[^"]*)", nomeUrna:"(?P<nomeUrna>[^"]*)", '
    r'numero:(?P<numero>\d+|null), partido:(?P<partido>null|"[^"]*"), '
    r'genero:"(?P<genero>[^"]*)", coligado:(?P<coligado>true|false), '
    # fonte:"rrc" é opcional — entradas cadastradas direto do RRC (política
    # de 18/08/2026) carregam esse campo extra; sem o grupo opcional, o
    # regex não as enxergava e elas apareciam pra sempre como "no RRC sem
    # entrada correspondente" (falso positivo achado em 21/08/2026).
    # fonteArquivo aceita aspas ESCAPADAS no valor (\") — as entradas de
    # RRC citam a coligação entre aspas dentro do texto (ex.: Chiodini e
    # Lunelli) e o [^"]* antigo parava na primeira, invisibilizando-as.
    # status:"desistencia"/"sub-judice" também é opcional (política 21/08 —
    # candidato congelado FICA no elenco; sem o grupo, ele sumia do parse e
    # voltava como falso "sem entrada", achado na revisão de 22/08).
    r'confianca:"(?P<confianca>[^"]*)", (?:status:"(?P<status>[^"]*)", )?(?:fonte:"(?P<fonte>[^"]*)", )?fonteArquivo:"(?P<fonteArquivo>(?:[^"\\]|\\.)*)" \}'
)
CARGO_BLOCK_RE = re.compile(r'"([^"]+)":\s*\[(.*?)\n  \]', re.DOTALL)


def parse_provisorio(caminho):
    conteudo = Path(caminho).read_text(encoding="utf-8")
    por_cargo = {}
    for cargo, bloco in CARGO_BLOCK_RE.findall(conteudo):
        entradas = []
        for m in ENTRY_RE.finditer(bloco):
            d = m.groupdict()
            entradas.append({
                "id": d["id"],
                "nome": d["nome"],
                "numero": None if d["numero"] == "null" else int(d["numero"]),
                "partido": None if d["partido"] == "null" else d["partido"].strip('"'),
                "confianca": d["confianca"],
                "fonteArquivo": d["fonteArquivo"],
            })
        por_cargo[cargo] = entradas
    return por_cargo


def cruzar(nosso_por_cargo, uf):
    resultado = {}
    for cargo_codigo, cargo_label in CARGO_RRC_PARA_LABEL.items():
        rrc = buscar_rrc(uf, cargo_codigo)
        rrc_por_numero = {}
        for c in rrc:
            rrc_por_numero.setdefault(c["numero"], []).append(c)

        nossos = nosso_por_cargo.get(cargo_label, [])
        nossos_numeros = {c["numero"] for c in nossos if c["numero"] is not None}

        confirmados = 0
        divergencias = []
        rrc_so_no_rrc = []
        sugestao_numero_suplente = []

        for c in nossos:
            if c["numero"] is None:
                continue
            candidatos_rrc = rrc_por_numero.get(c["numero"])
            if not candidatos_rrc:
                continue
            rrc_c = candidatos_rrc[0]
            partido_nosso = c["partido"]
            partido_rrc_normalizado = normaliza_partido(rrc_c["partido"])
            if partido_nosso and partido_rrc_normalizado and partido_nosso != partido_rrc_normalizado:
                divergencias.append({
                    "numero": c["numero"], "nome": c["nome"],
                    "nosso_partido": partido_nosso, "rrc_partido": rrc_c["partido"],
                    "rrc_nome": rrc_c["nome"], "fonteArquivo": c["fonteArquivo"],
                })
            else:
                confirmados += 1

        # Nosso arquivo às vezes tem numero:null pra candidato que a ata não
        # deu número individual (vice, suplente) mas que JÁ existe no nosso
        # arquivo — casar por nome primeiro, senão ele conta como "só no
        # RRC" por engano (falso positivo: ele não está faltando, só está
        # sem número). Vale pra qualquer cargo, não só suplente de Senador.
        nomes_nossos_sem_numero = {
            _normaliza_nome(c["nome"]): c for c in nossos if c["numero"] is None
        }
        numeros_casados_por_nome = set()
        for rrc_c in rrc:
            nome_norm = _normaliza_nome(rrc_c["nome"])
            c = nomes_nossos_sem_numero.get(nome_norm)
            if c is None:
                continue
            sugestao_numero_suplente.append({
                "nome": c["nome"], "numero_rrc": rrc_c["numero"],
                "fonteArquivo": c["fonteArquivo"],
            })
            numeros_casados_por_nome.add(rrc_c["numero"])

        for numero, candidatos_rrc in rrc_por_numero.items():
            if numero is None or numero in nossos_numeros or numero in numeros_casados_por_nome:
                continue
            for rrc_c in candidatos_rrc:
                rrc_so_no_rrc.append(rrc_c)

        resultado[cargo_label] = {
            "total_rrc": len(rrc),
            "total_nosso": len(nossos),
            "confirmados": confirmados,
            "divergencias": divergencias,
            "rrc_so_no_rrc": rrc_so_no_rrc,
            "sugestao_numero_suplente": sugestao_numero_suplente,
        }
    return resultado


def _normaliza_nome(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.lower().strip()


def escrever_relatorio(resultado, uf, saida_dir):
    hoje = date.today().isoformat()
    linhas = [
        f"# Conferência contra o RRC oficial — candidatos 2026 {uf}",
        "",
        f"Gerado em {hoje} por `ferramentas/conferir_rrc.py`. Cruza "
        f"`{uf.lower()}-2026-provisorio.js` (baseado em Atas de Convenção) contra o "
        "Registro de Candidatura (RRC) oficial do TSE, por número dentro do mesmo cargo.",
        "",
        "**RRC é mais autoritativo que ata — mas cobertura é parcial até o fim do "
        "prazo de registro (~agosto/2026).** Candidato nosso que ainda não aparece "
        "no RRC não é erro, é normal (ainda não se registrou formalmente).",
        "",
        "**Este relatório não escreve em `*-provisorio.js` sozinho** — mesmo "
        "princípio de `*-conferencia.md`: divergência aqui é para revisão humana.",
        "",
    ]

    total_confirmados = sum(r["confirmados"] for r in resultado.values())
    total_divergencias = sum(len(r["divergencias"]) for r in resultado.values())
    total_so_rrc = sum(len(r["rrc_so_no_rrc"]) for r in resultado.values())
    linhas.append(f"Resumo: **{total_confirmados}** confirmados, "
                   f"**{total_divergencias}** divergência(s) de partido, "
                   f"**{total_so_rrc}** candidato(s) no RRC sem entrada correspondente no nosso arquivo.")
    linhas.append("")

    linhas.append("## Cobertura por cargo")
    linhas.append("")
    linhas.append("| Cargo | No RRC | No nosso arquivo | Confirmados (número+partido batem) |")
    linhas.append("|---|---|---|---|")
    for cargo, r in resultado.items():
        linhas.append(f"| {cargo} | {r['total_rrc']} | {r['total_nosso']} | {r['confirmados']} |")
    linhas.append("")

    if total_divergencias:
        linhas.append("## Divergências de partido (revisar — RRC é mais autoritativo)")
        linhas.append("")
        linhas.append("| Cargo | Nome (nosso) | Número | Nosso partido | Partido no RRC | Nome no RRC |")
        linhas.append("|---|---|---|---|---|---|")
        for cargo, r in resultado.items():
            for d in r["divergencias"]:
                linhas.append(f"| {cargo} | {d['nome']} | {d['numero']} | {d['nosso_partido']} | "
                               f"{d['rrc_partido']} | {d['rrc_nome']} |")
        linhas.append("")
    else:
        linhas.append("## Divergências de partido")
        linhas.append("")
        linhas.append("Nenhuma — todo número que bate entre os dois arquivos também bate o partido.")
        linhas.append("")

    algum_so_rrc = any(r["rrc_so_no_rrc"] for r in resultado.values())
    if algum_so_rrc:
        linhas.append("## Candidatos no RRC sem entrada correspondente no nosso arquivo")
        linhas.append("")
        linhas.append("Registrado oficialmente mas não achado por número em nenhuma ata "
                       "processada — pode ser candidato que a ata não cobriu, ou número "
                       "novo por retificadora que ainda não baixamos. Revisar manualmente "
                       "antes de adicionar (ver `ferramentas/tratar_atas.py`).")
        linhas.append("")
        linhas.append("| Cargo | Número | Nome (RRC) | Coligação/Partido |")
        linhas.append("|---|---|---|---|")
        for cargo, r in resultado.items():
            for c in r["rrc_so_no_rrc"]:
                linhas.append(f"| {cargo} | {c['numero']} | {c['nome']} | "
                               f"{c['coligacao'] or c['partido'] or '?'} |")
        linhas.append("")

    algum_sugestao = any(r["sugestao_numero_suplente"] for r in resultado.values())
    if algum_sugestao:
        linhas.append("## Sugestão de número (nosso arquivo tem `numero:null`, casado por nome com o RRC)")
        linhas.append("")
        linhas.append("Ata não deu número individual (comum em vice/suplente, cujo número no "
                       "anexo é o da chapa do titular); RRC já tem o registro. Conferir e "
                       "preencher manualmente se fizer sentido — não é preenchido sozinho.")
        linhas.append("")
        linhas.append("| Cargo | Nome | Número no RRC | Nossa fonte |")
        linhas.append("|---|---|---|---|")
        for cargo, r in resultado.items():
            for s in r["sugestao_numero_suplente"]:
                linhas.append(f"| {cargo} | {s['nome']} | {s['numero_rrc']} | {s['fonteArquivo']} |")
        linhas.append("")

    caminho = Path(saida_dir) / f"{uf.lower()}-2026-rrc-conferencia.md"
    caminho.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    return caminho


def main():
    parser = argparse.ArgumentParser(description="Cruza o provisório de candidatos 2026 contra o RRC oficial do TSE.")
    parser.add_argument("--uf", default="SC")
    parser.add_argument("--cache", help="diretório com {cargo}.json pré-baixados (contorna o 403 do TSE)")
    parser.add_argument("--provisorio", default=None, help="Caminho do *-2026-provisorio.js (default: dados/estados/{uf}-2026-provisorio.js)")
    parser.add_argument("--saida", default="dados/estados")
    args = parser.parse_args()

    caminho_provisorio = args.provisorio or f"{args.saida}/{args.uf.lower()}-2026-provisorio.js"

    print(f"[1/3] Lendo {caminho_provisorio} ...")
    nosso_por_cargo = parse_provisorio(caminho_provisorio)
    total_nosso = sum(len(v) for v in nosso_por_cargo.values())
    print(f"      {total_nosso} candidatura(s) no nosso arquivo.")

    print(f"[2/3] Buscando RRC oficial do TSE para {args.uf} (7 cargos) ...")
    global CACHE_DIR
    if args.cache:
        CACHE_DIR = args.cache
    resultado = cruzar(nosso_por_cargo, args.uf)
    total_rrc = sum(r["total_rrc"] for r in resultado.values())
    total_confirmados = sum(r["confirmados"] for r in resultado.values())
    total_div = sum(len(r["divergencias"]) for r in resultado.values())
    print(f"      {total_rrc} candidatura(s) no RRC; {total_confirmados} confirmada(s), {total_div} divergência(s).")

    print(f"[3/3] Escrevendo relatório em {args.saida} ...")
    caminho_md = escrever_relatorio(resultado, args.uf, args.saida)
    print(f"      Escrito: {caminho_md}")


if __name__ == "__main__":
    main()
