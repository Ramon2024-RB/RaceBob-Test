(function(){
"use strict";
/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);
const today = () => { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const fmtDate = d => { if(!d) return ""; const [y,m,t]=d.split("-"); return `${t}.${m}.${y}`; };
const num = v => { if(v==null||v==="") return null; const n=parseFloat(String(v).replace(",",".").replace(/[^\d.\-]/g,"")); return isNaN(n)?null:n; };
const fmtNum = (n,d=1) => n==null? "–" : n.toFixed(d).replace(".",",");
function lapSec(s){ if(!s) return null; s=String(s).trim().replace(/,/g,"."); let mm=0, ss=s;
  if(s.includes(":")){ [mm,ss]=s.split(":"); } else if((s.match(/\./g)||[]).length===2){ const i=s.indexOf("."); mm=s.slice(0,i); ss=s.slice(i+1); }
  if(!/^\d+$/.test(String(mm))||!/^\d+(\.\d+)?$/.test(ss)) return null; return (+mm)*60 + +ss; }
function fmtLap(sec){ if(sec==null) return "–"; const m=Math.floor(sec/60); const r=(sec-m*60).toFixed(3).padStart(6,"0").replace(/0+$/,"").replace(/\.$/,""); return m?`${m}:${r.padStart(2,"0")}`:r; }
const byId = (arr,id) => arr.find(x=>x.id===id);

/* ================= field catalogue (from the setup sheet) ================= */
const FIELDS = [
  {g:"Federbein", k:"s_spring",  l:"Feder",            u:"N/mm"},
  {g:"Federbein", k:"s_preload", l:"Vorspannung",      u:"mm"},
  {g:"Federbein", k:"s_length",  l:"Länge",            u:"mm"},
  {g:"Federbein", k:"s_setting", l:"Setting",          u:"", text:true},
  {g:"Federbein", k:"s_reb",     l:"Zugstufe",         u:"Klicks"},
  {g:"Federbein", k:"s_comp",    l:"Druckstufe",       u:"Klicks"},
  {g:"Federbein", k:"s_compL",   l:"Druckstufe Low",   u:"Klicks"},
  {g:"Federbein", k:"s_compH",   l:"Druckstufe High",  u:"Klicks"},
  {g:"Gabel",     k:"f_spring",  l:"Feder",            u:"N/mm"},
  {g:"Gabel",     k:"f_preload", l:"Vorspannung",      u:"Umdr./mm"},
  {g:"Gabel",     k:"f_position",l:"Position / Überstand", u:"mm"},
  {g:"Gabel",     k:"f_setting", l:"Setting",          u:"", text:true},
  {g:"Gabel",     k:"f_reb",     l:"Zugstufe",         u:"Klicks"},
  {g:"Gabel",     k:"f_comp",    l:"Druckstufe",       u:"Klicks"},
  {g:"Gabel",     k:"f_air",     l:"Luftpolster",      u:"mm"},
  {g:"Sonstiges", k:"steer",     l:"Lenkungsdämpfer",  u:"Klicks"},
  {g:"Sonstiges", k:"g_front",   l:"Ritzel",           u:"Z"},
  {g:"Sonstiges", k:"g_rear",    l:"Kettenrad",        u:"Z"},
  {g:"Reifen",    k:"t_brandF",  l:"Marke / Modell vorne",  u:"", text:true},
  {g:"Reifen",    k:"t_brandR",  l:"Marke / Modell hinten", u:"", text:true},
  {g:"Reifen",    k:"t_compF",   l:"Mischung vorne",   u:"", text:true},
  {g:"Reifen",    k:"t_compR",   l:"Mischung hinten",  u:"", text:true},
  {g:"Reifen",    k:"t_pF",      l:"Druck vorne",      u:"bar"},
  {g:"Reifen",    k:"t_pR",      l:"Druck hinten",     u:"bar"}
];
const GROUPS = ["Federbein","Gabel","Sonstiges","Reifen","Eigene"];
function bikeFields(b){
  const hidden = new Set((b&&b.hidden)||[]);
  return FIELDS.filter(f=>!hidden.has(f.k)).concat(((b&&b.custom)||[]).map(c=>({g:"Eigene",k:c.k,l:c.l,u:c.u||"",text:false})));
}
const fieldLabel = (b,k) => { const f=bikeFields(b).find(x=>x.k===k)||FIELDS.find(x=>x.k===k); return f? (f.g==="Federbein"?"Federbein ":f.g==="Gabel"?"Gabel ":f.g==="Reifen"&&!/vorne|hinten/.test(f.l)?"Reifen ":"")+f.l : k; };
const DYN = [["brake","Bremsstabilität"],["handling","Handling"],["corner","Kurvengeschwindigkeit"],["accel","Stabilität beim Beschleunigen"]];
const DYNV = {gut:["gut","good"],ok:["geht","mid"],problem:["Problem","bad"]};
const PACK_SUGGEST = {
  "Fahrer":["Helm 1+2","Lederkombi 1+2","Stiefel 1+2","Handschuhe 1+2","Airbag","Rückenprotektor","Funktionsunterwäsche 1+2","Halstuch","Gehörschutz","Knieschleifer","Visier hell / dunkel","Visierreiniger & Tear-Offs","Intercom + Kabel","Regenkombi","Mütze / Cap","Schweißhandtuch","Motorrad-/Ersatzschlüssel"],
  "Werkzeug":["Werkzeugkiste","Ratschkasten","Drehmomentschlüssel","Kerzenschlüssel","Hakenschlüssel Federbein","Maßband (Negativfederweg)","Bremsenentlüfter","Zentralständer","Montageständer vorne","Montageständer hinten","Sicherungsdraht & Zange","Trichter klein / groß","Benzinkanister","Luftdruckprüfer","Kompressor","Infrarot Thermometer","dB Messgerät"],
  "Technik & Teile":["Reifenwärmer","Rennreifen + Felgen","Regenreifen + Felgen","Laptimer","Startnummern","Ersatzteilkiste","Bremsbeläge","Bremshebel","Kupplungshebel","Schalthebel","Fußrasten","Ritzel / Kettenrad","Kettenschloss","Schraubenkiste","Splinte","Zündkerzen","Bremsflüssigkeit","Motoröl","Kühlflüssigkeit / dest. Wasser","Bremsenreiniger","Kettenspray","Pflegemittel","Kabelbinder","Tape","Lappen","dB-Eater","Ladegerät (Batterie)","Spanngurte","Rampe (Ein-/Ausladen)","Teppich","Kabeltrommel","Campingadapter","Ventilator","Klapptisch"],
  "Papiere & Geld":["Papiere / Anmeldung Training","Ausweis","Führerschein","Fahrzeugbrief (bei Auslandsfahrt)","Auslandsversicherungsdaten","EC- / Kreditkarte","Geldbeutel","Bargeld"],
  "Fahrerlager & Camping":["Pavillon / Zelt","Klappstuhl","Feldbett","Isomatte","Schlafsack","Bettzeug","Kissen","Heizlüfter","Mehrfachsteckdose","Taschenlampe","Boxenuhr","Kugelschreiber","Setup-Notizen","Kleber","Werkstatt-Handschuhe","Küchenrolle & Müllsack","Handtuch","Erste-Hilfe-Set","Sonnenmilch","Grill","Kühlbox","Getränke","Essen","Riegel","Shaker","Supps","Insta360 inkl. Zubehör"],
  "Elektronik":["Handy inkl. Ladegerät","Ladekabel","Ladegeräte","Powerbank","Tablet","Kopfhörer"],
  "Kleidung":["Jacke","Pullover","Klamotten","T-Shirts","kurze Hosen","lange Hosen","Jogging Hosen","Unterhosen","Socken","Adiletten","Badeschuhe","Badehose","Sonnenbrille"],
  "Hygiene":["Deo","Zahnbürste + Pasta","Duschgel","Bürste","Föhn","Labello","Taschentücher","Nasenspray","Augentropfen","Melatonin"]
};

/* ================= state ================= */
const SECTIONS = ["bikes","gear","pack","service","tracks"];
const S = {bikes:[], gear:[], pack:[], service:[], tracks:[], days:[]};
const LS_KEY="trackbook_v2", LS_DIRTY="trackbook_v2_dirty";
let dirty = {};
function loadLocal(){
  try{ const d=JSON.parse(localStorage.getItem(LS_KEY)||"null"); if(d) for(const k in S) if(Array.isArray(d[k])) S[k]=d[k]; }catch(e){}
  try{ dirty=JSON.parse(localStorage.getItem(LS_DIRTY)||"{}")||{}; }catch(e){ dirty={}; }
  migrate();
}
function migrate(){ // v2.1: tyre brand split into front/rear
  const fix=o=>{ if(o&&o.t_brand!=null){ if(o.t_brandF==null) o.t_brandF=o.t_brand; if(o.t_brandR==null) o.t_brandR=o.t_brand; delete o.t_brand; } };
  S.bikes.forEach(b=>{ fix(b.base); if(b.hidden&&b.hidden.includes("t_brand")) b.hidden=b.hidden.filter(k=>k!=="t_brand").concat(["t_brandF","t_brandR"]); });
  S.days.forEach(d=>{ fix(d.start); (d.stints||[]).forEach(st=>fix(st.changes)); });
}
function saveLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); localStorage.setItem(LS_DIRTY, JSON.stringify(dirty)); }catch(e){} }

/* ================= sync: private per-person store when available, else device only ================= */
let db=null, userId=null; const deferred={};
const sheetIsOpen = () => { const w=document.getElementById("sheetWrap"); return !!(w&&w.classList.contains("open")); };
function runDeferred(){ setTimeout(()=>{ Object.keys(deferred).forEach(k=>{ const f=deferred[k]; delete deferred[k]; try{ f(); }catch(e){} }); },0); }
const writing={}, again={}, timers={};
function setSync(mode,msg){
  const el=$("#sync");
  el.textContent={local:"Auf dem Gerät",loading:"Lädt …",ok:"Synchron",pending:"Speichert …",offline:"Offline"}[mode]||mode;
  el.className="sync"+(mode==="ok"?" ok":mode==="offline"?" warn":"");
  el.title=msg||"";
}
const secRef = name => db.collection("data/users/"+userId).doc("tb2_"+name);
const dayCol = () => db.doc("data/users/"+userId+"/tb2").collection("days");
function markDirty(k){ dirty[k]=true; saveLocal(); }
function clearDirty(k){ delete dirty[k]; saveLocal(); }
function badge(){ if(db) setSync(Object.keys(dirty).length?"pending":"ok"); }
function changed(section){
  markDirty(section); render();
  if(!db) return;
  clearTimeout(timers[section]); timers[section]=setTimeout(()=>flushSection(section),600); badge();
}
async function flushSection(section){
  if(!db) return;
  if(writing[section]){ again[section]=true; return; }
  writing[section]=true;
  try{ await secRef(section).set({items:S[section], updated:Date.now()}); clearDirty(section); }
  catch(e){ writeErr(e, ()=>flushSection(section)); }
  writing[section]=false;
  if(again[section]){ again[section]=false; return flushSection(section); }
  badge();
}
function dayChanged(id){ markDirty("day:"+id); render(); if(db) flushDay(id); }
async function flushDay(id){
  const key="day:"+id;
  if(writing[key]){ again[key]=true; return; }
  writing[key]=true; badge();
  try{ const d=byId(S.days,id); if(d) await dayCol().doc(id).set(d); else await dayCol().doc(id).delete(); clearDirty(key); }
  catch(e){ writeErr(e, ()=>flushDay(id)); }
  writing[key]=false;
  if(again[key]){ again[key]=false; return flushDay(id); }
  badge();
}
function writeErr(e, retry){
  const c=e&&e.code;
  if(["invalid_argument","not_granted","capability_disabled","capability_removed","revoked"].includes(c)){ db=null; setSync("local","Speichert nur auf diesem Gerät"); return; }
  if(c==="quota_exceeded"){ setSync("offline","Speicher voll"); return; }
  setSync("offline","Keine Verbindung, neuer Versuch gleich"); setTimeout(retry,5000);
}
async function initSync(){
  if(!(window.claude && typeof window.claude.use==="function")){ setSync("local"); return; }
  setSync("loading");
  let d=null,u=null;
  try{ [d,u]=await Promise.all([window.claude.use("db"), window.claude.use("user")]); }catch(e){}
  if(!d||!u){ setSync("local"); return; }
  try{ userId=await u.id(); }catch(e){ userId=null; }
  if(!userId){ setSync("local"); return; }
  db=d;
  let confirmed=0; const need=SECTIONS.length+1;
  const timer=setTimeout(()=>{ if(confirmed<need) setSync("offline","Server nicht erreichbar, zeige Daten von diesem Gerät"); },10000);
  const done=()=>{ if(++confirmed===need){ clearTimeout(timer); badge(); } };
  SECTIONS.forEach(name=>{
    let first=true;
    secRef(name).onSnapshot(snap=>{
      const def=!snap.metadata.fromCache;
      if(dirty[name]||writing[name]){ if(def&&first){ first=false; done(); flushSection(name); } return; }
      if(snap.exists){ const it=(snap.data()||{}).items; if(Array.isArray(it)){ const apply=()=>{ if(dirty[name]||writing[name]) return; S[name]=JSON.parse(JSON.stringify(it)); migrate(); saveLocal(); render(); };
        if(sheetIsOpen()) deferred[name]=apply; else apply(); } }
      else if(def && S[name].length){ markDirty(name); flushSection(name); }
      if(def&&first){ first=false; done(); }
    }, ()=>setSync("offline","Sync unterbrochen"));
  });
  let first=true;
  dayCol().onSnapshot(qs=>{
    const def=!qs.metadata.fromCache;
    if(sheetIsOpen() && !(def&&first)){ deferred.days=()=>applyDays(qs,false); return; }
    applyDays(qs, def);
  }, ()=>setSync("offline","Sync unterbrochen"));
  function applyDays(qs, def){
    const remote=qs.docs.map(x=>JSON.parse(JSON.stringify(x.data())));
    const map=new Map(remote.map(t=>[t.id,t]));
    for(const k in dirty){ if(!k.startsWith("day:")) continue; const id=k.slice(4); const loc=byId(S.days,id); if(loc) map.set(id,loc); else map.delete(id); }
    if(def&&first){
      if(remote.length===0) S.days.forEach(t=>{ if(!map.has(t.id)){ map.set(t.id,t); markDirty("day:"+t.id); } });
      for(const k in dirty) if(k.startsWith("day:")) flushDay(k.slice(4));
    }
    S.days=[...map.values()]; migrate(); saveLocal(); render();
    if(def&&first){ first=false; done(); }
  }
}

/* ================= derived data ================= */
const bikeName = id => (byId(S.bikes,id)||{}).name || "–";
const WD=["So","Mo","Di","Mi","Do","Fr","Sa"];
const evDays = d => Math.max(1, parseInt(d.dayCount)||1);
function dayDate(d,k){ if(!d.date) return ""; const x=new Date(d.date+"T12:00:00"); x.setDate(x.getDate()+k-1); return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10); }
const wd = iso => iso? WD[new Date(iso+"T12:00:00").getDay()] : "";
function dateRange(d){ const n=evDays(d); if(n===1) return fmtDate(d.date); const a=fmtDate(d.date), b=fmtDate(dayDate(d,n)); return a.slice(0,6)+"–"+b; }
function stintLabel(d,i){ const st=(d.stints||[])[i]||{}; if(evDays(d)===1) return "Stint "+(i+1); const day=st.day||1; const k=(d.stints||[]).slice(0,i).filter(x=>(x.day||1)===day).length+1; return `Tag ${day} · Stint ${k}`; }
const stintDate = (d,i) => dayDate(d, ((d.stints||[])[i]||{}).day||1);
const eventName = d => d.title || d.track || "Event";
const fahrtage = () => S.days.reduce((a,d)=>a+evDays(d),0);
const daysSorted = () => S.days.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.created||0)-(a.created||0));
const daysOfBike = id => S.days.filter(d=>d.bikeId===id).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.created||0)-(b.created||0));
function setupAt(day, n){ // setup in force for stint n (1-based); n=0 → start setup
  const s=Object.assign({}, day.start||{});
  (day.stints||[]).slice(0,n).forEach(st=>Object.assign(s, st.changes||{}));
  return s;
}
const endSetup = day => setupAt(day,(day.stints||[]).length);
function currentSetup(bikeId){
  const b=byId(S.bikes,bikeId); const ds=daysOfBike(bikeId);
  return ds.length? endSetup(ds[ds.length-1]) : Object.assign({}, (b&&b.base)||{});
}
function diff(prev, next, keys){ const out={}; keys.forEach(k=>{ const a=(prev[k]??"")+"", b=(next[k]??"")+""; if(a!==b) out[k]=next[k]??""; }); return out; }
function dayBest(d){ let best=null; (d.stints||[]).forEach(s=>{ const v=lapSec(s.lap); if(v!=null&&(best==null||v<best)) best=v; }); return best; }
function trackBests(){
  const m={};
  S.days.forEach(d=>{ const b=dayBest(d); if(b==null||!d.track) return; const k=d.track.trim(); if(!m[k]||b<m[k].best) m[k]={best:b,day:d}; });
  return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
}
const tracksKnown = () => [...new Set(S.days.map(d=>(d.track||"").trim()).filter(Boolean))].sort();
const ridersKnown = () => [...new Set(S.days.map(d=>(d.rider||"").trim()).filter(Boolean))].sort();
const valFmt = (f,v) => (v==null||v==="")? "–" : esc(v)+(f&&f.u&&!f.text&&/^[\d.,\-\/ ]+$/.test(String(v))? ` <span class="muted" style="font-size:12px;font-weight:400">${esc(f.u)}</span>`:"");
const ratio = (fr,rr) => { const a=num(fr), b=num(rr); return a&&b? b/a : null; };

