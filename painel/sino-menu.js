/* sino no menu (só administrador, 15/10/2026): item Notificações + luz piscando no botão quando há não lidas */
function sinoMenuAdmin(URL_SB, CHAVE, token){ if(!token) return; var H={"Content-Type":"application/json",apikey:CHAVE,Authorization:"Bearer "+token};
  fetch(URL_SB+"/rest/v1/rpc/sou_admin",{method:"POST",headers:H,body:"{}"}).then(function(r){return r.json();}).then(function(adm){ if(adm!==true) return;
    poeGabinete(); try{localStorage.setItem("sl_gab","1")}catch(e){}
    return fetch(URL_SB+"/rest/v1/rpc/contar_notificacoes_nao_lidas",{method:"POST",headers:H,body:"{}"}).then(function(r){return r.json();}).then(function(n){ n=+n||0;
      var m=document.querySelector(".mnu"), b=document.querySelector(".mnub"); if(!m||!b||m.querySelector(".mnot")) return;
      var a=document.createElement("a"); a.href="../?notif=1"; a.className="mnot"; a.innerHTML='<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5V7.5a4 4 0 0 1 8 0v4l1.2 1.2H2.8z"/><path d="M6.6 14a1.5 1.5 0 0 0 2.8 0"/></svg><span>Notificações</span>'+(n?"<em>"+n+"</em>":""); var ref=m.querySelector(".msim"); ref?ref.before(a):m.prepend(a);
      if(n){ var l=document.createElement("i"); l.className="mluz"; b.appendChild(l); b.title="Menu · "+n+" notificação"+(n>1?"ões":"")+" não lida"+(n>1?"s":""); } }); }).catch(function(){}); }

/* link Gabinete (só administrador): na barra do topo e no menu; refaz se a página redesenhar o topo */
function hrefGab(){ return "gabinete.html"; } /* o Gabinete abre no parlamentar vinculado à conta (gab_vinculo) */
function poeGabinete(){ document.querySelectorAll("a[href^='gabinete']").forEach(function(a){ if(!/\?d=/.test(a.getAttribute("href"))||a.dataset.g!=="1"){ a.href=hrefGab(); a.dataset.g="1"; } }); var nv=document.querySelector(".sl-nav"); if(nv&&!nv.querySelector(":scope > a[href^='gabinete']")){ var t=document.createElement("a"); t.href=hrefGab(); t.dataset.g="1"; t.textContent="Gabinete"; var w=nv.querySelector(":scope > .mnuw"); w?w.before(t):nv.appendChild(t); }
  var mg=document.querySelector(".mnu"); if(mg&&!mg.querySelector(".mgab")){ var g=document.createElement("a"); g.href=hrefGab(); g.dataset.g="1"; g.className="mgab"; g.textContent="Gabinete"; mg.appendChild(g); } }
(function(){ var on=false; try{on=localStorage.getItem("sl_gab")==="1"}catch(e){} if(!on) return; var go=function(){ poeGabinete(); var tp=document.querySelector(".topo"); if(tp) new MutationObserver(function(){ poeGabinete(); }).observe(tp,{childList:true,subtree:true}); };
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go(); })();

/* Trilho dos painéis (24/10/2026): à esquerda um grupo de fundo cinza escuro, sem borda, com o seletor do painel
   (lista: Gabinete, Parlamentares, Mesa, Ranking) e, na sequência, os subtítulos do painel aberto (.gsecs no
   Gabinete, .sl-meio na Mesa). À direita só o estado (.sl-uf) e o menu. Padrão das quatro páginas. */
(function(){
  var PAIN=[["gabinete.html","Gabinete"],["novos.html?v=8","Parlamentares"],["mesa.html?v=8","Mesa"],["index.html?v=8#ranking","Ranking"]];
  function atual(){ var p=location.pathname; if(/gabinete/.test(p)) return "Gabinete"; if(/mesa/.test(p)) return "Mesa"; if(/novos/.test(p)) return "Parlamentares"; return "Ranking"; }
  function montar(){
    var t=document.getElementById("topoSL"), wm=t&&t.querySelector(".wm"); if(!wm) return;
    var tr=t.querySelector(".sl-trilho");
    if(!tr){ var on=false; try{on=localStorage.getItem("sl_gab")==="1"}catch(e){} var a=atual(), ps=PAIN.filter(function(p){ return p[1]!=="Gabinete"||on||a==="Gabinete"; });
      tr=document.createElement("div"); tr.className="sl-trilho";
      tr.innerHTML='<span class="psel"><button class="pselb" aria-haspopup="listbox" title="Trocar de painel">'+a+'<svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 1l4 4 4-4"/></svg></button><span class="psell" hidden>'+ps.map(function(p){ return '<a href="'+(p[1]==="Gabinete"&&typeof hrefGab==="function"?hrefGab():p[0])+'"'+(p[1]===a?' class="on"':'')+'>'+p[1]+'</a>'; }).join("")+'</span></span><span class="sl-subs"></span>';
      var uf=t.querySelector(".sl-uf"); (uf&&uf.previousElementSibling===wm?uf:wm).after(tr);
      var bt=tr.querySelector(".pselb"), l=tr.querySelector(".psell"), mud=function(v){ l.hidden=!v; bt.classList.toggle("ab",v); };
      bt.onclick=function(e){ e.stopPropagation(); mud(l.hidden); }; document.addEventListener("click",function(){ mud(false); });
      t.classList.add("com-trilho"); }
    if(!document.querySelector(".sl-uf")&&window.slPorUF) window.slPorUF();
    var subs=tr.querySelector(".sl-subs"), g=t.querySelector(".gsecs, .sl-meio, .secs"); if(g&&g.parentNode!==subs) subs.appendChild(g);
    // Parlamentares: o estado fica ao lado direito de "Estaduais / Federais", não no topo
    var ufa=document.querySelector(".sl-uf"), cg=document.querySelector(".cgBox .cgTab");
    if(ufa&&cg){ var rw=cg.parentNode.classList.contains("cgRow")?cg.parentNode:null; if(!rw){ rw=document.createElement("div"); rw.className="cgRow"; cg.before(rw); rw.appendChild(cg); } if(ufa.parentNode!==rw) rw.appendChild(ufa); ufa.style.marginLeft=""; var sv0=t.querySelector(".sl-nav")||t.querySelector(".mnuw"); if(sv0) sv0.style.marginLeft="auto"; return; }
    var uf2=t.querySelector(".sl-uf"), mw=t.querySelector(".mnuw"), alvo=mw; while(alvo&&alvo.parentNode!==t) alvo=alvo.parentNode; if(uf2&&alvo&&uf2.nextElementSibling!==alvo) alvo.before(uf2);
    // o estado vai para a direita, junto do menu: zera a margem automática que a lista de Parlamentares deixou no menu (senão o espaço se divide e o "SC" fica no meio)
    if(uf2){ uf2.style.marginLeft="auto"; [t.querySelector(".sl-nav"), mw].forEach(function(x){ if(x&&x!==uf2) x.style.marginLeft=""; }); } else { var sv=t.querySelector(".sl-nav")||mw; if(sv) sv.style.marginLeft="auto"; }
  }
  var go=function(){ montar(); var t=document.getElementById("topoSL"); if(t) new MutationObserver(function(){ montar(); }).observe(t,{childList:true,subtree:true}); var ap=document.getElementById("app"); if(ap) new MutationObserver(function(){ montar(); }).observe(ap,{childList:true}); };
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go();
  window.slTrilho=montar;
})();
