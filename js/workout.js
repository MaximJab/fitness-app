// Reiter „Workout“: Übungen planen, Start-Übersicht, Training speichern
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
function removeFromWorkout(exId){const d=D().draft,ex=byId[exId];d.items=d.items.filter(i=>i.exId!==exId);
 save();toast((ex?ex.name:'Übung')+' entfernt');const n=d.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;}
function addToWorkout(exId){const ex=byId[exId],d=D().draft;
 if(d.items.some(i=>i.exId===exId)){toast('Schon im Workout');return;}
 const pl=defaultPlan(ex);d.items.push({exId,reps:pl.reps,w:ex.kbCount?defaultWeight(ex):0});
 save();toast(ex.name+' hinzugefügt');const n=d.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;}

// ---------- Workout
// Ältere Datenstände (Satzliste) auf Satzanzahl und Wiederholungen umstellen
function normItem(it){if(Array.isArray(it.sets)){const s=it.sets;it.reps=s[0]?.r??settings().reps;if(it.w==null&&s[0]?.w!=null)it.w=s[0].w;it.sets=s.length||settings().sets;}return it;}
// Gewicht: im Workout gewählt, sonst aus der Historie bzw. „Mein aktuelles Gewicht“
const wOf=it=>{const ex=byId[it.exId];return !ex||!ex.kbCount?0:(it.w!=null?+it.w:defaultWeight(ex));};
// Letzte gespeicherte Einheit einer Übung mit Datum
function lastInfo(exId){const ss=D().sessions;for(let i=ss.length-1;i>=0;i--){const e=ss[i].entries.find(x=>x.exId===exId);if(e&&e.sets.length){const rs=[...new Set(e.sets.map(x=>x.r))];
 return`Zuletzt ${new Date(ss[i].date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}: ${byId[exId]?.kbCount?e.sets[0].w+' kg, ':''}${e.sets.length} × ${rs.join('/')}`;}}return'Noch nicht trainiert';}
function weightSelect(i,ex,w,sc){const opts=[...new Set([...KB_SIZES,w])].sort((a,b)=>a-b);
 return`<div class="wrow"><span>Gewicht</span><select class="wsel" data-wsel="${i}" data-sc="${sc}" aria-label="Gewicht für ${esc(ex.name)}">${opts.map(k=>`<option value="${k}"${k===w?' selected':''}>${k} kg${ex.kbCount===2?' × 2':''}</option>`).join('')}</select></div>`;}
function stepper(i,k,val,sc,label){return`<div class="stepper"><button type="button" data-k="${k}" data-i="${i}" data-sc="${sc}" data-dir="-1" aria-label="${label} verringern">−</button><input type="number" inputmode="numeric" min="1" value="${val}" data-f="${k}" data-i="${i}" data-sc="${sc}" aria-label="${label}"><button type="button" data-k="${k}" data-i="${i}" data-sc="${sc}" data-dir="1" aria-label="${label} erhöhen">+</button></div>`;}
function thumbHtml(ex){return ex.keys?`<button class="thumb-btn" data-open="${ex.id}" aria-label="${esc(ex.name)} ansehen"><canvas class="thumb" width="128" height="128" data-ex="${ex.id}"></canvas></button>`:'';}
function kbNeeds(items){const need={};
 items.forEach(it=>{const ex=byId[it.exId],w=wOf(it);if(!ex||!ex.kbCount||!(w>0))return;need[w]=Math.max(need[w]||0,ex.kbCount);});
 return Object.entries(need).map(([w,n])=>({w:+w,n})).sort((a,b)=>a.w-b.w);}
function kbNeedHtml(items){const needs=kbNeeds(items);
 return needs.length?`<div class="kb-need">${needs.map(x=>`<span>${x.n} × ${x.w} kg</span>`).join('')}</div>`:'<p class="note">Keine Kettlebells nötig.</p>';}
const ICON_UP='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',ICON_DOWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const fmtKg=v=>Math.round(v).toLocaleString('de-DE');

