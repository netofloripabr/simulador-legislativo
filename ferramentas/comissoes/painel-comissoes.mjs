// Protótipo do painel Processo Legislativo › Comissões (18/11/2026): proposições que tramitam nas comissões permanentes
// da ALESC, no padrão do painel das emendas (Controle de Recursos). Lê dados/painel/alesc-tramitacao.json (ou o cache
// parcial) e gera um HTML único com os dados embutidos.
// Uso: node ferramentas/comissoes/painel-comissoes.mjs <saida.html>
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), SAI = (process.argv[2] !== "--json" && process.argv[2]) || join(RAIZ, "prototipos/comissoes-tramitacao/painel.html");
const ARQ = join(RAIZ, "dados/painel/alesc-tramitacao.json");
let P, gerado;
if (existsSync(ARQ)) { const J = JSON.parse(readFileSync(ARQ, "utf8")); P = J.proposicoes; gerado = J.gerado; }
else { const C = join(AQUI, "_cache/prop"); P = readdirSync(C).map((f) => JSON.parse(readFileSync(join(C, f), "utf8"))); gerado = new Date().toISOString(); }

// siglas das comissões (as usadas pela ALESC e no relatório de comissões)
const SIG = [[/constitui[çc][ãa]o e justi/i, "CCJ"], [/finan[çc]as/i, "CFT"], [/trabalho/i, "CTA"], [/agricultura/i, "CAG"], [/assuntos municipais/i, "CAM"], [/defesa civil/i, "CDC"],
  [/crian[çc]a/i, "CCA"], [/pessoa com defici/i, "CPD"], [/direitos humanos/i, "CDH"], [/economia/i, "CEC"], [/educa[çc][ãa]o/i, "CEd"], [/esporte/i, "CEL"], [/pesca/i, "CPA"],
  [/drogas/i, "CPCD"], [/relacionamento|mercosul/i, "CRI"], [/sa[úu]de/i, "CSa"], [/seguran[çc]a/i, "CSP"], [/transportes/i, "CTI"], [/turismo/i, "CTu"], [/idos/i, "CDPI"],
  [/consumidor/i, "CDCon"], [/meio ambiente/i, "CMA"], [/animal/i, "CBA"], [/[ée]tica/i, "CED"]];
const sig = (n) => (SIG.find(([re]) => re.test(n)) || [0, n.replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, "").slice(0, 6)])[1];
const curto = (n) => n.replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, "").replace(/, das Relações Internacionais e do Mercosul/i, " e Mercosul").replace(/ e de Legislação Participativa/i, "");

