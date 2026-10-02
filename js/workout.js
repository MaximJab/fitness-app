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
function weightSelect(i,ex,w,sc){const opts=[...new Set([...KB_SIZES,w])].sort((a,b)=>a-b);
 return`<div class="wrow"><span>Gewicht</span><select class="wsel" data-wsel="${i}" data-sc="${sc}" aria-label="Gewicht für ${esc(ex.name)}">${opts.map(k=>`<option value="${k}"${k===w?' selected':''}>${k} kg${ex.kbCount===2?' × 2':''}</option>`).join('')}</select></div>`;}
function stepper(i,k,val,sc,label){return`<div class="stepper"><button type="button" data-k="${k}" data-i="${i}" data-sc="${sc}" data-dir="-1" aria-label="${label} verringern">−</button><input type="number" inputmode="numeric" min="1" value="${val}" data-f="${k}" data-i="${i}" data-sc="${sc}" aria-label="${label}"><button type="button" data-k="${k}" data-i="${i}" data-sc="${sc}" data-dir="1" aria-label="${label} erhöhen">+</button></div>`;}
function setsRepsRow(i,o,sc){return`<div class="wrow"><span>Sätze</span>${stepper(i,'sets',o.sets,sc,'Satzanzahl')}<span class="x">×</span>${stepper(i,'reps',o.reps,sc,'Wiederholungen pro Satz')}<span>Wdh.</span></div>`;}
function thumbHtml(ex){return ex.keys?`<button class="thumb-btn" data-open="${ex.id}" aria-label="${esc(ex.name)} ansehen"><canvas class="thumb" width="128" height="128" data-ex="${ex.id}"></canvas></button>`:'';}
// Eingaben (Sätze, Wiederholungen, Gewicht) für Planung (sc=plan) und Training (sc=act)
function bindInputs(v,d,rerender){const tgt=(i,sc)=>sc==='act'?d.items[i].act:d.items[i];
 const setV=(o,k,val)=>{o[k]=Math.max(1,Math.min(k==='sets'?20:200,Math.round(val)||1));save();rerender();};
 v.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const o=tgt(+b.dataset.i,b.dataset.sc),k=b.dataset.k;setV(o,k,o[k]+(+b.dataset.dir));});
 v.querySelectorAll('[data-f]').forEach(el=>el.onchange=()=>setV(tgt(+el.dataset.i,el.dataset.sc),el.dataset.f,parseInt(el.value)));
 v.querySelectorAll('[data-wsel]').forEach(el=>el.onchange=()=>{tgt(+el.dataset.wsel,el.dataset.sc).w=+el.value;save();rerender();});
 v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));}
function kbNeeds(items){const need={};
 items.forEach(it=>{const ex=byId[it.exId],w=wOf(it);if(!ex||!ex.kbCount||!(w>0))return;need[w]=Math.max(need[w]||0,ex.kbCount);});
 return Object.entries(need).map(([w,n])=>({w:+w,n})).sort((a,b)=>a.w-b.w);}
function kbNeedHtml(items){const needs=kbNeeds(items),inv=D().inventory;
 return needs.length?`<div class="kb-need">${needs.map(x=>{const have=+inv[x.w]||0,miss=Math.max(0,x.n-have);return`<span class="${miss?'miss':''}">${x.n} × ${x.w} kg${miss?` <em>(${miss} fehlt)</em>`:''}</span>`;}).join('')}</div>`:'<p class="note">Keine Kettlebells nötig.</p>';}