// ---------- Workout-Einstellungen: Sätze gelten für alle Übungen, optional abfallende Wiederholungen
const cfg=()=>{const d=D().draft;if(!d.cfg)d.cfg={sets:settings().sets,drop:false};return d.cfg;};
// Wiederholungen je Satz, z. B. 10 · 9 · 8 bei abfallenden Wiederholungen
const planReps=(reps,c)=>Array.from({length:c.sets},(_,i)=>c.drop?Math.max(1,reps-i):reps);
function planVolume(items,c){return items.reduce((a,it)=>{const ex=byId[it.exId];if(!ex||!ex.kbCount)return a;return a+planReps(it.reps,c).reduce((b,r)=>b+r*wOf(it)*ex.kbCount,0);},0);}
function kbCardHtml(items,c){const v=planVolume(items,c);
 return`<div class="card"><div class="kb-row"><h3>Benötigte Kettlebells</h3>${v?`<span class="vol">${fmtKg(v)} kg bewegt</span>`:''}</div>${kbNeedHtml(items)}</div>`;}
// Laufendes Training liegt getrennt von der Auswahl (D().active), damit die Auswahl danach wieder frei ist
function migrateTraining(){const d=D().draft;
 if(d.training){if(d.items.length)D().active={name:d.name,startedAt:d.startedAt,items:d.items};d.items=[];d.name='';delete d.training;delete d.startedAt;}
 const A=D().active;if(!A)return;
 // älteres Trainingsformat (ein Ist-Wert pro Übung) in einzelne Sätze umwandeln
 A.items.forEach(it=>{if(Array.isArray(it.sets)&&it.sets.length&&typeof it.sets[0]==='object'&&'done' in it.sets[0])return;normItem(it);
  const a=it.act||{w:wOf(it),sets:it.sets||settings().sets,reps:it.reps||settings().reps};
  it.w=+a.w;it.reps=a.reps;it.sets=Array.from({length:a.sets},()=>({r:a.reps,w:+a.w,done:false}));delete it.act;});}

// ---------- Planung
function renderWorkout(){migrateTraining();const d=D().draft,v=$('#view-workout');d.items.forEach(normItem);
 if(D().active){renderTraining();return;}
 if(!d.items.length){v.innerHTML=`<p class="empty">Noch keine Übungen im Workout.<br>Tippe in der Übungsliste auf <b>+</b> oder lade ein gespeichertes Workout.</p><button class="btn" id="toEx">Übungen ansehen</button><button class="btn sec" id="toSaved">Gespeicherte Workouts</button>`;
  $('#toEx').onclick=()=>go('exercises');$('#toSaved').onclick=()=>go('saved');return;}
 const c=cfg();
 let html=`<input class="field" id="wName" placeholder="Name des Workouts (optional)" value="${esc(d.name)}">
 <button class="btn" id="setupW">Workout einstellen</button>
 ${kbCardHtml(d.items,c)}<div id="wItems">`;
 d.items.forEach((it,i)=>{const ex=byId[it.exId];if(!ex)return;
  html+=`<div class="card ex-card" data-i="${i}"><div class="ex-head"><div class="move"><button type="button" data-mv="${i}" data-dir="-1" aria-label="${esc(ex.name)} nach oben"${i===0?' disabled':''}>${ICON_UP}</button><button type="button" data-mv="${i}" data-dir="1" aria-label="${esc(ex.name)} nach unten"${i===d.items.length-1?' disabled':''}>${ICON_DOWN}</button></div>${thumbHtml(ex)}<button class="name" data-open="${ex.id}">${esc(ex.name)}<small>${esc(lastInfo(ex.id))}</small></button>
  <button class="icon-btn" data-rm="${i}" aria-label="${esc(ex.name)} entfernen">✕</button></div>
  <div class="wrow"><span>${c.drop?'Wdh. im 1. Satz':'Wiederholungen'}</span>${stepper(i,'reps',it.reps,'plan','Wiederholungen')}</div>
  ${ex.kbCount?weightSelect(i,ex,wOf(it),'plan'):''}</div>`;});
 html+=`</div><div class="btn-row"><button class="btn sec" id="saveTpl">Als Workout speichern</button><button class="btn danger" id="clear">Leeren</button></div>`;
 v.innerHTML=html;
 $('#wName').oninput=e=>{d.name=e.target.value;save();};
 const setR=(i,val)=>{d.items[i].reps=Math.max(1,Math.min(200,Math.round(val)||1));save();renderWorkout();};
 v.querySelectorAll('[data-k="reps"]').forEach(b=>b.onclick=()=>setR(+b.dataset.i,d.items[+b.dataset.i].reps+(+b.dataset.dir)));
 v.querySelectorAll('[data-f="reps"]').forEach(el=>el.onchange=()=>setR(+el.dataset.i,parseInt(el.value)));
 v.querySelectorAll('[data-wsel]').forEach(el=>el.onchange=()=>{d.items[+el.dataset.wsel].w=+el.value;save();renderWorkout();});
 v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 v.querySelectorAll('[data-rm]').forEach(el=>el.onclick=()=>{d.items.splice(+el.dataset.rm,1);save();render();});
 v.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const i=+b.dataset.mv,j=i+(+b.dataset.dir);if(j<0||j>=d.items.length)return;[d.items[i],d.items[j]]=[d.items[j],d.items[i]];save();renderWorkout();});
 observeThumbs();
 $('#setupW').onclick=openSetup;
 $('#saveTpl').onclick=()=>{if(saveTemplate(d.items.map(it=>({exId:it.exId,sets:c.sets,reps:it.reps,w:wOf(it)})),d.name,c)){d.items=[];d.name='';save();render();}};
 $('#clear').onclick=()=>{if(!confirm('Workout leeren?'))return;d.items=[];d.name='';save();render();};}
