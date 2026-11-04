# Estrutura da Casa (Parlamentares › Administrativo): gera dados/painel/estrutura-casa.json a partir do portal da
# transparência da ALESC já baixado (ferramentas/diario/_cache/portal-lista.json e portal-contracheques.json).
# Para cada lotação: vagas previstas pela norma (Res. 002/2006 e alterações; Atos da Mesa), quem ocupa cada uma
# (deduzido pelo valor do contracheque), o valor aplicado e a cota. Duas organizações: por tipo de unidade e pelo
# organograma (prefixo da lotação no portal = a quem a unidade responde, Res. 001/2006, art. 2º).
# Rodar depois de atualizar o cache do portal:  python3 ferramentas/estrutura_casa.py
import json, re, html, math, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
L = json.load(open(R + 'ferramentas/diario/_cache/portal-lista.json'))
CC = json.load(open(R + 'ferramentas/diario/_cache/portal-contracheques.json'))
M = json.load(open(R + 'dados/painel/mesa-estruturas.json'))
IDX = json.loads(re.search(r'const GAB_IDX = (\[[^\]]*\])', open(R + 'painel/novos.js').read()).group(1)); VAL = 296.55; VIC = 356.34
# chaves anônimas (matrícula → HMAC do banco), fora do git; regerar com a consulta em TRANSFERENCIA.md
CHV = json.load(open(R + 'ferramentas/diario/_cache/chaves-estrutura.json'))
def num(s):
    t = re.sub(r'[^0-9,-]', '', str(s or ''))
    try: return float(t.replace(',', '.')) if t not in ('', '-') else 0.0
    except ValueError: return 0.0
