#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tratar_atas.py — rotina de tratamento das Atas de Convenção Partidária (TSE)

O QUE ISTO É
------------
As "atas" baixadas de https://divulgacandcontas.tse.jus.br/divulga/#/ata para
as Eleições 2026 NÃO são atas de apuração de votos (isso só existe depois da
eleição, em outubro/2026). São as ATAS DE CONVENÇÃO PARTIDÁRIA — o documento
em que cada partido/federação registra, em julho/2026, quem serão seus
candidatos ao pleito de outubro/2026 (Governador, Vice, Senador + suplentes,
Deputado Federal, Deputado Estadual). É exatamente o dado que falta para
popular `dados/estados/sc.js` (ver PROJETO.md, Fase 2.6 e pendência da Fase 2.8).

IMPORTANTE — por que isto é "provisório", não "oficial":
A candidatura só vira fato definitivo depois do registro (RRC) na Justiça
Eleitoral e do julgamento de eventuais impugnações (prazo tipicamente até
~agosto/2026). Por isso este script NUNCA escreve em `dados/base-2022.js` nem
em `dados/candidatos-extra-2022.js` — só gera um arquivo novo e separado,
marcado como provisório, para revisão humana antes de virar "fato" no projeto
(mesmo princípio de `dados/correcoes-nomes.md`).

FONTE DO DADO DENTRO DO PDF:
Cada ata termina com um anexo estruturado ("Lista de candidatos"), um
formulário oficial por candidato — não é a prosa da ata em si, que varia de
partido pra partido. O anexo é o mesmo layout em todas as atas testadas:

    Candidato(s) ao cargo de <CARGO> concorrerá <isolado|coligado>
     N - NOME COMPLETO
     Nome
     NOME_URNA                    NÚMERO (ou "-")          GÊNERO
     Nome para Urna                Número                   Gênero
     ...CPF (não extraído — não é necessário pro projeto e evitamos
        guardar dado sensível que não será usado)...

Esse anexo é a fonte primária (confiança "alta"). Quando o candidato concorre
"coligado" (Senador, em geral), o anexo não informa o partido individual —
nesse caso cruzamos com o texto corrido da ata (que cita "partido X" por
nome) pra tentar completar; se não achar, fica null e entra na lista de
pendências (nunca inventamos o partido).

Não capturamos CPF nem título de eleitor no arquivo de saída — são dados
mais sensíveis que o necessário para o simulador (que só usa nome, nome de
urna, número, partido, cargo).

TRÊS ROTINAS, UM SCRIPT
------------------------
1. tratar()    — lê todos os PDFs de um diretório de atas, extrai candidaturas
                 do anexo estruturado de cada uma, com a linha-fonte guardada
                 para auditoria.
2. verificar() — roda sobre o resultado de tratar(): detecta duplicidade
                 (mesma ordem/cargo em ata e retificadora — fica a versão mais
                 nova), números repetidos dentro do mesmo partido, partidos
                 fora da lista conhecida (dados/partidos-brasil.js), e reúne
                 tudo que não foi extraído com confiança total numa lista de
                 pendências para revisão manual.
3. alimentar() — escreve o resultado consolidado em
                 dados/estados/sc-2026-provisorio.js (novo arquivo, não mexe
                 nos existentes) + um relatório em Markdown com o que precisa
                 de revisão humana, no mesmo espírito de correcoes-nomes.md.

Uso:
    python3 tratar_atas.py --atas-dir ATAS/SC --saida dados/estados --uf SC