const ICON_UP='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',ICON_DOWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
// Laufendes Training liegt getrennt von der Auswahl (D().active), damit die Auswahl danach wieder frei ist
function migrateTraining(){const d=D().draft;if(d.training){if(d.items.length)D().active={name:d.name,startedAt:d.startedAt,items:d.items};d.items=[];d.name='';delete d.training;delete d.startedAt;}}
function renderWorkout(){migrateTraining();const d=D().draft,v=$('#view-workout');d.items.forEach(normItem);
 if(D().active){renderTraining();return;}
 if(!d.items.length){v.innerHTML=`<p class="empty">Noch keine Übungen im Workout.<br>Tippe in der Übungsliste auf <b>+</b> oder lade ein gespeichertes Workout.</p><button class="btn" id="toEx">Übungen ansehen</button><button class="btn sec" id="toSaved">Gespeicherte Workouts</button>`;
  $('#toEx').onclick=()=>go('exercises');$('#toSaved').onclick=()=>go('saved');return;}
 let html=`<input class="field" id="wName" placeholder="Name des Workouts (optional)" value="${esc(d.name)}">
 <button class="btn" id="startW">Workout starten</button>
 <div class="card"><h3>Benötigte Kettlebells</h3>${kbNeedHtml(d.items)}</div><div id="wItems">`;
 d.items.forEach((it,i)=>{const ex=byId[it.exId];if(!ex)return;
  html+=`<div class="card ex-card" data-i="${i}"><div class="ex-head"><div class="move"><button type="button" data-mv="${i}" data-dir="-1" aria-label="${esc(ex.name)} nach oben"${i===0?' disabled':''}>${ICON_UP}</button><button type="button" data-mv="${i}" data-dir="1" aria-label="${esc(ex.name)} nach unten"${i===d.items.length-1?' disabled':''}>${ICON_DOWN}</button></div>${thumbHtml(ex)}<button class="name" data-open="${ex.id}">${esc(ex.name)}<small>${esc(lastInfo(ex.id))}</small></button>
  <button class="icon-btn" data-rm="${i}" aria-label="${esc(ex.name)} entfernen">✕</button></div>
  ${setsRepsRow(i,it,'plan')}${ex.kbCount?weightSelect(i,ex,wOf(it),'plan'):''}</div>`;});
 html+=`</div><div class="btn-row"><button class="btn sec" id="saveTpl">Als Workout speichern</button><button class="btn danger" id="clear">Leeren</button></div>`;
 v.innerHTML=html;
 $('#wName').oninput=e=>{d.name=e.target.value;save();};
 bindInputs(v,d,renderWorkout);
 v.querySelectorAll('[data-rm]').forEach(el=>el.onclick=()=>{d.items.splice(+el.dataset.rm,1);save();render();});
 v.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const i=+b.dataset.mv,j=i+(+b.dataset.dir);if(j<0||j>=d.items.length)return;[d.items[i],d.items[j]]=[d.items[j],d.items[i]];save();renderWorkout();});
 observeThumbs();
 $('#startW').onclick=openStart;
 $('#saveTpl').onclick=()=>{if(saveTemplate(d.items.map(it=>({exId:it.exId,sets:it.sets,reps:it.reps,w:wOf(it)})),d.name)){d.items=[];d.name='';save();render();}};
 $('#clear').onclick=()=>{if(!confirm('Workout leeren?'))return;d.items=[];d.name='';delete d.training;delete d.startedAt;save();render();};}
// Workout unter einem Namen im Reiter „Gespeichert“ ablegen
function saveTemplate(items,cur){const name=(cur||'').trim()||prompt('Name für das Workout:','Mein Workout');if(!name)return null;
 const ex=D().templates.find(t=>t.name===name);if(ex){if(!confirm(`„${name}“ überschreiben?`))return null;ex.items=items;}else D().templates.push({id:uid(),name,items});
 save();toast(`„${name}“ gespeichert`);return name;}
