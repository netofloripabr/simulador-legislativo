# Mapa do site SimulaLEGIS (04/11/2026). Lê ferramentas/mapa/mapa.json (a lista oficial do que existe e para onde vai),
# confere cada item com o código (a âncora precisa existir no arquivo) e procura títulos que estão no código mas não no
# mapa. Gera ferramentas/mapa/mapa.html (a página publicada como Artifact privado, "Mapa do SimulaLEGIS").
# Uso: python3 ferramentas/mapa/gerar_mapa.py   → imprime o que não bate; sai com código 1 se houver divergência.
import json, os, re, sys, html
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
M = json.load(open(R + 'ferramentas/mapa/mapa.json'))
esc = lambda s: html.escape(str(s or ''))
CACHE = {}
def ler(f):
    if f not in CACHE:
        try: CACHE[f] = open(R + f, encoding='utf8').read()
        except OSError: CACHE[f] = None
    return CACHE[f]

problemas, nomes = [], []
def conferir(no, cam):
    no['_cam'] = cam + [no['nome']]; nomes.append(no['nome'])
    f, a = no.get('arquivo'), no.get('ancora')
    if f:
        t = ler(f)
        if t is None: problemas.append(('sumiu', ' › '.join(no['_cam']), f'arquivo {f} não existe'))
        elif a and a not in t: problemas.append(('sumiu', ' › '.join(no['_cam']), f'"{a}" não aparece em {f}'))
    for k in no.get('filhos', []): conferir(k, no['_cam'])
for p in M['paginas']: conferir(p, [])

# títulos do código que o mapa ainda não tem (blocos de Parlamentares e títulos do Gabinete)
norm = lambda s: re.sub(r'\W', '', s.lower())
mapa_txt = norm(' '.join(nomes))
achados = []
nv = ler('painel/novos.js') or ''
achados += [('Parlamentares', t.strip()) for t in re.findall(r'<h3(?: data-bl)?>([^<$]{4,60})', nv)]
gb = ler('painel/gabinete.js') or ''
m = re.search(r'const TITULOS = \[(.*?)\]\];', gb, re.S)
if m: achados += [('Gabinete', t) for t in re.findall(r'\["\w+", "([^"]+)"', m.group(1))]
for pg, t in achados:
    if norm(t.split(':')[0])[:14] not in mapa_txt: problemas.append(('novo', pg + ' › ' + t, 'está no código e não está no mapa'))

# página
ST = {'pronto': 'Pronto', 'construcao': 'Em construção', 'prototipo': 'Protótipo', 'planejado': 'Planejado', 'pausado': 'Pausado'}
QU = {'visitante': 'Visitante', 'cadastrado': 'Cadastrado', 'gabinete': 'Gabinete liberado', 'admin': 'Só admin'}
def conta(no, c):
    c[no.get('status', 'pronto')] = c.get(no.get('status', 'pronto'), 0) + 1
    for k in no.get('filhos', []): conta(k, c)
    return c
def item(no, nivel, quem_pai):
    st, qu = no.get('status', 'pronto'), no.get('quem', quem_pai)
    meta = ''.join(f'<span class="m">{esc(x)}</span>' for x in [no.get('dados')] if x)
    extra = (f'<p class="vai">Vai para: {esc(no["vai_para"])}</p>' if no.get('vai_para') else '') + (f'<p class="nt">{esc(no["nota"])}</p>' if no.get('nota') else '')
    onde = f'<code>{esc(no.get("arquivo", ""))}</code>' if no.get('arquivo') else ''
    fil = ''.join(item(k, nivel + 1, qu) for k in no.get('filhos', []))
    busca = esc((no['nome'] + ' ' + (no.get('nota') or '') + ' ' + (no.get('vai_para') or '') + ' ' + (no.get('arquivo') or '')).lower())
    cab = f'<span class="nm">{esc(no["nome"])}</span><span class="tags"><span class="st s-{st}">{ST[st]}</span><span class="qu">{QU.get(qu, qu)}</span></span>'
    corpo = f'<div class="det">{extra}<div class="onde">{onde}{meta}</div></div>' if (extra or onde or meta) else ''
    attrs = f'data-st="{st}" data-qu="{qu}" data-q="{busca}"'
    if fil: return f'<details class="no n{nivel}" {attrs}{" open" if nivel == 0 else ""}><summary>{cab}</summary>{corpo}<div class="fl">{fil}</div></details>'
    return f'<div class="no n{nivel} folha" {attrs}><div class="lin">{cab}</div>{corpo}</div>'

arv = ''.join(f'<section class="pg"><header><h2>{esc(p["nome"])}</h2>' + (f'<span class="url">{esc(p["url"])}</span>' if p.get('url') else '') + f'</header>' + (f'<p class="lead">{esc(p["nota"])}</p>' if p.get('nota') else '') + ''.join(item(k, 0, p.get('quem', 'visitante')) for k in p.get('filhos', [])) + '</section>' for p in M['paginas'])
tot = {}
for p in M['paginas']: conta(p, tot)
resumo = ''.join(f'<button class="f" data-f="{k}" aria-pressed="false"><b>{tot.get(k, 0)}</b>{v}</button>' for k, v in ST.items() if tot.get(k))
movs = []
def acha_mov(no):
    if no.get('vai_para'): movs.append((' › '.join(no['_cam']), no['vai_para']))
    for k in no.get('filhos', []): acha_mov(k)
for p in M['paginas']: acha_mov(p)
probs = ''.join(f'<li class="p-{k}"><b>{"Sumiu do código" if k == "sumiu" else "Sem lugar no mapa"}</b> {esc(a)} <span>{esc(b)}</span></li>' for k, a, b in problemas)
dec = ''.join(f'<li><time>{esc(d)}</time>{esc(t)}</li>' for d, t in M.get('decisoes', []))
mv = ''.join(f'<li><span>{esc(a)}</span><i>→</i><b>{esc(b)}</b></li>' for a, b in movs)
T = open(R + 'ferramentas/mapa/modelo.html', encoding='utf8').read()
out = T.replace('__ATUAL__', esc(M.get('atualizado', ''))).replace('__RESUMO__', resumo).replace('__ARVORE__', arv).replace('__DECISOES__', dec).replace('__MOVS__', mv or '<li>Nenhuma mudança combinada em aberto.</li>') \
       .replace('__PROBS__', probs or '<li class="ok">Tudo o que está no mapa foi encontrado no código, e nenhum título novo ficou de fora.</li>').replace('__NPROB__', str(len(problemas)))
open(R + 'ferramentas/mapa/mapa.html', 'w', encoding='utf8').write(out)
for k, a, b in problemas: print(('SUMIU ' if k == 'sumiu' else 'NOVO  ') + a + ' · ' + b)
print(f'mapa: {sum(tot.values())} itens · {len(problemas)} divergência(s) · ferramentas/mapa/mapa.html')
sys.exit(1 if problemas else 0)
