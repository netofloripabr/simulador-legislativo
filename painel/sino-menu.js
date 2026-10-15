/* sino no menu (só administrador, 15/10/2026): item Notificações + luz piscando no botão quando há não lidas */
function sinoMenuAdmin(URL_SB, CHAVE, token){ if(!token) return; var H={"Content-Type":"application/json",apikey:CHAVE,Authorization:"Bearer "+token};
  fetch(URL_SB+"/rest/v1/rpc/sou_admin",{method:"POST",headers:H,body:"{}"}).then(function(r){return r.json();}).then(function(adm){ if(adm!==true) return;
    return fetch(URL_SB+"/rest/v1/rpc/contar_notificacoes_nao_lidas",{method:"POST",headers:H,body:"{}"}).then(function(r){return r.json();}).then(function(n){ n=+n||0;
      var m=document.querySelector(".mnu"), b=document.querySelector(".mnub"); if(!m||!b||m.querySelector(".mnot")) return;
      var a=document.createElement("a"); a.href="../?notif=1"; a.className="mnot"; a.innerHTML='<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5V7.5a4 4 0 0 1 8 0v4l1.2 1.2H2.8z"/><path d="M6.6 14a1.5 1.5 0 0 0 2.8 0"/></svg><span>Notificações</span>'+(n?"<em>"+n+"</em>":""); var ref=m.querySelector(".msim"); ref?ref.before(a):m.prepend(a);
      if(n){ var l=document.createElement("i"); l.className="mluz"; b.appendChild(l); b.title="Menu · "+n+" notificação"+(n>1?"ões":"")+" não lida"+(n>1?"s":""); } }); }).catch(function(){}); }
