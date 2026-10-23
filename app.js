const $=id=>document.getElementById(id);
const STORAGE="atlas_mobile_history_v1";
let lastReport=null;
function getHistory(){try{return JSON.parse(localStorage.getItem(STORAGE)||"[]")}catch{return []}}
function saveHistory(items){localStorage.setItem(STORAGE,JSON.stringify(items.slice(0,50)))}
function setPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.page===id));if(id==="historyPage")renderHistory();window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));
document.querySelectorAll("[data-kind]").forEach(b=>b.addEventListener("click",()=>{$("kind").value=b.dataset.kind;$("query").focus();window.scrollTo({top:0,behavior:"smooth"})}));
function links(query,quoted=false){let q=encodeURIComponent(quoted?`"${query}"`:query);return[
{title:"Google Search",url:`https://www.google.com/search?q=${q}`,type:"Moteur de recherche",note:"Recherche externe : les résultats dépendent de l’indexation du moteur."},
{title:"Bing Search",url:`https://www.bing.com/search?q=${q}`,type:"Moteur de recherche",note:"Ouvre les résultats du moteur dans Safari."},
{title:"DuckDuckGo",url:`https://duckduckgo.com/?q=${q}`,type:"Moteur de recherche",note:"Une source supplémentaire pour comparer les résultats."}
]}
function domainOf(q){return q.replace(/^https?:\/\//i,"").split(/[/?#:]/)[0].replace(/\.$/,"").toLowerCase()}
function validDomain(d){return d.length<=253&&d.includes(".")&&d.split(".").every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(x))}
function makeReport(query,kind){
 let results=[],warnings=[];
 if(kind==="email"){
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query))throw Error("Le format de l’adresse e-mail semble invalide.");
  let domain=query.split("@").pop().toLowerCase();
  results.push(...links(query,true),{title:"RDAP — domaine de l’adresse",url:`https://rdap.org/domain/${encodeURIComponent(domain)}`,type:"RDAP",note:"Informations publiques d’enregistrement du domaine; certaines données peuvent être masquées."},{title:"DNS — enregistrements MX",url:`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,type:"DNS-over-HTTPS",note:"Ouvre la réponse DNS publique pour vérifier les serveurs de messagerie configurés."});
 }else if(kind==="domain"){
  let d=domainOf(query);if(!validDomain(d))throw Error("Saisis un nom de domaine valide, par exemple example.org.");
  results.push({title:"RDAP — enregistrement du domaine",url:`https://rdap.org/domain/${encodeURIComponent(d)}`,type:"RDAP",note:"Données publiques d’enregistrement; les informations du titulaire peuvent être masquées."},{title:"DNS — enregistrements A",url:`https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`,type:"DNS-over-HTTPS",note:"Consulte les adresses IPv4 publiques retournées par le résolveur DNS."},...links(`"${d}"`));
 }else if(kind==="url"){
  let d=domainOf(query);if(!validDomain(d))throw Error("Saisis une URL publique ou un domaine valide.");
  results.push({title:"RDAP — domaine de l’URL",url:`https://rdap.org/domain/${encodeURIComponent(d)}`,type:"RDAP",note:"Informations d’enregistrement du domaine."},...links(`"${query}"`));
 }else{
  results.push(...links(query,kind==="username"));
  if(kind==="username")results.push({title:"GitHub — profils publics",url:`https://github.com/search?q=${encodeURIComponent(query)}&type=users`,type:"Recherche de plateforme",note:"Un pseudonyme identique ne prouve pas que deux profils appartiennent à la même personne."});
 }
 return {id:Date.now(),query,kind,created_at:new Date().toISOString(),results,warnings,disclaimer:"Les liens de recherche ouvrent des sources externes. Vérifie manuellement chaque source; aucune identité n’est confirmée automatiquement."};
}
$("searchForm").addEventListener("submit",e=>{
 e.preventDefault();$("error").classList.add("hidden");$("resultsSection").classList.add("hidden");
 try{
  const report=makeReport($("query").value.trim(),$("kind").value);lastReport=report;
  const history=getHistory();history.unshift(report);saveHistory(history);renderResults(report);$("resultsSection").classList.remove("hidden");$("resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){$("error").textContent=err.message;$("error").classList.remove("hidden")}
});
function renderResults(report){
 $("resultsTitle").textContent=`${report.results.length} pistes · ${report.query}`;
 const container=$("results");container.replaceChildren();
 report.results.forEach(r=>{
  const card=document.createElement("article");card.className="result";
  const head=document.createElement("div");head.className="result-head";
  const title=document.createElement("h3");title.textContent=r.title;
  const tag=document.createElement("span");tag.className="tag";tag.textContent=r.type;head.append(title,tag);
  const p=document.createElement("p");p.textContent=r.note;
  const a=document.createElement("a");a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Ouvrir la source ↗";
  card.append(head,p,a);container.append(card);
 });
}
$("exportBtn").addEventListener("click",()=>{if(!lastReport)return;const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`atlas-rapport-${lastReport.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
function renderHistory(){
 const container=$("history");container.replaceChildren();const items=getHistory();
 if(!items.length){container.textContent="Aucune recherche enregistrée sur cet appareil.";return}
 items.forEach(item=>{
  const row=document.createElement("div");row.className="history-item";const info=document.createElement("div");
  const title=document.createElement("b");title.textContent=item.query;const small=document.createElement("small");small.textContent=`${item.kind} · ${new Date(item.created_at).toLocaleString()}`;info.append(title,small);
  const btn=document.createElement("button");btn.textContent="Ouvrir";btn.addEventListener("click",()=>{lastReport=item;renderResults(item);$("resultsSection").classList.remove("hidden");setPage("searchPage");setTimeout(()=>$("resultsSection").scrollIntoView({behavior:"smooth"}),100)});row.append(info,btn);container.append(row);
 });
}
$("clearHistory").addEventListener("click",()=>{if(confirm("Effacer les recherches conservées dans cet espace ?")){localStorage.removeItem(STORAGE);renderHistory()}});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