esc = lambda s: html.escape(str(s or ''))
tit = lambda s: re.sub(r'\b(Da|De|Do|Das|Dos|E)\b', lambda m: m.group(0).lower(), str(s).title())
sem_pref = lambda l: re.sub(r'^[A-Z0-9]{1,5} - ', '', l)
# nome da unidade: título com acentos e siglas de partido em maiúsculas (o portal grava tudo sem acento)
ACENTO = {'Lideranca': 'Liderança', 'Presidencia': 'Presidência', 'Orcamento': 'Orçamento', 'Saude': 'Saúde', 'Comissoes': 'Comissões', 'Familia': 'Família', 'Relacoes': 'Relações', 'Camaras': 'Câmaras', 'Gestao': 'Gestão', 'Informacoes': 'Informações', 'Patrimonio': 'Patrimônio', 'Comunicacao': 'Comunicação', 'Inovacao': 'Inovação', 'Execucao': 'Execução', 'Orcamentaria': 'Orçamentária', 'Prestacao': 'Prestação', 'Licitacoes': 'Licitações', 'Publicacao': 'Publicação', 'Documentacao': 'Documentação', 'Taquigrafia': 'Taquigrafia', 'Sessoes': 'Sessões', 'Plenario': 'Plenário', 'Servicos': 'Serviços', 'Tecnicos': 'Técnicos', 'Graficos': 'Gráficos', 'Seguranca': 'Segurança', 'Beneficios': 'Benefícios', 'Estagios': 'Estágios', 'Integracao': 'Integração', 'Radio': 'Rádio', 'Tv': 'TV', 'Eventos': 'Eventos', 'Contratacoes': 'Contratações', 'Cerimonial': 'Cerimonial', 'Memoria': 'Memória', 'Logistico': 'Logístico', 'Manutencao': 'Manutenção', 'Nucleo': 'Núcleo', 'Gerencia': 'Gerência', 'Tecnico': 'Técnico', 'Sistemas': 'Sistemas', 'Administracao': 'Administração', 'Expediente': 'Expediente', 'Atos': 'Atos', 'Funcionais': 'Funcionais', 'Assistencia': 'Assistência', 'Consultoria': 'Consultoria', 'Vice-Presidencia': 'Vice-Presidência', 'Florianopolis': 'Florianópolis', 'Itajai': 'Itajaí', 'Uniao': 'União', 'Rede': 'Rede', 'Juridico': 'Jurídico', 'Contabilidade': 'Contabilidade', 'Tesouraria': 'Tesouraria', 'Processamento': 'Processamento', 'Acessibilidade': 'Acessibilidade', 'Divulgacao': 'Divulgação', 'Infraestrutura': 'Infraestrutura', 'Tecnologia': 'Tecnologia', 'Corregedoria': 'Corregedoria', 'Assembleia': 'Assembleia', 'Atualizacao': 'Atualização', 'Audio': 'Áudio', 'Ciencia': 'Ciência', 'Comissao': 'Comissão', 'Constituicao': 'Constituição', 'Deficiencia': 'Deficiência', 'Educacao': 'Educação', 'Etica': 'Ética', 'Justica': 'Justiça', 'Legislacao': 'Legislação', 'Operacoes': 'Operações', 'Prevencao': 'Prevenção', 'Proposicoes': 'Proposições', 'Protecao': 'Proteção', 'Publica': 'Pública', 'Publico': 'Público', 'Redacao': 'Redação', 'Servico': 'Serviço', 'Tramitacao': 'Tramitação', 'Tributacao': 'Tributação', 'Financas': 'Finanças', 'Crianca': 'Criança', 'Idosa': 'Idosa', 'Mercosul': 'Mercosul', 'Participat': 'Participativa', 'Merco': 'Mercosul', 'Sustentavel': 'Sustentável'}
SIGLAS = {'PL', 'PT', 'PP', 'MDB', 'PSD', 'PSDB', 'PDT', 'PSOL', 'NOVO', 'PODEMOS', 'REPUBLICANOS', 'UNIÃO', 'UNIAO', 'BRASIL'}
def rotulo_un(l):
    w = sem_pref(l).split()
    out = []
    for i, x in enumerate(w):
        if l.startswith('LIDERANCA') and i >= 2 and x in SIGLAS: out.append('UNIÃO' if x == 'UNIAO' else x); continue
        pt = x[-1] if x[-1] in ',;' else ''; x = x.rstrip(',;')
        t = tit(x) if i == 0 or x not in ('DA', 'DE', 'DO', 'DAS', 'DOS', 'E', 'AS', 'AO', 'COM') else x.lower()
        if t == 'as' and i and w[i - 1] == 'COMBATE': t = 'às'
        out.append(ACENTO.get(t, t) + pt)
    r = ' '.join(out)
    return r.replace('União Brasil', 'UNIÃO')
def fm(v):
    return 'R$ ' + (f'{v/1e6:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.') + ' mi' if v >= 1e6 else f'{round(v/1e3):,}'.replace(',', '.') + ' mil')
perto = lambda a, b: a and abs(a - b) < 0.06
def nivel(v):
    b, e = None, 2
    for i, x in enumerate(IDX):
        d = abs(x * VAL - v)
        if d < e: e, b = d, i + 1
    return b
DAS3, DAS5, DAS6, DAS7, DAS8 = 12726.42, 16340.59, 18232.39, 20173.54, 67378.52
FC3, FC4, FC5, FC6, FC7 = 4424.32, 6198.2, 8982.02, 12945.41, 15404.97
VL = {'DAS-8': DAS8 + FC7, 'DAS-7': DAS7 + FC7, 'DAS-6': DAS6 + FC6, 'DAS-5': DAS5 + FC5, 'DAS-3': DAS3 + FC3, 'FC-7': FC7, 'FC-4': FC4, 'GAC-59': 13460.89, 'GE-ADJ': 6198.19, 'FC-6': FC6, 'FC-5': FC5}
cc_ = lambda v: lambda p: perto(p['cc'], v)
fc_ = lambda v: lambda p: perto(p['fc'], v) or perto(p['ge'], v)
# efetivo no cargo de direção recebe a Gratificação de Exercício no lugar do DAS (mesmo valor da FC do nível)
das_ = lambda v, f: lambda p: perto(p['cc'], v) or perto(p['ge'], f)
adj_ = lambda p: p['adj'] > 0 or perto(p['fc'], FC6)
niv = lambda p: bool(p['cc']) and nivel(p['cc']) is not None
alg = lambda p: bool(p['cc'] or p['fc'])

