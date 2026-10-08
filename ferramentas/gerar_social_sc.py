#!/usr/bin/env python3
"""Gera dados/painel/sc-social.json: indicadores sociais por município de SC.

Fontes (todas públicas, sem autenticação):
  - TSE perfil do eleitorado 2026 (zip ~400 MB, cacheado em ~/.cache/sel-social (ou $SEL_CACHE))
  - IBGE SIDRA, Censo 2022: tabelas 10211 (população/situação), 10295 (renda per capita),
    10183 (religião, pessoas 10+)
  - MDS SAGI MI Social (Solr): Bolsa Família por município

Uso: python3 ferramentas/gerar_social_sc.py
Chave de saída = campo `k` de dados/painel/sc-base.json. Casamento por código IBGE
(dados/regioes-sc.js) e código TSE (dados/resultados/sc-2022/municipios.json).
"""
import csv, io, json, os, re, sys, time, urllib.request, zipfile
from collections import defaultdict
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get('SEL_CACHE', os.path.expanduser('~/.cache/sel-social'))
SAIDA = os.path.join(RAIZ, 'dados', 'painel', 'sc-social.json')
URL_TSE = 'https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/perfil_eleitorado_2026.zip'
SIDRA = 'https://apisidra.ibge.gov.br/values'
MDS = 'https://aplicacoes.mds.gov.br/sagi/servicos/misocial/'


def get(url, tentativas=3):
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (gerar_social_sc)'})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except Exception as e:
            if i == tentativas - 1:
                raise
            print('  retry', url[:90], e, file=sys.stderr)
            time.sleep(3)