// Workout unter einem Namen im Reiter „Gespeichert“ ablegen
function saveTemplate(items,cur,c){const name=(cur||'').trim()||prompt('Name für das Workout:','Mein Workout');if(!name)return null;
 const ex=D().templates.find(t=>t.name===name),tc=c?{sets:c.sets,drop:!!c.drop}:undefined;
 if(ex){if(!confirm(`„${name}“ überschreiben?`))return null;ex.items=items;if(tc)ex.cfg=tc;}else D().templates.push({id:uid(),name,items,...(tc?{cfg:tc}:{})});
 save();toast(`„${name}“ gespeichert`);return name;}

// ---------- Schritt 1: Workout einstellen
function openSheetBody(html){$('#startBody').innerHTML=html;$('#startSheet').hidden=false;document.body.style.overflow='hidden';$('#startClose').onclick=closeStart;}
function openSetup(){const d=D().draft,c=cfg();d.items.forEach(normItem);
 const ex0=d.items.find(it=>byId[it.exId]),demo=ex0?ex0.reps:10;
 openSheetBody(`<p class="step-no">Schritt 1 von 2</p><h2 class="start-title">Workout einstellen</h2><p class="note">${d.items.length} Übungen. Die Einstellungen gelten für alle Übungen.</p>
 <div class="card setup"><h3>Sätze pro Übung</h3><div class="wrow"><div class="stepper"><button type="button" id="cfgMinus" aria-label="Weniger Sätze">−</button><input type="number" inputmode="numeric" min="1" max="20" id="cfgSets" value="${c.sets}" aria-label="Sätze pro Übung"><button type="button" id="cfgPlus" aria-label="Mehr Sätze">+</button></div><span>Sätze</span></div></div>
 <label class="card setup toggle"><input type="checkbox" id="cfgDrop"${c.drop?' checked':''}><span><b>Abfallende Wiederholungen</b><small>Pro Satz eine Wiederholung weniger.</small></span></label>
 <div class="card setup-demo"><h3>So sieht ein Satzplan aus</h3><p class="note" id="cfgDemoName">${esc(ex0?byId[ex0.exId].name:'Beispiel')}, ${demo} Wiederholungen</p><div class="reps-pills" id="cfgDemo"></div></div>
 <button class="btn" id="cfgDone">Einstellungen abschließen</button><button class="btn sec" id="cfgBack">Zurück</button>`);
 const demoPaint=()=>{$('#cfgDemo').innerHTML=planReps(demo,c).map((r,i)=>`<span><small>Satz ${i+1}</small>${r}</span>`).join('');};
 const setS=n=>{c.sets=Math.max(1,Math.min(20,Math.round(n)||1));$('#cfgSets').value=c.sets;save();demoPaint();};
 $('#cfgMinus').onclick=()=>setS(c.sets-1);$('#cfgPlus').onclick=()=>setS(c.sets+1);$('#cfgSets').onchange=e=>setS(parseInt(e.target.value));
 $('#cfgDrop').onchange=e=>{c.drop=e.target.checked;save();demoPaint();};
 demoPaint();$('#cfgDone').onclick=openOverview;$('#cfgBack').onclick=()=>{closeStart();renderWorkout();};}

