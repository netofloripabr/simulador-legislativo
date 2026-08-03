#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preencher_partido_origem.py — adiciona o campo partidoOriginal em cada
candidato REAL de federação (PT/PC do B/PV, PSOL/REDE) já cadastrado em
dados/estados/sc-2026-atas-reais.js.

Por que dá pra automatizar: o número de urna de um candidato SEMPRE começa
com o número oficial do partido dele (fato do TSE, não muda dentro de uma
federação) — 13=PT, 65=PC do B, 43=PV, 50=PSOL, 18=REDE. Conferido contra o
texto das duas atas (documentoAta.pdf (3) e (4)), que listam "partido X" por
pessoa — bate 100% com o prefixo do número em todos os casos.

Roda uma vez só; depois disso partidoOriginal fica gravado no arquivo
estável, igual qualquer outro campo — não precisa rodar de novo a não ser
que uma federação nova entre na base.
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQUIVO = RAIZ / "dados" / "estados" / "sc-2026-atas-reais.js"

PREFIXO_PARTIDO = {
    "13": "PT", "65": "PC do B", "43": "PV",
    "50": "PSOL", "18": "REDE",
}


def partido_origem(numero):
    prefixo = str(numero)[:2]
    return PREFIXO_PARTIDO.get(prefixo)


def main():
    texto = ARQUIVO.read_text(encoding="utf-8")
    padrao = re.compile(
        r'(\{ id:"[^"]+", nome:"[^"]+", nomeUrna:"[^"]*", numero:(\d+), partido:"(?:PT/PC do B/PV|PSOL/REDE)", )'
        r'(genero:)'
    )

    contagem = {"PT": 0, "PC do B": 0, "PV": 0, "PSOL": 0, "REDE": 0, "sem_match": 0}

    def substituir(m):
        prefixo_texto, numero, genero_kw = m.groups()
        origem = partido_origem(numero)
        if not origem:
            contagem["sem_match"] += 1
            return m.group(0)
        contagem[origem] += 1
        return f'{prefixo_texto}partidoOriginal:"{origem}", {genero_kw}'

    novo_texto = padrao.sub(substituir, texto)
    ARQUIVO.write_text(novo_texto, encoding="utf-8")
    print(contagem)


if __name__ == "__main__":
    main()