def grupo(l):
    if l.startswith('CC - COMISSAO'): return 'Comissões permanentes'
    if re.match(r'MD - \dª (VICE|SECRETARIA)', l) or l in ('GABINETE DA PRESIDENCIA', 'GP - CHEFIA DE GABINETE DA PRESIDENCIA'): return 'Mesa Diretora'
    if l.startswith('LIDERANCA'): return 'Lideranças'
    if 'COLEGIADO DE BANCADA' in l: return 'Colegiados de Bancada'
    if 'CASA MILITAR' in l or 'BOMBEIROS' in l: return 'Casa Militar'
    if 'ESCOLA DO LEGISLATIVO' in l: return 'Escola do Legislativo'
    if re.search(r'PROCURADORIA|CONTROLADORIA|CONSULTORIA|OUVIDORIA|CORREGEDORIA', l): return 'Procuradoria e controle'
    if 'SECRETARIA' in l: return 'Secretarias'
    if 'DIRETORIA' in l and 'SEM LOTACAO' not in l: return 'Diretorias'
    if 'COORDENADORIA' in l: return 'Coordenadorias'
    if re.search(r'GERENCIA|NUCLEO|ASSESSORIA DE PLANEJAMENTO', l): return 'Gerências e núcleos'
    return None

# vagas legais de cada unidade (Res. 002/2006): [(cargo, quem ocupa, quantidade)] e, se houver, a cota de valor
GM = M['gabinetes_mesa']; LOTM = {'GABINETE DA PRESIDENCIA': 'Presidente', 'MD - 1ª VICE-PRESIDENCIA': '1º Vice-Presidente', 'MD - 2ª VICE-PRESIDENCIA': '2º Vice-Presidente', 'MD - 1ª SECRETARIA': '1º Secretário', 'MD - 2ª SECRETARIA': '2º Secretário', 'MD - 3ª SECRETARIA': '3º Secretário', 'MD - 4ª SECRETARIA': '4º Secretário'}
B = {'PL': 16, 'PT': 5, 'UNIAO BRASIL': 4, 'PP': 4, 'MDB': 4, 'REPUBLICANOS': 3, 'PSD': 3, 'PODEMOS': 2, 'PSOL': 1, 'NOVO': 1, 'PDT': 1, 'PSDB': 0}
T = M['liderancas']['tabela']
def vagas(g, l, n_pessoas):
    if g == 'Mesa Diretora':
        if l.startswith('GP - CHEFIA'): return [('Chefe de Gabinete da Presidência · PL/DAS-8', alg, 1)], None, ''
        k = GM[LOTM[l]]; return [('Secretário Parlamentar · PL/GAM', niv, k['cargos_max'])], k['cota'], 'DAS fora da cota' if l.startswith('GAB') else ''
    if g == 'Lideranças':
        b = B.get(l.replace('LIDERANCA DO ', ''), 0); e = T.get(str(min(9, b))) if b else None
        return ([('Secretário Parlamentar · PL/GAL', niv, e['cargos'])], e['cota'], f'bancada de {b} em 2027') if e else ([], 0, 'sem bancada em 2027')
    if g == 'Colegiados de Bancada':
        if l == 'DL - COLEGIADO DE BANCADA': return [('Secretário do Colegiado · PL/GAS', niv, 20)], 683.856532 * VIC, 'bancadas partidárias'
        q = 1 if n_pessoas <= 1 else 2; return [('Secretário do Colegiado · PL/GAS', niv, q)], (39.570453 if q == 1 else 79.140906) * VIC, 'bancada regional'
    if l.startswith('CC - COMISSAO'): return [('Assessor de Comissão Permanente · PL/GAC-59', cc_(13460.89), 1)], None, ''
    if 'NUCLEO DE ESTUDO DE DADOS' in l: return [('Gestão do Núcleo · PL/FC-4', fc_(FC4), 1)], None, ''
    if 'ASSESSORIA DE PLANEJAMENTO DE CONTRATACOES' in l: return [('Assessor de Planejamento de Contratações · PL/DAS-6', alg, 1)], None, ''
    if 'SECRETARIA GERAL' in l: return [('Secretário-Geral · PL/DAS-7', das_(DAS7, FC7), 1), ('Assessor da Secretaria-Geral · PL/DAS-6', das_(DAS6, FC6), 1)], None, ''
    if 'RELACOES INSTITUCIONAIS' in l: return [('Secretário Executivo · PL/DAS-7', das_(DAS7, FC7), 1), ('Assessor de Relações Institucionais · PL/DAS-6', das_(DAS6, FC6), 2), ('Assessor de Relações Institucionais · PL/DAS-3', cc_(DAS3), 2)], None, ''
    if 'CAMARAS MUNICIPAIS' in l: return [('Secretário de Apoio às Câmaras · PL/DAS-6', das_(DAS6, FC6), 1), ('Assessor · PL/DAS-3', cc_(DAS3), 3)], None, ''
    if 'SECRETARIA DA MULHER' in l: return [('Secretário Parlamentar · PL/GAR', niv, 6)], 167.8053 * VIC, ''
    if 'SECRETARIA DA FAMILIA' in l: return [('Secretário Parlamentar · PL/GAF', niv, 4)], 83.9026 * VIC, ''
    if 'PROCURADORIA' in l: return [('Procurador-Geral e Adjunto · PL/DAS-8', cc_(DAS8), 2)], None, ''
    if 'CONTROLADORIA' in l: return [('Controlador-Geral e Adjunto · PL/DAS-8', cc_(DAS8), 2)], None, ''
    if 'CONSULTORIA' in l: return [('Chefe da Consultoria · PL/FC-7', fc_(FC7), 1), ('Chefe Adjunto · PL/FC-6', fc_(FC6), 1)], None, ''
    if 'CORREGEDORIA' in l: return [('Secretário-Geral da Corregedoria · PL/DAS-6', das_(DAS6, FC6), 1), ('Secretário Parlamentar · PL/DAS-3', cc_(DAS3), 2)], None, ''
    if 'OUVIDORIA' in l: return [('Ouvidor', alg, 1)], None, ''
    if l == 'DG - ESCOLA DO LEGISLATIVO': return [('Diretor da Escola · PL/DAS-7', das_(DAS7, FC7), 1), ('Coordenador da Escola · PL/DAS-6', das_(DAS6, FC6), 1), ('Assessor da Escola · PL/DAS-5', das_(DAS5, FC5), 6)], None, ''
    if l == 'GP - DIRETORIA GERAL': return [('Diretor-Geral · PL/DAS-8', cc_(DAS8), 1), ('Diretor-Geral Adjunto · GE-ADJ', adj_, 1)], None, ''
    if 'DIRETORIA' in l: return [('Diretor · PL/DAS-7', das_(DAS7, FC7), 1), ('Diretor Adjunto · GE-ADJ', adj_, 1)], None, ''
    if 'COORDENADORIA' in l: return [('Coordenador · PL/DAS-6', das_(DAS6, FC6), 1)], None, ''
    if 'GERENCIA' in l: return [('Gerente · PL/FC-5', fc_(FC5), 1)], None, ''
    return [], None, ''   # Casa Militar, núcleos: sem cargo próprio

