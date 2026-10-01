// Reiter „Workout“: Übungen planen, Start-Übersicht, Training speichern
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
function removeFromWorkout(exId){const d=D().draft,ex=byId[exId];d.items=d.items.filter(i=>i.exId!==exId);
 save();toast((ex?ex.name:'Übung')+' entfernt');const n=d.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;}
function addToWorkout(exId){const ex=byId[exId],d=D().draft;
 if(d.items.some(i=>i.exId===exId)){toast('Schon im Workout');return;}
 const pl=defaultPlan(ex);d.items.push({exId,sets:pl.sets,reps:pl.reps,w:ex.kbCount?defaultWeight(ex):0});
 save();toast(ex.name+' hinzugefügt');const n=d.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;}

// ---------- Workout
// Ältere Datenstände (Satzliste) auf Satzanzahl und Wiederholungen umstellen
function normItem(it){if(Array.isArray(it.sets)){const s=it.sets;it.reps=s[0]?.r??settings().reps;if(it.w==null&&s[0]?.w!=null)it.w=s[0].w;it.sets=s.length||settings().sets;}return it;}
// Gewicht: im Workout gewählt, sonst aus der Historie bzw. „Mein aktuelles Gewicht“
const wOf=it=>{const ex=byId[it.exId];return !ex||!ex.kbCount?0:(it.w!=null?+it.w:defaultWeight(ex));};
// Letzte gespeicherte Einheit einer Übung mit Datum
function lastInfo(exId){const ss=D().sessions;for(let i=ss.length-1;i>=0;i--){const e=ss[i].entries.find(x=>x.exId===exId);if(e&&e.sets.length){const rs=[...new Set(e.sets.map(x=>x.r))];
 return`Zuletzt ${new Date(ss[i].date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}: ${byId[exId]?.kbCount?e.sets[0].w+' kg, ':''}${e.sets.length} × ${rs.join('/')}`;}}return'Noch nicht trainiert';}
function weightSelect(i,ex,w){const opts=[...new Set([...KB_SIZES,w])].sort((a,b)=>a-b);
 return`<div class="wrow"><span>Gewicht</span><select class="wsel" data-wsel="${i}" aria-label="Gewicht für ${esc(ex.name)}">${opts.map(k=>`<option value="${k}"${k===w?' selected':''}>${k} kg${ex.kbCount===2?' × 2':''}</option>`).join('')}</select></div>`;}
function kbNeeds(items){const need={};
 items.forEach(it=>{const ex=byId[it.exId],w=wOf(it);if(!ex||!ex.kbCount||!(w>0))return;need[w]=Math.max(need[w]||0,ex.kbCount);});
 return Object.entries(need).map(([w,n])=>({w:+w,n})).sort((a,b)=>a.w-b.w);}
function kbNeedHtml(items){const needs=kbNeeds(items),inv=D().inventory;
 return needs.length?`<div class="kb-need">${needs.map(x=>{const have=+inv[x.w]||0,miss=Math.max(0,x.n-have);return`<span class="${miss?'miss':''}">${x.n} × ${x.w} kg${miss?` <em>(${miss} fehlt)</em>`:''}</span>`;}).join('')}</div>`:'<p class="note">Keine Kettlebells nötig.</p>';}