// mini resumo: o objetivo, sem a fórmula introdutória da ementa
const tira = (s) => s.replace(/\s*,?\s*e (dá|adota|estabelece) outras provid[êe]ncias\.?/gi, "").replace(/\s*,?\s*no (âmbito do )?Estado de Santa Catarina/gi, "").replace(/\s+/g, " ").trim();
const maiuscula = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
function resumo(e) { e = tira(e || "").replace(/[“”]/g, '"');
  let m;
  if ((m = e.match(/^Veto (Total|Parcial) ao Projeto de Lei( Complementar)? n?º?\s*([\d.\/]+).*?que\s+"(.+?)"?$/i))) return ["Veto " + m[1].toLowerCase(), `PL${m[2] ? "C" : ""} ${m[3]}: ` + m[4].replace(/^(Disp[õo]e sobre|Institui,?|Altera)\s+/i, "").replace(/"$/, "")];
  if ((m = e.match(/^Declara de utilidade p[úu]blica( estadual)?,?\s*(a|o|as|os)?\s*(.+?)(,? (de|do|da|com sede|situad)[^,]*)?,?\s+e altera/i))) return ["Utilidade pública", maiuscula(m[3].trim())];
  if ((m = e.match(/^Declara integrante do Patrim[ôo]nio Cultural[^,]*?\s+(o|a|os|as)?\s*(.+?)(,|\s+e altera)/i))) return ["Patrimônio cultural", maiuscula(m[2].trim())];
  if ((m = e.match(/^Denomina\s+(.+)/i))) return ["Denominação", maiuscula(m[1].replace(/\s*,?\s*e altera.*$/i, "").trim())];
  if ((m = e.match(/^Altera .*?[,\s](para|a fim de|com o objetivo de)\s+(.+)$/i))) return ["Altera lei", maiuscula(m[2].replace(/\.$/, ""))];
  if ((m = e.match(/^Altera (a |o )?(Lei|Lei Complementar|art\.?|arts\.?|Anexo|Constitui)[^"]*"(.+?)"/i))) return ["Altera lei", "Muda: " + m[3].replace(/^(Disp[õo]e|Institui|Cria|Estabelece) (sobre )?/i, "").replace(/\.$/, "")];
  if ((m = e.match(/^Institui\s+(.+)/i))) return ["Cria", maiuscula(m[1].replace(/\.$/, ""))];
  if ((m = e.match(/^(Cria|Estabelece|Autoriza|Concede|Proíbe|Obriga|Assegura|Garante|Reconhece|Regulamenta|Fixa|Define|Revoga|Acrescenta|Susta|Inclui|Modifica|Ratifica|Aprova)\s+(.+)/i))) return [maiuscula(m[1].toLowerCase()), maiuscula(m[2].replace(/\.$/, ""))];
  if ((m = e.match(/^Disp[õo]e sobre\s+(.+)/i))) return ["Trata de", maiuscula(m[1].replace(/\.$/, ""))];
  return ["", maiuscula(e.replace(/\.$/, ""))]; }
// ementa escrita toda em maiúsculas vira texto normal (siglas de até 5 letras continuam maiúsculas)
const caixa = (s) => { const l = (s.match(/\p{L}/gu) || []).length, u = (s.match(/\p{Lu}/gu) || []).length; if (!l || u / l < .6) return s; const t = s.toLowerCase().replace(/\b(sc|sus|icms|ipva|tea|loa|ldo|alesc|cnpj|pl|plc|pec)\b/g, (m) => m.toUpperCase()); return t[0].toUpperCase() + t.slice(1); };
const corta = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/[ ,;:]+\S*$/, "") + "…" : s;
const TEMAS = [["Utilidade pública", /utilidade p[úu]blica/i], ["Patrimônio e datas", /patrim[ôo]nio cultural|calend[áa]rio|dia estadual|semana estadual|m[êe]s estadual|denomina/i], ["Saúde", /sa[úu]de|hospital|m[ée]dic|doen[çc]a|c[âa]ncer|vacina|sus\b/i],
  ["Educação", /educa|escola|ensino|estudant|aluno|professor/i], ["Segurança", /seguran[çc]a p[úu]blica|pol[íi]cia|crime|viol[êe]ncia|penal|presos?\b/i], ["Animais", /anima(l|is)|c[ãa]es|gatos|fauna/i],
  ["Tributos e finanças", /tribut|imposto|icms|ipva|fiscal|or[çc]ament|cr[ée]dito suplementar|fundo/i], ["Servidores", /servidor|cargo|carreira|remunera|vencimento|quadro de pessoal/i], ["Meio ambiente", /ambient|clim|res[íi]duo|[áa]gua|florest/i],
  ["Pessoas com deficiência", /defici[êe]ncia|autis|tea\b/i], ["Mulheres e família", /mulher|fam[íi]lia|g[êe]nero|gestant|m[ãa]es?\b/i], ["Trânsito e transporte", /tr[âa]nsito|rodovi|transporte|ve[íi]culo/i]];
const tema = (e) => (TEMAS.find(([, re]) => re.test(e)) || ["Outros"])[0];
const dias = (a, b) => a && b ? Math.round((new Date(b) - new Date(a)) / 864e5) : null, HOJE = new Date().toISOString().slice(0, 10);

const L = P.map((p) => { const [tipo, num, ano] = (p.cod.match(/^([A-Z]+)\.?\/(\d+)\/(\d{4})/) || [0, p.cod, "", ""]).slice(1);
  const chegou = [...(p.tram || [])].reverse().find((t) => t.para === p.setor), [verbo, txt] = resumo(p.ementa);
  const C = (p.comissoes || []).map((c) => { const r = c.relatores[c.relatores.length - 1] || null, st = c.parecer ? "ok" : c.nome === p.setor ? "atual" : r && r.concl ? "ok" : "falta";
    return { s: sig(c.nome), n: curto(c.nome), st, rel: r ? r.relator : null, dist: r ? r.dist : null, concl: r ? r.concl : null, par: c.parecer ? c.parecer.res.replace(/^Parecer /, "") : null, part: c.parecer ? c.parecer.txt : null }; });
  if (!C.some((c) => c.st === "atual")) C.push({ s: sig(p.setor), n: curto(p.setor), st: "atual", rel: null });
  const atual = C.find((c) => c.st === "atual");
  return { id: p.id, tipo: tipo.replace(/\.$/, ""), num: String(+num || num), ano, autor: (p.autoria || "").replace(/^Deputad[oa] /, ""), ementa: caixa(p.ementa || ""), verbo, resumo: corta(caixa(txt), 150), tema: tema(p.ementa), prot: p.entrada,
    com: curto(p.setor), csig: sig(p.setor), chegou: chegou ? chegou.d : null, dias: dias(chegou ? chegou.d : null, HOJE), rel: atual ? atual.rel : null, relDist: atual ? atual.dist : null, sit: p.situacao, fluxo: C,
    tram: (p.tram || []).filter((t) => t.d && t.sit).map((t) => [t.d, t.sit, t.para]) }; });
const COMS = [...new Set(L.map((x) => x.com))].sort((a, b) => L.filter((x) => x.com === b).length - L.filter((x) => x.com === a).length);
const dados = { gerado, total: L.length, coms: COMS.map((c) => [c, sig(c)]), L };

// --json <arquivo>: só os dados prontos para o site (o painel do Gabinete lê este arquivo); tramitação só os 10 últimos passos
if (process.argv.includes("--json")) { const out = process.argv[process.argv.indexOf("--json") + 1];
  dados.L.forEach((x) => { x.tram = x.tram.slice(-10); x.fluxo.forEach((c) => { Object.keys(c).forEach((k) => c[k] == null && delete c[k]); }); Object.keys(x).forEach((k) => x[k] == null && delete x[k]); });
  writeFileSync(out, JSON.stringify(dados)); console.log("ok", out, dados.L.length); process.exit(0); }
const html = readFileSync(join(AQUI, "painel-comissoes.html"), "utf8").replace("/*DADOS*/null", JSON.stringify(dados));
writeFileSync(SAI, html); console.log("ok", SAI, L.length, "proposições");