def rotulo(p):
    if p['chefe']: return 'Chefe de Gabinete · PL/DAS-7'
    for v, n in ((DAS8, 'DAS-8'), (DAS7, 'DAS-7'), (DAS6, 'DAS-6'), (DAS5, 'DAS-5'), (DAS3, 'DAS-3')):
        if perto(p['cc'], v): return 'Comissionado · PL/' + n
    if p['cc'] and nivel(p['cc']): return f'Comissionado · nível {nivel(p["cc"])}'
    if p['cc']: return 'Comissionado · nível a identificar'
    if p['ef']: return 'Efetivo' + (' + função de confiança' if p['fc'] else '')
    if p['mil']: return 'Militar'
    return (p['vinc'] or '—') + ('' if p['bruto'] else ' · sem contracheque na ALESC')

U = {}
for m, nome, vinc, lot in L:
    if not lot or lot == '—' or lot.startswith('GAB DEP') or vinc in ('Aposentado', 'Deputado'): continue
    g = grupo(lot)
    if not g: continue
    rows = (CC.get(m) or {}).get('rows') or []; d = {r[1]: num(r[2]) for r in rows}
    U.setdefault(g, {}).setdefault(lot, []).append({'m': m, 'n': nome, 'vinc': vinc, 'cc': d.get('Cargo comissionado', 0), 'fc': d.get('Função de Confiança', 0), 'ge': d.get('Gratificação de Exercício', 0), 'adj': d.get('Gratificação de Exercício Diretor Adjunto', 0), 'ef': d.get('Cargo efetivo', 0), 'mil': 'Gratificação Policial Militar' in d, 'chefe': 'Chefia de gabinete' in d, 'bruto': d.get('BRUTO', 0)})

