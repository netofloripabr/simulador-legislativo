// Apuração dos duelos (13/10/2026): pontua cada lado com calculo/pontuacao.js (regra dos três ícones)
// contra o resultado oficial (dados/painel/sc-estadual.json) e gera /tmp/apurar.sql (encerra o duelo,
// grava pontos e vencedor, avisa os dois no sino). Entrada: /tmp/duelos.json exportado do banco (status selado).
// Duelo: soma dos pontos dos candidatos em que o lado pôs votos; empate = sem vencedor; sem prêmio em SL.
const fs=require("fs");
const src=fs.readFileSync("calculo/pontuacao.js","utf8"); eval(src+";global.pontuarCedulaCargo=pontuarCedulaCargo;");
const D=JSON.parse(fs.readFileSync("dados/painel/sc-estadual.json","utf8"));
const slug=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const porNome={}; D.c.forEach(c=>{ porNome[slug(c.nome)]=c; porNome[slug(c.u)]=porNome[slug(c.u)]||c; });
const duelos=JSON.parse(fs.readFileSync("/tmp/duelos.json","utf8")); const out=[], sql=[];
for(const d of duelos){
  const esc=d.esc||[]; let semMatch=0;
  const oficiais=esc.map(e=>{ const pp=slug(e.partido); const resto=e.chave.startsWith(pp+"-")?e.chave.slice(pp.length+1):e.chave; const c=porNome[resto]||porNome[slug(e.nome)]; if(!c){semMatch++; return null;} return {chave:e.chave, partido:e.partido, votosReais:c.t, eleitoReal:/^eleito/i.test(c.s||""), status:"valido"}; }).filter(Boolean);
  const lado=(v)=>{ const prev=(v||[]).filter(x=>Number(x.votos)>0).map(x=>({chave:x.chave, votos:Number(x.votos), marcadoEleito:true})); const r=pontuarCedulaCargo(prev, oficiais, esc.length); return Math.round(r.pontos); };
  const pc=lado(d.vc), pd=lado(d.vd); const venc=pc>pd?d.c:pd>pc?d.d:null;
  out.push([d.nome, esc.length, semMatch, pc, pd, venc?(venc===d.c?"criador":"desafiado"):"empate"]);
  sql.push(`update desafios set status='encerrado', pontos_criador=${pc}, pontos_desafiado=${pd}, vencedor_id=${venc?`'${venc}'`:"null"} where id='${d.id}' and status='selado';`);
  for(const [p,meu,ou] of [[d.c,pc,pd],[d.d,pd,pc]]) sql.push(`select public.criar_notificacao_interna('${p}','desafio_apurado','Duelo apurado: ${String(d.nome).replace(/[“”"']/g,"").replace(/'/g,"")}','${meu>ou?"Você venceu":meu<ou?"Você perdeu":"Empate"} por ${meu} a ${ou} pontos na apuração oficial de 2026.');`);
}
console.table(out); fs.writeFileSync("/tmp/apurar.sql",sql.join("\n"));
const miss=new Set(); for(const d of duelos) for(const e of d.esc||[]){ const pp=slug(e.partido); const resto=e.chave.startsWith(pp+"-")?e.chave.slice(pp.length+1):e.chave; if(!(porNome[resto]||porNome[slug(e.nome)])) miss.add(e.partido+" | "+e.nome+" | "+e.chave); }
console.log([...miss].slice(0,40).join("\n"), miss.size);
const ar=duelos[0]; console.log("arisia vd:", JSON.stringify(ar.vd).slice(0,200));