// Übersicht beim Start: Bilder, Reihenfolge, Gewichte
function openStart(){const d=D().draft;d.items.forEach(normItem);save();
 $('#startBody').innerHTML=`<h2 class="start-title">${esc(d.name||'Dein Workout')}</h2><p class="note">${d.items.length} Übungen in dieser Reihenfolge</p>
 <ol class="start-list">${d.items.map((it,i)=>{const ex=byId[it.exId];if(!ex)return'';const hw=D().weights[it.exId];
  return`<li><span class="start-n">${i+1}</span>${ex.keys?`<canvas class="start-img thumb" width="160" height="160" data-ex="${ex.id}"></canvas>`:'<span class="start-img"></span>'}
  <div><b>${esc(ex.name)}</b><small>${it.sets} Sätze × ${it.reps} Wdh.</small>
  ${ex.kbCount?`<span class="wt">${wOf(it)} kg${ex.kbCount===2?' × 2':''}</span>${hw==null?'<small>noch kein Training gespeichert</small>':''}`:''}</div></li>`;}).join('')}</ol>
 <div class="card"><h3>Benötigte Kettlebells</h3>${kbNeedHtml(d.items)}</div>
 <button class="btn" id="startGo">Training beginnen</button><button class="btn sec" id="startBack">Zurück</button>`;
 $('#startSheet').hidden=false;document.body.style.overflow='hidden';
 // Erstes Bild sofort zeichnen, danach animiert der gemeinsame Mini-Renderer die Bilder
 if(initThumbs()){document.querySelectorAll('#startBody canvas.start-img').forEach(c=>drawStill(c,byId[c.dataset.ex]));observeThumbs();}
 $('#startGo').onclick=()=>{D().active={name:d.name,startedAt:new Date().toISOString(),items:d.items.map(it=>({...it,act:{w:wOf(it),sets:it.sets,reps:it.reps}}))};
  d.items=[];d.name='';save();closeStart();window.scrollTo(0,0);render();};
 $('#startBack').onclick=closeStart;$('#startClose').onclick=closeStart;}
function closeStart(){$('#startSheet').hidden=true;document.body.style.overflow='';observeThumbs();}
// Trainingsmodus: pro Übung die tatsächlichen Werte erfassen (vorbelegt mit der Planung)
function renderTraining(){const A=D().active,v=$('#view-workout');A.items.forEach(normItem);
 A.items.forEach(it=>{if(!it.act)it.act={w:wOf(it),sets:it.sets,reps:it.reps};});
 const since=new Date(A.startedAt||Date.now()).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
 v.innerHTML=`<div class="train-head"><b>${esc(A.name||'Training')}</b><span>läuft seit ${since} Uhr</span></div>
 ${A.items.map((it,i)=>{const ex=byId[it.exId];if(!ex)return'';
  return`<div class="card ex-card train-card"><div class="ex-head"><span class="start-n">${i+1}</span>${thumbHtml(ex)}<button class="name" data-open="${ex.id}">${esc(ex.name)}<small>Geplant: ${it.sets} × ${it.reps}${ex.kbCount?`, ${wOf(it)} kg`:''}</small></button></div>
  ${setsRepsRow(i,it.act,'act')}${ex.kbCount?weightSelect(i,ex,+it.act.w,'act'):''}</div>`;}).join('')}
 <button class="btn" id="trEnd">Workout beenden</button><div class="btn-row"><button class="btn sec" id="trSave">Workout speichern</button><button class="btn sec" id="trBack">Zurück</button></div>`;
 bindInputs(v,A,renderTraining);observeThumbs();
 // Zurück: Übungen wandern zurück in die Workout-Zusammenstellung
 $('#trBack').onclick=()=>{const d=D().draft;A.items.forEach(it=>{delete it.act;if(!d.items.some(x=>x.exId===it.exId))d.items.push(it);});
  if(!d.name)d.name=A.name||'';delete D().active;save();window.scrollTo(0,0);render();};
 $('#trSave').onclick=()=>{const n=saveTemplate(A.items.map(it=>({exId:it.exId,sets:it.act.sets,reps:it.act.reps,w:+it.act.w})),A.name);if(n){A.name=n;save();renderTraining();}};
 $('#trEnd').onclick=finishWorkout;}
function finishWorkout(){const A=D().active;if(!A)return;
 const entries=A.items.filter(it=>byId[it.exId]).map(it=>{const a=it.act||{w:wOf(it),sets:it.sets,reps:it.reps},w=byId[it.exId].kbCount?+a.w:0;return{exId:it.exId,sets:Array.from({length:a.sets},()=>({w,r:a.reps}))};});
 if(!entries.length){toast('Keine Übungen im Workout');return;}
 if(!confirm('Workout beenden und im Verlauf speichern?'))return;
 D().sessions.push({id:uid(),date:new Date().toISOString(),start:A.startedAt||null,name:A.name||'Training',entries});
 entries.forEach(e=>{if(byId[e.exId].kbCount)D().weights[e.exId]=e.sets[0].w;});
 delete D().active;save();toast('Workout im Verlauf gespeichert');go('history');}