// ---------- Schritt 2: Übersicht des Workouts
function openOverview(){const d=D().draft,c=cfg(),items=d.items.filter(it=>byId[it.exId]);
 const totalSets=items.length*c.sets,totalReps=items.reduce((a,it)=>a+planReps(it.reps,c).reduce((b,r)=>b+r,0),0),vol=planVolume(items,c);
 openSheetBody(`<p class="step-no">Schritt 2 von 2</p><h2 class="start-title">${esc(d.name||'Dein Workout')}</h2>
 <div class="ov-stats"><div><b>${items.length}</b><span>Übungen</span></div><div><b>${totalSets}</b><span>Sätze</span></div><div><b>${totalReps}</b><span>Wiederholungen</span></div><div><b>${vol?fmtKg(vol):'–'}</b><span>kg bewegt</span></div></div>
 <p class="note">${c.sets} ${c.sets===1?'Satz':'Sätze'} pro Übung${c.drop?', abfallende Wiederholungen':''}</p>
 <ol class="start-list ov-list">${items.map((it,i)=>{const ex=byId[it.exId];
  return`<li><span class="start-n">${i+1}</span>${ex.keys?`<canvas class="start-img thumb" width="160" height="160" data-ex="${ex.id}"></canvas>`:'<span class="start-img"></span>'}
  <div class="ov-body"><b>${esc(ex.name)}</b>${ex.kbCount?`<span class="wt">${wOf(it)} kg${ex.kbCount===2?' × 2':''}</span>`:`<small>${esc(ex.equip||'Körpergewicht')}</small>`}
  <div class="reps-pills">${planReps(it.reps,c).map((r,j)=>`<span><small>Satz ${j+1}</small>${r}</span>`).join('')}</div></div></li>`;}).join('')}</ol>
 <div class="card"><h3>Benötigte Kettlebells</h3>${kbNeedHtml(items)}</div>
 <button class="btn" id="startGo">Workout starten</button><button class="btn sec" id="ovBack">Einstellungen ändern</button>`);
 if(initThumbs()){document.querySelectorAll('#startBody canvas.start-img').forEach(cv=>drawStill(cv,byId[cv.dataset.ex]));observeThumbs();}
 $('#ovBack').onclick=openSetup;
 $('#startGo').onclick=()=>{D().active={name:d.name,startedAt:new Date().toISOString(),cfg:{...c},
   items:items.map(it=>{const w=wOf(it);return{exId:it.exId,reps:it.reps,w,sets:planReps(it.reps,c).map(r=>({r,w,done:false}))};})};
  d.items=[];d.name='';save();closeStart();window.scrollTo(0,0);render();};}
function openStart(){openSetup();}
function closeStart(){$('#startSheet').hidden=true;document.body.style.overflow='';observeThumbs();}

