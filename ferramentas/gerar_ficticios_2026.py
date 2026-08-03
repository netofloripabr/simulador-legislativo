#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gerar_ficticios_2026.py — preenche candidatos 2026 FICTÍCIOS pros
estados/cargos que ainda não têm nenhuma ata de convenção real processada
(ver ferramentas/tratar_atas.py, hoje só cobre parte dos partidos de SC).

IMPORTANTE: nada aqui é candidato real. Todo registro sai com
fonte:"ficticio" e confianca:"ficticia", pensado pra ser trocado partido a
partido conforme as atas de verdade forem saindo (mesmo espírito de
dados/correcoes-nomes.md — nunca virar "fato" sem confirmação).

Fonte do dado REAL de SC: dados/estados/sc-2026-atas-reais.js — um arquivo
ESTÁVEL, que este script só LÊ, nunca escreve. Rodar este script várias
vezes seguidas sempre parte do mesmo dado real, sem risco de reler sua
própria saída de uma rodada anterior (o bug que gerou a primeira versão
com fictício "promovido" a real por engano).

Usa o partido/vagas2022 de cada estado a partir do resultado real de 2022
(dados/estados/{uf}-2022-resultado-provisorio.js) só como referência de
"quais partidos existem nesse estado" e "proporção de candidatos" — não
reaproveita nenhum nome de candidato real de 2022 no fictício de 2026.