const ICON_UP='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',ICON_DOWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function renderWorkout(){const d=D().draft,v=$('#view-workout');d.items.forEach(normItem);
 const tpl=D().templates;
 const tplHtml=tpl.length?`<div class="card"><h3>Gespeicherte Workouts</h3>${tpl.map(t=>`<div class="prof"><b>${esc(t.name)}</b><span class="note">${t.items.length} Übungen</span><button class="icon-btn" data-load="${t.id}" aria-label="${esc(t.name)} laden">↺</button><button class="icon-btn" data-deltpl="${t.id}" aria-label="${esc(t.name)} löschen">✕</button></div>`).join('')}</div>`:'';
 if(!d.items.length){v.innerHTML=`<p class="empty">Noch keine Übungen im Workout.<br>Tippe in der Übungsliste auf <b>+</b>.</p><button class="btn" id="toEx">Übungen ansehen</button>${tplHtml}`;
  $('#toEx').onclick=()=>go('exercises');bindTpl();return;}
 let html=`<input class="field" id="wName" placeholder="Name des Workouts (optional)" value="${esc(d.name)}">
 <button class="btn" id="startW">${d.startedAt?'Übersicht anzeigen':'Workout starten'}</button>
 <div class="card"><h3>Benötigte Kettlebells</h3>${kbNeedHtml(d.items)}</div><div id="wItems">`;
 d.items.forEach((it,i)=>{const ex=byId[it.exId];if(!ex)return;const w=wOf(it);
  html+=`<div class="card ex-card" data-i="${i}"><div class="ex-head"><div class="move"><button type="button" data-mv="${i}" data-dir="-1" aria-label="${esc(ex.name)} nach oben"${i===0?' disabled':''}>${ICON_UP}</button><button type="button" data-mv="${i}" data-dir="1" aria-label="${esc(ex.name)} nach unten"${i===d.items.length-1?' disabled':''}>${ICON_DOWN}</button></div>${ex.keys?`<button class="thumb-btn" data-open="${ex.id}" aria-label="${esc(ex.name)} ansehen"><canvas class="thumb" width="128" height="128" data-ex="${ex.id}"></canvas></button>`:''}<button class="name" data-open="${ex.id}">${esc(ex.name)}<small>${esc(lastInfo(ex.id))}</small></button>
  <button class="icon-btn" data-rm="${i}" aria-label="${esc(ex.name)} entfernen">✕</button></div>
  <div class="wrow"><span>Sätze</span><div class="stepper"><button type="button" data-k="sets" data-i="${i}" data-dir="-1" aria-label="Weniger Sätze">−</button><input type="number" inputmode="numeric" min="1" value="${it.sets}" data-f="sets" data-i="${i}" aria-label="Satzanzahl"><button type="button" data-k="sets" data-i="${i}" data-dir="1" aria-label="Mehr Sätze">+</button></div>
  <span class="x">×</span><div class="stepper"><button type="button" data-k="reps" data-i="${i}" data-dir="-1" aria-label="Weniger Wiederholungen">−</button><input type="number" inputmode="numeric" min="1" value="${it.reps}" data-f="reps" data-i="${i}" aria-label="Wiederholungen pro Satz"><button type="button" data-k="reps" data-i="${i}" data-dir="1" aria-label="Mehr Wiederholungen">+</button></div><span>Wdh.</span></div>${ex.kbCount?weightSelect(i,ex,w):''}</div>`;});
 html+=`</div><button class="btn" id="finish">Training speichern</button><div class="btn-row"><button class="btn sec" id="saveTpl">Als Workout speichern</button><button class="btn danger" id="clear">Leeren</button></div>${tplHtml}`;
 v.innerHTML=html;
 const setV=(i,k,val)=>{d.items[i][k]=Math.max(1,Math.min(k==='sets'?20:200,Math.round(val)||1));save();renderWorkout();};
 $('#wName').oninput=e=>{d.name=e.target.value;save();};
 v.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i,k=b.dataset.k;setV(i,k,d.items[i][k]+(+b.dataset.dir));});
 v.querySelectorAll('[data-f]').forEach(el=>el.onchange=()=>setV(+el.dataset.i,el.dataset.f,parseInt(el.value)));
 v.querySelectorAll('[data-wsel]').forEach(el=>el.onchange=()=>{d.items[+el.dataset.wsel].w=+el.value;save();renderWorkout();});
 v.querySelectorAll('[data-rm]').forEach(el=>el.onclick=()=>{d.items.splice(+el.dataset.rm,1);save();render();});
 v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 v.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const i=+b.dataset.mv,j=i+(+b.dataset.dir);if(j<0||j>=d.items.length)return;[d.items[i],d.items[j]]=[d.items[j],d.items[i]];save();renderWorkout();});
 observeThumbs();
 $('#startW').onclick=openStart;
 $('#finish').onclick=finishWorkout;
 $('#saveTpl').onclick=()=>{const name=(d.name||'').trim()||prompt('Name für das Workout:','Mein Workout');if(!name)return;
  const items=d.items.map(it=>({exId:it.exId,sets:it.sets,reps:it.reps,w:it.w}));
  const ex=D().templates.find(t=>t.name===name);if(ex){if(!confirm(`„${name}“ überschreiben?`))return;ex.items=items;}else D().templates.push({id:uid(),name,items});
  d.name=name;save();toast('Workout gespeichert');renderWorkout();};
 $('#clear').onclick=()=>{if(!confirm('Workout leeren?'))return;d.items=[];d.name='';delete d.startedAt;save();render();};
 bindTpl();}