# barra de 10 miniblocos (cada um = 10% do previsto), preenchida na proporção; à esquerda o ocupado/usado, à direita a
# quantidade/cota. Passou do limite: a barra fica cheia em laranja. Vale igual para vagas e para valores.
def barra10(a, b, ea, eb):
    f = a / b * 10 if b else 0
    if f > 10: cel = '<i class="x"></i>' * 10
    else:
        ch = int(f); pt = f - ch
        cel = ''.join('<i></i>' if i < ch else (f'<i class="p" style="--p:{pt*100:.0f}%"></i>' if i == ch and pt > 0.05 else '<i class="v"></i>') for i in range(10))
    return f'<span class="mb"><b>{ea}</b><span class="b10">{cel}</span><em>{eb}</em></span>'
mini = lambda u, n: barra10(u, n, str(u), str(n))
mini_valor = lambda v, c: barra10(v, c, fm(v), fm(c))
XI = '<i class="x"></i>'; VAGA = '<span class="vg">vaga livre</span>'
nome = lambda p: '<b class="pn" title="abre o perfil (matrícula, vínculo, histórico)">' + esc(tit(p['n'])) + '</b>'
def rot_cargo(cg, p):
    cg = cg.replace('GE-ADJ', 'Gratificação de Diretor Adjunto')
    if p and not p['cc'] and p['ge'] and 'DAS-' in cg: cg = re.sub(r'PL/DAS-\d', 'efetivo + Gratificação de Exercício', cg)
    if p and cg.endswith(('GAM', 'GAL', 'GAS', 'GAR', 'GAF')) and nivel(p['cc']): return cg + ' nível ' + str(nivel(p['cc']))
    return cg