Saída: dados/estados/{uf}-2026-provisorio.js, um por UF (SC incluso, já
mesclado real+fictício + as seções que não são cargo modelado hoje —
Governador/Vice-Governador/suplência de Senador — preservadas como estão).
"""

import json
import random
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_ESTADOS = RAIZ / "dados" / "estados"

CARGOS = ["Deputado Estadual", "Deputado Federal", "Senador"]
SECOES_EXTRAS_SC = ["Governador", "Senador (1º suplente)", "Senador (2º suplente)", "Vice-Governador"]

# Federações registradas no TSE (valem pra eleição inteira, em qualquer
# estado — não é coisa específica de SC), fonte:
# https://www.tse.jus.br/partidos/federacoes-registradas-no-tse. Sem esse
# mapa, a comparação de nome batia "PT" (rótulo de 2022) contra
# "PT/PC do B/PV" (rótulo real de 2026) e achava que o partido não tinha
# NENHUM real, gerando fictício com o nome velho por cima de quem já é real
# pela federação nova (virava um "partido" duplicado e fantasma na tela).
FEDERACOES_2026_NACIONAL = {
    "PT": "PT/PC do B/PV", "PC do B": "PT/PC do B/PV", "PV": "PT/PC do B/PV",
    "PSOL": "PSOL/REDE", "REDE": "PSOL/REDE",
    "UNIÃO": "UNIÃO/PP", "PP": "UNIÃO/PP",
    "PSDB": "PSDB/CIDADANIA", "CIDADANIA": "PSDB/CIDADANIA",
    "PRD": "PRD/SOLIDARIEDADE", "SOLIDARIEDADE": "PRD/SOLIDARIEDADE",
}
FEDERACOES_2026 = {
    # Exceções por estado, se algum dia precisar (nenhuma até agora).
}


def nome_2026(uf, partido2022):
    return FEDERACOES_2026.get(uf, {}).get(partido2022) or FEDERACOES_2026_NACIONAL.get(partido2022, partido2022)

NOMES = ["Ana","Carlos","Fernanda","João","Juliana","Marcos","Patrícia","Rafael","Sandra","Tiago",
         "Camila","Diego","Elaine","Gustavo","Larissa","Rodrigo","Simone","Vinícius","Bruna","Eduardo",
         "Beatriz","Felipe","Renata","André","Cristina"]
MEIOS = ["da Silva","dos Santos","de Souza","Pereira","Costa","Ferreira","Rodrigues","Almeida",
         "Nascimento","de Carvalho","Gomes","Martins","de Araújo","Barbosa","Ribeiro","Cardoso",
         "Teixeira","Correia","Dias","Moreira","Lima","Rocha","Barros","Freitas","Machado"]
SOBRENOMES = ["Junior","Neto","Filho","Sobrinho","Vieira","Castro","Monteiro","Azevedo","Nunes",
              "Pinto","Cavalcante","Brito","Cunha","Reis","Farias","Melo","Amaral","Fonseca",
              "Guimarães","Peixoto","Sales","Andrade","Siqueira","Bezerra","Xavier"]


def slugify(texto):
    nfkd = unicodedata.normalize("NFKD", texto or "")
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")


def js_valor(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return json.dumps(v, ensure_ascii=False)


def ler_partidos_2022(uf):
    """Lê dados/estados/{uf}-2022-resultado-provisorio.js e extrai, por
    cargo, a lista de partidos + vagas2022 — só usado como referência de
    quais partidos existem nesse estado e o tamanho relativo de cada um.
    Mesmo arquivo multi-cargo pra todo mundo, SC incluso."""
    caminho = DIR_ESTADOS / f"{uf.lower()}-2022-resultado-provisorio.js"
    texto = caminho.read_text(encoding="utf-8")
    partidos_por_cargo = {}
    for cargo in CARGOS:
        bloco_match = re.search(rf'"{cargo}": \[(.*?)\n  \],', texto, re.S)
        if not bloco_match:
            partidos_por_cargo[cargo] = []
            continue
        bloco = bloco_match.group(1)
        pares = re.findall(r'nome:"([^"]+)", vagas2022:(\d+)', bloco)
        partidos_por_cargo[cargo] = [(nome, int(vagas)) for nome, vagas in pares]
    return partidos_por_cargo


def ler_reais_sc_2026():
    """Lê dados/estados/sc-2026-atas-reais.js (fonte estável, nunca escrita
    por este script). Retorna: candidatos reais por cargo (texto JS pronto),
    partidos já cobertos por cargo (não recebem fictício), e o texto bruto
    das seções extras (Governador etc) pra colar direto na saída."""
    caminho = RAIZ / "dados" / "estados" / "sc-2026-atas-reais.js"
    if not caminho.exists():
        return {}, {}, ""
    texto = caminho.read_text(encoding="utf-8")

    reais_por_cargo = {}
    partidos_cobertos = {}
    for cargo in CARGOS:
        bloco_match = re.search(rf'"{cargo}": \[(.*?)\n  \],', texto, re.S)
        if not bloco_match:
            reais_por_cargo[cargo] = []
            partidos_cobertos[cargo] = set()
            continue
        bloco = bloco_match.group(1)
        linhas = re.findall(r"\{[^}]+\}", bloco)
        partidos = set()
        for linha in linhas:
            partido_m = re.search(r'partido:"([^"]+)"', linha)
            if partido_m:
                partidos.add(partido_m.group(1))
        reais_por_cargo[cargo] = linhas
        partidos_cobertos[cargo] = partidos

    partes_extras = []
    for secao in SECOES_EXTRAS_SC:
        m = re.search(rf'"{re.escape(secao)}": \[(.*?)\n  \],', texto, re.S)
        if m:
            partes_extras.append(f'  "{secao}": [{m.group(1)}\n  ],')
    texto_extras = "\n".join(partes_extras)

    return reais_por_cargo, partidos_cobertos, texto_extras


def gerar_nome_unico(usados):
    for _ in range(200):
        nome = f"{random.choice(NOMES)} {random.choice(MEIOS)} {random.choice(SOBRENOMES)}"
        if nome not in usados:
            usados.add(nome)
            return nome
    return f"{random.choice(NOMES)} {random.choice(MEIOS)} {random.choice(SOBRENOMES)}"


# Teto LEGAL de registro de candidatura (Lei das Eleições, 9.504/1997, art.
# 10, com a redação da EC 97/2017 — fim das coligações proporcionais a
# partir de 2020, substituídas por federações partidárias): um partido pode
# registrar até 150% do número de vagas em disputa naquele cargo; uma
# federação (que concorre como se fosse um partido só), até 200%. Fonte:
# https://www.tse.jus.br/institucional/escola-judiciaria-eleitoral/publicacoes/revistas-da-eje/artigos/registro-de-candidatura
# Pra Dep. Estadual de SC (40 vagas): até 60 candidatos por partido sozinho,
# até 80 por federação.
#
# A heurística abaixo NÃO usa esse teto como base — ela estima quantos
# candidatos cada partido lançaria com base no que ele mesmo elegeu em 2022
# (não no total de vagas do cargo), o que dá números bem mais conservadores
# (teto próprio de 30). Isso não fere a lei (fica sempre abaixo do teto
# legal), só não usa o teto como referência de quantidade. Se um dia
# precisar gerar listas mais completas (mais perto do máximo permitido),
# comparar o resultado de qtd_candidatos_ficticios(vagas2022) com
# TETO_CANDIDATOS_PCT abaixo pra não ultrapassar o limite de verdade.
TETO_CANDIDATOS_PCT = {"solo": 1.5, "federacao": 2.0}


def qtd_candidatos_ficticios(vagas2022):
    # heurística simples: partido sem vaga em 2022 ainda lança 3 candidatos
    # fictícios (todo partido registrado lança alguém); partido com vaga
    # lança ~2,5x o que já elegeu, com teto de 30 pra não gerar lista
    # gigante demais num partido único.
    if vagas2022 <= 0:
        return 3
    return max(3, min(30, round(vagas2022 * 2.5)))


def gerar_candidato_ficticio(partido, uf, indice, usados_nomes, partido_original=None):
    nome = gerar_nome_unico(usados_nomes)
    primeiro_nome = nome.split(" ")[0]
    numero_base = (abs(hash(partido)) % 90 + 10)  # só decorativo, não é o número real do partido
    candidato = {
        "id": f"{slugify(partido)}-{uf.lower()}-ficticio-{indice}",
        "nome": nome,
        "nomeUrna": f"{primeiro_nome} {nome.split(' ')[-1]}",
        "numero": numero_base * 100 + indice,
        "partido": partido,
        "genero": random.choice(["MASCULINO", "FEMININO"]),
        "coligado": False,
        "confianca": "ficticia",
        "fonte": "ficticio",
    }
    # Quando "partido" é uma federação (ex.: "PT/PC do B/PV"), o fictício
    # precisa saber de qual partido membro ele é de fato (partido_original) —
    # a contagem/ranking de vagas é da federação inteira, mas o hemiciclo e a
    # legenda contam assento por partido de verdade (ver
    # dados/estados/registro-2026.js, candidatos2026EstadoCargo).
    if partido_original and partido_original != partido:
        candidato["partidoOriginal"] = partido_original
    return candidato


def montar_cargo(uf, cargo, partidos_2022, reais_candidatos):
    saida = list(reais_candidatos)  # já são strings JS prontas, mantém como estão
    # Quantos reais já existem por partido (nome de 2026, ver FEDERACOES_2026)
    # — usado pra COMPLETAR a quantidade fictícia que falta, não pular o
    # partido inteiro só porque uma fração dele já é real (ex.: um deputado
    # confirmou reeleição, mas o resto da chapa ainda é fictício).
    reais_por_partido = {}
    for c_str in reais_candidatos:
        m = re.search(r'partido:"([^"]+)"', c_str)
        if m:
            reais_por_partido[m.group(1)] = reais_por_partido.get(m.group(1), 0) + 1
    usados_nomes = set()
    idx_global = 1
    total_vagas_cargo = sum(v for _, v in partidos_2022)
    for partido2022, vagas in partidos_2022:
        partido26 = nome_2026(uf, partido2022)
        ja_reais = reais_por_partido.get(partido26, 0)
        alvo = qtd_candidatos_ficticios(vagas)
        n = max(0, alvo - ja_reais)
        # Sanidade contra o teto legal (ver TETO_CANDIDATOS_PCT acima) — só
        # avisa, não trava a geração: a heurística de hoje é conservadora
        # o bastante pra nunca bater nisso, mas se o alvo mudar no futuro
        # (ex.: listas mais completas) é bom saber na hora.
        eh_federacao = partido26 != partido2022
        teto = total_vagas_cargo * TETO_CANDIDATOS_PCT["federacao" if eh_federacao else "solo"]
        if ja_reais + n > teto:
            print(f"  [AVISO] {uf}/{partido26}: {ja_reais + n} candidatos gerados > teto legal de {int(teto)} ({'federação' if eh_federacao else 'partido solo'}, {total_vagas_cargo} vagas no cargo).")
        for _ in range(n):
            c = gerar_candidato_ficticio(partido26, uf, idx_global, usados_nomes, partido_original=partido2022)
            campos = ", ".join(f"{k}:{js_valor(v)}" for k, v in c.items())
            saida.append("{ " + campos + " }")
            idx_global += 1
    return saida


def main():
    random.seed(42)  # reprodutível — mesmo resultado se rodar de novo
    reais_sc, partidos_reais_sc, extras_sc_texto = ler_reais_sc_2026()

    ufs = sorted(p.name.split("-")[0].upper() for p in DIR_ESTADOS.glob("*-2022-resultado-provisorio.js"))
    ufs = ["SC"] + [u for u in ufs if u != "SC"]

    resumo = []
    for uf in ufs:
        partidos_por_cargo = ler_partidos_2022(uf)
        linhas = [
            f"// Candidatos 2026 ({uf}) — PROVISÓRIO. Mistura candidatos REAIS extraídos",
            "// de ata de convenção (quando existem, confianca:\"alta\"/\"media\") com",
            "// candidatos FICTÍCIOS gerados automaticamente (fonte:\"ficticio\") pros",
            "// partidos que ainda não têm nenhuma ata processada nesse cargo — ver",
            "// ferramentas/gerar_ficticios_2026.py. NENHUM candidato fictício é uma",
            "// pessoa real. Troque cada partido pelo real assim que a ata sair, um de",
            "// cada vez (mesma regra de dados/correcoes-nomes.md: nada vira \"fato\"",
            "// sem confirmação humana).",
            # "var" (não "const") de propósito: dados/estados/registro-2026.js
            # busca esse global dinamicamente por window["CANDIDATOS_2026_" +
            # uf + "_PROVISORIO"] — "const"/"let" no escopo global NÃO vira
            # propriedade de window, só "var" (ou function) vira.
            f"var CANDIDATOS_2026_{uf}_PROVISORIO = {{",
        ]
        total_real = 0
        total_ficticio = 0
        for cargo in CARGOS:
            reais = reais_sc.get(cargo, []) if uf == "SC" else []
            candidatos_cargo = montar_cargo(uf, cargo, partidos_por_cargo.get(cargo, []), reais)
            total_real += len(reais)
            total_ficticio += len(candidatos_cargo) - len(reais)
            linhas.append(f'  "{cargo}": [')
            for c_str in candidatos_cargo:
                linhas.append(f"    {c_str},")
            linhas.append("  ],")
        if uf == "SC" and extras_sc_texto:
            linhas.append(extras_sc_texto)
        linhas.append("};")
        caminho_saida = DIR_ESTADOS / f"{uf.lower()}-2026-provisorio.js"
        caminho_saida.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        resumo.append((uf, total_real, total_ficticio))
        print(f"{uf}: {total_real} reais + {total_ficticio} fictícios -> {caminho_saida.name}")

    print(f"\nTotal: {sum(r for _,r,_ in resumo)} reais, {sum(f for _,_,f in resumo)} fictícios, {len(resumo)} estados.")


if __name__ == "__main__":
    main()