def baixar(url, destino):
    if os.path.exists(destino) and os.path.getsize(destino) > 0:
        return destino
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    tmp = destino + '.part'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=600) as r, open(tmp, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    os.replace(tmp, destino)
    return destino


def r1(x):
    return None if x is None else round(x, 1)


# ---------- base de municípios ----------
def carregar_base():
    base = json.load(open(os.path.join(RAIZ, 'dados/painel/sc-base.json')))
    chaves = [m['k'] for m in base['mun']]
    txt = open(os.path.join(RAIZ, 'dados/regioes-sc.js'), encoding='utf-8').read()
    ibge = {c: i for i, c in re.findall(r'ibge:"(\d+)",\s*nome:"[^"]*",\s*chave:"([^"]+)"', txt)}
    ibge = {i: c for c, i in ibge.items()}  # ibge7 -> chave
    mj = json.load(open(os.path.join(RAIZ, 'dados/resultados/sc-2022/municipios.json')))['municipios']
    tse = {v['tse'].lstrip('0'): k for k, v in mj.items()}
    return chaves, ibge, tse


# ---------- TSE ----------
def tse_perfil(tse2chave):
    zpath = baixar(URL_TSE, os.path.join(CACHE, 'perfil_eleitorado_2026.zip'))
    acc = defaultdict(lambda: defaultdict(int))
    with zipfile.ZipFile(zpath) as z:
        nome = [n for n in z.namelist() if n.upper().endswith('_SC.CSV')][0]
        with z.open(nome) as fb:
            rd = csv.DictReader(io.TextIOWrapper(fb, encoding='latin-1'), delimiter=';')
            for row in rd:
                if row['SG_UF'] != 'SC':
                    continue
                ch = tse2chave.get(row['CD_MUNICIPIO'].lstrip('0'))
                if not ch:
                    acc['_sem_chave'][row['NM_MUNICIPIO']] += 1
                    continue
                q = int(row.get('QT_ELEITORES_PERFIL') or row['QT_ELEITORES'])
                a = acc[ch]
                a['tot'] += q
                if row['DS_GENERO'].upper().startswith('FEMININO'):
                    a['fem'] += q
                fx = row['DS_FAIXA_ETARIA']
                m = re.match(r'\s*(\d+)', fx)
                if m:
                    ini = int(m.group(1))
                    if 16 <= ini <= 24:
                        a['jov'] += q
                    if ini >= 60:
                        a['ido'] += q
                esc = row['DS_GRAU_ESCOLARIDADE'].upper()
                if esc.startswith('SUPERIOR COMPLETO'):
                    a['sup'] += q
                if (esc.startswith('ANALFAB') or esc.startswith('LÊ E ESCREVE') or esc.startswith('LE E ESCREVE')
                        or 'FUNDAMENTAL' in esc):
                    a['fund'] += q
    sem = acc.pop('_sem_chave', {})
    out = {}
    for ch, a in acc.items():
        t = a['tot'] or 1
        out[ch] = {'eleitores_2026': a['tot'], 'pct_mulheres_eleit': r1(100 * a['fem'] / t),
                   'pct_16_24_eleit': r1(100 * a['jov'] / t), 'pct_60mais_eleit': r1(100 * a['ido'] / t),
                   'pct_superior_eleit': r1(100 * a['sup'] / t), 'pct_ate_fundamental_eleit': r1(100 * a['fund'] / t)}
    return out, sorted(sem)


# ---------- SIDRA ----------
def sidra(path):
    d = json.loads(get(f'{SIDRA}/{path}'))
    return d[1:]


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def ibge_dados():
    pop, urb, renda, rel = {}, {}, {}, defaultdict(dict)
    for r in sidra('t/10211/n6/in%20n3%2042/v/93/p/2022/c2661/32776/c1/6795,1'):
        c, v = r['D1C'], num(r['V'])
        if r['D5C'] == '6795':
            pop[c] = v
        else:
            urb[c] = v
    for r in sidra('t/10295/n6/in%20n3%2042/v/13431/p/2022/c2/6794/c86/95251/c58/95253'):
        renda[r['D1C']] = num(r['V'])
    for r in sidra('t/10183/n6/in%20n3%2042/v/140/p/2022/c464/50292/c2/6794/c58/95253/c133/95278,95263,95277'):
        rel[r['D1C']][r['D7C']] = num(r['V'])
    out = {}
    for c in pop:
        o = {'pop_2022': int(pop[c]) if pop[c] else None}
        if pop[c] and urb.get(c) is not None:
            o['pct_urbana'] = r1(100 * urb[c] / pop[c])
        o['renda_pc_media'] = renda.get(c) and round(renda[c])
        rr = rel.get(c, {})
        if rr.get('95278'):
            o['pct_catolicos'] = r1(100 * (rr.get('95263') or 0) / rr['95278'])
            o['pct_evangelicos'] = r1(100 * (rr.get('95277') or 0) / rr['95278'])
        out[c] = o
    return out


# ---------- MDS Bolsa Família ----------
def mds_mes(anomes, campo):
    q = (f'{MDS}?q=*:*&fq=codigo_ibge:42*&fq=anomes_s:{anomes}&fl=codigo_ibge,{campo}'
         f'&rows=400&wt=json')
    docs = json.loads(get(q))['response']['docs']
    return {d['codigo_ibge']: d.get(campo) for d in docs if d.get(campo)}


def mds_ultimo(campo, minimo=280):
    hoje = date.today()
    y, m = hoje.year, hoje.month
    for _ in range(24):
        an = f'{y}{m:02d}'
        try:
            v = mds_mes(an, campo)
        except Exception as e:
            print('  MDS falhou', an, e, file=sys.stderr)
            v = {}
        if len(v) >= minimo:
            return an, v
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return None, {}


def main():
    chaves, ibge2ch, tse2ch = carregar_base()
    ibge6 = {i[:6]: c for i, c in ibge2ch.items()}
    res = {k: {'ibge': next((i for i, c in ibge2ch.items() if c == k), None)} for k in chaves}
    fontes = {}

    print('IBGE SIDRA...')
    for cod, o in ibge_dados().items():
        ch = ibge2ch.get(cod)
        if ch in res:
            res[ch].update(o)
    fontes['pop_2022 / pct_urbana'] = {
        'desc': 'População residente total e urbana (situação do domicílio), Censo 2022',
        'url': 'https://sidra.ibge.gov.br/tabela/10211', 'tabela': 'SIDRA 10211 (v93; c1 Urbana)', 'ref': '2022-08-01'}
    fontes['renda_pc_media'] = {
        'desc': 'Rendimento nominal médio mensal domiciliar per capita (R$, moradores em DPP ocupados), Censo 2022',
        'url': 'https://sidra.ibge.gov.br/tabela/10295', 'tabela': 'SIDRA 10295 (v13431)', 'ref': '2022 (R$ de jul/2022)'}
    fontes['pct_catolicos / pct_evangelicos'] = {
        'desc': '% de pessoas de 10 anos ou mais por religião (Católica Apostólica Romana; Evangélicas), Censo 2022. '
                'O Censo 2022 só divulga religião por município para 10+ anos.',
        'url': 'https://sidra.ibge.gov.br/tabela/10183', 'tabela': 'SIDRA 10183 (v140; c133 95263/95277/95278)', 'ref': '2022'}

    print('MDS Bolsa Família...')
    an_f, fam = mds_ultimo('qtd_familias_beneficiarias_bolsa_familia_i')
    an_p, pes = mds_ultimo('cadunico_tot_pes_pbf_i')
    for c6, v in fam.items():
        ch = ibge6.get(c6)
        if ch in res:
            res[ch]['pbf_familias'] = v
    for c6, v in pes.items():
        ch = ibge6.get(c6)
        if ch in res:
            res[ch]['pbf_pessoas'] = v
            if res[ch].get('pop_2022'):
                res[ch]['pct_pop_pbf'] = r1(100 * v / res[ch]['pop_2022'])
    fontes['pbf_familias'] = {'desc': 'Famílias beneficiárias do Bolsa Família no mês', 'ref': an_f,
                              'url': MDS + '?q=*:*&fq=codigo_ibge:42*&fq=anomes_s:' + str(an_f),
                              'campo': 'qtd_familias_beneficiarias_bolsa_familia_i (MDS/SAGI MI Social)'}
    fontes['pbf_pessoas / pct_pop_pbf'] = {
        'desc': 'Pessoas no CadÚnico em famílias beneficiárias do PBF; % = pessoas / população Censo 2022 '
                '(numerador e denominador de datas diferentes, é aproximação)', 'ref': an_p,
        'url': MDS + '?q=*:*&fq=codigo_ibge:42*&fq=anomes_s:' + str(an_p),
        'campo': 'cadunico_tot_pes_pbf_i (MDS/SAGI MI Social)'}

    print('TSE perfil do eleitorado 2026 (download grande na 1a vez)...')
    tse, sem = tse_perfil(tse2ch)
    for ch, o in tse.items():
        if ch in res:
            res[ch].update(o)
    fontes['eleitorado (pct_*_eleit, eleitores_2026)'] = {
        'desc': 'Perfil do eleitorado 2026, soma de QT_ELEITORES (arquivo perfil_eleitorado_2026_SC.csv dentro do zip) por município. 16-24 = faixas iniciando entre 16 e 24; '
                '60+ = faixas iniciando em 60+; superior = SUPERIOR COMPLETO; até fundamental = analfabeto + lê e escreve + '
                'fundamental incompleto/completo.', 'url': URL_TSE, 'ref': 'perfil_eleitorado_2026 (arquivo vigente no download)'}
    if sem:
        fontes['_tse_sem_chave'] = sem
    fontes['_gerado_em'] = date.today().isoformat()
    fontes['_script'] = 'ferramentas/gerar_social_sc.py'

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, 'w', encoding='utf-8') as f:
        json.dump({'fontes': fontes, 'mun': res}, f, ensure_ascii=False, separators=(',', ':'))

    campos = sorted({k for o in res.values() for k in o})
    print(f'{len(res)} municípios; gravado {SAIDA}')
    for c in campos:
        falt = [k for k, o in res.items() if o.get(c) is None]
        print(f'  {c}: faltam {len(falt)}', falt[:10] if falt else '')


if __name__ == '__main__':
    main()