def unidade(g, lot, P):
    V, cota, obs = vagas(g, lot, len(P)); livres = list(P); ocup = []
    prev = 0; usado = 0
    for cg, ok, q in V:
        cod = (re.search(r'(DAS-\d|FC-\d|GAC-\d+|GE-ADJ)', cg) or [None])[0]; vl = VL.get(cod, 0)
        for i in range(q):
            p = max((x for x in livres if ok(x)), key=lambda x: x['cc'] or x['fc'], default=None)
            if p: livres.remove(p)
            ocup.append((cg, p)); prev += vl
            if p: usado += (p['cc'] or p['fc']) if cota else vl
    nV = len(ocup); nU = sum(1 for _, p in ocup if p)
    cota0 = cota
    if not cota: cota = prev   # sem cota de nomeações: a referência é o valor legal dos cargos previstos
    t = sum(p['bruto'] for p in P)
    lin = ''.join('<tr class="' + ('' if p else 'vz') + '"><td>' + esc(rot_cargo(cg, p)) + '</td><td>' + (nome(p) if p else VAGA) + '</td><td class="r">' + (fm(p['bruto']) if p and p['bruto'] else '—') + '</td></tr>' for cg, p in ocup)
    eq = ''.join('<tr><td class="mu">' + esc(rotulo(p)) + '</td><td>' + nome(p) + '</td><td class="r">' + (fm(p['bruto']) if p['bruto'] else '—') + '</td></tr>' for p in sorted(livres, key=lambda p: -p['bruto']))
    corpo = ('<table class="tb"><thead><tr><th>Cargo</th><th>Ocupante</th><th class="r">Bruto</th></tr></thead><tbody>' + lin + '</tbody></table>' if lin else '') + (('<details class="eq"><summary>' + ('Outras pessoas na unidade' if lin else 'Pessoas na unidade') + ' · ' + str(len(livres)) + '</summary><table class="tb"><tbody>' + eq + '</tbody></table></details>') if eq else '')
    # sem matrícula nem nome (o repositório é público): cada pessoa vai com a chave anônima do banco (migração 94),
    # que só a função adm_estrutura_nomes (admin) transforma em nome; '' = vaga livre, '?' = ocupada sem chave
    ch = lambda p: CHV.get(str(int(p['m'])), '?')
    posts = [[rot_cargo(cg, p), ch(p) if p else '', round(p['bruto'], 2) if p else 0] for cg, p in ocup]
    outros = [[rotulo(p), ch(p), round(p['bruto'], 2)] for p in sorted(livres, key=lambda p: -p['bruto'])]
    return {'posts': posts, 'outros': outros, 'semcota': not V or cota0 is None, 'nV': nV, 'nU': nU, 'usado': usado, 'cota': cota or 0, 't': t, 'n': len(P), 'obs': obs, 'corpo': corpo, 'lot': lot}
ICO = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="5" r="2.8"/><path d="M2.8 14c.6-2.9 2.7-4.4 5.2-4.4s4.6 1.5 5.2 4.4"/></svg>'
def ocupa(u, n):
    if not n: return '<span class="oc sem">sem vagas próprias</span>'
    w = min(100, u / n * 100)
    return f'<span class="oc"><span class="tr{" x" if u > n else ""}"><i style="width:{w:.1f}%"></i></span><b>{u}<em>/{n}</em></b></span>'
def valor(r):
    if not r['cota']: return '<span class="oc vf"><span class="tr vz"></span><b>' + fm(r['t']).replace('R$ ', '') + '<em>/sem cota</em></b></span>'
    w = min(100, r['usado'] / r['cota'] * 100)
    return f'<span class="oc vf"><span class="tr{" x" if r["usado"] > r["cota"] else ""}"><i style="width:{w:.1f}%"></i></span><b>{fm(r["usado"]).replace("R$ ", "")}<em>/{fm(r["cota"]).replace("R$ ", "")}</em></b></span>'
def linha(nome, sub, r, tag):
    return f'<summary><span class="nm">{nome}<small>{sub}</small></span>{ocupa(r["nU"], r["nV"])}{valor(r)}<i class="ch"></i></summary>'

def g_de(l): return grupo(l) or 'x'
PP = {}   # todas as pessoas por lotação (as duas vistas usam as mesmas)
for g, lots in U.items():
    for l, P in lots.items(): PP[l] = (g, P)
UN = {l: unidade(g, l, P) for l, (g, P) in PP.items()}
def soma(us):
    return {'nV': sum(u['nV'] for u in us), 'nU': sum(u['nU'] for u in us), 'usado': sum(u['usado'] for u in us), 'cota': sum(u['cota'] for u in us), 't': sum(u['t'] for u in us), 'n': sum(u['n'] for u in us)}
def sub_un(n, obs, k=0):
    return ICO + str(n) + (' · ' + str(k) + (' subunidades' if k > 1 else ' subunidade') if k else '') + (' · ' + obs if obs else '')