Reexecutável: pode rodar de novo sempre que novas atas forem depositadas
(inclusive retificadoras) — não duplica, não sobrescreve dado confirmado.
"""

import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from datetime import date

# Investigado em 03/08/2026 (rodada nacional, 26 UFs): é NORMAL um partido
# ter candidato real só em "Deputado Federal" e nenhum em "Deputado
# Estadual" pra mesma ata/UF — não é bug de classificação daqui. Ex.: a ata
# do DC/SC diz explicitamente "o partido deliberado por não lançar
# candidaturas ao cargo de Deputado(a) Estadual neste pleito"; a do
# MISSÃO (recorrente em vários estados) simplesmente não tem seção de
# Deputado Estadual no documento. Antes de "corrigir" esse padrão de novo,
# ler o texto puro (pdftotext -layout) da ata em questão pra confirmar se é
# isso ou se é de fato um caso novo de má classificação.
CARGO_NORMALIZADO = {
    "governador": "Governador",
    "vice-governador": "Vice-Governador",
    "vice governador": "Vice-Governador",
    "senador": "Senador",
    "1º suplente": "Senador (1º suplente)",
    "2º suplente": "Senador (2º suplente)",
    "1o suplente": "Senador (1º suplente)",
    "2o suplente": "Senador (2º suplente)",
    "deputado federal": "Deputado Federal",
    "deputada federal": "Deputado Federal",
    "deputado estadual": "Deputado Estadual",
    "deputada estadual": "Deputado Estadual",
    "deputado distrital": "Deputado Estadual",
}

RE_HASH_RODAPE = re.compile(r"^\s*Hash:.*P[áa]gina\s+\d+\s+de\s+\d+", re.IGNORECASE)
RE_CABECALHO_CARGO = re.compile(
    r"Candidato\(s\)\s+ao\s+cargo\s+de\s+(.+?)\s+concorrer[áa]\s+(isolado|coligado)",
    re.IGNORECASE
)
RE_LINHA_ORDEM_NOME = re.compile(r"^\s*(\d+)\s*-\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿ'ÇÃÕÁÉÍÓÚÂÊÔ \.]+)\s*$")
RE_LINHA_URNA_NUMERO_GENERO = re.compile(
    r"^\s*(.+?)\s{2,}(\d[\d\.]*|-)\s{2,}(Masculino|Feminino)\s*$", re.IGNORECASE
)


def limpar_nome_urna(texto):
    """Tira caractere solto de formulário (checkbox/marcador do PDF) que às
    vezes gruda no início do "Nome para Urna" na extração de texto — achado
    em 03/08/2026 na rodada nacional (ex.: "]MARLEIDE CUNHA" em RN,
    ": RODRIGO FISCAL DO POVO" em RS — o "]"/":" está no PDF de origem, não
    é erro do regex). Preserva nome de urna que legitimamente começa com
    "#" (estilo hashtag/slogan, permitido pelo TSE — ex.: "#tô com Lora",
    candidata real em BA)."""
    texto = texto.strip()
    while texto and not (texto[0].isalnum() or texto[0] == "#"):
        texto = texto[1:].lstrip()
    return texto

# padrão auxiliar (texto corrido) só pra recuperar o partido de candidatos
# "coligado" que o anexo estruturado não informa
PADRAO_PARTIDO_POR_NOME = re.compile(
    r"([A-ZÀ-Ÿ][A-ZÀ-Ÿ' \.]{4,80}?)[,;]?\s*(?:\([^)]+\)|nome de urna\s+[A-ZÀ-Ÿ' \.]+)?[,;]?\s*"
    r"n[úu]mero\s*\d+[,;]?\s*g[êe]nero\s+\w+[,;]?\s*partido\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ/\- ]{1,40})",
    re.IGNORECASE
)


def slugify(texto):
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    sem_acento = sem_acento.lower()
    sem_acento = re.sub(r"[^a-z0-9]+", "-", sem_acento).strip("-")
    return sem_acento


def pdf_para_texto(caminho_pdf):
    """Usa pdftotext -layout (poppler) — preserva a disposição em colunas do anexo."""
    resultado = subprocess.run(
        ["pdftotext", "-layout", str(caminho_pdf), "-"],
        capture_output=True, text=True
    )
    if resultado.returncode != 0:
        raise RuntimeError(f"Falha ao ler {caminho_pdf}: {resultado.stderr}")
    return resultado.stdout


def normalizar_nome_partido(nome):
    """Colapsa quebra de linha/espaço duplo (o anexo em PDF às vezes quebra o
    nome da federação no meio) e tira número de registro colado em sigla de
    federação (ex.: "44-UNIÃO/11-PP" -> "UNIÃO/PP") — sem isso, o nome
    extraído da ata não bate com FEDERACOES_2026 (dados/estados/registro-2026.js),
    a vagas2022 daquela federação some silenciosamente (fica 0) e o total de
    vagas do cargo dá errado. Ver dados/estados/registro-2026.js."""
    if nome is None:
        return None
    nome = re.sub(r"\s+", " ", nome).strip()
    nome = re.sub(r"\d+-\s*(?=[A-ZÀ-Ÿ])", "", nome)
    return nome.strip()


def extrair_titulo_partido(texto):
    """Extrai partido/federação e sigla(s) do cabeçalho da ata."""
    m = re.search(r"Ata (?:de|da)(?: Convenção)? Estadual do Partido\s+\d+\s*-\s*([A-Za-zÀ-ÿ]+)", texto)
    if m:
        return normalizar_nome_partido(m.group(1))
    m = re.search(r"Ata (?:de|da) Convenção Estadual da Federação[^(]*\(([^)]+)\)", texto)
    if m:
        return normalizar_nome_partido(m.group(1))
    m = re.search(r"Ata Retificadora Convenção Estadual do Partido\s+\d+\s*-\s*([A-Za-zÀ-ÿ]+)", texto)
    if m:
        return normalizar_nome_partido(m.group(1))
    # rodapé "SANTA CATARINA - SC   NN - SIGLA" / "...Localidade  Partido/Federação"
    m = re.search(r"^\s*[A-ZÀ-Ÿ ]+\s*-\s*[A-Z]{2}\s+\d+\s*-\s*([A-Za-zÀ-ÿ/ ]+)$", texto, re.MULTILINE)
    if m:
        return normalizar_nome_partido(m.group(1))
    return None


def mapa_partido_por_nome_da_prosa(texto):
    """Varre o texto corrido (fora do anexo) atrás de 'NOME ... partido X' —
    usado só pra completar o partido de candidatos coligados, que o anexo
    estruturado não informa por nome."""
    mapa = {}
    for linha in texto.split("\n"):
        m = PADRAO_PARTIDO_POR_NOME.search(linha)
        if m:
            nome_norm = re.sub(r"\s+", " ", m.group(1)).strip().upper()
            mapa[nome_norm] = m.group(2).strip()
    return mapa


def extrair_lista_estruturada(texto, arquivo, partido_doc):
    """Lê o anexo 'Lista de candidatos' de uma ata: fonte de confiança alta,
    formulário oficial por candidato, mesmo layout em todas as atas."""
    linhas = [l for l in texto.split("\n") if not RE_HASH_RODAPE.match(l)]
    mapa_partido_prosa = mapa_partido_por_nome_da_prosa(texto)

    achados = []
    cargo_atual = None
    coligado_atual = False
    i = 0
    while i < len(linhas):
        linha = linhas[i]

        m_cargo = RE_CABECALHO_CARGO.search(linha)
        if m_cargo:
            rotulo = m_cargo.group(1).strip().lower()
            cargo_atual = CARGO_NORMALIZADO.get(rotulo, m_cargo.group(1).strip())
            coligado_atual = m_cargo.group(2).lower() == "coligado"
            i += 1
            continue

        m_ordem = RE_LINHA_ORDEM_NOME.match(linha)
        if m_ordem and cargo_atual:
            ordem, nome_completo = m_ordem.groups()
            # a próxima linha não-vazia relevante deve ser "Nome" (rótulo) e
            # depois a linha com urna/número/gênero
            j = i + 1
            while j < len(linhas) and linhas[j].strip() == "":
                j += 1
            if j < len(linhas) and linhas[j].strip().lower() == "nome":
                j += 1
                while j < len(linhas) and linhas[j].strip() == "":
                    j += 1
                m_urna = RE_LINHA_URNA_NUMERO_GENERO.match(linhas[j]) if j < len(linhas) else None
                if m_urna:
                    nome_urna, numero_txt, genero = m_urna.groups()
                    numero = None if numero_txt.strip() == "-" else int(numero_txt.replace(".", ""))
                    nome_norm = re.sub(r"\s+", " ", nome_completo).strip().upper()
                    partido = None if coligado_atual else partido_doc
                    if partido is None:
                        partido = mapa_partido_prosa.get(nome_norm)
                    achados.append({
                        "cargo": cargo_atual,
                        "ordem": int(ordem),
                        "nome": nome_completo.strip().title(),
                        "nomeUrna": limpar_nome_urna(nome_urna).title(),
                        "numero": numero,
                        "genero": genero.upper(),
                        "partido": partido,
                        "coligado": coligado_atual,
                        "arquivoFonte": arquivo,
                        "partidoDocumento": partido_doc,
                        "confianca": "alta" if partido else "media",  # sem partido = precisa revisar
                        "linhaFonte": f"{linha.strip()} / {linhas[j].strip()}",
                    })
                    i = j + 1
                    continue
        i += 1

    return achados


def tratar(atas_dir):
    """Rotina 1: lê e extrai candidaturas de todos os PDFs do diretório."""
    atas_dir = Path(atas_dir)
    pdfs = sorted(atas_dir.glob("*.pdf"))
    todas_candidaturas = []
    resumo_arquivos = []

    for pdf in pdfs:
        texto = pdf_para_texto(pdf)
        partido_doc = extrair_titulo_partido(texto)
        is_retificadora = "retificadora" in pdf.name.lower() or "RETIFICADORA" in texto[:300].upper()
        candidaturas = extrair_lista_estruturada(texto, pdf.name, partido_doc)
        for c in candidaturas:
            c["retificadora"] = is_retificadora
        todas_candidaturas.extend(candidaturas)
        resumo_arquivos.append({
            "arquivo": pdf.name,
            "partidoDetectado": partido_doc,
            "retificadora": is_retificadora,
            "candidaturasExtraidas": len(candidaturas),
        })

    return {"candidaturas": todas_candidaturas, "resumoArquivos": resumo_arquivos}


def carregar_partidos_conhecidos(projeto_dir):
    """Lê dados/partidos-brasil.js para checar siglas conhecidas (validação leve)."""
    caminho = Path(projeto_dir) / "dados" / "partidos-brasil.js"
    if not caminho.exists():
        return set()
    texto = caminho.read_text(encoding="utf-8")
    return set(re.findall(r'sigla:\s*"([^"]+)"', texto))


def verificar(resultado_tratar, partidos_conhecidos):
    """Rotina 2: dedup (retificadora substitui original), checagem de
    números repetidos e partidos fora da lista conhecida."""
    candidaturas = resultado_tratar["candidaturas"]

    chave = lambda c: (c["partidoDocumento"], c["cargo"], c["ordem"], c["nome"])
    retificadas = {chave(c) for c in candidaturas if c["retificadora"]}

    alertas = []
    finais = []
    for c in candidaturas:
        if not c["retificadora"] and chave(c) in retificadas:
            alertas.append(f"Candidatura de {c['nome']} ({c['partidoDocumento']}, {c['cargo']}) "
                            f"tem versão retificadora — mantendo só a mais nova.")
            continue
        finais.append(c)

    contagem = {}
    for c in finais:
        if c["numero"] is None:
            continue
        k = (c["partidoDocumento"], c["cargo"], c["numero"])
        contagem.setdefault(k, []).append(c["nome"])
    for k, nomes in contagem.items():
        if len(nomes) > 1:
            alertas.append(f"Número {k[2]} repetido em {k[0]}/{k[1]} para: {', '.join(nomes)} — conferir manualmente.")

    for c in finais:
        p = c["partido"]
        if partidos_conhecidos and p and not any(p.lower() == s.lower() for s in partidos_conhecidos):
            alertas.append(f"Partido \"{p}\" (candidato {c['nome']}) não está em dados/partidos-brasil.js — "
                            f"pode ser sigla nova/federação ou erro de leitura, conferir.")

    sem_partido = [c for c in finais if c["partido"] is None]
    if sem_partido:
        alertas.append(f"{len(sem_partido)} candidatura(s) coligada(s) sem partido identificado "
                        f"(ver seção de pendências).")

    return {
        "candidaturasFinais": finais,
        "alertas": alertas,
        "semPartido": sem_partido,
        "resumoArquivos": resultado_tratar["resumoArquivos"],
    }


def js_string(valor):
    return "null" if valor is None else json.dumps(valor, ensure_ascii=False)


CAMPO_CANDIDATO_RE = re.compile(r'(\w+):("(?:[^"\\]|\\.)*"|null|true|false|-?\d+)')

# Ordem "preferida" de escrita — só pra manter as linhas legíveis/estáveis.
# Qualquer campo fora desta lista (ex.: partidoOriginal, que
# gerar_ficticios_2026.py adiciona em candidato de federação) ainda é escrito,
# só que depois destes, em ordem alfabética — nunca descartado. Ver
# linha_candidato_js().
CAMPOS_CANDIDATO_ORDEM = ["id", "nome", "nomeUrna", "numero", "partido", "genero",
                          "coligado", "confianca", "fonteArquivo", "fonte"]


def parse_linha_candidato(linha):
    """Lê de volta uma linha `{ id:"x", nome:"y", ... },` do .js gerado (ou do
    fictício) pros tipos Python correspondentes. Parser propositalmente simples
    (regex chave:valor) porque o arquivo é sempre gerado por script, nunca
    editado à mão linha a linha."""
    campos = {}
    for chave, valor in CAMPO_CANDIDATO_RE.findall(linha):
        if valor == "null":
            campos[chave] = None
        elif valor == "true":
            campos[chave] = True
        elif valor == "false":
            campos[chave] = False
        elif valor and valor[0] == '"':
            campos[chave] = json.loads(valor)
        else:
            campos[chave] = int(valor)
    return campos


def ler_provisorio_existente(caminho_js):
    """Lê um dados/estados/{uf}-2026-provisorio.js já existente (se houver) e
    devolve {cargo: [candidato, ...]}. Usado só pra NÃO perder candidato
    nenhum (tipicamente fictício, de gerar_ficticios_2026.py) de partido que
    ainda não tem ata real processada — ver merge em alimentar()."""
    if not caminho_js.exists():
        return {}
    por_cargo = {}
    cargo_atual = None
    for linha in caminho_js.read_text(encoding="utf-8").splitlines():
        m_cargo = re.match(r'\s*"([^"]+)":\s*\[', linha)
        if m_cargo:
            cargo_atual = m_cargo.group(1)
            por_cargo.setdefault(cargo_atual, [])
            continue
        if cargo_atual and "{" in linha and "}" in linha:
            campos = parse_linha_candidato(linha)
            if campos.get("id"):
                por_cargo[cargo_atual].append(campos)
    return por_cargo


def _campo_js(chave, valor):
    if chave == "coligado" or isinstance(valor, bool):
        return f"{chave}:{'true' if valor else 'false'}"
    if isinstance(valor, int):
        return f"{chave}:{valor}"
    return f"{chave}:{js_string(valor)}"


def linha_candidato_js(c):
    """Escreve todos os campos do candidato, não só os conhecidos — um
    candidato preservado do arquivo antigo (ex.: fictício de federação, com
    partidoOriginal) não pode perder campo só porque este script não sabia
    dele. CAMPOS_CANDIDATO_ORDEM só decide a ordem de exibição."""
    vistos = set()
    partes = []
    for chave in CAMPOS_CANDIDATO_ORDEM:
        if chave in c:
            partes.append(_campo_js(chave, c[chave]))
            vistos.add(chave)
    for chave in sorted(c):
        if chave not in vistos:
            partes.append(_campo_js(chave, c[chave]))
    return f"    {{ {', '.join(partes)} }},"


def alimentar(resultado_verificar, saida_dir, uf="SC"):
    """Rotina 3: escreve dados/estados/{uf}-2026-provisorio.js + relatório .md
    de pendências. NÃO toca em base-2022.js / candidatos-extra-2022.js.

    NUNCA sobrescreve um partido/cargo inteiro que ainda não tem ata real —
    faz merge com o que já estava no arquivo (tipicamente candidato fictício
    de gerar_ficticios_2026.py, com fonte:"ficticio", que a interface marca
    visualmente como tal). Só troca fictício por real partido a partido,
    conforme a ata de cada um sai — nunca perde a chapa inteira de um partido
    só porque essa rodada só trouxe ata de outro."""
    saida_dir = Path(saida_dir)
    saida_dir.mkdir(parents=True, exist_ok=True)
    caminho_js = saida_dir / f"{uf.lower()}-2026-provisorio.js"

    existente_por_cargo = ler_provisorio_existente(caminho_js)

    por_cargo = {}
    partidos_reais_por_cargo = {}
    ids_vistos = {}
    for c in sorted(resultado_verificar["candidaturasFinais"], key=lambda c: (c["cargo"], c["ordem"])):
        cargo = c["cargo"]
        por_cargo.setdefault(cargo, [])
        base_partido = c["partido"] or c["partidoDocumento"] or "sem-partido"
        partidos_reais_por_cargo.setdefault(cargo, set()).add(base_partido)
        base_id = slugify(f"{base_partido}-{c['nome']}")
        n = ids_vistos.get(base_id, 0)
        ids_vistos[base_id] = n + 1
        cand_id = base_id if n == 0 else f"{base_id}-{n+1}"
        # Dict "limpo" de propósito (não `{**c, ...}`) — c carrega campos
        # internos do processamento (cargo, ordem, partidoDocumento,
        # retificadora...) que não podem vazar pro .js gerado.
        por_cargo[cargo].append({
            "id": cand_id,
            "nome": c["nome"],
            "nomeUrna": c["nomeUrna"],
            "numero": c["numero"],
            "partido": c["partido"],
            "genero": c["genero"],
            "coligado": c["coligado"],
            "confianca": c["confianca"],
            "fonteArquivo": c["arquivoFonte"],
        })

    candidatos_preservados = 0
    for cargo, candidatos_antigos in existente_por_cargo.items():
        partidos_ja_reais = partidos_reais_por_cargo.get(cargo, set())
        por_cargo.setdefault(cargo, [])
        for cand in candidatos_antigos:
            if cand.get("partido") not in partidos_ja_reais:
                por_cargo[cargo].append(cand)
                candidatos_preservados += 1

    hoje = date.today().isoformat()
    linhas_js = [
        f"// Candidatos 2026 ({uf.upper()}) — PROVISÓRIO, extraído das Atas de Convenção",
        f"// Partidária depositadas em ATAS/{uf.upper()}/, publicadas em",
        "// https://divulgacandcontas.tse.jus.br/divulga/#/ata",
        "//",
        "// NÃO é o registro oficial de candidatura (RRC) — é o que cada partido/",
        "// federação anunciou na própria convenção (formulário 'Lista de candidatos'",
        "// anexo a cada ata). Pode mudar até o fim do prazo de registro na Justiça",
        "// Eleitoral (~agosto/2026). Tratar como rascunho até confirmar contra a",
        "// lista oficial (endpoint de candidaturas da API do TSE, hoje ainda vazio",
        "// para 2026 — ver ferramentas/tratar_atas.py).",
        "//",
        f"// Gerado por ferramentas/tratar_atas.py em {hoje}.",
        f"// Ver dados/estados/{uf.lower()}-2026-conferencia.md para o que precisa de revisão",
        "// humana antes desses dados virarem \"fato\" no projeto (mesmo processo de",
        "// dados/correcoes-nomes.md). CPF e título de eleitor propositalmente não",
        "// foram copiados para este arquivo (não são usados pelo simulador).",
        "//",
        "// Partido/cargo sem ata real processada ainda mantém o candidato",
        "// fictício que já estava aqui (fonte:\"ficticio\", gerado por",
        "// ferramentas/gerar_ficticios_2026.py) em vez de sumir da lista — a",
        "// interface marca esses visualmente. Nunca reescrever esse merge pra",
        "// um overwrite total do arquivo (decisão do usuário, 03/08/2026).",
        # "var", não "const": script clássico (sem type="module") só expõe em
        # window[...] (é assim que registro-2026.js lê) uma declaração top-level
        # com "var" — "const"/"let" ficam fora de window, e candidatos2026EstadoCargo
        # cairia sempre pro fallback de 2022 sem erro nenhum aparecer no console.
        f"var CANDIDATOS_2026_{uf.upper()}_PROVISORIO = {{",
    ]
    for cargo, cands in sorted(por_cargo.items()):
        linhas_js.append(f"  {js_string(cargo)}: [")
        for c in cands:
            linhas_js.append(linha_candidato_js(c))
        linhas_js.append("  ],")
    linhas_js.append("};")

    caminho_js.write_text("\n".join(linhas_js) + "\n", encoding="utf-8")

    linhas_md = [
        f"# Conferência — candidatos 2026 {uf} (atas de convenção)",
        "",
        f"Gerado em {hoje} por `ferramentas/tratar_atas.py`. Fonte: PDFs em `ATAS/{uf}/`,",
        "baixados de https://divulgacandcontas.tse.jus.br/divulga/#/ata (anexo",
        "'Lista de candidatos' de cada ata).",
        "",
        "**Nenhum dado aqui vira `dados/estados/*.js` definitivo sem confirmação humana.**",
        "",
        "## Resumo por arquivo",
        "",
        "| Arquivo | Partido detectado | Retificadora | Candidaturas extraídas |",
        "|---|---|---|---|",
    ]
    for r in resultado_verificar["resumoArquivos"]:
        linhas_md.append(f"| {r['arquivo']} | {r['partidoDetectado'] or '?'} | "
                          f"{'sim' if r['retificadora'] else 'não'} | {r['candidaturasExtraidas']} |")
    linhas_md.append("")
    total = len(resultado_verificar["candidaturasFinais"])
    total_alta = sum(1 for c in resultado_verificar["candidaturasFinais"] if c["confianca"] == "alta")
    linhas_md.append(f"Total de candidaturas: **{total}** — confiança alta: **{total_alta}**, "
                      f"a revisar (partido não identificado): **{len(resultado_verificar['semPartido'])}**")
    if candidatos_preservados:
        linhas_md.append("")
        linhas_md.append(f"Candidatos fictícios preservados (partido/cargo ainda sem ata real): "
                          f"**{candidatos_preservados}** — ver `fonte:\"ficticio\"` no .js gerado.")
    linhas_md.append("")

    if resultado_verificar["alertas"]:
        linhas_md.append("## Alertas automáticos")
        linhas_md.append("")
        for a in resultado_verificar["alertas"]:
            linhas_md.append(f"- {a}")
        linhas_md.append("")

    if resultado_verificar["semPartido"]:
        linhas_md.append("## Candidaturas coligadas sem partido identificado (revisar contra o PDF)")
        linhas_md.append("")
        linhas_md.append("| Nome | Cargo | Arquivo (documento da coligação) |")
        linhas_md.append("|---|---|---|")
        for c in resultado_verificar["semPartido"]:
            linhas_md.append(f"| {c['nome']} | {c['cargo']} | {c['arquivoFonte']} |")
        linhas_md.append("")

    linhas_md += [
        "## Status de confirmação",
        "",
        "_(nenhuma linha confirmada ainda — preencher conforme for revisando, mesmo",
        "formato de dados/correcoes-nomes.md)_",
        "",
        "| Nome | Cargo | Partido | Status | Fonte |",
        "|---|---|---|---|---|",
    ]

    caminho_md = saida_dir / f"{uf.lower()}-2026-conferencia.md"
    caminho_md.write_text("\n".join(linhas_md) + "\n", encoding="utf-8")

    return caminho_js, caminho_md


def main():
    parser = argparse.ArgumentParser(description="Trata Atas de Convenção Partidária (TSE) em candidatos 2026.")
    parser.add_argument("--atas-dir", default="ATAS/SC", help="Diretório com os PDFs das atas")
    parser.add_argument("--saida", default="dados/estados", help="Diretório de saída")
    parser.add_argument("--uf", default="SC")
    parser.add_argument("--json-debug", action="store_true", help="Também salva o JSON bruto intermediário")
    args = parser.parse_args()

    projeto_dir = Path(args.saida).resolve().parent if Path(args.saida).name == "estados" else Path(".")

    print(f"[1/3] Tratando atas em {args.atas_dir} ...")
    resultado_tratar = tratar(args.atas_dir)
    print(f"      {len(resultado_tratar['candidaturas'])} candidaturas extraídas de "
          f"{len(resultado_tratar['resumoArquivos'])} arquivo(s).")

    print("[2/3] Verificando (dedup, retificadoras, alertas) ...")
    partidos_conhecidos = carregar_partidos_conhecidos(projeto_dir)
    resultado_verificar = verificar(resultado_tratar, partidos_conhecidos)
    print(f"      {len(resultado_verificar['candidaturasFinais'])} candidatura(s) após dedup; "
          f"{len(resultado_verificar['alertas'])} alerta(s).")

    print(f"[3/3] Alimentando {args.saida} ...")
    caminho_js, caminho_md = alimentar(resultado_verificar, args.saida, uf=args.uf)
    print(f"      Escrito: {caminho_js}")
    print(f"      Escrito: {caminho_md}")

    if args.json_debug:
        caminho_json = Path(args.saida) / f"{args.uf.lower()}-2026-debug.json"
        caminho_json.write_text(
            json.dumps(resultado_verificar, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"      Escrito: {caminho_json}")


if __name__ == "__main__":
    main()