// ---------- Training: jeder Satz wird einzeln eingeloggt
function renderTraining(){const A=D().active,v=$('#view-workout');
 const since=new Date(A.startedAt||Date.now()).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
 const all=A.items.reduce((a,it)=>a+it.sets.length,0),done=A.items.reduce((a,it)=>a+it.sets.filter(s=>s.done).length,0);
 v.innerHTML=`<div class="train-head"><b>${esc(A.name||'Training')}</b><span>seit ${since} Uhr · ${done}/${all} Sätze</span></div>
 ${A.items.map((it,i)=>{const ex=byId[it.exId];if(!ex)return'';const dn=it.sets.filter(s=>s.done).length;
  return`<div class="card ex-card train-card"><div class="ex-head"><span class="start-n${dn===it.sets.length&&dn?' ok':''}">${i+1}</span>${thumbHtml(ex)}<button class="name" data-open="${ex.id}">${esc(ex.name)}<small>${dn}/${it.sets.length} Sätze eingeloggt</small></button></div>
  <div class="set-list">${it.sets.map((s,j)=>`<div class="set-row${s.done?' done':''}"><span class="set-no">Satz ${j+1}</span>
   ${stepper(i+':'+j,'r',s.r,'set','Wiederholungen Satz '+(j+1))}
   ${ex.kbCount?`<select class="wsel" data-sw="${i}:${j}" aria-label="Gewicht Satz ${j+1}">${[...new Set([...KB_SIZES,+s.w])].sort((a,b)=>a-b).map(k=>`<option value="${k}"${k===+s.w?' selected':''}>${k} kg${ex.kbCount===2?' × 2':''}</option>`).join('')}</select>`:'<span class="set-bw">Körpergewicht</span>'}
   <button type="button" class="log${s.done?' on':''}" data-log="${i}:${j}" aria-pressed="${s.done}" aria-label="Satz ${j+1} ${s.done?'nicht mehr eingeloggt':'einloggen'}">${s.done?'✓':'Einloggen'}</button></div>`).join('')}</div>
  <div class="set-actions"><button type="button" class="link" data-addset="${i}">+ Satz</button>${it.sets.length>1?`<button type="button" class="link" data-rmset="${i}">− Letzten Satz entfernen</button>`:''}</div></div>`;}).join('')}
 <button class="btn" id="trEnd">Workout beenden</button><div class="btn-row"><button class="btn sec" id="trSave">Workout speichern</button><button class="btn sec" id="trBack">Zurück</button></div>`;
 const at=k=>{const [i,j]=String(k).split(':').map(Number);return A.items[i].sets[j];};
 const setR=(k,val)=>{at(k).r=Math.max(1,Math.min(200,Math.round(val)||1));save();renderTraining();};
 v.querySelectorAll('[data-k="r"]').forEach(b=>b.onclick=()=>setR(b.dataset.i,at(b.dataset.i).r+(+b.dataset.dir)));
 v.querySelectorAll('[data-f="r"]').forEach(el=>el.onchange=()=>setR(el.dataset.i,parseInt(el.value)));
 // Gewicht gilt ab diesem Satz auch für die folgenden, noch nicht eingeloggten Sätze
 v.querySelectorAll('[data-sw]').forEach(el=>el.onchange=()=>{const [i,j]=el.dataset.sw.split(':').map(Number);A.items[i].sets.forEach((s,k)=>{if(k===j||(k>j&&!s.done))s.w=+el.value;});save();renderTraining();});
 v.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{const s=at(b.dataset.log);s.done=!s.done;save();renderTraining();if(s.done)toast('Satz eingeloggt');});
 v.querySelectorAll('[data-addset]').forEach(b=>b.onclick=()=>{const it=A.items[+b.dataset.addset],l=it.sets[it.sets.length-1]||{r:it.reps,w:it.w};it.sets.push({r:l.r,w:l.w,done:false});save();renderTraining();});
 v.querySelectorAll('[data-rmset]').forEach(b=>b.onclick=()=>{const it=A.items[+b.dataset.rmset];if(it.sets.length>1)it.sets.pop();save();renderTraining();});
 v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 observeThumbs();
 // Zurück: Übungen wandern zurück in die Workout-Zusammenstellung
 $('#trBack').onclick=()=>{const d=D().draft;A.items.forEach(it=>{if(!d.items.some(x=>x.exId===it.exId))d.items.push({exId:it.exId,reps:it.reps,w:it.w});});
  if(!d.name)d.name=A.name||'';if(A.cfg)d.cfg={...A.cfg};delete D().active;save();window.scrollTo(0,0);render();};
 $('#trSave').onclick=()=>{const c=A.cfg||{sets:settings().sets,drop:false};const n=saveTemplate(A.items.map(it=>({exId:it.exId,sets:c.sets,reps:it.reps,w:+it.w})),A.name,c);if(n){A.name=n;save();renderTraining();}};
 $('#trEnd').onclick=finishWorkout;}
function finishWorkout(){const A=D().active;if(!A)return;
 const entries=A.items.filter(it=>byId[it.exId]).map(it=>({exId:it.exId,sets:it.sets.filter(s=>s.done).map(s=>({w:byId[it.exId].kbCount?+s.w:0,r:s.r}))})).filter(e=>e.sets.length);
 const open=A.items.reduce((a,it)=>a+it.sets.filter(s=>!s.done).length,0);
 if(!entries.length){toast('Noch kein Satz eingeloggt');return;}
 if(!confirm(open?`${open} ${open===1?'Satz ist':'Sätze sind'} nicht eingeloggt und ${open===1?'wird':'werden'} nicht gespeichert. Workout trotzdem beenden?`:'Workout beenden und im Verlauf speichern?'))return;
 D().sessions.push({id:uid(),date:new Date().toISOString(),start:A.startedAt||null,name:A.name||'Training',entries});
 entries.forEach(e=>{if(byId[e.exId].kbCount)D().weights[e.exId]=e.sets[e.sets.length-1].w;});
 delete D().active;save();toast('Workout im Verlauf gespeichert');go('history');}