def no_un(l, filhos, nome=None):
    u = UN[l]; ks = filhos.get(l, [])
    tot = soma([u] + [arv(k, filhos) for k in ks])
    corpo = u['corpo'] + ''.join(no_un(k, filhos) for k in ks)
    return '<details class="u">' + linha(esc(nome or rotulo_un(l)), sub_un(tot['n'], u['obs'], len(ks)), tot, 'u') + '<div class="cp">' + corpo + '</div></details>'
def arv(l, filhos):
    return soma([UN[l]] + [arv(k, filhos) for k in filhos.get(l, [])])
def bloco_g(nome, sub_extra, raizes, filhos, nomes=None):
    nomes = nomes or {}
    tot = soma([arv(l, filhos) for l in raizes])
    sub = ICO + str(tot['n']) + ' · ' + str(len(raizes)) + (' unidades' if len(raizes) > 1 else ' unidade') + (' · ' + sub_extra if sub_extra else '')
    return '<details class="g">' + linha(nome, sub, tot, 'g') + '<div class="us">' + ''.join(no_un(l, filhos, nomes.get(l)) for l in raizes) + '</div></details>'
ordem = lambda ls: sorted(ls, key=lambda l: -arv(l, F)['t'])

# vista 1 — modelo atual: por tipo de unidade
F = {}
grupos = {}
for l, (g, P) in PP.items(): grupos.setdefault(g, []).append(l)
mod = ''.join(bloco_g(g, '', ordem(ls), F) for g, ls in sorted(grupos.items(), key=lambda kv: -sum(UN[l]['t'] for l in kv[1])))

# vista 2 — organograma (Res. 001/2006, art. 2º): o prefixo da lotação no portal diz a quem a unidade responde
DIR = {'DA': 'Diretoria Administrativa', 'DL': 'Diretoria Legislativa', 'DCS': 'Diretoria de Comunicação Social', 'DF': 'Diretoria Financeira', 'DGP': 'Diretoria de Gestão de Pessoas', 'DTI': 'Diretoria de Tecnologia e Inovação'}
PROPRIA = {'DA': 'DG - DIRETORIA ADMINISTRATIVA', 'DL': 'DG - DIRETORIA LEGISLATIVA', 'DCS': 'DG - DIRETORIA DE COMUNICACAO SOCIAL', 'DF': 'DG - DIRETORIA FINANCEIRA', 'DGP': 'DG - DIRETORIA DE GESTAO DE PESSOAS', 'DTI': 'DG - DIRETORIA DE TECNOLOGIA E INOVACAO'}
PAI = {'CC': 'DL - COORDENADORIA DAS COMISSOES', 'CDOC': 'DL - COORDENADORIA DE DOCUMENTACAO', 'CIS': 'DTI - COORDENADORIA DE INFRAESTRUTURA E SEGURANCA', 'COP': 'DF - COORDENADORIA DO ORCAMENTO PARLAMENTAR', 'CPD': 'DTI - COORDENADORIA DE PROJETOS E DESENVOLVIMENTO', 'CPS': 'DL - COORDENADORIA DO PLENARIO E DAS SESSOES', 'CR': 'DCS - COORDENADORIA DE RADIO', 'CTV': 'DCS - COORDENADORIA DE TV', 'CRM': 'DA - COORDENADORIA DE RECURSOS MATERIAIS', 'CSM': 'DTI - COORDENADORIA DE SUPORTE E MANUTENCAO', 'CST': 'DA - COORDENADORIA DE SERVICOS TECNICOS', 'CT': 'DA - COORDENADORIA DE TRANSPORTES', 'SG': 'CGP - SECRETARIA GERAL', 'EL': 'DG - ESCOLA DO LEGISLATIVO', '1SEC': 'MD - 1ª SECRETARIA'}
def pai(l):
    c = l.split(' - ')[0] if ' - ' in l else ''
    if c == 'CE': return 'DL - COORDENADORIA DE EXPEDIENTE' if re.search('REDACAO|TRAMITACAO', l) else 'CGP - COORDENADORIA DE EVENTOS'
    return PAI.get(c)