/* ================= navigation ================= */
const TABS=[
  {id:"home",label:"Start",icon:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'},
  {id:"days",label:"Events",icon:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'},
  {id:"bikes",label:"Bikes",icon:'<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16l4-7h5l4 7M14 9l-2-3h-2M9.5 9l3 7"/>'},
  {id:"service",label:"Service",icon:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'},
  {id:"tools",label:"Ratgeber",icon:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M16 11v4"/>'},
  {id:"more",label:"Mehr",icon:'<path d="M4 6h16M4 12h16M4 18h16"/>'}
];
const ui={tab:"home", stack:[]};
function setTab(t){ ui.tab=t; ui.stack=[]; try{ if(location.hash!=="#"+t) history.replaceState(null,"","#"+t);}catch(e){} render(); window.scrollTo(0,0); }
function push(v){ ui.stack.push(v); render(); window.scrollTo(0,0); }
function renderTabs(){ $("#tabs").innerHTML=TABS.map(t=>`<button type="button" data-act="tab" data-t="${t.id}" ${ui.tab===t.id?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>${t.label}</button>`).join(""); }

/* ================= views ================= */
function dayItem(d){
  const best=dayBest(d); const n=(d.stints||[]).length;
  return `<button type="button" class="item" data-act="open-day" data-id="${d.id}">
    <div class="badge" style="font-size:15px;line-height:1;flex-direction:column;display:flex;justify-content:center;align-items:center">${esc(fmtDate(d.date).slice(0,5))}${evDays(d)>1?`<small style="font-size:11px;font-weight:600">${evDays(d)} Tage</small>`:""}</div>
    <div class="grow"><div class="t">${esc(eventName(d))}</div><div class="s">${d.title&&d.track?esc(d.track)+" · ":""}${esc(bikeName(d.bikeId))} · ${n} ${n===1?"Stint":"Stints"}${d.rider?" · "+esc(d.rider):""}</div></div>
    <div class="num" style="font-size:20px">${best!=null?fmtLap(best):""}</div></button>`;
}
function vHome(){
  if(!S.bikes.length) return {title:"RaceBob", html:`<div class="card hero"><div class="eyebrow">Willkommen</div><div class="hero-t">Los geht's mit deinem Bike</div><div class="muted small" style="margin:6px 0 12px">Leg zuerst dein Motorrad mit Federbein, Gabel und Grundabstimmung an. Danach trägst du Events und Stints ein, und hier siehst du alles Wichtige auf einen Blick.</div><button type="button" class="btn pri big" data-act="new-bike">Motorrad anlegen</button></div>`};
  const t=today(); const ds=daysSorted();
  const active=ds.find(d=>d.date&&d.date<=t&&dayDate(d,evDays(d))>=t);
  const upcoming=S.days.filter(d=>d.date&&d.date>t).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const last=ds.find(d=>d.date&&dayDate(d,evDays(d))<t);
  let h="";
  // ---- hero: what's on now
  if(active){
    let k=1; for(let j=1;j<=evDays(active);j++) if(dayDate(active,j)===t) k=j;
    const st=(active.stints||[]); const todayIdx=st.map((s,i)=>i).filter(i=>(st[i].day||1)===k);
    let best=null; todayIdx.forEach(i=>{ const v=lapSec(st[i].lap); if(v!=null&&(best==null||v<best)) best=v; });
    h+=`<div class="card hero live"><div class="row between"><span class="eyebrow"><span class="pulse"></span>Läuft gerade</span><span class="chip">${evDays(active)>1?`Tag ${k} von ${evDays(active)}`:"Heute"}</span></div>
      <div class="hero-t">${esc(eventName(active))}</div><div class="muted small">${esc([active.title?active.track:"",bikeName(active.bikeId)].filter(Boolean).join(" · "))}</div>
      <div class="hero-stats"><div><b>${todayIdx.length}</b><span>Stints heute</span></div><div><b>${best!=null?fmtLap(best):"–"}</b><span>Beste heute</span></div></div>
      <button type="button" class="btn pri big" data-act="new-stint" data-id="${active.id}">+ Stint eintragen</button>
      <button type="button" class="btn" style="width:100%;margin-top:8px" data-act="open-day" data-id="${active.id}">Event öffnen</button></div>`;
  } else if(upcoming){
    const n=Math.round((new Date(upcoming.date+"T12:00:00")-new Date(t+"T12:00:00"))/864e5);
    const pk=S.pack.length, pd=S.pack.filter(p=>p.done).length;
    h+=`<div class="card hero"><div class="row between"><span class="eyebrow">Nächstes Event</span><span class="chip">${dateRange(upcoming)}</span></div>
      <div class="row" style="align-items:flex-end;gap:14px;flex-wrap:nowrap"><div style="flex:1;min-width:0"><div class="hero-t">${esc(eventName(upcoming))}</div><div class="muted small">${esc([upcoming.title?upcoming.track:"",bikeName(upcoming.bikeId)].filter(Boolean).join(" · "))}</div></div>
      <div class="count"><b>${n}</b><span>${n===1?"Tag":"Tage"}</span></div></div>
      ${pk?`<button type="button" class="packbar" data-act="push" data-v="pack"><span>Packliste</span><span class="bar ${pd===pk?"":"mid"}" style="flex:1;margin:0"><i style="width:${Math.max(4,pd/pk*100).toFixed(0)}%"></i></span><b>${pd}/${pk}</b></button>`:`<button type="button" class="btn" style="width:100%;margin-top:10px" data-act="push" data-v="pack">Packliste anlegen</button>`}
      <button type="button" class="btn" style="width:100%;margin-top:8px" data-act="open-day" data-id="${upcoming.id}">Event öffnen</button></div>`;
  } else {
    h+=`<div class="card hero"><span class="eyebrow">Nächstes Event</span><div class="hero-t">Noch nichts geplant</div><div class="muted small" style="margin:4px 0 12px">Trag dein nächstes Event schon vorher ein, dann zählt die App die Tage runter und zeigt deinen Packstand.</div><button type="button" class="btn pri big" data-act="new-day">+ Neues Event</button></div>`;
  }
  // ---- bike cockpit
  const mainBike = byId(S.bikes,(active||upcoming||last||{}).bikeId) || S.bikes[0];
  const bikes=[mainBike].concat(S.bikes.filter(b=>b!==mainBike));
  bikes.forEach(b=>{
    const s=currentSetup(b.id); const fs=bikeFields(b); const has=k=>fs.some(x=>x.k===k);
    const v=k=>(s[k]!=null&&s[k]!=="")?esc(s[k]):'<span class="muted">–</span>';
    const rows=[];
    if(has("f_reb")||has("s_reb")) rows.push(["Zugstufe",v("f_reb"),v("s_reb")]);
    const sc=[s.s_comp,[s.s_compL,s.s_compH].filter(Boolean).join(" / ")].filter(Boolean)[0];
    if(s.f_comp||sc) rows.push(["Druckstufe",v("f_comp"),sc?esc(sc):'<span class="muted">–</span>']);
    if(s.t_pF||s.t_pR) rows.push(["Luftdruck",v("t_pF"),v("t_pR")]);
    if(s.t_compF||s.t_compR) rows.push(["Mischung",v("t_compF"),v("t_compR")]);
    const aF=tyreAge(b.id,"F"), aR=tyreAge(b.id,"R");
    const ag=a=>a?(a.laps?`${a.laps} Rd.`:`${a.stints} ${a.stints===1?"Stint":"Stints"}`):'<span class="muted">–</span>';
    if(aF||aR) rows.push(["Reifenalter",ag(aF),ag(aR)]);
    const m=sagAt(b); if(m){ const r=sagCalc(m); const c=(k)=>{ const x=r[k]; const cl=sagCls(b,k,x); return x==null?'<span class="muted">–</span>':`<span class="${cl?"sag-"+cl:""}">${fmtNum(x,0)} mm</span>`; }; rows.push(["Negativfederweg",c("fWith"),c("rWith")]); }
    const items=S.service.filter(it=>it.bikeId===b.id); let bad=0,mid=0; items.forEach(it=>{ const p=svcStatus(it).pct; if(p!=null){ if(p>=1) bad++; else if(p>=.8) mid++; } });
    const dueNames=items.filter(it=>{ const p=svcStatus(it).pct; return p!=null&&p>=.8; }).sort((a,c)=>svcStatus(c).pct-svcStatus(a).pct).slice(0,3).map(it=>it.name);
    h+=`<div class="card"><div class="row between"><div><div class="eyebrow">Dein Bike</div><div style="font-family:var(--display);font-size:24px;font-weight:700;line-height:1.1">${esc(b.name)}</div></div><button type="button" class="btn sm" data-act="open-bike" data-id="${b.id}">Setup</button></div>
      ${rows.length?`<div class="tyres cockpit" style="margin-top:10px"><div></div><div class="th">Vorne</div><div class="th">Hinten</div>${rows.map(([l,a,c])=>`<span>${l}</span><b>${a}</b><b>${c}</b>`).join("")}</div>`:`<div class="muted small" style="margin-top:8px">Noch keine Setup-Werte. Trag die Grundabstimmung ein.</div>`}
      <button type="button" class="svcstrip ${bad?"bad":mid?"mid":"good"}" data-act="svc-open" data-id="${b.id}"><span class="dot ${bad?"bad":mid?"mid":items.length?"good":""}"></span><span class="grow">${bad||mid?`<b>Service:</b> ${esc(dueNames.join(", "))}`:items.length?"Service: alles in Ordnung":"Service: noch nichts eingetragen"}</span>${bad?`<span class="cnt">${bad}</span>`:""}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
  });
  // ---- season
  const y=t.slice(0,4); let sd=0,ss=0,sl=0; const trs=new Set();
  S.days.forEach(d=>{ for(let k=1;k<=evDays(d);k++) if(dayDate(d,k).slice(0,4)===y&&dayDate(d,k)<=t) sd++; (d.stints||[]).forEach((st,i)=>{ if(stintDate(d,i).slice(0,4)===y){ ss++; sl+=num(st.laps)||0; if(d.track) trs.add(d.track); } }); });
  h+=`<h2>Saison ${y}</h2><div class="stats four"><div class="stat"><div class="v">${sd}</div><div class="k">Fahrtage</div></div><div class="stat"><div class="v">${ss}</div><div class="k">Stints</div></div><div class="stat"><div class="v">${sl}</div><div class="k">Runden</div></div><div class="stat"><div class="v">${trs.size}</div><div class="k">Strecken</div></div></div>`;
  // ---- best laps
  const tb=trackBests().map(([tn,x])=>{ const tr=S.tracks.find(k=>k.name.trim().toLowerCase()===tn.toLowerCase()); return [tn,x,tr]; });
  if(tb.length) h+=`<h2>Bestzeiten</h2><div class="slist">`+tb.map(([tn,x,tr])=>`<div class="srow" role="button" tabindex="0" data-act="${tr?"open-track":"open-day"}" data-id="${tr?tr.id:x.day.id}"><div class="grow"><div class="t">${esc(tn)}</div><div class="m">${esc(bikeName(x.day.bikeId))} · ${fmtDate(x.day.date)}</div></div><span class="num" style="font-size:22px">${fmtLap(x.best)}</span></div>`).join("")+`</div>`;
  // ---- shortcuts
  h+=`<div class="quick"><button type="button" data-act="new-day"><b>+</b>Neues Event</button><button type="button" data-act="sag"><b>mm</b>Federweg messen</button><button type="button" data-act="push" data-v="guide"><b>?</b>Ratgeber</button><button type="button" data-act="push" data-v="tracks"><b>T</b>Strecken</button></div>`;
  return {title:"RaceBob", html:h};
}
function vDays(){
  const ds=daysSorted();
  let h=`<button type="button" class="btn pri big" data-act="new-day">+ Neues Event</button>
  <button type="button" class="item" data-act="push" data-v="tracks"><div class="badge">${S.tracks.length}</div><div class="grow"><div class="t">Strecken</div><div class="s">Streckenplan, Kurven, Bremspunkte und deine Notizen</div></div></button>`;
  if(!ds.length) return {title:"Events", html:h+`<div class="empty">Noch keine Events. Ein Event kann ein einzelner Trackday oder ein mehrtägiges Training sein.</div>`};
  let y="";
  ds.forEach(d=>{ const yy=(d.date||"").slice(0,4)||"Ohne Datum"; if(yy!==y){ if(y) h+=`</div>`; h+=`<h2>${esc(yy)}</h2><div class="list">`; y=yy; } h+=dayItem(d); });
  return {title:"Events", html:h+`</div>`};
}
function setupCard(b, s, onlyFilled=true, ageBike){
  const fs=bikeFields(b);
  const out=GROUPS.map(g=>{ const f=fs.filter(x=>x.g===g && (!onlyFilled || (s[x.k]!=null&&s[x.k]!==""))); if(!f.length && !(g==="Reifen"&&ageBike)) return "";
    if(g==="Reifen") return tyreTable(fs,s,onlyFilled,ageBike);
    let extra=""; if(g==="Sonstiges"){ const r=ratio(s.g_front,s.g_rear); if(r) extra=`<div><span>Übersetzung</span><b>${fmtNum(r,2)}</b></div>`; }
    return `<div class="sec">${g}</div><div class="kv">${f.map(x=>`<div><span>${esc(x.l)}</span><b>${valFmt(x,s[x.k])}</b></div>`).join("")}${extra}</div>`; }).join("");
  return out || `<div class="muted small">Noch keine Werte eingetragen.</div>`;
}
const isNewTyre = (st,pos) => !!(pos==="F"? (st.newF||st.tyreNew) : (st.newR||st.tyreNew));
function tyreAge(bikeId,pos,until){ // until = {dayId,i}: inclusive; null = everything
  let age=null;
  for(const d of daysOfBike(bikeId)){ const sts=d.stints||[];
    for(let i=0;i<sts.length;i++){ const st=sts[i];
      if(until && until.dayId===d.id && i===until.i && until.exclusive) return age;
      if(isNewTyre(st,pos)) age={since:stintDate(d,i),stints:0,laps:0,days:new Set()};
      if(age){ age.stints++; age.laps+=num(st.laps)||0; age.days.add(d.id+":"+(st.day||1)); }
      if(until && until.dayId===d.id && i===until.i) return age; } }
  return age;
}
function ageText(a, short){ if(!a) return short?"–":"unbekannt"; const p=[`${a.stints} ${a.stints===1?"Stint":"Stints"}`]; if(a.laps) p.push(`${a.laps} Rd.`); p.push(`${a.days.size} ${a.days.size===1?"Tag":"Tage"}`); return p.join(" · ")+(short?"":` · seit ${fmtDate(a.since)}`); }
const TYRE_ROWS=[["Marke","t_brandF","t_brandR"],["Mischung","t_compF","t_compR"],["Druck","t_pF","t_pR"]];
function tyreTable(fs,s,onlyFilled,ageBike){
  const has=k=>fs.some(x=>x.k===k); const filled=k=>s[k]!=null&&s[k]!=="";
  const rows=TYRE_ROWS.filter(([,f,r])=>(has(f)||has(r)) && (!onlyFilled||filled(f)||filled(r)));
  const aF=ageBike?tyreAge(ageBike,"F"):null, aR=ageBike?tyreAge(ageBike,"R"):null;
  if(!rows.length && !aF && !aR) return "";
  const cell=(k)=>{ const f=fs.find(x=>x.k===k); return f? `<b>${valFmt(f,s[k])}</b>` : `<b class="muted">–</b>`; };
  return `<div class="sec">Reifen</div><div class="tyres"><div></div><div class="th">Vorne</div><div class="th">Hinten</div>${rows.map(([l,f,r])=>`<span>${l}</span>${cell(f)}${cell(r)}`).join("")}${ageBike?`<span>Alter</span><b class="age">${aF?esc(ageText(aF,true))+`<small>seit ${fmtDate(aF.since)}</small>`:'<span class="muted">unbekannt</span>'}</b><b class="age">${aR?esc(ageText(aR,true))+`<small>seit ${fmtDate(aR.since)}</small>`:'<span class="muted">unbekannt</span>'}</b>`:""}</div>${ageBike&&(!aF||!aR)?`<div class="hint" style="margin-top:6px">Reifenalter: Hake beim nächsten Reifenwechsel im Stint „Neuer Reifen“ an, dann zählt die App ab da mit.</div>`:""}`;
}
function changeChips(b, prev, ch){
  const ks=Object.keys(ch||{}); if(!ks.length) return `<div class="muted small">Keine Änderung am Setup.</div>`;
  return `<div class="chg-list">${ks.map(k=>`<span class="chg">${esc(fieldLabel(b,k))}: ${esc(prev[k]||"–")} → <b>${esc(ch[k]||"–")}</b></span>`).join("")}</div>`;
}
function dynChips(dyn){ return DYN.filter(([k])=>dyn&&dyn[k]).map(([k,l])=>`<span class="chip ${DYNV[dyn[k]][1]}">${esc(l)}: ${DYNV[dyn[k]][0]}</span>`).join(""); }
function vDay(id){
  const d=byId(S.days,id); if(!d) return {title:"Event", html:`<div class="empty">Nicht gefunden.</div>`};
  const b=byId(S.bikes,d.bikeId); const best=dayBest(d);
  let h=`<div class="card"><div class="kv">
    <div><span>${evDays(d)>1?"Zeitraum":"Datum"}</span><b>${dateRange(d)||"–"}</b></div>${evDays(d)>1?`<div><span>Dauer</span><b>${evDays(d)} Tage</b></div>`:""}${d.title&&d.track?`<div><span>Strecke</span><b>${esc(d.track)}</b></div>`:""}<div><span>Bike</span><b>${esc(bikeName(d.bikeId))}</b></div>
    <div><span>Fahrer</span><b>${esc(d.rider||"–")}</b></div><div><span>Beste Runde</span><b>${fmtLap(best)}</b></div>
    <div><span>Luft</span><b>${d.air?esc(d.air)+" °C":"–"}</b></div><div><span>Asphalt</span><b>${d.trackTemp?esc(d.trackTemp)+" °C":"–"}</b></div>
  </div></div>`;
  h+=`<div class="row between"><h2>Setup vor Start</h2><button type="button" class="btn sm" data-act="edit-start" data-id="${id}">Bearbeiten</button></div><div class="card">${setupCard(b,d.start||{})}${sagTable(b,sagAt(b,d.date))}</div>`;
  const st=d.stints||[];
  const multi=evDays(d)>1;
  st.forEach((s,i)=>{
    const prev=setupAt(d,i); const lap=lapSec(s.lap), ideal=lapSec(s.ideal);
    if(multi && (i===0 || (st[i-1].day||1)!==(s.day||1))){ const dd=dayDate(d,s.day||1); h+=`<div class="row" style="gap:8px;margin-top:8px"><span class="badge" style="height:34px;font-size:16px">Tag ${s.day||1}</span><span style="font-weight:600">${wd(dd)}, ${fmtDate(dd)}</span></div>`; }
    const lbl=multi?stintLabel(d,i).split(" · ")[1]:stintLabel(d,i);
    h+=`<div class="row between"><h2>${lbl}</h2><button type="button" class="btn sm" data-act="edit-stint" data-day="${id}" data-i="${i}">Bearbeiten</button></div>
    <div class="card"><div class="sec">Änderung vor ${lbl}</div>${changeChips(b,prev,s.changes)}
    <div class="kv" style="margin-top:12px">
      <div><span>Rundenzeit</span><b>${fmtLap(lap)}</b></div><div><span>Idealzeit</span><b>${fmtLap(ideal)}</b></div>${s.laps?`<div><span>Runden</span><b>${esc(s.laps)}</b></div>`:""}
      ${s.air||s.trackTemp?`<div><span>Luft / Asphalt</span><b>${esc(s.air||"–")} / ${esc(s.trackTemp||"–")} °C</b></div>`:""}
      ${s.feel?`<div><span>Gefühl</span><b style="color:var(--accent)">${"★".repeat(+s.feel)}${"☆".repeat(5-s.feel)}</b></div>`:""}
      ${s.tTempF||s.tTempR?`<div><span>Reifentemp. V / H</span><b>${esc(s.tTempF||"–")} / ${esc(s.tTempR||"–")} °C</b></div>`:""}
      ${s.pWarmF||s.pWarmR?`<div><span>Druck warm V / H</span><b>${esc(s.pWarmF||"–")} / ${esc(s.pWarmR||"–")} bar</b></div>`:""}
    </div>
    ${isNewTyre(s,"F")||isNewTyre(s,"R")?`<div style="margin-top:8px">${isNewTyre(s,"F")?'<span class="chip good">Neuer Reifen vorne</span>':""}${isNewTyre(s,"R")?'<span class="chip good">Neuer Reifen hinten</span>':""}</div>`:""}
    ${dynChips(s.dyn)?`<div style="margin-top:8px">${dynChips(s.dyn)}</div>`:""}
    ${(s.sym||[]).length?`<details class="more" style="margin-top:10px"><summary>Gefühlt: ${esc(s.sym.map(id=>(symById(id)||{}).l).filter(Boolean).join(", "))}</summary>${adviceHtml(s.sym)}</details>`
      : DYN.filter(([k])=>s.dyn&&(s.dyn[k]==="problem"||s.dyn[k]==="ok")).map(([k,l])=>`<button type="button" class="btn sm" style="margin:8px 8px 0 0" data-act="guide-for" data-p="${DYN_PHASE[k]}">Ratgeber: ${esc(l)}</button>`).join("")}
    ${s.feeling?`<div class="sec">Feeling</div><div class="note">${esc(s.feeling)}</div>`:""}
    ${s.desc?`<div class="sec">Beschreibung</div><div class="note">${esc(s.desc)}</div>`:""}${cornerChips(d,s)}</div>`;
  });
  h+=`<button type="button" class="btn pri big" data-act="new-stint" data-id="${id}">+ Stint eintragen</button>`;
  h+=`<h2>Endergebnis</h2><div class="card note">${d.result?esc(d.result):'<span class="muted">Noch nichts eingetragen.</span>'}</div>`;
  const trk=dayTrack(d);
  h+=`<div class="row">${trk?`<button type="button" class="btn" data-act="open-track" data-id="${trk.id}">Strecke & Kurven</button>`:""}<button type="button" class="btn" data-act="edit-day" data-id="${id}">Event bearbeiten</button><button type="button" class="btn danger" data-act="del-day" data-id="${id}">Löschen</button></div>`;
  return {title:`${eventName(d)} · ${dateRange(d)}`, html:h};
}
function vBikes(){
  let h=`<button type="button" class="btn pri big" data-act="new-bike">+ Motorrad anlegen</button>`;
  if(!S.bikes.length) return {title:"Bikes", html:h+`<div class="empty">Noch kein Motorrad angelegt.</div>`};
  h+=`<div class="list">`+S.bikes.map(b=>`<button type="button" class="item" data-act="open-bike" data-id="${b.id}"><div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${esc([b.shock,b.fork].filter(Boolean).join(" · ")||"Fahrwerk nicht eingetragen")}</div></div><span class="chip">${daysOfBike(b.id).length} Events</span></button>`).join("")+`</div>`;
  return {title:"Bikes", html:h};
}
function vBike(id){
  const b=byId(S.bikes,id); if(!b) return {title:"Bike", html:`<div class="empty">Nicht gefunden.</div>`};
  let h=`<div class="card"><div class="kv"><div><span>Federbein</span><b>${esc(b.shock||"–")}</b></div><div><span>Gabel</span><b>${esc(b.fork||"–")}</b></div></div>${b.notes?`<div class="sec">Hinweise</div><div class="note">${esc(b.notes)}</div>`:""}</div>`;
  const cur=currentSetup(id); const ds=daysOfBike(id);
  h+=`<div class="row between"><h2>Aktuelles Setup</h2><button type="button" class="btn sm" data-act="open-hist" data-id="${id}">Verlauf als Tabelle</button></div>
  <div class="card">${ds.length?`<div class="muted small" style="margin-bottom:6px">Stand nach ${esc(eventName(ds[ds.length-1]))}, ${dateRange(ds[ds.length-1])}</div>`:""}${setupCard(b,cur,true,id)}${sagTable(b,sagAt(b))}</div>`;
  h+=`<div class="row between"><h2>Grundabstimmung</h2><button type="button" class="btn sm" data-act="edit-base" data-id="${id}">Bearbeiten</button></div><div class="card">${setupCard(b,b.base||{})}</div>`;
  const sm=(b.sag||[]).slice().sort((x,y)=>(y.date||"").localeCompare(x.date||""))[0];
  h+=`<div class="row between"><h2>Negativfederweg</h2><button type="button" class="btn sm" data-act="sag" data-bike="${id}">Messen</button></div>`;
  h+= sm? `<div class="card"><div class="muted small" style="margin-bottom:8px">Messung vom ${fmtDate(sm.date)}${sm.note?" · "+esc(sm.note):""}</div>${sagResultHtml(b,sm)}</div>` : `<div class="empty">Noch keine Messung. Mit dem Rechner misst du A, B und C vorne und hinten.</div>`;
  if(ds.length) h+=`<h2>Events</h2><div class="list">${ds.slice().reverse().map(dayItem).join("")}</div>`;
  h+=`<div class="row"><button type="button" class="btn" data-act="edit-bike" data-id="${id}">Bike & Felder bearbeiten</button></div>`;
  return {title:b.name, html:h};
}
function vHist(id){
  const b=byId(S.bikes,id); if(!b) return {title:"Verlauf", html:""};
  const cols=[{label:"Grund",sub:"abstimmung",s:b.base||{}}];
  daysOfBike(id).forEach(d=>{
    cols.push({label:fmtDate(d.date).slice(0,6)+" Start",sub:eventName(d),s:setupAt(d,0),day:d});
    (d.stints||[]).forEach((st,i)=>cols.push({label:stintLabel(d,i),sub:(d.track||"")+" "+fmtDate(stintDate(d,i)).slice(0,5),s:setupAt(d,i+1),st,day:d}));
  });
  const fs=bikeFields(b);
  let h=`<div class="muted small">Jede Spalte zeigt das Setup, mit dem gefahren wurde. Rot heißt: gegenüber der Spalte davor geändert. Zum Blättern wischen.</div><div class="tablewrap"><table class="hist"><thead><tr><th class="rh">Einstellung</th>${cols.map(c=>`<th>${esc(c.label)}<small>${esc(c.sub)}</small></th>`).join("")}</tr></thead><tbody>`;
  GROUPS.forEach(g=>{ const f=fs.filter(x=>x.g===g && cols.some(c=>c.s[x.k]!=null&&c.s[x.k]!=="")); if(!f.length) return;
    h+=`<tr class="grp"><th class="rh">${g}</th>${cols.map(()=>"<td></td>").join("")}</tr>`;
    f.filter(x=>cols.some(c=>c.s[x.k]!=null&&c.s[x.k]!=="")).forEach(x=>{ h+=`<tr><th class="rh">${esc(x.l)}</th>`+cols.map((c,i)=>{ const v=c.s[x.k]??""; const p=i?(cols[i-1].s[x.k]??""):v; return `<td class="${i&&String(v)!==String(p)?"d":""}">${esc(v)||'<span class="muted">–</span>'}</td>`; }).join("")+`</tr>`; });
  });
  const sagCols=cols.map(c=>c.day? sagAt(b, c.st? stintDate(c.day,(c.day.stints||[]).indexOf(c.st)) : c.day.date) : null);
  if(sagCols.some(Boolean)){
    h+=`<tr class="grp"><th class="rh">Negativfederweg</th>${cols.map(()=>"<td></td>").join("")}</tr>`;
    [["fNo","Vorne ohne Fahrer"],["fWith","Vorne mit Fahrer"],["rNo","Hinten ohne Fahrer"],["rWith","Hinten mit Fahrer"]].forEach(([k,l])=>{
      h+=`<tr><th class="rh">${l}</th>`+sagCols.map((m,i)=>{ const v=m?sagCalc(m)[k]:null; const pv=i&&sagCols[i-1]?sagCalc(sagCols[i-1])[k]:v; return `<td class="${i&&v!=null&&pv!=null&&v!==pv?"d":""}">${v!=null?fmtNum(v):'<span class="muted">–</span>'}</td>`; }).join("")+`</tr>`; });
  }
  h+=`<tr class="grp"><th class="rh">Ergebnis</th>${cols.map(()=>"<td></td>").join("")}</tr>`;
  h+=`<tr><th class="rh">Rundenzeit</th>${cols.map(c=>`<td>${c.st&&lapSec(c.st.lap)!=null?fmtLap(lapSec(c.st.lap)):""}</td>`).join("")}</tr>`;
  h+=`<tr><th class="rh">Kommentar</th>${cols.map(c=>`<td class="wrap">${c.st?esc([c.st.feeling,c.st.desc].filter(Boolean).join(" · ")):(c.day&&!c.st&&c.day.result?esc(c.day.result):"")}</td>`).join("")}</tr>`;
  h+=`</tbody></table></div>`;
  return {title:"Verlauf · "+b.name, html:h};
}
/* ---- sag ---- */
function parseRange(r){ const m=String(r||"").replace(/,/g,".").match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/); return m?[+m[1],+m[2]]:null; }
function sagCalc(m){ const g=k=>num(m[k]); const out={};
  ["f","r"].forEach(p=>{ const A=g(p+"A"),B=g(p+"B"),C=g(p+"C"); out[p+"No"]=A!=null&&B!=null?A-B:null; out[p+"With"]=A!=null&&C!=null?A-C:null; }); return out; }
function sagAt(b, date){ return ((b&&b.sag)||[]).filter(m=>!date||(m.date||"")<=date).sort((x,y)=>(y.date||"").localeCompare(x.date||""))[0]||null; }
function sagCls(b,k,v){ const rg=parseRange(((b&&b.sagTarget)||{})[k]); if(v==null||!rg) return ""; return v>=rg[0]&&v<=rg[1]?"good":"bad"; }
function sagTable(b, m){
  if(!m) return "";
  const r=sagCalc(m); if(["fNo","rNo","fWith","rWith"].every(k=>r[k]==null)) return "";
  const c=k=>{ const v=r[k]; const cl=sagCls(b,k,v); return `<b class="${cl?"sag-"+cl:""}">${v==null?'<span class="muted">–</span>':fmtNum(v)+' <span class="muted" style="font-size:12px;font-weight:400">mm</span>'}</b>`; };
  return `<div class="sec">Negativfederweg</div><div class="tyres"><div></div><div class="th">Vorne</div><div class="th">Hinten</div><span>Ohne Fahrer</span>${c("fNo")}${c("rNo")}<span>Mit Fahrer</span>${c("fWith")}${c("rWith")}</div><div class="hint" style="margin-top:4px">gemessen am ${fmtDate(m.date)}${m.note?" · "+esc(m.note):""}</div>`;
}
function sagResultHtml(b, m){
  const r=sagCalc(m); const t=(b&&b.sagTarget)||{};
  const box=(k,label)=>{ const v=r[k], rg=parseRange(t[k]); const cls=v==null||!rg?"":(v>=rg[0]&&v<=rg[1]?"good":"bad");
    const st=v==null?"":!rg?"Kein Zielbereich":(v<rg[0]?`zu wenig (Ziel ${rg[0]}–${rg[1]})`:v>rg[1]?`zu viel (Ziel ${rg[0]}–${rg[1]})`:`im Ziel ${rg[0]}–${rg[1]}`);
    return `<div class="sagbox ${cls}"><div class="muted small">${label}</div><div class="v">${v==null?"–":fmtNum(v)+" mm"}</div><div class="st">${st}</div></div>`; };
  return `<div class="sagres">${box("fNo","Vorne ohne Fahrer")}${box("rNo","Hinten ohne Fahrer")}${box("fWith","Vorne mit Fahrer")}${box("rWith","Hinten mit Fahrer")}</div>`;
}
/* ---- Fahrwerksratgeber ---- */
const DYN_PHASE={brake:"q1",handling:"q2",corner:"q5",accel:"q7"};
const GUIDE_Q=[
 {id:"q1",ph:"Bremsen",q:"Ist das Bike beim Anbremsen stabil?",opts:[
  {s:"Das Heck wird unruhig",steps:["Negativfederweg hinten prüfen","Zugstufe Federbein prüfen: kann zu viel oder zu wenig sein. Im Zweifel öffnen und neu testen","Gabel langsamer einfedern lassen: Druckstufe Gabel zu","Vorspannung Gabel erhöhen","Federrate Gabel prüfen, ggf. härtere Federn (danach Negativfederweg neu messen)","Heck tiefer (Federbeinlänge kürzer)","Front höher (Gabelüberstand verringern)"]},
  {s:"Die Gabel schlägt durch (geht auf Block)",steps:["Negativfederweg vorne prüfen","Vorspannung Gabel erhöhen","Zugstufe Gabel 2–3 Klicks öffnen. Wird es besser, weiter öffnen, bis ein neues Problem auftaucht","Federrate Gabel prüfen, ggf. härtere Federn (danach Negativfederweg neu messen)","Luftpolster verkleinern (mehr Öl)"]}]},
 {id:"q2",ph:"Einlenken",q:"Wie lenkt das Bike auf der Bremse ein?",opts:[
  {s:"Schwer, oder es richtet sich auf. Die Front steht zu tief",steps:["Negativfederweg vorne prüfen","Vorspannung Gabel erhöhen","Zugstufe Gabel 2–3 Klicks öffnen. Wird es besser, weiter öffnen, bis ein neues Problem auftaucht","Federrate Gabel prüfen, ggf. härtere Federn (danach Negativfederweg neu messen)","Luftpolster verkleinern","Front höher (Gabelüberstand verringern)","Negativfederweg hinten prüfen","Heck tiefer: Vorspannung Federbein weniger, Federbein kürzer oder weichere Feder"]}]},
 {id:"q3",ph:"Bremse lösen",q:"Was macht das Bike beim Lösen der Bremse?",opts:[
  {s:"Es zieht nach innen",steps:["!Die Front steht zu tief. Geh die Schritte von Frage 2 durch"]},
  {s:"Es schiebt nach außen",steps:["!Die Front steht beim Lösen der Bremse zu hoch, also Balance nach vorne bringen","Beide Negativfederwege prüfen","Vorspannung Gabel reduzieren","Federrate Gabel reduzieren","Luftpolster vergrößern","Zugstufe Gabel erhöhen","Front tiefer (Gabelüberstand vergrößern)","Vorspannung Federbein erhöhen","Zugstufe Federbein verringern","Federrate Federbein erhöhen","Heck höher (Federbeinlänge)"]}]},
 {id:"q4",ph:"Stützgas",q:"Was passiert, wenn du Stützgas anlegst?",opts:[
  {s:"Es zieht rein oder schiebt raus",steps:["!Die Front steht zu tief oder zu hoch. Prüf Frage 2 (zieht rein) und Frage 3 (schiebt raus)"]},
  {s:"Das Bike wird unruhig",steps:["Zugstufe Gabel 2–3 Klicks zu","Wird es besser, weitere 2 Klicks zu, bis ein neues Problem auftaucht"]}]},
 {id:"q5",ph:"Kurvenmitte",q:"Hält das Bike am Stützgas in voller Schräglage den Radius?",note:"Das ist die wichtigste Frage für die Balance, aber auch das schwierigste Problem. Achte darauf, in welche Richtung das Bike tendiert.",opts:[
  {s:"Nein, und es lenkt auf der Bremse schlecht ein oder richtet sich dabei auf",steps:["!Die Front ist überladen. Geh die Schritte von Frage 2 durch"]},
  {s:"Nein, obwohl es sehr bremsstabil ist und auf der Bremse gut einlenkt",steps:["!Die Front ist zu wenig belastet. Geh die Schritte von Frage 3 durch (schiebt nach außen)"]}]},
 {id:"q6",ph:"Kurvenmitte",q:"Lässt sich die Linie in Schräglage noch korrigieren?",opts:[
  {s:"Nein, aber sonst gibt es keine Probleme",steps:["!Das Bike steht insgesamt zu tief. Beide Achsen immer gleichmäßig anheben, damit die Balance bleibt","Federbein länger und Gabelüberstand verringern","Vorspannung erhöhen","Federraten erhöhen","Negativfederwege prüfen"]}]},
 {id:"q7",ph:"Beschleunigen",q:"Was passiert ab dem Beschleunigen?",opts:[
  {s:"Es läuft nach außen",steps:["!Das Heck steht zu tief, es gibt zu wenig Schlupf am Hinterrad","Vorspannung Federbein erhöhen","Negativfederwege prüfen","Federrate Federbein erhöhen","Front tiefer (Gabelüberstand, Federrate, Vorspannung)","Zugstufe Gabel erhöhen"]},
  {s:"Wenig Grip am Hinterrad",steps:["!Zu wenig Last am Hinterrad, das Heck steht zu hoch","Vorspannung Federbein reduzieren","Federrate Federbein verringern","Federbein evtl. überdämpft: Dämpfung schrittweise öffnen","Federbein kürzer","Steht die Front zu tief: Vorspannung Gabel erhöhen, Federrate Gabel erhöhen, Zugstufe Gabel öffnen, Gabelüberstand verringern"]},
  {s:"Das Heck pumpt",steps:["!Nicht mit Dämpfung zudrehen. Die Ursache ist meist ein zu tiefes Heck: Der Schwingenwinkel stimmt nicht, und der Kettenzug arbeitet gegen die Feder","Vorspannung Federbein erhöhen","Federrate Federbein erhöhen","Heck höher (Federbeinlänge)"]},
  {s:"Das Bike wird unruhig",steps:["!Zu wenig Dämpfung am Federbein","Zugstufe Federbein klickweise zu","Wird es besser, weiter zu, bis ein neues Problem auftaucht","Dann einen Schritt zurück"]}]},
 {id:"q8",ph:"Beschleunigen",q:"Neigt das Bike beim Beschleunigen zu Wheelies oder Lenkerschlagen?",opts:[
  {s:"Ja, das Vorderrad hebt früh ab oder der Lenker schlägt",steps:["!Beides hat oft dieselbe Ursache: Das Vorderrad wird beim Beschleunigen schlecht geführt","Negativfederwege an beiden Achsen prüfen","Zugstufe Gabel öffnen (die Gabel federt nicht schnell genug aus)","Vorspannung Gabel reduzieren (die Gabel federt nicht weit genug aus)","Federrate Gabel reduzieren","Heck besser abstützen: Vorspannung Federbein erhöhen, Federrate erhöhen, Heck höher"]}]}
];
const SYMS=[
 {id:"q1a",dyn:"brake",l:"Heck unruhig beim Anbremsen",q:0,o:0},
 {id:"q1b",dyn:"brake",l:"Gabel schlägt durch",q:0,o:1},
 {id:"q2a",dyn:"handling",l:"Lenkt auf der Bremse schwer ein oder richtet sich auf",q:1,o:0},
 {id:"q3a",dyn:"handling",l:"Zieht beim Lösen der Bremse nach innen",q:2,o:0,ref:"q2a"},
 {id:"q3b",dyn:"handling",l:"Schiebt beim Lösen der Bremse nach außen",q:2,o:1},
 {id:"q4b",dyn:"corner",l:"Unruhig beim Anlegen vom Stützgas",q:3,o:1},
 {id:"q5a",dyn:"corner",l:"Hält den Radius nicht, lenkt auf der Bremse schlecht ein",q:4,o:0,ref:"q2a"},
 {id:"q5b",dyn:"corner",l:"Hält den Radius nicht, obwohl sehr bremsstabil",q:4,o:1,ref:"q3b"},
 {id:"q6a",dyn:"corner",l:"Linie in Schräglage nicht korrigierbar",q:5,o:0},
 {id:"q7a",dyn:"accel",l:"Läuft beim Beschleunigen nach außen",q:6,o:0},
 {id:"q7b",dyn:"accel",l:"Wenig Grip am Hinterrad",q:6,o:1},
 {id:"q7c",dyn:"accel",l:"Heck pumpt",q:6,o:2},
 {id:"q7d",dyn:"accel",l:"Unruhig beim Beschleunigen",q:6,o:3},
 {id:"q8a",dyn:"accel",l:"Wheelie oder Lenkerschlagen",q:7,o:0}];
const symById = id => SYMS.find(x=>x.id===id);
function symAdvice(id){
  const sy=symById(id); if(!sy) return null; const opt=GUIDE_Q[sy.q].opts[sy.o];
  let why=opt.steps.filter(x=>x[0]==="!").map(x=>x.slice(1).replace(/\.?\s*Geh die Schritte.*$/,"").replace(/\.?\s*Prüf Frage.*$/,"")).filter(Boolean);
  let steps=opt.steps.filter(x=>x[0]!=="!");
  if(sy.ref){ const r=symAdvice(sy.ref); steps=r.steps; why=why.concat(r.why); }
  return {label:sy.l, why, steps, q:GUIDE_Q[sy.q].id};
}
function adviceHtml(ids, compact){
  const list=(ids||[]).map(symAdvice).filter(Boolean); if(!list.length) return "";
  return `<div class="advice">${compact?"":`<div class="small muted">Vorschläge aus dem Ratgeber, nach Priorität. Pro Stint nur eine Änderung, dann vergleichen.</div>`}${list.map(a=>`<div class="opt"><div class="opt-t">${esc(a.label)}</div>${a.why.map(w=>`<div class="why">${esc(w)}</div>`).join("")}
    ${compact?`<div class="next">Als Erstes: <b>${esc(a.steps[0]||"")}</b></div>`:`<ol>${a.steps.map((x,k)=>`<li${k===0?' class="first"':""}>${esc(x)}${k===0?' <span class="chip good">als Erstes</span>':""}</li>`).join("")}</ol>`}</div>`).join("")}</div>`;
}
const GUIDE_KNOW=[
 {t:"Balance: das Bike als Wippe",p:["Ziel ist eine ausgeglichene Verteilung, etwa 50/50. Dann hält das Bike den Radius mit wenig Kraftaufwand und braucht weniger Dämpfung.","Die Balance bestimmen Feder, Vorspannung, Negativfederweg, Dämpfung und Luftpolster."],
  lists:[["Balance zu weit vorne",["schlecht bremsstabil","Einlenken auf der Bremse fällt schwer","läuft in Schräglage weit (Vorderrad wird überfahren)","wenig Grip hinten beim Beschleunigen"]],["Balance zu weit hinten",["sehr bremsstabil","lenkt auf der Bremse gut ein","schiebt nach außen, sobald die Bremse gelöst wird","guter Grip hinten","träges Handling"]]]},
 {t:"Feder & Vorspannung",p:["Die Feder hat Priorität vor dem Dämpfer. Eine falsche Federrate lässt sich nicht mit Dämpfung ausgleichen.","Vorspannung macht die Feder nicht härter. Sie erhöht nur die Kraft, ab der die Feder einfedert, und damit die Fahrhöhe. Gleichzeitig verkürzt sie den nutzbaren Federweg.","Faustregel zum Rechnen: Federrate (N/mm) × Vorspannung (mm) = Kraft in N, geteilt durch 9,81 = kg."]},
 {t:"Negativfederweg",p:["Statisch = A − B (nur Eigengewicht), dynamisch = A − C (mit Fahrer). Hinten misst du vom Heck zur Achse, vorne am Standrohr, z. B. mit Kabelbinder.","Immer beide Werte ansehen. Erreichst du den dynamischen Wert nur mit sehr viel Vorspannung und ist der statische dann viel zu klein, ist die Feder meist zu weich."],
  lists:[["Zu wenig vorne",["Lenkerschlagen","starke Wheelie-Neigung","Rad reißt in Schräglage ab","unkomfortabel"]],["Zu wenig hinten",["schlecht bremsstabil","Gripverlust beim Rausbeschleunigen","unkomfortabel"]],["Zu viel vorne",["Federweg früh aufgebraucht","Front am Kurveneingang zu tief","unruhig beim Lastwechsel"]],["Zu viel hinten",["Heck knickt beim Beschleunigen ein","Heck ab Scheitel zu tief","Pumpen beim Beschleunigen"]]]},
 {t:"Zugstufe (die wichtigere Dämpfung)",p:["Die Dämpfung regelt, wie schnell das Fahrwerk ein- und ausfedert, nicht wie hart es ist. Die Zugstufe bremst das Ausfedern. Sie arbeitet gegen die Feder und hat deshalb Vorrang vor der Druckstufe."],
  lists:[["Zu stark vorne",["Gabel wird beim Anbremsen zusammengedrückt","Vorderrad bleibt zu lange belastet","wenig Grip hinten beim Beschleunigen","weniger agil, eher Wheelies","Lenkerschlagen","unkomfortabel, Rad fällt in Löcher"]],["Zu stark hinten",["weniger bremsstabil (Rad hebt ab, bevor das Federbein ausfedert)","wenig Grip beim Beschleunigen","Heck sinkt tiefer","weniger agil, Richtungswechsel unter Gas schwerer"]],["Zu schwach vorne",["Gabel federt zu schnell aus","Grip-Abriss beim Lösen der Bremse möglich","Unruhe bei Lastwechseln","Bike nickt oder schwingt nach","Front höher, sehr agil"]],["Zu schwach hinten",["Heck unruhig in jeder Fahrsituation","Pumpen beim Beschleunigen","weniger bremsstabil","schwingt nach"]]]},
 {t:"Druckstufe",p:["Die Druckstufe bremst das Einfedern. Sie sorgt für Bremsstabilität und Abstützung des Hecks beim Beschleunigen."],
  lists:[["Zu stark",["Bodenwellen werden nicht geschluckt","Haftungsabriss möglich","unkomfortabel","fühlt sich an wie eine zu harte Feder"]],["Zu schwach vorne",["wenig bremsstabil","Front knickt beim Gas schließen ein","Bike nickt"]],["Zu schwach hinten",["Heck knickt beim Beschleunigen ein","wenig Stabilität und Führung unter Gas"]]]},
 {t:"Low- & High-Speed",p:["Gemeint ist die Geschwindigkeit der Federbewegung, nicht das Fahrtempo. Der Übergang liegt grob bei 75 mm/s.","High-Speed: hartes Anbremsen (vorne), Bodenwellen, plötzlicher Haftungsabriss hinten.","Low-Speed: Bremse lösen, Gas auf und zu, Lastwechsel zwischen den Achsen."]},
 {t:"Luftpolster (Gabel)",p:["Das Luftpolster ist der ölfreie Raum in der Gabel. Je kleiner es ist (mehr Öl), desto früher wird die Gabel progressiv.","Schlägt die Gabel beim Anbremsen durch: Luftpolster verkleinern. Wird der Federweg nicht genutzt: Luftpolster vergrößern.","Im Zweifel die Herstellerangaben nehmen."]}
];
const SAG_REF={fNo:"28-32",fWith:"35-40",rNo:"12-15",rWith:"25-30"};
function vGuide(view, q){
  const tab=view||ui.guideTab||"diag";
  let h=`<div class="segtabs" role="tablist">${[["diag","Diagnose"],["know","Wissen"],["ref","Richtwerte"]].map(([k,l])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?"on":""}" data-act="guide-tab" data-t="${k}">${l}</button>`).join("")}</div>`;
  if(tab==="diag"){
    h+=`<details class="more"><summary>So gehst du vor</summary><ol class="small" style="margin:10px 0 0;padding-left:20px;display:grid;gap:6px">
      <li><b>Reifendruck</b> prüfen</li><li><b>Negativfederweg</b> einstellen (Rechner unter Ratgeber)</li><li><b>Zugstufe</b> einstellen, im Stand</li><li><b>Druckstufe</b> einstellen, beim Fahren</li></ol>
      <div class="list small" style="margin-top:10px">
      <div><b>Feder vor Dämpfer:</b> Eine falsche Federrate lässt sich nicht mit Dämpfung ausgleichen.</div>
      <div><b>Klicks immer von „ganz zu“ zählen</b> (im Uhrzeigersinn schließen), z. B. „12 Klicks offen“.</div>
      <div><b>Ausschlussverfahren:</b> Die Lösungen sind nach Priorität sortiert. Probier sie einzeln nacheinander. Wird es besser, geh weiter in diese Richtung, bis ein neues Problem auftaucht, und dann einen Schritt zurück.</div>
      <div><b>Alles dokumentieren</b> und im Zweifel dahin zurückdrehen, wo du gestartet bist.</div></div></details>
      <div class="muted small">Geh die Kurve gedanklich von der Bremse bis zum Beschleunigen durch. Tipp auf die Frage, bei der dein Bike nicht passt.</div>`;
    h+=`<div class="list">`+GUIDE_Q.map((g,n)=>`<details class="more" id="gq_${g.id}" ${q===g.id?"open":""}><summary><span class="qn">${n+1}</span> ${esc(g.q)} <span class="chip">${esc(g.ph)}</span></summary>
      ${g.note?`<div class="small muted" style="margin-top:8px">${esc(g.note)}</div>`:""}
      ${g.opts.map(o=>{ const why=o.steps.filter(x=>x[0]==="!").map(x=>x.slice(1)), st=o.steps.filter(x=>x[0]!=="!");
        return `<div class="opt"><div class="opt-t">${esc(o.s)}</div>${why.map(w=>`<div class="why">${esc(w)}</div>`).join("")}${st.length?`<ol>${st.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:""}</div>`; }).join("")}</details>`).join("")+`</div>`;
  } else if(tab==="know"){
    h+=`<div class="list">`+GUIDE_KNOW.map(k=>`<details class="more"><summary>${esc(k.t)}</summary>${k.p.map(x=>`<p class="small" style="margin:8px 0 0">${esc(x)}</p>`).join("")}
      ${(k.lists||[]).length?`<div class="knowgrid">${k.lists.map(([t,l])=>`<div><div class="opt-t">${esc(t)}</div><ul>${l.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>`:""}</details>`).join("")+`</div>`;
  } else {
    h+=`<div class="card"><div style="font-weight:600">Negativfederweg für Supersport & Superbike auf der Rennstrecke</div>
      <div class="tyres" style="margin-top:10px"><div></div><div class="th">Vorne</div><div class="th">Hinten</div><span>Statisch (A − B)</span><b>28–32 mm</b><b>12–15 mm</b><span>Dynamisch (A − C)</span><b>35–40 mm</b><b>25–30 mm</b></div>
      <div class="hint" style="margin-top:8px">Richtwerte. Im Zweifel gelten die Angaben deines Fahrwerksherstellers, und je nach Motorradtyp kann es Unterschiede geben.</div>
      ${S.bikes.length?`<div class="row" style="margin-top:10px">${S.bikes.map(b=>`<button type="button" class="btn sm" data-act="sag-ref" data-id="${b.id}">Als Ziel für ${esc(b.name)} übernehmen</button>`).join("")}</div>`:""}</div>`;
  }
  h+=`<div class="hint">Allgemeine Grundregeln. Die Angaben deines Fahrwerksherstellers haben Vorrang. Teste Änderungen erst mit ruhigem Tempo.</div>`;
  return {title:"Ratgeber", html:h};
}
function vTools(){
  let h=`<div class="list">
   <button type="button" class="item" data-act="push" data-v="guide"><div class="badge">?</div><div class="grow"><div class="t">Fahrwerksratgeber</div><div class="s">8 Fragen von der Bremse bis zum Beschleunigen, Wissen und Richtwerte</div></div></button>
   <button type="button" class="item" data-act="sag"><div class="badge">mm</div><div class="grow"><div class="t">Negativfederweg-Rechner</div><div class="s">A ausgefedert, B Eigengewicht, C mit Fahrer · mit Zielbereich</div></div></button>
   <button type="button" class="item" data-act="push" data-v="gear"><div class="badge">Z</div><div class="grow"><div class="t">Übersetzung & Bestand</div><div class="s">Alle Kombinationen aus deinen Ritzeln und Kettenrädern</div></div></button>
  </div>`;
  const all=[]; S.bikes.forEach(b=>(b.sag||[]).forEach(m=>all.push({b,m})));
  all.sort((x,y)=>(y.m.date||"").localeCompare(x.m.date||""));
  if(all.length) h+=`<h2>Letzte Messungen</h2><div class="list">`+all.slice(0,5).map(({b,m})=>{ const r=sagCalc(m); return `<button type="button" class="item" data-act="sag-edit" data-bike="${b.id}" data-id="${m.id}"><div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${fmtDate(m.date)}${m.note?" · "+esc(m.note):""}</div></div><div class="num small" style="text-align:right">V ${fmtNum(r.fNo,0)} / ${fmtNum(r.fWith,0)}<br>H ${fmtNum(r.rNo,0)} / ${fmtNum(r.rWith,0)}</div></button>`; }).join("")+`</div>`;
  return {title:"Ratgeber & Rechner", html:h};
}
/* ---- gearing ---- */
function vGear(){
  const fr=S.gear.filter(g=>g.type==="Ritzel").sort((a,b)=>a.teeth-b.teeth), rr=S.gear.filter(g=>g.type==="Kettenrad").sort((a,b)=>a.teeth-b.teeth);
  const inUse={}; S.bikes.forEach(b=>{ const s=currentSetup(b.id); if(s.g_front) inUse["Ritzel"+num(s.g_front)]=(inUse["Ritzel"+num(s.g_front)]||[]).concat(b.name); if(s.g_rear) inUse["Kettenrad"+num(s.g_rear)]=(inUse["Kettenrad"+num(s.g_rear)]||[]).concat(b.name); });
  const cur=new Set(S.bikes.map(b=>{ const s=currentSetup(b.id); return num(s.g_front)+"/"+num(s.g_rear); }));
  let h=`<div class="card"><div class="sec">Schnell rechnen</div><div class="grid3"><div class="f"><label for="qF">Ritzel</label><input id="qF" inputmode="numeric" placeholder="16"></div><div class="f"><label for="qR">Kettenrad</label><input id="qR" inputmode="numeric" placeholder="44"></div><div class="f"><label>Verhältnis</label><div class="num" id="qOut" style="font-size:28px;padding-top:4px">–</div></div></div></div>`;
  const inv=(list,type)=>`<h2>${type==="Ritzel"?"Ritzel":"Kettenräder"}</h2>`+(list.length?`<div class="list">${list.map(g=>{ const u=inUse[type+g.teeth]||[]; const avail=(+g.count||0)-u.length;
    return `<button type="button" class="item" data-act="edit-gear" data-id="${g.id}"><div class="badge">${g.teeth}</div><div class="grow"><div class="t">${g.teeth} Zähne</div><div class="s">${u.length?"verbaut: "+esc(u.join(", ")):"nicht verbaut"}${g.note?" · "+esc(g.note):""}</div></div><div style="text-align:right"><div class="num" style="font-size:20px">${avail}</div><div class="muted" style="font-size:12px">von ${+g.count||0} frei</div></div></button>`; }).join("")}</div>`:`<div class="empty">Noch keine ${type==="Ritzel"?"Ritzel":"Kettenräder"} eingetragen.</div>`);
  h+=inv(fr,"Ritzel")+inv(rr,"Kettenrad");
  h+=`<div class="row"><button type="button" class="btn pri" data-act="new-gear" data-type="Ritzel">+ Ritzel</button><button type="button" class="btn pri" data-act="new-gear" data-type="Kettenrad">+ Kettenrad</button></div>`;
  if(fr.length&&rr.length){
    const combos=[]; fr.forEach(a=>rr.forEach(b=>combos.push({f:a.teeth,r:b.teeth,ratio:b.teeth/a.teeth})));
    combos.sort((a,b)=>a.ratio-b.ratio);
    const chains=(S.gear.find(g=>g.type==="chains")||{}).map||{};
    h+=`<h2>Alle Kombinationen</h2><div class="muted small">Kürzere Übersetzung = höheres Verhältnis. Kettenlänge (Glieder) tippst du einmal ein, dann bleibt sie gespeichert.</div><div class="tablewrap"><table class="hist"><thead><tr><th class="rh">Verhältnis</th><th>Ritzel</th><th>Kettenrad</th><th>Kettenlänge</th></tr></thead><tbody>${combos.map(c=>{ const key=c.f+"/"+c.r; return `<tr><th class="rh">${fmtNum(c.ratio,2)}${cur.has(key)?' <span class="chip bad">aktuell</span>':""}</th><td>${c.f}</td><td>${c.r}</td><td><input aria-label="Kettenlänge ${key}" data-chain="${key}" value="${esc(chains[key]||"")}" inputmode="numeric" style="width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"></td></tr>`; }).join("")}</tbody></table></div>`;
  }
  return {title:"Übersetzung", html:h};
}
/* ---- service ---- */
const SVC_SUGGEST=["Motoröl & Ölfilter","Bremsflüssigkeit vorne","Bremsflüssigkeit hinten","Kupplungsflüssigkeit","Ventilspiel","Kühlflüssigkeit","Zündkerzen","Luftfilter","Kette reinigen & schmieren","Kettenspannung prüfen","Gabelservice / Gabelöl","Federbein-Service","Lenkkopflager","Radlager","Schwingenlager","Drosselklappen synchronisieren"];
const PART_SUGGEST=["Bremsbeläge vorne","Bremsbeläge hinten","Kette","Ritzel","Kettenrad","Bremsscheiben vorne","Bremsscheibe hinten","Kupplungsbeläge","Batterie"];
const isPart = it => it.kind==="part";
function usageSince(bikeId, from, to){ // events/stints of this bike on or after `from` (and before `to`)
  let days=0, stints=0, laps=0;
  S.days.filter(d=>d.bikeId===bikeId).forEach(d=>{
    for(let k=1;k<=evDays(d);k++){ const dt=dayDate(d,k); if(dt>=from && (!to||dt<to)) days++; }
    (d.stints||[]).forEach((st,i)=>{ const dt=stintDate(d,i); if(dt>=from && (!to||dt<to)){ stints++; laps+=num(st.laps)||0; } });
  });
  return {days,stints,laps};
}
const fmtKm = n => Math.round(n).toLocaleString("de-DE")+" km";
function partUsageText(it, log, next){
  const b=byId(S.bikes,it.bikeId)||{}; const u=usageSince(it.bikeId, log.date, next&&next.date);
  const endKm = next? num(next.km) : num(b.km); const km = endKm!=null&&num(log.km)!=null? endKm-num(log.km) : null;
  const p=[]; if(km!=null&&km>=0) p.push(fmtKm(km)); p.push(`${u.days} ${u.days===1?"Fahrtag":"Fahrtage"}`); if(u.stints) p.push(`${u.stints} ${u.stints===1?"Stint":"Stints"}`); if(u.laps) p.push(`${u.laps} Rd.`);
  return p.join(" · ");
}
function partTeeth(it){ const s=currentSetup(it.bikeId); const n=it.name.toLowerCase(); if(n==="ritzel"&&s.g_front) return s.g_front+" Z"; if(n==="kettenrad"&&s.g_rear) return s.g_rear+" Z"; return ""; }
const addMonths=(d,m)=>{ const x=new Date(d+"T12:00:00"); const day=x.getDate(); x.setMonth(x.getMonth()+m); if(x.getDate()<day) x.setDate(0); return x; };
const isoD = x => new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10);
const svcLogs = it => (it.logs||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(num(b.km)||0)-(num(a.km)||0));
function svcStatus(it){
  const b=byId(S.bikes,it.bikeId)||{}; const last=svcLogs(it)[0];
  const hasInt=it.months||it.km||it.days||it.hours;
  if(!last) return {pct:null,cls:"",text:hasInt?"Noch nicht erledigt eingetragen":"Kein Intervall",last:null};
  if(!hasInt) return {pct:null,cls:"",text:"Kein Intervall festgelegt",last};
  let pct=0; const parts=[];
  if(num(it.months)){ const m=num(it.months); const due=addMonths(last.date,m); const start=new Date(last.date+"T12:00:00"); const now=new Date();
    const p=(now-start)/(due-start); pct=Math.max(pct,p); const left=Math.round((due-now)/864e5);
    parts.push({p,t:left<0?`seit ${-left} Tagen fällig`:left<=45?`noch ${left} Tage`:`bis ${fmtDate(isoD(due))}`}); }
  if(num(it.km)&&num(b.km)!=null&&num(last.km)!=null){ const used=num(b.km)-num(last.km); const left=num(it.km)-used; const p=used/num(it.km); pct=Math.max(pct,p);
    parts.push({p,t:left<0?`${Math.round(-left)} km drüber`:`noch ${Math.round(left)} km`}); }
  if(num(it.days)){ let n=0; S.days.filter(d=>d.bikeId===it.bikeId).forEach(d=>{ for(let k=1;k<=evDays(d);k++){ const dt=dayDate(d,k); if(isPart(it)?dt>=last.date:dt>last.date) n++; } }); const left=num(it.days)-n; const p=n/num(it.days); pct=Math.max(pct,p);
    parts.push({p,t:left<0?`${-left} Fahrtage drüber`:left===0?"jetzt fällig (Fahrtage)":`noch ${left} ${left===1?"Fahrtag":"Fahrtage"}`}); }
  if(num(it.hours)&&num(b.hours)!=null&&num(last.hours)!=null){ const used=num(b.hours)-num(last.hours); const left=num(it.hours)-used; const p=used/num(it.hours); pct=Math.max(pct,p);
    parts.push({p,t:left<0?`${fmtNum(-left)} h drüber`:`noch ${fmtNum(left)} h`}); }
  if(!parts.length) return {pct:null,cls:"",text:"Kilometer- bzw. Stundenstand fehlt",last};
  parts.sort((a,b)=>b.p-a.p);
  const cls=pct>=1?"bad":pct>=.8?"mid":"good";
  return {pct,cls,text:parts.map(x=>x.t).join(" · "),last};
}
function svcRow(it){
  const st=svcStatus(it);
  if(isPart(it)){ const last=svcLogs(it)[0]; const tz=partTeeth(it);
    return `<div class="svc"><div class="grow" data-act="open-svc" data-id="${it.id}" role="button" tabindex="0"><div class="t">${esc(it.name)}${tz?` <span class="chip">${esc(tz)}</span>`:""}</div>
      ${last?`<div class="s" style="color:var(--ink);font-weight:600">${esc(partUsageText(it,last))}</div><div class="muted" style="font-size:12px">drauf seit ${fmtDate(last.date)}${last.note?" · "+esc(last.note):""}</div>`:`<div class="s">Einbaudatum fehlt</div>`}
      ${st.pct!=null?`<div class="s ${st.cls==="bad"?"bad":st.cls==="mid"?"mid":""}" style="font-size:12px">${esc(st.text)}</div><div class="bar ${st.cls}"><i style="width:${Math.min(100,Math.max(4,st.pct*100)).toFixed(0)}%"></i></div>`:""}</div>
      <button type="button" class="btn sm" data-act="svc-done" data-id="${it.id}">${last?"Getauscht":"Einbau eintragen"}</button></div>`; }
  return `<div class="svc"><div class="grow" data-act="open-svc" data-id="${it.id}" role="button" tabindex="0"><div class="t">${esc(it.name)}</div>
    <div class="s ${st.cls==="bad"?"bad":st.cls==="mid"?"mid":""}">${esc(st.text)}</div>
    <div class="muted" style="font-size:12px">${st.last?`Zuletzt ${fmtDate(st.last.date)}${st.last.km?" · "+esc(st.last.km)+" km":""}`:""}</div>
    ${st.pct!=null?`<div class="bar ${st.cls}"><i style="width:${Math.min(100,Math.max(4,st.pct*100)).toFixed(0)}%"></i></div>`:""}</div>
    <button type="button" class="btn sm" data-act="svc-done" data-id="${it.id}">Erledigt</button></div>`;
}
const svcDue = () => S.service.filter(it=>{ const s=svcStatus(it); return s.pct!=null&&s.pct>=.8; });
function svcLine(it){
  const st=svcStatus(it); const part=isPart(it); const last=svcLogs(it)[0];
  const cls=st.pct==null?"":st.cls;
  let main, sub;
  if(part){ const tz=partTeeth(it); main=last?partUsageText(it,last):"Einbaudatum fehlt"; sub=last?`seit ${fmtDate(last.date)}${tz?" · "+tz:""}${last.note?" · "+last.note:""}`:(tz?tz:"");
    if(st.pct!=null && cls!=="good") sub=st.text+(sub?" · "+sub:""); }
  else { main=st.text; sub=last?`zuletzt ${fmtDate(last.date)}${last.km?" · "+last.km+" km":""}`:""; }
  return `<div class="srow"><span class="dot ${cls}" aria-hidden="true"></span>
    <div class="grow" data-act="open-svc" data-id="${it.id}" role="button" tabindex="0"><div class="t">${esc(it.name)}</div>
    <div class="s ${!part&&cls==="bad"?"bad":!part&&cls==="mid"?"mid":""}">${esc(main)}</div>${sub?`<div class="m">${esc(sub)}</div>`:""}</div>
    <button type="button" class="ibtn" data-act="svc-done" data-id="${it.id}" aria-label="${part?(last?"Getauscht":"Einbau eintragen"):"Erledigt"}: ${esc(it.name)}" title="${part?(last?"Getauscht":"Einbau eintragen"):"Erledigt"}">${part?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'}</button></div>`;
}
const svcRank = it => { const p=svcStatus(it).pct; return p==null?-1:p; };
function svcHistHtml(bikeId){
  const logs=[]; S.service.filter(it=>it.bikeId===bikeId).forEach(it=>(it.logs||[]).forEach(l=>logs.push({it,l})));
  logs.sort((a,b)=>(b.l.date||"").localeCompare(a.l.date||""));
  if(!logs.length) return `<div class="empty">Noch keine Einträge. Sobald du etwas als erledigt oder getauscht einträgst, erscheint es hier.</div>`;
  const cost=logs.reduce((a,x)=>a+(num(x.l.cost)||0),0);
  return (cost?`<div class="muted small">${logs.length} Einträge · Kosten gesamt <b style="color:var(--ink)">${fmtNum(cost,2)} €</b></div>`:"")+
    `<div class="slist">${logs.map(({it,l})=>`<div class="srow" data-act="svc-log-edit" data-svc="${it.id}" data-id="${l.id}" role="button" tabindex="0"><span class="date">${fmtDate(l.date).slice(0,6)}<small>${(l.date||"").slice(0,4)}</small></span><div class="grow"><div class="t">${esc(it.name)}${isPart(it)?' <span class="chip">Teil</span>':""}</div><div class="m">${esc([l.km?l.km+" km":"",l.note].filter(Boolean).join(" · ")||"Ohne Notiz")}</div></div>${l.cost?`<span class="num">${esc(l.cost)} €</span>`:""}</div>`).join("")}</div>`;
}
function vService(){
  if(!S.bikes.length) return {title:"Service", html:`<div class="empty">Leg zuerst ein Motorrad an, dann kannst du Wartung und Verschleißteile eintragen.<br><br><button type="button" class="btn pri" data-act="new-bike">Motorrad anlegen</button></div>`};
  if(!byId(S.bikes,ui.svcBike)) ui.svcBike=S.bikes[0].id;
  const b=byId(S.bikes,ui.svcBike); const tab=ui.svcTab||"wartung";
  const items=S.service.filter(it=>it.bikeId===b.id);
  const maint=items.filter(x=>!isPart(x)).sort((x,y)=>svcRank(y)-svcRank(x)), parts=items.filter(isPart).sort((x,y)=>svcRank(y)-svcRank(x));
  const cnt=list=>{ let bad=0,mid=0; list.forEach(it=>{ const c=svcStatus(it); if(c.pct!=null){ if(c.pct>=1) bad++; else if(c.pct>=.8) mid++; } }); return {bad,mid}; };
  let h="";
  if(S.bikes.length>1) h+=`<div class="row">${S.bikes.map(x=>{ const c=cnt(S.service.filter(it=>it.bikeId===x.id)); return `<button type="button" class="btn sm ${x.id===b.id?"pri":""}" data-act="svc-bike" data-id="${x.id}">${esc(x.name)}${c.bad+c.mid?` <span class="cnt">${c.bad+c.mid}</span>`:""}</button>`; }).join("")}</div>`;
  const all=cnt(items), ok=items.filter(it=>{ const c=svcStatus(it); return c.pct!=null&&c.pct<.8; }).length;
  h+=`<div class="card svchead"><div class="grow"><div class="muted small">${esc(b.name)}</div><div class="num" style="font-size:26px">${b.km?fmtKm(num(b.km)):"km-Stand fehlt"}${b.hours?` <span class="muted" style="font-size:16px">· ${esc(b.hours)} h</span>`:""}</div>
    <div class="row" style="gap:6px;margin-top:4px">${all.bad?`<span class="chip bad">${all.bad} fällig</span>`:""}${all.mid?`<span class="chip mid">${all.mid} bald fällig</span>`:""}${ok?`<span class="chip good">${ok} in Ordnung</span>`:""}${!all.bad&&!all.mid&&!ok?`<span class="chip">Noch keine Intervalle</span>`:""}</div></div>
    <button type="button" class="btn sm" data-act="odo" data-id="${b.id}">km-Stand</button></div>`;
  const tabs=[["wartung","Wartung",maint.length,cnt(maint)],["teile","Verschleiß",parts.length,cnt(parts)],["heft","Service-Heft",null,null]];
  h+=`<div class="segtabs" role="tablist">${tabs.map(([k,l,n,c])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?"on":""}" data-act="svc-tab" data-t="${k}">${l}${c&&(c.bad+c.mid)?` <span class="cnt">${c.bad+c.mid}</span>`:n?` <small>${n}</small>`:""}</button>`).join("")}</div>`;
  if(tab==="wartung"){
    h+= maint.length? `<div class="slist">${maint.map(svcLine).join("")}</div>` : `<div class="empty">Noch keine Wartungspunkte, z. B. Ölwechsel, Bremsflüssigkeit oder Ventilspiel.</div>`;
    h+=`<button type="button" class="btn" data-act="new-svc" data-bike="${b.id}">+ Wartungspunkt</button>`;
  } else if(tab==="teile"){
    h+= parts.length? `<div class="slist">${parts.map(svcLine).join("")}</div>` : `<div class="empty">Bremsbeläge, Kette, Ritzel, Kettenrad … mit Laufleistung seit dem Einbau.</div>`;
    h+=`<button type="button" class="btn ${parts.length?"":"pri"}" data-act="new-parts" data-id="${b.id}">+ Verschleißteile</button>`;
  } else h+=svcHistHtml(b.id);
  return {title:"Service", html:h};
}
function vSvc(id){
  const it=byId(S.service,id); if(!it) return {title:"Service", html:`<div class="empty">Nicht gefunden.</div>`};
  const st=svcStatus(it); const iv=[it.months?`${esc(it.months)} Monate`:"",it.km?`${esc(it.km)} km`:"",it.days?`${esc(it.days)} Fahrtage`:"",it.hours?`${esc(it.hours)} h`:""].filter(Boolean);
  if(isPart(it)) return vPart(it);
  let h=`<div class="card"><div class="kv"><div><span>Bike</span><b>${esc(bikeName(it.bikeId))}</b></div><div><span>Intervall</span><b>${iv.length?iv.join(" oder "):"–"}</b></div></div>
    <div class="sec">Status</div><div class="${st.cls==="bad"?"":""}" style="font-weight:600;color:${st.cls==="bad"?"var(--accent)":st.cls==="mid"?"var(--warn)":"inherit"}">${esc(st.text)}</div>
    ${st.pct!=null?`<div class="bar ${st.cls}"><i style="width:${Math.min(100,Math.max(4,st.pct*100)).toFixed(0)}%"></i></div>`:""}
    ${it.info?`<div class="sec">Material & Hinweise</div><div class="note">${esc(it.info)}</div>`:""}</div>
  <button type="button" class="btn pri big" data-act="svc-done" data-id="${id}">Erledigt eintragen</button>`;
  const logs=svcLogs(it);
  h+=`<h2>Verlauf</h2>`+(logs.length?`<div class="list">${logs.map(l=>`<button type="button" class="item" data-act="svc-log-edit" data-svc="${id}" data-id="${l.id}"><div class="grow"><div class="t">${fmtDate(l.date)}</div><div class="s">${[l.km?esc(l.km)+" km":"",l.hours?esc(l.hours)+" h":"",l.note?esc(l.note):""].filter(Boolean).join(" · ")||"Ohne Notiz"}</div></div>${l.cost?`<div class="num" style="font-size:18px">${esc(l.cost)} €</div>`:""}</button>`).join("")}</div>`:`<div class="empty">Noch nichts eingetragen.</div>`);
  h+=`<div class="row"><button type="button" class="btn" data-act="edit-svc" data-id="${id}">Bearbeiten</button><button type="button" class="btn danger" data-act="del-svc" data-id="${id}">Löschen</button></div>`;
  return {title:it.name, html:h};
}
function vPart(it){
  const id=it.id; const st=svcStatus(it); const logs=svcLogs(it); const last=logs[0]; const tz=partTeeth(it);
  const iv=[it.km?`${esc(it.km)} km`:"",it.days?`${esc(it.days)} Fahrtage`:"",it.months?`${esc(it.months)} Monate`:""].filter(Boolean);
  let h=`<div class="card"><div class="kv"><div><span>Bike</span><b>${esc(bikeName(it.bikeId))}</b></div>${tz?`<div><span>Aktuell verbaut</span><b>${esc(tz)}</b></div>`:""}<div><span>Tausch spätestens nach</span><b>${iv.length?iv.join(" oder "):"–"}</b></div></div>
    ${last?`<div class="sec">Laufleistung des aktuellen Teils</div><div style="font-family:var(--display);font-size:24px;font-weight:700">${esc(partUsageText(it,last))}</div><div class="muted small">drauf seit ${fmtDate(last.date)}${last.km?" bei "+esc(last.km)+" km":""}${last.note?" · "+esc(last.note):""}</div>`:`<div class="muted small" style="margin-top:8px">Trag ein, wann das aktuelle Teil eingebaut wurde.</div>`}
    ${st.pct!=null?`<div class="s" style="margin-top:8px;font-weight:600;color:${st.cls==="bad"?"var(--accent)":st.cls==="mid"?"var(--warn)":"inherit"}">${esc(st.text)}</div><div class="bar ${st.cls}"><i style="width:${Math.min(100,Math.max(4,st.pct*100)).toFixed(0)}%"></i></div>`:""}
    ${(()=>{ const b=byId(S.bikes,it.bikeId)||{}; return last&&num(last.km)!=null&&num(b.km)==null?`<div class="hint" style="margin-top:6px">Für die Kilometer trag unter Service den aktuellen km-Stand des Bikes ein.</div>`:""; })()}
    ${it.info?`<div class="sec">Hinweise</div><div class="note">${esc(it.info)}</div>`:""}</div>
  <button type="button" class="btn pri big" data-act="svc-done" data-id="${id}">${last?"Getauscht":"Einbau eintragen"}</button>`;
  h+=`<h2>Bisherige Teile</h2>`+(logs.length?`<div class="list">${logs.map((l,k)=>{ const next=k>0?logs[k-1]:null;
    return `<button type="button" class="item" data-act="svc-log-edit" data-svc="${id}" data-id="${l.id}"><div class="grow"><div class="t">${fmtDate(l.date)} – ${next?fmtDate(next.date):"heute"}${!next?' <span class="chip good">aktuell</span>':""}</div><div class="s">${esc(partUsageText(it,l,next))}${l.note?" · "+esc(l.note):""}</div></div>${l.cost?`<div class="num" style="font-size:18px">${esc(l.cost)} €</div>`:""}</button>`; }).join("")}</div>`:`<div class="empty">Noch nichts eingetragen.</div>`);
  h+=`<div class="row"><button type="button" class="btn" data-act="edit-svc" data-id="${id}">Bearbeiten</button><button type="button" class="btn danger" data-act="del-svc" data-id="${id}">Löschen</button></div>`;
  return {title:it.name+" · "+bikeName(it.bikeId), html:h};
}
function vSvcHist(bikeId){
  const logs=[]; S.service.filter(it=>it.bikeId===bikeId).forEach(it=>(it.logs||[]).forEach(l=>logs.push({it,l})));
  logs.sort((a,b)=>(b.l.date||"").localeCompare(a.l.date||""));
  const cost=logs.reduce((a,x)=>a+(num(x.l.cost)||0),0);
  let h=cost?`<div class="card"><div class="kv"><div><span>Einträge</span><b>${logs.length}</b></div><div><span>Kosten gesamt</span><b>${fmtNum(cost,2)} €</b></div></div></div>`:"";
  h+=logs.length?`<div class="list">${logs.map(({it,l})=>`<button type="button" class="item" data-act="svc-log-edit" data-svc="${it.id}" data-id="${l.id}"><div class="badge" style="font-size:14px;line-height:1">${esc(fmtDate(l.date).slice(0,5))}</div><div class="grow"><div class="t">${esc(it.name)}</div><div class="s">${[(l.date||"").slice(0,4),l.km?esc(l.km)+" km":"",l.note?esc(l.note):""].filter(Boolean).join(" · ")}</div></div>${l.cost?`<div class="num" style="font-size:18px">${esc(l.cost)} €</div>`:""}</button>`).join("")}</div>`:`<div class="empty">Noch keine Einträge.</div>`;
  return {title:"Service-Heft · "+bikeName(bikeId), html:h};
}
/* ---- Strecken & Kurven ---- */
const IMG={}; const imgLoading={};
const imgKey = id => "tb2_img_"+id;
function getImg(id){
  if(IMG[id]) return IMG[id];
  try{ const v=localStorage.getItem(imgKey(id)); if(v){ IMG[id]=v; return v; } }catch(e){}
  if(db && !imgLoading[id]){ imgLoading[id]=true;
    db.collection("data/users/"+userId).doc("tb2img_"+id).get().then(snap=>{ if(snap.exists){ const d=(snap.data()||{}).data; if(d){ IMG[id]=d; try{ localStorage.setItem(imgKey(id),d); }catch(e){} render(); } } }).catch(()=>{}).finally(()=>{ imgLoading[id]=false; });
  }
  return null;
}
async function putImg(id, data){
  if(data){ IMG[id]=data; try{ localStorage.setItem(imgKey(id),data); }catch(e){} }
  else { delete IMG[id]; try{ localStorage.removeItem(imgKey(id)); }catch(e){} }
  if(db){ try{ const ref=db.collection("data/users/"+userId).doc("tb2img_"+id); if(data) await ref.set({data}); else await ref.delete(); }catch(e){} }
}
function compressImage(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file); const im=new Image();
    im.onload=()=>{ let max=1400, q=.8, out="";
      for(let i=0;i<12;i++){ const sc=Math.min(1,max/Math.max(im.width,im.height)); const c=document.createElement("canvas"); c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
        const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height); out=c.toDataURL("image/jpeg",q);
        if(out.length<220000) break; if(q>.5) q-=.1; else max=Math.round(max*.8); }
      URL.revokeObjectURL(url); res(out); };
    im.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("Bild konnte nicht gelesen werden")); };
    im.src=url;
  });
}
function bestLaps(tr){ // fastest stint per bike, plus overall
  const per={}; let all=null;
  daysAtTrack(tr).forEach(d=>(d.stints||[]).forEach((st,i)=>{ const v=lapSec(st.lap); if(v==null) return; const r={v,d,i};
    if(!per[d.bikeId]||v<per[d.bikeId].v) per[d.bikeId]=r; if(!all||v<all.v) all=r; }));
  return {all, per:Object.values(per).sort((a,b)=>a.v-b.v)};
}
const bestItem = (r,big) => `<button type="button" class="item" data-act="open-day" data-id="${r.d.id}"><div class="grow"><div class="t">${esc(bikeName(r.d.bikeId))}</div><div class="s">${fmtDate(stintDate(r.d,r.i))} · ${stintLabel(r.d,r.i)}${r.d.rider?" · "+esc(r.d.rider):""}</div></div><div class="num" style="font-size:${big?28:20}px">${fmtLap(r.v)}</div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);flex:none"><path d="M9 6l6 6-6 6"/></svg></button>`;
const dayTrack = d => d.trackId? byId(S.tracks,d.trackId) : null;
const daysAtTrack = tr => S.days.filter(d=>d.trackId===tr.id || (!d.trackId && (d.track||"").trim().toLowerCase()===tr.name.trim().toLowerCase()));
function cornerNotes(tr, cid){
  const out=[]; daysAtTrack(tr).forEach(d=>(d.stints||[]).forEach((st,i)=>{ if(st.corners&&st.corners[cid]) out.push({d,i,t:st.corners[cid]}); }));
  return out.sort((a,b)=>(b.d.date||"").localeCompare(a.d.date||"")||b.i-a.i);
}
function mapHtml(tr, opts={}){
  const img=tr.hasImg?getImg(tr.id):null; const cs=tr.corners||[];
  if(!img) return tr.hasImg?`<div class="empty">Bild wird geladen …</div>`:"";
  const placing=ui.place&&ui.place.trackId===tr.id&&!opts.noPlace;
  return `<div class="map ${placing?"placing":""}" data-act="${opts.act||"map-tap"}" data-track="${tr.id}"><img src="${img}" alt="Streckenplan ${esc(tr.name)}">${cs.filter(c=>c.x!=null).map(c=>`<button type="button" class="mk ${opts.has&&opts.has[c.id]?"has":""} ${(ui.place&&ui.place.cornerId===c.id)||opts.sel===c.id?"sel":""}" style="left:${(c.x*100).toFixed(2)}%;top:${(c.y*100).toFixed(2)}%" data-act="${opts.mkAct||"open-corner"}" data-track="${tr.id}" data-id="${c.id}" aria-label="Kurve ${esc(c.name)}">${esc(c.name.replace(/^T/,""))}</button>`).join("")}</div>`;
}
function vTracks(){
  let h=`<button type="button" class="btn pri big" data-act="new-track">+ Strecke anlegen</button>`;
  if(!S.tracks.length) return {title:"Strecken", html:h+`<div class="empty">Noch keine Strecken. Leg eine Strecke an, lade einen Streckenplan als Bild hoch und tippe die Kurven darauf.</div>`};
  h+=`<div class="list">`+S.tracks.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(tr=>{ const ds=daysAtTrack(tr); const bl=bestLaps(tr).all;
    return `<button type="button" class="item" data-act="open-track" data-id="${tr.id}"><div class="badge">${(tr.corners||[]).length}</div><div class="grow"><div class="t">${esc(tr.name)}</div><div class="s">${(tr.corners||[]).length} Kurven · ${ds.length} Events${bl?" · Bestzeit mit "+esc(bikeName(bl.d.bikeId)):""}</div></div><div class="num" style="font-size:20px">${bl?fmtLap(bl.v):""}</div></button>`; }).join("")+`</div>`;
  return {title:"Strecken", html:h};
}
function vTrack(id){
  const tr=byId(S.tracks,id); if(!tr) return {title:"Strecke", html:`<div class="empty">Nicht gefunden.</div>`};
  const ds=daysAtTrack(tr).sort((a,b)=>(b.date||"").localeCompare(a.date||"")); const bl=bestLaps(tr);
  const cs=tr.corners||[]; const placing=ui.place&&ui.place.trackId===id;
  let h=bl.all? `<h2 style="margin-top:0">Bestzeit</h2>${bestItem(bl.all,true)}`:"";
  if(bl.per.length>1) h+=`<div class="sec" style="margin:0">Bestzeit je Bike</div><div class="list">${bl.per.map(r=>bestItem(r)).join("")}</div>`;
  h+=`<div class="card"><div class="kv"><div><span>Kurven</span><b>${cs.length}</b></div><div><span>Events</span><b>${ds.length}</b></div>${tr.length?`<div><span>Länge</span><b>${esc(tr.length)} km</b></div>`:""}</div>${tr.notes?`<div class="note" style="margin-top:8px">${esc(tr.notes)}</div>`:""}</div>`;
  if(tr.hasImg){
    h+= placing? `<div class="placehint">${ui.place.cornerId?`Tippe auf die neue Stelle für ${esc((cs.find(c=>c.id===ui.place.cornerId)||{}).name||"die Kurve")}.`:`Tippe auf den Plan, um Kurve T${cs.length+1} zu setzen. Weitertippen für die nächsten Kurven.`}</div>`:"";
    h+=mapHtml(tr);
    h+=`<div class="mapbar">${placing?`<button type="button" class="btn pri sm" data-act="place-stop">Fertig</button>`:`<button type="button" class="btn pri sm" data-act="place-start" data-id="${id}">Kurven auf dem Plan setzen</button>`}<label class="btn sm filebtn">Bild ersetzen<input type="file" accept="image/*" data-upload="${id}"></label></div>`;
  } else {
    h+=`<div class="card"><div style="font-weight:600">Streckenplan hinzufügen</div><div class="muted small" style="margin:4px 0 10px">Lade einen Screenshot vom Streckenplan, ein Foto oder eine Skizze hoch. Danach tippst du die Kurven direkt aufs Bild.</div><label class="btn pri filebtn">Bild auswählen<input type="file" accept="image/*" data-upload="${id}"></label><div id="upMsg" class="muted small" style="margin-top:6px"></div></div>`;
  }
  h+=`<h2>Kurven</h2>`;
  h+= cs.length? `<div class="list">${cs.map(c=>{ const n=cornerNotes(tr,c.id); const info=[c.dir,c.gear?c.gear+". Gang":"",c.brake?"Bremsen: "+c.brake:""].filter(Boolean).join(" · ");
    return `<button type="button" class="item" data-act="open-corner" data-track="${id}" data-id="${c.id}"><div class="badge">${esc(c.name.replace(/^T/,""))}</div><div class="grow"><div class="t">${esc(c.name)}${c.label?" · "+esc(c.label):""}</div><div class="s">${esc(info||(c.notes?c.notes.slice(0,70):"Tippen für Linie, Bremspunkt, Blickpunkt …"))}</div></div>${n.length?`<span class="chip">${n.length} ${n.length===1?"Notiz":"Notizen"}</span>`:""}</button>`; }).join("")}</div>` : `<div class="empty">Noch keine Kurven.${tr.hasImg?" Tippe oben auf „Kurven auf dem Plan setzen“.":""}</div>`;
  h+=`<div class="row"><button type="button" class="btn" data-act="add-corner" data-id="${id}">+ Kurve ohne Plan</button><button type="button" class="btn" data-act="edit-track" data-id="${id}">Strecke bearbeiten</button></div>`;
  if(ds.length) h+=`<h2>Events hier</h2><div class="list">${ds.map(dayItem).join("")}</div>`;
  return {title:tr.name, html:h};
}
function trackForm(tr){
  const isNew=!tr; tr=tr||{};
  openSheet(isNew?"Neue Strecke":"Strecke bearbeiten", `
    ${inp("name","Name",tr.name||"",'placeholder="z. B. Rijeka"')}
    <div class="grid2">${inp("place","Ort / Land",tr.place||"")}${inp("length","Länge (km)",tr.length||"",'inputmode="decimal"')}</div>
    ${area("notes","Notizen zur Strecke",tr.notes,"Belag, Bodenwellen, Boxenausfahrt, Besonderheiten")}
    ${isNew?"":`${tr.hasImg?`<button type="button" class="btn" data-act="del-img" data-id="${tr.id}">Streckenplan entfernen</button>`:""}<button type="button" class="btn danger" data-act="del-track" data-id="${tr.id}">Strecke löschen</button>`}`,
  fd=>{ if(!fd.name) return formErr("Bitte gib der Strecke einen Namen.");
    const vals={name:fd.name,place:fd.place,length:fd.length,notes:fd.notes};
    if(isNew){ const rec={id:uid(),...vals,corners:[],hasImg:false}; S.tracks.push(rec);
      S.days.forEach(d=>{ if(!d.trackId && (d.track||"").trim().toLowerCase()===rec.name.trim().toLowerCase()){ d.trackId=rec.id; dayChanged(d.id); } });
      changed("tracks"); ui.tab="days"; ui.stack=[{v:"track",id:rec.id}]; render(); return rec; }
    else { Object.assign(tr,vals); changed("tracks"); } });
}
function cornerForm(trackId, c){
  const tr=byId(S.tracks,trackId); if(!tr) return; const isNew=!c; c=c||{name:"T"+((tr.corners||[]).length+1)};
  const hist=isNew?[]:cornerNotes(tr,c.id);
  openSheet(isNew?"Neue Kurve":c.name+(c.label?" · "+c.label:""), `
    ${!isNew&&tr.hasImg&&getImg(tr.id)?`<div style="max-width:420px">${mapHtml(tr,{noPlace:true,act:"noop",mkAct:"noop",sel:c.id})}</div>`:""}
    <div class="grid3">${inp("name","Nummer",c.name||"")}${inp("label","Name (optional)",c.label||"",'placeholder="z. B. Haarnadel"')}${sel("dir","Richtung",c.dir||"",[["","–"],"Links","Rechts"])}</div>
    <div class="grid2">${inp("gear","Gang",c.gear||"",'inputmode="numeric"')}${inp("brake","Bremspunkt",c.brake||"",'placeholder="z. B. 100er Schild"')}</div>
    ${inp("turnin","Einlenkpunkt",c.turnin||"")}
    ${inp("apex","Scheitelpunkt / Linie",c.apex||"",'placeholder="z. B. später Scheitel, innen am Curb"')}
    ${inp("look","Blickpunkt",c.look||"")}
    ${inp("exit","Ausgang / Gas",c.exit||"",'placeholder="z. B. ab Scheitel sanft auf, raus bis zum Curb"')}
    ${area("notes","Mein Plan für die Kurve",c.notes,"Worauf will ich hier achten?")}
    ${hist.length?`<fieldset><legend>Notizen aus deinen Stints</legend><div class="list">${hist.map(x=>`<div><div class="muted" style="font-size:13px">${fmtDate(stintDate(x.d,x.i))} · ${esc(eventName(x.d))} · ${stintLabel(x.d,x.i)}</div><div class="note">${esc(x.t)}</div></div>`).join("")}</div></fieldset>`:""}
    ${isNew?"":`<div class="row">${tr.hasImg?`<button type="button" class="btn" data-act="place-move" data-track="${trackId}" data-id="${c.id}">Auf dem Plan verschieben</button>`:""}<button type="button" class="btn danger" data-act="del-corner" data-track="${trackId}" data-id="${c.id}">Kurve löschen</button></div>`}`,
  fd=>{ const vals={name:fd.name||c.name,label:fd.label,dir:fd.dir,gear:fd.gear,brake:fd.brake,turnin:fd.turnin,apex:fd.apex,look:fd.look,exit:fd.exit,notes:fd.notes};
    tr.corners=tr.corners||[]; if(isNew) tr.corners.push({id:uid(),...vals}); else Object.assign(c,vals); changed("tracks"); });
}
function cornerChips(d, st){
  const tr=dayTrack(d); if(!tr||!st.corners) return "";
  const cs=(tr.corners||[]).filter(c=>st.corners[c.id]); if(!cs.length) return "";
  return `<div class="sec">Kurven</div><div class="list">${cs.map(c=>`<div class="row" style="align-items:flex-start;gap:10px;flex-wrap:nowrap"><span class="badge" style="min-width:34px;height:34px;font-size:15px">${esc(c.name.replace(/^T/,""))}</span><div class="note small" style="padding-top:6px">${esc(st.corners[c.id])}</div></div>`).join("")}</div>`;
}
async function handleUpload(input){
  const id=input.dataset.upload; const f=input.files&&input.files[0]; if(!f) return;
  const tr=byId(S.tracks,id); if(!tr) return;
  const msg=$("#upMsg"); if(msg) msg.textContent="Bild wird verkleinert …";
  try{ const data=await compressImage(f); await putImg(id,data); tr.hasImg=true; changed("tracks");
    if(!(tr.corners||[]).some(c=>c.x!=null)){ ui.place={trackId:id}; render(); }
  }catch(e){ if(msg) msg.textContent="Das Bild konnte nicht gelesen werden. Versuch es mit einem Screenshot oder JPG."; }
}
function vMore(){
  const done=S.pack.filter(p=>p.done).length;
  return {title:"Mehr", html:`<div class="list">
    <button type="button" class="item" data-act="push" data-v="pack"><div class="badge">✓</div><div class="grow"><div class="t">Packliste</div><div class="s">${S.pack.length?`${done} von ${S.pack.length} eingepackt`:"Noch leer"}</div></div></button>
    <button type="button" class="item" data-act="push" data-v="data"><div class="badge">⇅</div><div class="grow"><div class="t">Daten & Backup</div><div class="s">Sicherung speichern oder einspielen</div></div></button>
  </div>`};
}
function vPack(){
  let h="";
  if(!S.pack.length) h+=`<div class="empty">Deine Packliste ist leer.<br><br><button type="button" class="btn pri" data-act="pack-seed">Vorschlagsliste übernehmen</button></div>`;
  const order=Object.keys(PACK_SUGGEST); [...new Set(S.pack.map(p=>p.cat||"Sonstiges"))].sort((a,b)=>{ const x=order.indexOf(a),y=order.indexOf(b); return (x<0?99:x)-(y<0?99:y); }).forEach(c=>{ const its=S.pack.filter(p=>(p.cat||"Sonstiges")===c); h+=`<h2>${esc(c)} <span style="font-size:15px">${its.filter(p=>p.done).length}/${its.length}</span></h2><div class="list">`+S.pack.filter(p=>(p.cat||"Sonstiges")===c).map(p=>`<div class="check ${p.done?"done":""}"><input type="checkbox" id="pk_${p.id}" data-act="pack-toggle" data-id="${p.id}" ${p.done?"checked":""}><label for="pk_${p.id}">${esc(p.text)}</label><button type="button" class="x" data-act="pack-del" data-id="${p.id}" aria-label="${esc(p.text)} entfernen">×</button></div>`).join("")+`</div>`; });
  h+=`<form class="card" id="packForm"><div class="grid2"><div class="f"><label for="pkText">Neuer Eintrag</label><input id="pkText" name="text" placeholder="z. B. Ersatz-Bremshebel"></div><div class="f"><label for="pkCat">Kategorie</label><input id="pkCat" name="cat" list="pkCats" placeholder="Werkzeug"><datalist id="pkCats">${Object.keys(PACK_SUGGEST).map(k=>`<option value="${k}">`).join("")}</datalist></div></div><button class="btn pri" style="margin-top:10px">Hinzufügen</button></form>`;
  if(S.pack.length) h+=`<div class="row"><button type="button" class="btn" data-act="pack-reset">Alle Haken entfernen (für das nächste Event)</button><button type="button" class="btn" data-act="pack-fill">Fehlende Vorschläge ergänzen</button></div><div id="packMsg" class="muted small"></div>`;
  return {title:"Packliste", html:h};
}
function vData(){
  const st=S.days.reduce((a,d)=>a+(d.stints||[]).length,0);
  return {title:"Daten & Backup", html:`<div class="card"><div style="font-weight:600">Speicherort</div><div class="muted small">${db?"Diese Testversion speichert privat in deinem Claude-Konto, nur du siehst die Daten. In der fertigen App liegen alle Daten nur auf deinem iPhone.":"Alle Daten liegen nur auf diesem Gerät."}</div></div>
  <div class="card"><div style="font-weight:600">Sicherung</div><div class="muted small" style="margin-bottom:10px">${S.bikes.length} Bikes, ${S.days.length} Events, ${st} Stints. Speichere die Sicherung z. B. in einer Notiz oder in der Dateien-App, um Daten aufs iPad zu übertragen.</div>
  <div class="row"><button type="button" class="btn pri" data-act="export">Sicherung kopieren</button><button type="button" class="btn" data-act="import">Sicherung einspielen</button></div><div id="expMsg" class="muted small" style="margin-top:8px"></div></div>`};
}

/* ================= render ================= */
function render(){
  renderTabs();
  const top=ui.stack[ui.stack.length-1]; let v;
  if(top){ v=({tracks:vTracks,track:()=>vTrack(top.id),guide:()=>vGuide(top.tab,top.q),svc:()=>vSvc(top.id),svchist:()=>vSvcHist(top.id),day:()=>vDay(top.id),bike:()=>vBike(top.id),hist:()=>vHist(top.id),gear:vGear,pack:vPack,data:vData}[top.v]||vHome)(); }
  else v=({home:vHome,days:vDays,bikes:vBikes,service:vService,tools:vTools,more:vMore}[ui.tab]||vHome)();
  $("#title").textContent=v.title; $("#title").classList.toggle("sub",!!top); $("#logo").hidden=!!top||ui.tab!=="home"; $("#backBtn").hidden=!top;
  const ae=document.activeElement, keep=ae&&ae.dataset&&ae.dataset.chain;
  $("#main").innerHTML=v.html;
  if(keep){ const el=document.querySelector(`[data-chain="${keep}"]`); if(el) el.focus(); }
}

/* ================= sheet ================= */
let sheetSave=null, sheetChange=null;
function openSheet(title, body, onSave, opts={}){
  $("#sheetTitle").textContent=title; $("#sheetBody").innerHTML=body; $("#sheetBody").scrollTop=0;
  $("#sheetSave").textContent=opts.saveLabel||"Speichern"; $("#sheetSave").hidden=!!opts.noSave;
  sheetSave=onSave; sheetChange=opts.onChange||null;
  $("#sheetWrap").classList.add("open"); $("#sheetWrap").setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  if(sheetChange) sheetChange(null);
  $("#sheetBody").scrollTop=0; requestAnimationFrame(()=>{ $("#sheetBody").scrollTop=0; });
}
function closeSheet(){ runDeferred(); $("#sheetWrap").classList.remove("open"); $("#sheetWrap").setAttribute("aria-hidden","true"); document.body.style.overflow=""; sheetSave=null; sheetChange=null; }
function toast(msg){ let t=document.getElementById("toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2200); }
function confirmSheet(text, yes, onYes){ openSheet("Sicher?", `<div class="card">${esc(text)}</div><button type="button" class="btn pri big" id="cfYes">${esc(yes)}</button>`, null, {noSave:true}); $("#cfYes").onclick=()=>{ closeSheet(); onYes(); }; }
function formData(){ const fd={}; new FormData($("#sheet")).forEach((v,k)=>{ fd[k]=typeof v==="string"?v.trim():v; }); return fd; }
$("#sheet").addEventListener("submit", e=>{ e.preventDefault(); if(!sheetSave) return; if(sheetSave(formData())!==false) closeSheet(); });
$("#sheet").addEventListener("change", e=>{ if(sheetChange) sheetChange(e.target); });
$("#sheet").addEventListener("input", e=>{ if(sheetChange&&e.target.dataset.live) sheetChange(e.target); });
$("#sheetWrap").addEventListener("click", e=>{ if(e.target===$("#sheetWrap")) closeSheet(); });
function formErr(msg){ let el=$("#formErr"); if(!el){ el=document.createElement("div"); el.id="formErr"; el.className="chip bad"; el.style.cssText="white-space:normal;padding:8px 12px;font-size:14px"; $("#sheetBody").prepend(el); } el.textContent=msg; $("#sheetBody").scrollTop=0; return false; }

const inp=(name,label,val,attrs="")=>`<div class="f"><label for="i_${name}">${label}</label><input id="i_${name}" name="${name}" value="${esc(val)}" ${attrs}></div>`;
const area=(name,label,val,ph="")=>`<div class="f"><label for="i_${name}">${label}</label><textarea id="i_${name}" name="${name}" placeholder="${esc(ph)}">${esc(val)}</textarea></div>`;
const sel=(name,label,val,opts)=>`<div class="f"><label for="i_${name}">${label}</label><select id="i_${name}" name="${name}">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(val??"")?"selected":""}>${esc(l)}</option>`;}).join("")}</select></div>`;
const seg=(name,val,opts)=>`<div class="seg" role="radiogroup">${opts.map(([v,l,c])=>`<label><input type="radio" name="${name}" value="${v}" class="${c||""}" ${String(val)===String(v)?"checked":""}><span>${l}</span></label>`).join("")}</div>`;
function setupFields(b, vals, prev){
  const fs=bikeFields(b);
  return GROUPS.map(g=>{ const f=fs.filter(x=>x.g===g); if(!f.length) return "";
    return `<fieldset><legend>${g}</legend><div class="grid2">${f.map(x=>{ const v=vals[x.k]??""; const was=prev&&String(prev[x.k]??"")!==String(v);
      return `<div class="f"><label for="i_su_${x.k}">${esc(x.l)}${x.u?` <i>(${esc(x.u)})</i>`:""}</label><input id="i_su_${x.k}" name="su_${x.k}" value="${esc(v)}" data-live="1" data-prev="${esc(prev?prev[x.k]??"":"")}" class="${was?"was":""}" ${x.text?"":'inputmode="decimal"'} autocomplete="off">${prev?`<div class="hint">${prev[x.k]?"bisher "+esc(prev[x.k]):"&nbsp;"}</div>`:""}</div>`; }).join("")}</div></fieldset>`; }).join("");
}
const readSetup = (b, fd) => { const s={}; bikeFields(b).forEach(x=>{ const v=fd["su_"+x.k]; if(v!=null&&v!=="") s[x.k]=v; }); return s; };

/* ================= forms ================= */
function bikeForm(b){
  const isNew=!b; b=b||{hidden:[],custom:[],sagTarget:{}}; b.sagTarget=b.sagTarget||{};
  const hidden=new Set(b.hidden||[]);
  openSheet(isNew?"Motorrad · Schritt 1/2":"Motorrad bearbeiten", `
    ${isNew?`<div class="muted small">Trag dein Motorrad so ein wie oben auf deinem Setup-Sheet: Modell, Federbein und Gabel. Im nächsten Schritt folgt die Grundabstimmung.</div>`:""}
    ${inp("name","Bike",b.name||"",'placeholder="Hersteller, Modell, Baujahr"')}
    <div class="grid2">${inp("shock","Federbein",b.shock||"",'placeholder="Hersteller und Typ"')}${inp("fork","Gabel",b.fork||"",'placeholder="Hersteller und Typ"')}</div>
    ${area("notes","Hinweise",b.notes,"Alles, was du dir zum Fahrwerk merken willst, z. B. wie die Längenverstellung funktioniert")}
    <details class="more"><summary>Felder anpassen (optional)</summary><div class="list" style="margin-top:8px"><fieldset><legend>Welche Einstellungen hat dein Bike?</legend><div class="muted small">Nur angehakte Felder erscheinen im Setup.</div>
    ${["Federbein","Gabel","Sonstiges","Reifen"].map(g=>`<div class="sec">${g}</div><div class="fieldpick">${FIELDS.filter(f=>f.g===g).map(f=>`<label class="cb"><input type="checkbox" name="has_${f.k}" ${hidden.has(f.k)?"":"checked"}>${esc(f.l)}</label>`).join("")}</div>`).join("")}</fieldset>
    ${area("custom","Eigene Felder (eins pro Zeile: Name; Einheit)",(b.custom||[]).map(c=>c.l+(c.u?"; "+c.u:"")).join("\n"),"Kettendurchhang; mm\nBremshebel Position; Stufe")}</div></details>
    <fieldset><legend>Ziel-Negativfederweg (mm, optional)</legend><div class="grid2">${inp("tg_fNo","Vorne ohne Fahrer",b.sagTarget.fNo||"",'placeholder="20-30"')}${inp("tg_rNo","Hinten ohne Fahrer",b.sagTarget.rNo||"",'placeholder="5-15"')}${inp("tg_fWith","Vorne mit Fahrer",b.sagTarget.fWith||"",'placeholder="30-40"')}${inp("tg_rWith","Hinten mit Fahrer",b.sagTarget.rWith||"",'placeholder="25-35"')}</div><div class="hint">Bereich aus der Anleitung deines Fahrwerks, als „von-bis“. Leer lassen, wenn du ihn nicht kennst.</div><button type="button" class="btn sm" style="margin-top:8px" data-act="sag-ref-fill">Richtwerte Supersport/Superbike Rennstrecke eintragen</button></fieldset>
    ${isNew?"":`<button type="button" class="btn danger" data-act="del-bike" data-id="${b.id}">Motorrad löschen</button>`}`,
  fd=>{
    if(!fd.name) return formErr("Bitte gib dem Motorrad einen Namen.");
    const old=b.custom||[];
    const custom=(fd.custom||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{ const [n,u]=l.split(";").map(x=>(x||"").trim()); const ex=old.find(c=>c.l===n); return {k:ex?ex.k:"c_"+uid(), l:n, u:u||""}; });
    const vals={name:fd.name,shock:fd.shock,fork:fd.fork,notes:fd.notes,hidden:FIELDS.filter(f=>!fd["has_"+f.k]).map(f=>f.k),custom,
      sagTarget:{fNo:fd.tg_fNo,rNo:fd.tg_rNo,fWith:fd.tg_fWith,rWith:fd.tg_rWith}};
    if(isNew){ const rec={id:uid(),base:{},sag:[],...vals}; S.bikes.push(rec); changed("bikes"); ui.tab="bikes"; ui.stack=[{v:"bike",id:rec.id}]; render(); setTimeout(()=>{ rec._new=true; baseForm(rec); delete rec._new; },50); }
    else { Object.assign(b,vals); changed("bikes"); }
  });
}
function baseForm(b){
  openSheet(b._new?"Grundabstimmung · Schritt 2/2":"Grundabstimmung", `<div class="muted small">Dein Ausgangs-Setup („Setting before start“), so wie das Bike gerade eingestellt ist. Felder, die du nicht kennst, lässt du leer. Neue Events starten automatisch mit dem zuletzt gefahrenen Setup.</div>${setupFields(b,b.base||{})}`,
    fd=>{ b.base=readSetup(b,fd); changed("bikes"); });
}
function dayForm(d){
  const isNew=!d;
  if(isNew && !S.bikes.length) return bikeForm();
  const last=daysSorted()[0];
  d=d||{date:today(), bikeId:(last&&last.bikeId)||S.bikes[0].id, rider:(last&&last.rider)||"", track:""};
  openSheet(isNew?"Neues Event":"Event bearbeiten", `
    ${inp("title","Name des Events (optional)",d.title||"",'placeholder="z. B. Trainingscamp Rijeka" autocomplete="off"')}
    <div class="grid2">${inp("date","Erster Tag",d.date||"",'type="date"')}${sel("dayCount","Dauer",evDays(d),[1,2,3,4,5,6,7].map(n=>[n,n===1?"1 Tag":n+" Tage"]))}</div>
    <div class="hint" id="rangeHint" style="margin-top:-6px"></div>
    ${sel("bikeId","Bike",d.bikeId,S.bikes.map(b=>[b.id,b.name]))}
    <div class="grid2">${sel("trackId","Strecke",d.trackId||(d.track&&!d.trackId?"__new":(S.tracks.length?"":"__new")),[["","– Strecke wählen –"],...S.tracks.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(t=>[t.id,t.name]),["__new","+ Neue Strecke"]])}${inp("rider","Fahrer",d.rider||"",'list="riderList" autocomplete="off"')}</div>
    <div id="newTrackSlot">${inp("track","Name der neuen Strecke",d.trackId?"":(d.track||""),'placeholder="z. B. Rijeka" autocomplete="off"')}</div>
    <datalist id="riderList">${ridersKnown().map(t=>`<option value="${esc(t)}">`).join("")}</datalist>
    <div class="grid2">${inp("air","Lufttemperatur °C",d.air||"",'inputmode="decimal"')}${inp("trackTemp","Asphalttemperatur °C",d.trackTemp||"",'inputmode="decimal"')}</div>
    ${isNew?`<div id="startSlot"></div>`:area("result","Endergebnis",d.result,"z. B. Rennen P4, 1:34.8")}`,
  fd=>{
    if(!fd.bikeId) return formErr("Bitte wähle ein Bike.");
    let trackId=fd.trackId, track="";
    if(trackId==="__new"){ if(!fd.track) return formErr("Bitte gib den Namen der neuen Strecke ein."); const ex=S.tracks.find(t=>t.name.trim().toLowerCase()===fd.track.trim().toLowerCase());
      if(ex) trackId=ex.id; else { const rec={id:uid(),name:fd.track,corners:[],hasImg:false}; S.tracks.push(rec); changed("tracks"); trackId=rec.id; } }
    const trk=byId(S.tracks,trackId); track=trk?trk.name:"";
    const dc=parseInt(fd.dayCount)||1;
    if(!isNew && (d.stints||[]).some(x=>(x.day||1)>dc)) return formErr(`Es gibt Stints an Tag ${Math.max(...d.stints.map(x=>x.day||1))}. Lösch sie zuerst oder wähle eine längere Dauer.`);
    const vals={title:fd.title,date:fd.date,dayCount:dc,bikeId:fd.bikeId,trackId:trk?trk.id:"",track,rider:fd.rider,air:fd.air,trackTemp:fd.trackTemp};
    if(isNew){ const b=byId(S.bikes,fd.bikeId); const rec={id:uid(),created:Date.now(),...vals,start:readSetup(b,fd),stints:[],result:""}; S.days.push(rec); dayChanged(rec.id); ui.tab="days"; ui.stack=[{v:"day",id:rec.id}]; render(); }
    else { Object.assign(d,vals,{result:fd.result}); dayChanged(d.id); }
  }, {onChange:t=>{
    if(!t||t.name==="trackId"){ $("#newTrackSlot").hidden=$("#i_trackId").value!=="__new"; }
    if(!t||t.name==="dayCount"||t.name==="date"){ const tmp={date:$("#i_date").value,dayCount:$("#i_dayCount").value}; $("#rangeHint").textContent=evDays(tmp)>1&&tmp.date?`${wd(tmp.date)} ${fmtDate(tmp.date)} bis ${wd(dayDate(tmp,evDays(tmp)))} ${fmtDate(dayDate(tmp,evDays(tmp)))}`:""; }
    if(!isNew) return;
    if(!t||t.name==="bikeId"){ const b=byId(S.bikes,$("#i_bikeId").value); const cur=currentSetup(b.id);
      $("#startSlot").innerHTML=`<div class="sec">Setup vor Start</div><div class="muted small">Übernommen vom letzten Setup dieses Bikes. Nur ändern, was du vor dem ersten Stint umgestellt hast.</div>${setupFields(b,cur,cur)}`; }
    if(t&&t.dataset.live) t.classList.toggle("was", t.dataset.prev!==t.value);
  }});
}
function startForm(d){
  const b=byId(S.bikes,d.bikeId);
  openSheet("Setup vor Start", setupFields(b,d.start||{}), fd=>{ d.start=readSetup(b,fd); dayChanged(d.id); });
}
function stintForm(d, i){
  const isNew=i==null; const b=byId(S.bikes,d.bikeId); const st=isNew?{}:d.stints[i]; const idx=isNew?(d.stints||[]).length:i;
  const prev=setupAt(d,idx); const vals=Object.assign({},prev,st.changes||{});
  const prevSt=idx>0?d.stints[idx-1]:null; const n=evDays(d);
  let defDay=st.day||1;
  if(isNew){ const t=today(); let k=0; for(let j=1;j<=n;j++) if(dayDate(d,j)===t) k=j; defDay=k||(prevSt?(prevSt.day||1):1); }
  const carry = isNew && prevSt && (prevSt.sym||[]).length ? `<div class="card carry"><div class="eyebrow">Offen vom letzten Stint</div>${adviceHtml(prevSt.sym,true)}<div class="hint" style="margin-top:6px">Was du umstellst, trägst du unten unter „Setup vor diesem Stint geändert?“ ein.</div></div>` : "";
  openSheet(isNew?"Neuer Stint":stintLabel(d,i), `${carry}
    ${n>1?`<div class="f"><label>An welchem Tag?</label>${seg("day",defDay,Array.from({length:n},(_,j)=>[j+1,`Tag ${j+1}`]))}<div class="hint">${Array.from({length:n},(_,j)=>`Tag ${j+1}: ${wd(dayDate(d,j+1))} ${fmtDate(dayDate(d,j+1)).slice(0,6)}`).join(" · ")}</div></div>`:""}
    ${(()=>{ const u=isNew?null:{dayId:d.id,i,exclusive:true}; const aF=tyreAge(d.bikeId,"F",u), aR=tyreAge(d.bikeId,"R",u);
      return `<div class="card" style="padding:10px 12px"><div style="font-weight:600;font-size:14px">Neue Reifen für diesen Stint?</div><div class="row" style="gap:18px"><label class="cb"><input type="checkbox" name="newF" ${isNewTyre(st,"F")?"checked":""}>Vorne</label><label class="cb"><input type="checkbox" name="newR" ${isNewTyre(st,"R")?"checked":""}>Hinten</label></div><div class="hint">Bisher gefahren:<br>Vorne: ${esc(ageText(aF,true))}<br>Hinten: ${esc(ageText(aR,true))}</div></div>`; })()}
    <fieldset><legend>Zurück in der Box</legend>
      <div class="grid3">${inp("lap","Rundenzeit",st.lap||"",'placeholder="1:34.7" inputmode="decimal"')}${inp("ideal","Idealzeit",st.ideal||"",'placeholder="1:34.2" inputmode="decimal"')}${inp("laps","Runden",st.laps||"",'inputmode="numeric" placeholder="z. B. 8"')}</div>
      <div class="f" style="margin-top:10px"><label>Gefühl</label>${seg("feel",st.feel||"",[[1,"1"],[2,"2"],[3,"3"],[4,"4"],[5,"5"]])}</div>
      ${area("feeling","Feeling",st.feeling,"z. B. gut, Bremse stark, aber Probleme an den Scheitel zu fahren")}
    </fieldset>
    <details class="more" ${Object.keys(st.changes||{}).length?"open":""}><summary>Setup vor diesem Stint geändert?${Object.keys(st.changes||{}).length?` <span class="chip bad">${Object.keys(st.changes).length} geändert</span>`:""}</summary>
      <div class="muted small" style="margin:8px 0">Vorausgefüllt mit dem bisherigen Setup. Nur ändern, was du umgestellt hast. Geänderte Felder werden rot.</div>
      <div class="list">${setupFields(b,vals,prev)}</div></details>
    <details class="more" ${st.tTempF||st.pWarmF||st.air?"open":""}><summary>Wetter & Reifen</summary><div class="list" style="margin-top:8px"><fieldset><legend>Bedingungen & Reifen</legend>
      <div class="grid2">${inp("air","Luft °C",st.air??(prevSt?prevSt.air:d.air)??"",'inputmode="decimal"')}${inp("trackTemp","Asphalt °C",st.trackTemp??(prevSt?prevSt.trackTemp:d.trackTemp)??"",'inputmode="decimal"')}</div>
      <div class="sec">Nach dem Stint gemessen</div>
      <div class="grid2">${inp("tTempF","Reifentemp. vorne °C",st.tTempF||"",'inputmode="decimal"')}${inp("tTempR","Reifentemp. hinten °C",st.tTempR||"",'inputmode="decimal"')}${inp("pWarmF","Druck warm vorne bar",st.pWarmF||"",'inputmode="decimal"')}${inp("pWarmR","Druck warm hinten bar",st.pWarmR||"",'inputmode="decimal"')}</div>
    </fieldset></div></details>
    <fieldset><legend>Wie hat sich das Fahrwerk angefühlt?</legend><div class="muted small" style="margin-bottom:8px">Bei „geht“ oder „Problem“ wählst du, was genau war, und bekommst direkt Vorschläge aus dem Ratgeber.</div>
      <div class="list">${DYN.map(([k,l])=>{ const val=(st.dyn||{})[k]||""; const syms=SYMS.filter(x=>x.dyn===k);
        return `<div><div class="dynrow"><div>${l}</div>${seg("dyn_"+k,val,[["gut","gut","g"],["ok","geht","m"],["problem","Problem",""]])}</div>
        <div class="symbox" id="symbox_${k}" ${val==="ok"||val==="problem"?"":"hidden"}>${syms.map(x=>`<label class="symchip"><input type="checkbox" name="sym_${x.id}" ${(st.sym||[]).includes(x.id)?"checked":""}><span>${esc(x.l)}</span></label>`).join("")}</div></div>`; }).join("")}</div>
      <div id="adviceSlot"></div>
      <button type="button" class="btn sm" style="margin-top:10px" data-act="dyn-clear">Bewertung zurücksetzen</button></fieldset>
    ${area("desc","Beschreibung",st.desc,"Was macht das Bike wo? z. B. Pumpen auf Start/Ziel, Lenkerschlagen, schiebt über vorne in T3")}
    ${(()=>{ const tr=dayTrack(d); if(!tr||!(tr.corners||[]).length) return ""; const cn=st.corners||{};
      return `<details class="more" ${Object.keys(cn).length?"open":""}><summary>Gedanken zu einzelnen Kurven</summary><div class="muted small" style="margin:8px 0">${tr.hasImg?"Tippe auf eine Kurve im Plan oder schreib direkt ins Feld.":"Nur ausfüllen, wo dir etwas aufgefallen ist."}</div>
      ${tr.hasImg&&getImg(tr.id)?mapHtml(tr,{noPlace:true,act:"noop",mkAct:"focus-corner",has:cn}):""}
      <div class="list" style="margin-top:10px">${tr.corners.map(c=>area("c_"+c.id,`${esc(c.name)}${c.label?" · "+esc(c.label):""}${c.dir?" · "+c.dir:""}${c.gear?" · "+esc(c.gear)+". Gang":""}`,cn[c.id]||"",c.notes?"Plan: "+c.notes.slice(0,70):"z. B. zu früh am Gas, Bremspunkt 10 m später")).join("")}</div></details>`; })()}
    ${isNew?"":`<button type="button" class="btn danger" data-act="del-stint" data-day="${d.id}" data-i="${i}">Stint löschen</button>`}`,
  fd=>{
    const now=readSetup(b,fd);
    const keys=[...new Set(Object.keys(prev).concat(Object.keys(now)))].filter(k=>bikeFields(b).some(f=>f.k===k));
    const rec={changes:diff(prev,now,keys),air:fd.air,trackTemp:fd.trackTemp,newF:!!fd.newF,newR:!!fd.newR,laps:fd.laps,tTempF:fd.tTempF,tTempR:fd.tTempR,pWarmF:fd.pWarmF,pWarmR:fd.pWarmR,
      lap:fd.lap,ideal:fd.ideal,feel:fd.feel||"",feeling:fd.feeling,desc:fd.desc,corners:Object.fromEntries(Object.keys(fd).filter(k=>k.startsWith("c_")&&fd[k]).map(k=>[k.slice(2),fd[k]])),sym:SYMS.filter(x=>fd["sym_"+x.id] && ["ok","problem"].includes(fd["dyn_"+x.dyn])).map(x=>x.id),dyn:Object.fromEntries(DYN.map(([k])=>[k,fd["dyn_"+k]||""]))};
    rec.day=n>1?(parseInt(fd.day)||1):1;
    d.stints=d.stints||[]; if(isNew) d.stints.push(rec); else d.stints[i]=rec;
    d.stints=d.stints.map((x,j)=>[x,j]).sort((a,b)=>((a[0].day||1)-(b[0].day||1))||a[1]-b[1]).map(x=>x[0]);
    dayChanged(d.id);
  }, {onChange:t=>{ if(t&&t.dataset.live) t.classList.toggle("was", t.dataset.prev!==t.value);
    if(!t || (t.name||"").startsWith("dyn_") || (t.name||"").startsWith("sym_")){
      const fd=formData(); DYN.forEach(([k])=>{ const bx=document.getElementById("symbox_"+k); if(bx) bx.hidden=!["ok","problem"].includes(fd["dyn_"+k]); });
      const ids=SYMS.filter(x=>fd["sym_"+x.id] && ["ok","problem"].includes(fd["dyn_"+x.dyn])).map(x=>x.id);
      const slot=document.getElementById("adviceSlot"); if(slot) slot.innerHTML=adviceHtml(ids);
    } }});
}
function sagForm(bikeId, m){
  if(!S.bikes.length) return bikeForm();
  const isNew=!m; m=m||{date:today()}; let bid=bikeId||S.bikes[0].id;
  const b0=byId(S.bikes,bid); const cur=currentSetup(bid);
  if(isNew){ m.fPre=cur.f_preload||""; m.rPre=cur.s_preload||""; }
  const n=(k,l)=>inp(k,l,m[k]||"",'inputmode="decimal" data-live="1" placeholder="mm"');
  openSheet(isNew?"Federweg messen":"Messung", `
    <div class="grid2">${sel("bikeId","Bike",bid,S.bikes.map(b=>[b.id,b.name]))}${inp("date","Datum",m.date||"",'type="date"')}</div>
    <div class="card small muted">A: komplett ausgefedert (Bike angehoben) · B: Bike steht mit Eigengewicht · C: Fahrer sitzt in Fahrposition. Vorne misst du am Gabelrohr, hinten senkrecht von Achse bis Heck-Markierung.</div>
    <fieldset><legend>Vorne</legend><div class="grid3">${n("fA","A ausgefedert")}${n("fB","B Eigengewicht")}${n("fC","C mit Fahrer")}</div>${inp("fPre","Vorspannung dabei",m.fPre||"",'inputmode="decimal"')}</fieldset>
    <fieldset><legend>Hinten</legend><div class="grid3">${n("rA","A ausgefedert")}${n("rB","B Eigengewicht")}${n("rC","C mit Fahrer")}</div>${inp("rPre","Vorspannung dabei",m.rPre||"",'inputmode="decimal"')}</fieldset>
    <div id="sagOut"></div>
    ${inp("note","Notiz",m.note||"",'placeholder="z. B. neue Feder, mit voller Montur"')}
    <button type="submit" class="btn pri big">Messung speichern</button>
    ${isNew?"":`<button type="button" class="btn danger" data-act="sag-del" data-bike="${bid}" data-id="${m.id}">Messung löschen</button>`}`,
  fd=>{
    const b=byId(S.bikes,fd.bikeId); const vals={date:fd.date,note:fd.note,fA:fd.fA,fB:fd.fB,fC:fd.fC,rA:fd.rA,rB:fd.rB,rC:fd.rC,fPre:fd.fPre,rPre:fd.rPre};
    if(!["fA","fB","fC","rA","rB","rC"].some(k=>vals[k])) return formErr("Trag mindestens einen Messwert ein.");
    if(isNew){ b.sag=b.sag||[]; b.sag.push({id:uid(),...vals}); }
    else { const ob=byId(S.bikes,bid); ob.sag=(ob.sag||[]).filter(x=>x.id!==m.id); b.sag=b.sag||[]; b.sag.push({id:m.id,...vals}); }
    changed("bikes"); toast("Messung gespeichert");
  }, {saveLabel:"Speichern", onChange:()=>{ const fd=formData(); $("#sagOut").innerHTML=`<div class="sec">Ergebnis</div>`+sagResultHtml(byId(S.bikes,fd.bikeId),fd)+`<div class="hint" style="margin-top:6px">Ohne Fahrer = A − B · Mit Fahrer = A − C · Zielbereich änderst du unter „Bike & Felder bearbeiten“.</div>`; }});
}
function gearForm(g, type){
  const isNew=!g; g=g||{type,count:1};
  openSheet(isNew?(type==="Ritzel"?"Neues Ritzel":"Neues Kettenrad"):g.type, `
    <div class="grid2">${inp("teeth","Zähne",g.teeth||"",'inputmode="numeric"')}${inp("count","Anzahl vorhanden",g.count??1,'inputmode="numeric"')}</div>
    ${inp("note","Notiz",g.note||"",'placeholder="z. B. 520er Teilung, Alu"')}
    <div class="muted small">Ob es gerade verbaut ist, erkennt die App am aktuellen Setup deiner Bikes.</div>
    ${isNew?"":`<button type="button" class="btn danger" data-act="del-gear" data-id="${g.id}">Löschen</button>`}`,
  fd=>{ const t=parseInt(fd.teeth); if(!t) return formErr("Bitte die Zähnezahl eintragen.");
    const vals={type:g.type,teeth:t,count:parseInt(fd.count)||0,note:fd.note};
    if(isNew) S.gear.push({id:uid(),...vals}); else Object.assign(g,vals); changed("gear"); });
}

function svcForm(it, bikeId){
  if(!S.bikes.length) return bikeForm();
  const isNew=!it; it=it||{bikeId:bikeId||S.bikes[0].id};
  const b=byId(S.bikes,it.bikeId)||{};
  if(isPart(it)) return openSheet("Verschleißteil bearbeiten", `
    <div class="grid2">${sel("bikeId","Bike",it.bikeId,S.bikes.map(x=>[x.id,x.name]))}${inp("name","Teil",it.name||"",'list="partList" autocomplete="off"')}</div>
    <datalist id="partList">${PART_SUGGEST.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
    <fieldset><legend>Tausch spätestens nach (optional)</legend><div class="grid3">${inp("km","… km",it.km||"",'inputmode="numeric"')}${inp("days","… Fahrtagen",it.days||"",'inputmode="numeric"')}${inp("months","… Monaten",it.months||"",'inputmode="numeric"')}</div><div class="hint">Dann warnt die App rechtzeitig. Leer lassen, wenn du nach Sicht tauschst.</div></fieldset>
    ${area("info","Hinweise",it.info,"z. B. Verschleißgrenze 1,5 mm Belag, Kettenlänge 112 Glieder")}`,
    fd=>{ if(!fd.name) return formErr("Bitte gib an, welches Teil."); Object.assign(it,{bikeId:fd.bikeId,name:fd.name,km:fd.km,days:fd.days,months:fd.months,info:fd.info}); changed("service"); });
  openSheet(isNew?"Neuer Wartungspunkt":"Wartungspunkt bearbeiten", `
    <div class="grid2">${sel("bikeId","Bike",it.bikeId,S.bikes.map(x=>[x.id,x.name]))}${inp("name","Was?",it.name||"",'list="svcList" placeholder="z. B. Motoröl & Ölfilter" autocomplete="off"')}</div>
    <datalist id="svcList">${SVC_SUGGEST.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
    <fieldset><legend>Intervall</legend><div class="muted small" style="margin-bottom:8px">Trag ein, was in deinem Wartungsplan steht. Fällig ist, was zuerst erreicht wird. Leer lassen, was nicht gilt.</div>
      <div class="grid2">${inp("months","alle … Monate",it.months||"",'inputmode="numeric"')}${inp("km","alle … km",it.km||"",'inputmode="numeric"')}${inp("days","alle … Fahrtage",it.days||"",'inputmode="numeric"')}${inp("hours","alle … Betriebsstunden",it.hours||"",'inputmode="decimal"')}</div>
      <div class="hint">Fahrtage zählt die App automatisch aus deinen Events. Ein 3-Tage-Event zählt als 3 Fahrtage.</div></fieldset>
    ${area("info","Material & Hinweise",it.info,"z. B. Ölsorte und Menge, Filter-Nummer, Drehmomente, Sollwerte")}
    ${isNew?`<fieldset><legend>Zuletzt gemacht (optional)</legend><div class="grid3">${inp("lastDate","Datum","",'type="date"')}${inp("lastKm","km-Stand",b.km||"",'inputmode="numeric"')}${inp("lastHours","Stunden",b.hours||"",'inputmode="decimal"')}</div><div class="hint">Damit die App gleich ausrechnen kann, wann es wieder fällig ist.</div></fieldset>`:""}`,
  fd=>{ if(!fd.name) return formErr("Bitte gib an, was gewartet wird, z. B. Ölwechsel.");
    const vals={bikeId:fd.bikeId,name:fd.name,months:fd.months,km:fd.km,days:fd.days,hours:fd.hours,info:fd.info};
    if(isNew){ const rec={id:uid(),...vals,logs:[]}; if(fd.lastDate) rec.logs.push({id:uid(),date:fd.lastDate,km:fd.lastKm,hours:fd.lastHours,note:""}); S.service.push(rec); }
    else Object.assign(it,vals);
    changed("service"); });
}
function svcLogForm(it, log){
  const isNew=!log; const b=byId(S.bikes,it.bikeId)||{}; log=log||{date:today(),km:b.km||"",hours:b.hours||""};
  const part=isPart(it);
  openSheet(isNew?(part?(svcLogs(it).length?"Getauscht: ":"Einbau: ")+it.name:"Erledigt: "+it.name):"Eintrag bearbeiten", `
    <div class="grid3">${inp("date",part?"Eingebaut am":"Datum",log.date||"",'type="date"')}${inp("km","km-Stand",log.km||"",'inputmode="numeric"')}${inp("hours","Stunden",log.hours||"",'inputmode="decimal"')}</div>
    ${part?inp("note","Was wurde eingebaut?",log.note||"",'placeholder="z. B. Brembo Z04, DID 520 ERV3, 15 Zähne"'):area("note","Was wurde gemacht / verwendet?",log.note,it.info?"z. B. "+it.info.slice(0,60):"z. B. Motul 300V 10W40, 3,4 l, neuer Filter")}
    ${part&&isNew&&svcLogs(it).length?`<div class="hint">Das alte Teil wird mit seiner Laufleistung unter „Bisherige Teile“ gespeichert.</div>`:""}
    ${inp("cost","Kosten € (optional)",log.cost||"",'inputmode="decimal"')}
    ${isNew?"":`<button type="button" class="btn danger" data-act="svc-log-del" data-svc="${it.id}" data-id="${log.id}">Eintrag löschen</button>`}`,
  fd=>{ if(!fd.date) return formErr("Bitte ein Datum eintragen.");
    const vals={date:fd.date,km:fd.km,hours:fd.hours,note:fd.note,cost:fd.cost};
    it.logs=it.logs||[]; if(isNew) it.logs.push({id:uid(),...vals}); else Object.assign(log,vals);
    let bk=false; if(num(fd.km)!=null&&(num(b.km)==null||num(fd.km)>num(b.km))){ b.km=fd.km; bk=true; } if(num(fd.hours)!=null&&(num(b.hours)==null||num(fd.hours)>num(b.hours))){ b.hours=fd.hours; bk=true; }
    if(bk) changed("bikes"); changed("service"); });
}
function partsForm(bikeId){
  const b=byId(S.bikes,bikeId); const have=new Set(S.service.filter(x=>x.bikeId===bikeId&&isPart(x)).map(x=>x.name.toLowerCase()));
  const opts=PART_SUGGEST.filter(n=>!have.has(n.toLowerCase()));
  openSheet("Verschleißteile", `
    <div class="muted small">Hak an, was du verfolgen willst. Die App zählt ab dem Einbau Kilometer, Fahrtage, Stints und Runden mit.</div>
    <fieldset><legend>Teile</legend><div class="fieldpick">${opts.map((n,k)=>`<label class="cb"><input type="checkbox" name="p_${k}" ${k<5?"checked":""}>${esc(n)}</label>`).join("")}</div>
    ${inp("custom","Weiteres Teil (optional)","",'placeholder="z. B. Bremsscheibe hinten"')}</fieldset>
    <fieldset><legend>Wann eingebaut? (optional)</legend><div class="grid2">${inp("date","Datum","",'type="date"')}${inp("km","km-Stand",b.km||"",'inputmode="numeric"')}</div><div class="hint">Gilt für alle angehakten Teile. Kennst du es nicht, lass es leer und trag es beim Teil einzeln ein.</div></fieldset>`,
  fd=>{ const names=opts.filter((n,k)=>fd["p_"+k]); if(fd.custom) names.push(fd.custom);
    if(!names.length) return formErr("Hak mindestens ein Teil an.");
    names.forEach(n=>{ const rec={id:uid(),kind:"part",bikeId,name:n,logs:[]}; if(fd.date) rec.logs.push({id:uid(),date:fd.date,km:fd.km,note:""}); S.service.push(rec); });
    if(num(fd.km)!=null&&(num(b.km)==null||num(fd.km)>num(b.km))){ b.km=fd.km; changed("bikes"); }
    changed("service"); }, {saveLabel:"Anlegen"});
}
function odoForm(b){
  openSheet("Stand aktualisieren", `<div class="grid2">${inp("km","Kilometerstand",b.km||"",'inputmode="numeric"')}${inp("hours","Betriebsstunden",b.hours||"",'inputmode="decimal"')}</div><div class="muted small">Damit rechnet die App aus, wann km- oder stundenabhängige Wartung fällig ist.</div>`,
    fd=>{ b.km=fd.km; b.hours=fd.hours; changed("bikes"); });
}

/* ================= actions ================= */
const A={
  tab:d=>setTab(d.t), back:()=>{ ui.place=null; ui.stack.pop(); render(); }, push:d=>push({v:d.v}), "close-sheet":closeSheet,
  "open-day":d=>push({v:"day",id:d.id}), "open-bike":d=>push({v:"bike",id:d.id}), "open-hist":d=>push({v:"hist",id:d.id}),
  "new-day":()=>dayForm(), "edit-day":d=>dayForm(byId(S.days,d.id)), "edit-start":d=>startForm(byId(S.days,d.id)),
  "del-day":d=>confirmSheet("Dieses Event mit allen Stints löschen?","Event löschen",()=>{ S.days=S.days.filter(x=>x.id!==d.id); dayChanged(d.id); ui.stack.pop(); render(); }),
  "new-stint":d=>stintForm(byId(S.days,d.id)), "edit-stint":d=>stintForm(byId(S.days,d.day),+d.i),
  "del-stint":d=>{ closeSheet(); confirmSheet("Diesen Stint löschen? Die Setup-Änderungen der folgenden Stints bleiben erhalten.","Stint löschen",()=>{ const day=byId(S.days,d.day); day.stints.splice(+d.i,1); dayChanged(day.id); }); },
  "dyn-clear":()=>{ $$('#sheet input[name^="dyn_"],#sheet input[name^="sym_"]').forEach(r=>r.checked=false); if(sheetChange) sheetChange(null); },
  "new-bike":()=>bikeForm(), "edit-bike":d=>bikeForm(byId(S.bikes,d.id)), "edit-base":d=>baseForm(byId(S.bikes,d.id)),
  "del-bike":d=>{ closeSheet(); confirmSheet("Motorrad löschen? Events dieses Bikes bleiben gespeichert, zeigen aber kein Bike mehr.","Motorrad löschen",()=>{ S.bikes=S.bikes.filter(b=>b.id!==d.id); changed("bikes"); ui.stack=[]; render(); }); },
  sag:d=>sagForm(d.bike), "sag-edit":d=>{ const b=byId(S.bikes,d.bike); sagForm(d.bike,(b.sag||[]).find(m=>m.id===d.id)); },
  "sag-del":d=>{ closeSheet(); const b=byId(S.bikes,d.bike); b.sag=(b.sag||[]).filter(m=>m.id!==d.id); changed("bikes"); },
  "new-track":()=>trackForm(), "edit-track":d=>trackForm(byId(S.tracks,d.id)), "open-track":d=>{ ui.place=null; push({v:"track",id:d.id}); },
  "del-track":d=>{ closeSheet(); confirmSheet("Strecke mit Plan und Kurven löschen? Deine Events bleiben erhalten.","Strecke löschen",()=>{ S.tracks=S.tracks.filter(t=>t.id!==d.id); putImg(d.id,null); changed("tracks"); ui.stack=ui.stack.filter(x=>!(x.v==="track"&&x.id===d.id)); render(); }); },
  "del-img":d=>{ closeSheet(); confirmSheet("Streckenplan entfernen? Die Kurven bleiben erhalten.","Plan entfernen",()=>{ const tr=byId(S.tracks,d.id); tr.hasImg=false; putImg(d.id,null); changed("tracks"); }); },
  "add-corner":d=>cornerForm(d.id), "open-corner":d=>{ if(ui.place&&ui.place.trackId===d.track) return; const tr=byId(S.tracks,d.track); cornerForm(d.track,(tr.corners||[]).find(c=>c.id===d.id)); },
  "del-corner":d=>{ closeSheet(); confirmSheet("Diese Kurve löschen?","Kurve löschen",()=>{ const tr=byId(S.tracks,d.track); tr.corners=(tr.corners||[]).filter(c=>c.id!==d.id); changed("tracks"); }); },
  "place-start":d=>{ ui.place={trackId:d.id}; render(); }, "place-stop":()=>{ ui.place=null; render(); },
  "place-move":d=>{ closeSheet(); ui.place={trackId:d.track,cornerId:d.id}; render(); },
  "map-tap":(d,el,e)=>{ if(!ui.place||ui.place.trackId!==d.track) return; const tr=byId(S.tracks,d.track); const r=el.getBoundingClientRect();
    const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)), y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
    tr.corners=tr.corners||[];
    if(ui.place.cornerId){ const c=tr.corners.find(c=>c.id===ui.place.cornerId); if(c){ c.x=x; c.y=y; } ui.place=null; }
    else { const unplaced=tr.corners.find(c=>c.x==null); if(unplaced){ unplaced.x=x; unplaced.y=y; } else tr.corners.push({id:uid(),name:"T"+(tr.corners.length+1),x,y}); }
    changed("tracks"); },
  "focus-corner":d=>{ const t=document.getElementById("i_c_"+d.id); if(t){ t.scrollIntoView({block:"center",behavior:"smooth"}); setTimeout(()=>t.focus(),250); } },
  noop:()=>{},
  "guide-tab":d=>{ const t=ui.stack[ui.stack.length-1]; ui.guideTab=d.t; if(t&&t.v==="guide"){ t.tab=d.t; t.q=null; } render(); },
  "guide-for":d=>{ ui.guideTab="diag"; push({v:"guide",tab:"diag",q:d.p}); setTimeout(()=>{ const el=document.getElementById("gq_"+d.p); if(el) el.scrollIntoView({block:"start",behavior:"smooth"}); },60); },
  "sag-ref-fill":()=>{ Object.entries(SAG_REF).forEach(([k,v])=>{ const el=document.getElementById("i_tg_"+k); if(el) el.value=v; }); },
  "sag-ref":d=>{ const b=byId(S.bikes,d.id); if(!b) return; b.sagTarget=Object.assign({},SAG_REF); changed("bikes"); toast("Richtwerte als Ziel übernommen"); },
  "svc-open":d=>{ ui.svcBike=d.id; ui.svcTab=(()=>{ const its=S.service.filter(it=>it.bikeId===d.id); const due=its.filter(it=>{ const p=svcStatus(it).pct; return p!=null&&p>=.8; }); return due.length&&due.every(isPart)?"teile":"wartung"; })(); setTab("service"); },
  "new-svc":d=>svcForm(null,d&&d.bike), "svc-bike":d=>{ ui.svcBike=d.id; render(); }, "svc-tab":d=>{ ui.svcTab=d.t; render(); }, "new-parts":d=>partsForm(d.id), "edit-svc":d=>svcForm(byId(S.service,d.id)), "open-svc":d=>push({v:"svc",id:d.id}),
  "svc-done":d=>svcLogForm(byId(S.service,d.id)), "svc-hist":d=>push({v:"svchist",id:d.id}), odo:d=>odoForm(byId(S.bikes,d.id)),
  "svc-log-edit":d=>{ const it=byId(S.service,d.svc); svcLogForm(it,(it.logs||[]).find(l=>l.id===d.id)); },
  "svc-log-del":d=>{ closeSheet(); const it=byId(S.service,d.svc); it.logs=(it.logs||[]).filter(l=>l.id!==d.id); changed("service"); },
  "del-svc":d=>confirmSheet("Wartungspunkt mit allen Einträgen löschen?","Löschen",()=>{ S.service=S.service.filter(x=>x.id!==d.id); changed("service"); ui.stack.pop(); render(); }),
  "new-gear":d=>gearForm(null,d.type), "edit-gear":d=>gearForm(byId(S.gear,d.id)),
  "del-gear":d=>{ closeSheet(); S.gear=S.gear.filter(g=>g.id!==d.id); changed("gear"); },
  "pack-toggle":d=>{ const p=byId(S.pack,d.id); if(p){ p.done=!p.done; changed("pack"); } },
  "pack-del":d=>{ S.pack=S.pack.filter(p=>p.id!==d.id); changed("pack"); },
  "pack-reset":()=>{ S.pack.forEach(p=>p.done=false); changed("pack"); },
  "pack-seed":()=>{ Object.entries(PACK_SUGGEST).forEach(([cat,items])=>items.forEach(text=>S.pack.push({id:uid(),cat,text,done:false}))); changed("pack"); },
  "pack-fill":()=>{ const have=new Set(S.pack.map(p=>p.text.trim().toLowerCase())); let n=0;
    Object.entries(PACK_SUGGEST).forEach(([cat,items])=>items.forEach(text=>{ if(!have.has(text.toLowerCase())){ S.pack.push({id:uid(),cat,text,done:false}); n++; } }));
    if(n) changed("pack"); const m=$("#packMsg"); if(m) m.textContent=n?`${n} Einträge ergänzt.`:"Alle Vorschläge sind schon auf deiner Liste."; },
  export:async()=>{ const images={}; for(const t of S.tracks){ if(t.hasImg){ let v=getImg(t.id); if(!v&&db){ try{ const sn=await db.collection("data/users/"+userId).doc("tb2img_"+t.id).get(); v=sn.exists?(sn.data()||{}).data:null; }catch(e){} } if(v) images[t.id]=v; } }
    const txt=JSON.stringify({app:"racebob",v:2,exported:new Date().toISOString(),data:S,images});
    try{ await navigator.clipboard.writeText(txt); $("#expMsg").textContent="Kopiert. Füge die Sicherung jetzt in eine Notiz oder Datei ein."; }
    catch(e){ openSheet("Sicherung", `<div class="muted small">Kopieren wurde blockiert. Text markieren und kopieren:</div><div class="f"><textarea readonly style="min-height:240px">${esc(txt)}</textarea></div>`, null, {noSave:true}); } },
  import:()=>openSheet("Sicherung einspielen", `<div class="card">Ersetzt alle aktuellen Daten durch die Sicherung.</div>${area("json","Sicherung hier einfügen","",'{"app":"racebob" …')}`, fd=>{
    let d=null, imgs={}; try{ const j=JSON.parse(fd.json); d=j.data; imgs=j.images||{}; }catch(e){}
    if(!d||!Array.isArray(d.bikes)) return formErr("Das ist keine gültige RaceBob-Sicherung. Bitte den kompletten Text einfügen.");
    const old=S.days.map(x=>x.id);
    for(const k in S) S[k]=Array.isArray(d[k])?d[k]:[];
    Object.entries(imgs).forEach(([id,v])=>putImg(id,v)); migrate();
    SECTIONS.forEach(s=>changed(s));
    const ids=new Set(S.days.map(x=>x.id)); old.filter(id=>!ids.has(id)).forEach(id=>dayChanged(id)); S.days.forEach(x=>dayChanged(x.id));
    ui.stack=[]; ui.tab="home"; render();
  }, {saveLabel:"Einspielen"})
};
document.addEventListener("click", e=>{
  const el=e.target.closest("[data-act]"); if(!el) return;
  if(el.type!=="checkbox") e.preventDefault();
  const f=A[el.dataset.act]; if(f) f(el.dataset,el,e);
});
document.addEventListener("change", e=>{ if(e.target.dataset&&e.target.dataset.upload) handleUpload(e.target); });
document.addEventListener("submit", e=>{
  if(e.target.id!=="packForm") return; e.preventDefault();
  const fd=new FormData(e.target); const text=String(fd.get("text")||"").trim(); if(!text) return;
  S.pack.push({id:uid(),text,cat:String(fd.get("cat")||"").trim()||"Sonstiges",done:false}); changed("pack");
  setTimeout(()=>{ const i=$("#pkText"); if(i) i.focus(); },0);
});
document.addEventListener("input", e=>{
  const t=e.target;
  if(t.id==="qF"||t.id==="qR"){ const r=ratio($("#qF").value,$("#qR").value); $("#qOut").textContent=r?fmtNum(r,2):"–"; }
});
document.addEventListener("change", e=>{
  const t=e.target; if(!t.dataset||!t.dataset.chain) return;
  let c=S.gear.find(g=>g.type==="chains"); if(!c){ c={id:uid(),type:"chains",map:{}}; S.gear.push(c); }
  c.map[t.dataset.chain]=t.value.trim(); changed("gear");
});
document.addEventListener("keydown", e=>{ if(e.key==="Enter"&&e.target.getAttribute&&e.target.getAttribute("role")==="button"){ e.target.click(); return; } if(e.key==="Escape"&&$("#sheetWrap").classList.contains("open")) closeSheet(); });
function fromHash(){ const h=(location.hash||"").slice(1); if(TABS.some(t=>t.id===h)){ ui.tab=h; ui.stack=[]; } }
window.addEventListener("hashchange", ()=>{ fromHash(); render(); });

loadLocal(); fromHash(); render(); setSync("local");
initSync();
})();