function bindTpl(){const v=$('#view-workout'),d=D().draft;
 v.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.load);if(!t)return;
  if(d.items.length&&!confirm('Aktuelles Workout ersetzen?'))return;
  d.name=t.name;delete d.startedAt;d.items=t.items.filter(it=>byId[it.exId]).map(it=>normItem({exId:it.exId,sets:Array.isArray(it.sets)?it.sets.map(s=>({r:s.r,w:s.w})):it.sets,reps:it.reps,w:D().weights[it.exId]??it.w}));save();render();});
 v.querySelectorAll('[data-deltpl]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.deltpl);if(!t||!confirm(`„${t.name}“ löschen?`))return;D().templates=D().templates.filter(x=>x!==t);save();renderWorkout();});}
// Übersicht beim Start: Bilder, Reihenfolge, Gewichte aus der Historie
function openStart(){const d=D().draft;d.items.forEach(normItem);save();
 $('#startBody').innerHTML=`<h2 class="start-title">${esc(d.name||'Dein Workout')}</h2><p class="note">${d.items.length} Übungen in dieser Reihenfolge</p>
 <ol class="start-list">${d.items.map((it,i)=>{const ex=byId[it.exId];if(!ex)return'';const hw=D().weights[it.exId];
  return`<li><span class="start-n">${i+1}</span>${ex.keys?`<canvas class="start-img" width="160" height="160" data-ex="${ex.id}"></canvas>`:'<span class="start-img"></span>'}
  <div><b>${esc(ex.name)}</b><small>${it.sets} Sätze × ${it.reps} Wdh.</small>
  ${ex.kbCount?`<span class="wt">${wOf(it)} kg${ex.kbCount===2?' × 2':''}</span>${hw==null?'<small>noch kein Training gespeichert</small>':''}`:''}</div></li>`;}).join('')}</ol>
 <div class="card"><h3>Benötigte Kettlebells</h3>${kbNeedHtml(d.items)}</div>
 <button class="btn" id="startGo">${d.startedAt?'Weiter trainieren':'Training beginnen'}</button><button class="btn sec" id="startBack">Zurück</button>`;
 $('#startSheet').hidden=false;document.body.style.overflow='hidden';
 if(initThumbs())document.querySelectorAll('#startBody canvas.start-img').forEach(c=>drawStill(c,byId[c.dataset.ex]));
 $('#startGo').onclick=()=>{if(!d.startedAt){d.startedAt=new Date().toISOString();save();}closeStart();renderWorkout();toast('Viel Erfolg!');};
 $('#startBack').onclick=closeStart;$('#startClose').onclick=closeStart;}
function closeStart(){$('#startSheet').hidden=true;document.body.style.overflow='';}
function finishWorkout(){const d=D().draft;d.items.forEach(normItem);
 const entries=d.items.filter(it=>byId[it.exId]).map(it=>{const w=wOf(it);return{exId:it.exId,sets:Array.from({length:it.sets},()=>({w,r:it.reps}))};});
 if(!entries.length){toast('Keine Übungen im Workout');return;}
 if(!confirm('Training mit den eingestellten Sätzen und Wiederholungen speichern?'))return;
 D().sessions.push({id:uid(),date:d.startedAt||new Date().toISOString(),name:d.name||'Training',entries});
 entries.forEach(e=>{if(byId[e.exId].kbCount)D().weights[e.exId]=e.sets[0].w;});
 delete d.startedAt;save();toast('Training gespeichert');go('history');}