def setor(l):
    c = l.split(' - ')[0] if ' - ' in l else ''
    if l.startswith('LIDERANCA'): return 'Lideranças'
    if l == 'GABINETE DA PRESIDENCIA' or c in ('MD', '1SEC'): return 'Mesa Diretora'
    if l.startswith('GP - CHEFIA') or c in ('CGP', 'SG'): return 'Chefia de Gabinete da Presidência'
    if l == 'GP - DIRETORIA GERAL' or l in ('DG - ASSESSORIA DE PLANEJAMENTO DE CONTRATACOES', 'DG - ESCOLA DO LEGISLATIVO') or c == 'EL': return 'Diretoria-Geral'
    for k, v in PROPRIA.items():
        if l == v: return DIR[k]
    if c in DIR: return DIR[c]
    p = pai(l)
    return setor(p) if p else 'Outras'
FO = {}; RA = {}
for l in PP:
    p = pai(l)
    if p and p in PP: FO.setdefault(p, []).append(l)
    else: RA.setdefault(setor(l), []).append(l)
for k in FO: FO[k] = sorted(FO[k], key=lambda l: -arv(l, FO)['t'])
SET = ['Mesa Diretora', 'Chefia de Gabinete da Presidência', 'Diretoria-Geral', 'Diretoria Legislativa', 'Diretoria Administrativa', 'Diretoria de Comunicação Social', 'Diretoria Financeira', 'Diretoria de Gestão de Pessoas', 'Diretoria de Tecnologia e Inovação', 'Lideranças', 'Outras']
NOMES = {v: 'Direção da diretoria' for v in PROPRIA.values()}; NOMES['GP - DIRETORIA GERAL'] = 'Direção-Geral'; NOMES['GP - CHEFIA DE GABINETE DA PRESIDENCIA'] = 'Chefe de Gabinete da Presidência'
def ord_set(ls):
    pr = [l for l in ls if l in NOMES]; return pr + sorted([l for l in ls if l not in NOMES], key=lambda l: -arv(l, FO)['t'])
EXT = {d: 'Diretoria-Geral' for d in DIR.values()}; EXT['Diretoria-Geral'] = 'Gabinete da Presidência'; EXT['Chefia de Gabinete da Presidência'] = 'Gabinete da Presidência'
org = ''.join(bloco_g(st, EXT.get(st, ''), ord_set(RA[st]), FO, NOMES) for st in SET if st in RA)
assert 'Outras' not in RA, RA.get('Outras')
REF = '10/2026'
J = {'ref': REF, 'fonte': 'Portal da transparência da ALESC (lotação e contracheque ' + REF + '); vagas pela Res. 002/2006 e alterações (Anexos II-A, IX-B a IX-H; LC de 04/2024 e 04/2025) e Atos da Mesa (768/2025). Ocupante deduzido pelo valor do cargo no contracheque.',
     'un': {l: {'r': NOMES.get(l) or rotulo_un(l), 'o': u['obs'], 'n': u['n'], 'V': u['nV'], 'U': u['nU'], 'us': round(u['usado'], 2), 'c': round(u['cota'], 2), 'sc': u['semcota'], 't': round(u['t'], 2), 'P': u['posts'], 'X': u['outros']} for l, u in UN.items()},
     'tipo': [[g, ordem(ls)] for g, ls in sorted(grupos.items(), key=lambda kv: -sum(UN[l]['t'] for l in kv[1]))],
     'org': [[st, EXT.get(st, ''), ord_set(RA[st])] for st in SET if st in RA],
     'filhos': FO}
J['un'] = {l: dict(v, r=rotulo_un(l)) for l, v in J['un'].items()}
J['nomes_org'] = NOMES
open(R + 'dados/painel/estrutura-casa.json', 'w').write(json.dumps(J, ensure_ascii=False, separators=(',', ':')))
print('ok', len(J['un']), 'unidades')
