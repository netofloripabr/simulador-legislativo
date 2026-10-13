# Relatório "10 deputados federais mais votados por município" de uma associação de municípios
# (pedido do usuário em 13/10/2026, para AMFRI e AMVE). Gera HTML em apresentacao/ e o PDF via Chrome headless.
# Uso: python3 ferramentas/relatorio_federal_assoc.py AMFRI "Foz do Rio Itajaí"
import json, sys, os, html, subprocess, datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sigla, nome_assoc = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
base = json.load(open(f"{RAIZ}/dados/painel/sc-base.json"))
fed = json.load(open(f"{RAIZ}/dados/painel/sc-federal.json"))
M = base["mun"]; C = fed["c"]; VAL = fed["val"]
idx = [i for i, m in enumerate(M) if m["assoc"] == sigla]
e = html.escape
ni = lambda x: f"{round(x):,}".replace(",", ".")
pc = lambda x: f"{x:.1f}".replace(".", ",") + "%"
COR = {"PL": "#3D7BFF", "PT": "#E5383B", "NOVO": "#F37021", "MDB": "#34C759", "PSD": "#D9A400", "PP": "#2FB5E8", "UNIÃO": "#2FB5E8", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PSDB": "#1E6FD9", "PDT": "#E5484D", "PSB": "#F2A900", "PSOL": "#C9A400"}
cor = lambda p: next((v for k, v in COR.items() if k in p.upper()), "#8A9096")
foto = lambda n: f"file://{RAIZ}/dados/fotos/sc-2026/federal/{n}.jpg" if os.path.exists(f"{RAIZ}/dados/fotos/sc-2026/federal/{n}.jpg") else ""

def tabela(i_list, titulo, sub, val):
    tot = {c["n"]: sum(c["v"][i] for i in i_list) for c in C}
    top = sorted(C, key=lambda c: -tot[c["n"]])[:10]
    mx = tot[top[0]["n"]] or 1
    linhas = "".join(f'''<tr><td class="r">{k + 1}º</td><td class="ft">{f'<img src="{foto(c["n"])}">' if foto(c["n"]) else ""}</td>
      <td><b>{e(c["u"])}</b><small>{e(c["p"])} · nº {e(c["n"])} · {e(c.get("s") or "")}</small></td>
      <td class="bar"><i style="width:{tot[c["n"]] / mx * 100:.1f}%;background:{cor(c["p"])}"></i></td>
      <td class="v">{ni(tot[c["n"]])}</td><td class="p">{pc(tot[c["n"]] / val * 100 if val else 0)}</td></tr>''' for k, c in enumerate(top))
    return f'''<div class="bloco"><div class="bh"><h2>{e(titulo)}</h2><span>{sub}</span></div><table>{linhas}</table></div>'''

val_assoc = sum(VAL[i] for i in idx)
partes = [tabela(idx, f"{sigla} · {len(idx)} municípios", f"{ni(val_assoc)} votos válidos para deputado federal", val_assoc)]
for i in sorted(idx, key=lambda i: M[i]["n"]):
    partes.append(tabela([i], M[i]["n"], f"{ni(VAL[i])} votos válidos · {ni(M[i]['el'])} eleitores", VAL[i]))

agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
doc = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{sigla} · deputados federais mais votados</title><style>
@font-face{{font-family:Inter;src:url(file://{RAIZ}/fontes/InterVariable.woff2);font-weight:100 900}}
@page{{size:A4;margin:12mm 12mm 14mm}} *{{box-sizing:border-box}} body{{margin:0;font:10px/1.4 Inter,system-ui,sans-serif;color:#0B0D0E;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.cab{{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5px solid #0B0D0E;padding-bottom:6px;margin-bottom:10px}} .wm{{font-size:17px;font-weight:900;letter-spacing:-.03em}} .wm b{{color:#1FA83A}} .wm small{{display:block;font-size:7px;letter-spacing:.2em;color:#6B7178;font-weight:600;text-transform:uppercase}} .meta{{text-align:right;font-size:8.5px;color:#6B7178}} .meta b{{color:#0B0D0E}}
h1{{font-size:24px;font-weight:900;letter-spacing:-.04em;margin:4px 0 2px}} .lead{{color:#6B7178;font-size:9.5px;margin:0 0 12px}}
.grade{{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}} .bloco{{border:.6px solid #D3D6D9;border-radius:10px;padding:8px 10px 6px;break-inside:avoid}} .bloco:first-child{{grid-column:1 / -1;border-color:#1FA83A}}
.bh{{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px}} .bh h2{{font-size:12px;margin:0;font-weight:800}} .bh span{{font-size:7.5px;color:#6B7178}}
table{{width:100%;border-collapse:collapse}} td{{padding:2.5px 3px;border-bottom:.5px solid #EEF0F1;vertical-align:middle}} tr:last-child td{{border-bottom:0}}
td.r{{width:18px;color:#8A9096;font-size:8.5px}} td.ft{{width:20px}} td.ft img{{width:17px;height:17px;border-radius:50%;object-fit:cover;object-position:50% 20%;display:block}} td b{{font-size:9px}} td small{{display:block;font-size:6.8px;color:#8A9096}}
td.bar{{width:24%}} td.bar i{{display:block;height:5px;border-radius:3px}} td.v{{text-align:right;font-weight:800;font-variant-numeric:tabular-nums;width:46px}} td.p{{text-align:right;color:#6B7178;width:36px;font-variant-numeric:tabular-nums}}
.bloco:first-child td b{{font-size:10px}} .bloco:first-child td.ft img{{width:22px;height:22px}}
.rod{{margin-top:12px;font-size:7px;color:#6B7178;border-top:.5px solid #D3D6D9;padding-top:5px}} .ctt{{position:fixed;top:-8mm;right:0;font-size:7px;color:#8A9096}}
</style></head><body><div class="ctt">Dúvidas e sugestões: Neto · (48) 99120-5200</div>
<div class="cab"><div class="wm">Simula<b>LEGIS</b><small>Simulador eleitoral legislativo 2026</small></div><div class="meta"><b>{sigla}{(" · " + e(nome_assoc)) if nome_assoc else ""}</b><br>Eleições 2026 · gerado em {agora}</div></div>
<h1>Deputado federal: os 10 mais votados</h1><p class="lead">Na associação e em cada município da {sigla}. Percentual sobre os votos válidos para deputado federal no recorte.</p>
<div class="grade">{"".join(partes)}</div>
<div class="rod">Dados oficiais do TSE (totalização final 2026). SimulaLEGIS · material de apoio, sem vínculo oficial com a Assembleia. Não é pesquisa eleitoral.</div></body></html>'''
os.makedirs(f"{RAIZ}/apresentacao", exist_ok=True)
saida = f"{RAIZ}/apresentacao/{sigla}-federais-mais-votados"
open(saida + ".html", "w").write(doc)
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", "--virtual-time-budget=8000", f"--print-to-pdf={saida}.pdf", f"file://{saida}.html"], capture_output=True)
print(saida + ".pdf")
