// Reiter „Verlauf“ und „Profil“
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// ---------- Verlauf
function renderHistory(){const ss=[...D().sessions].reverse(),v=$('#view-history');
 if(!ss.length){v.innerHTML='<p class="empty">Noch kein Training gespeichert.</p>';return;}
 v.innerHTML=ss.map(s=>{const vol=s.entries.reduce((a,e)=>a+e.sets.reduce((b,x)=>b+x.w*x.r*(byId[e.exId]?.kbCount||1),0),0);
  return`<details class="card hist-item"><summary><h3>${esc(s.name)}</h3><div class="meta">${fmtDate(s.date)}, ${s.entries.length} Übungen${vol?`, ${Math.round(vol).toLocaleString('de-DE')} kg bewegt`:''}</div></summary>
  ${s.entries.map(e=>`<div class="hist-ex"><b>${esc(byId[e.exId]?.name||e.exId)}</b>${e.sets.map(x=>`${x.w} kg × ${x.r}`).join(', ')}</div>`).join('')}
  <button class="btn danger" data-delsess="${s.id}">Training löschen</button></details>`;}).join('');
 v.querySelectorAll('[data-delsess]').forEach(b=>b.onclick=()=>{if(!confirm('Dieses Training löschen?'))return;D().sessions=D().sessions.filter(x=>x.id!==b.dataset.delsess);save();renderHistory();});}

// ---------- Profil
function renderProfile(){const v=$('#view-profile'),inv=D().inventory;
 v.innerHTML=`<div class="card"><h2>Profile</h2>${S.profiles.map(p=>`<div class="prof"><b>${esc(p.name)}</b>${p.id===S.active?'<span class="cur">Aktiv</span>':`<button class="chip" data-sw="${p.id}">Wechseln</button>`}</div>`).join('')}
  <div class="inline" style="margin-top:10px"><input class="field" id="npName" placeholder="Neues Profil"><button class="add" id="npAdd" aria-label="Profil anlegen">+</button></div></div>
 <div class="card"><h2>${esc(P().name)}</h2><div class="inline"><input class="field" id="rnName" value="${esc(P().name)}" aria-label="Profilname"><button class="chip" id="rnGo">Umbenennen</button></div></div>
 <div class="card"><h3>Standardwerte für neue Übungen</h3><p class="note">Gilt, wenn eine Übung noch nie trainiert wurde. Sonst werden Sätze, Wiederholungen und Gewicht vom letzten Training übernommen.</p>
  <div class="inv"><label>Sätze<input type="number" inputmode="numeric" min="1" max="20" value="${settings().sets}" data-set="sets"></label><label>Wiederholungen<input type="number" inputmode="numeric" min="1" max="100" value="${settings().reps}" data-set="reps"></label></div></div>
 <div class="card"><h3>Meine Kettlebells</h3><p class="note">Anzahl pro Gewicht. Das Workout zeigt, welche Glocken dir fehlen.</p>
  <div class="inv">${KB_SIZES.map(k=>`<label>${k} kg<input type="number" inputmode="numeric" min="0" max="9" value="${+inv[k]||0}" data-inv="${k}"></label>`).join('')}</div></div>
 <div class="card"><h3>Datensicherung</h3><p class="note">Alle Daten liegen nur auf diesem Gerät im Browser. Sichere sie regelmäßig als Datei. Beim Löschen der Website-Daten in Safari gehen sie sonst verloren.</p>
  <div class="btn-row"><button class="btn sec" id="exp">Exportieren</button><button class="btn sec" id="impBtn">Importieren</button></div><input type="file" id="imp" accept="application/json,.json" hidden></div>
 <button class="btn danger" id="delProf">Profil „${esc(P().name)}“ löschen</button>`;
 v.querySelectorAll('[data-sw]').forEach(b=>b.onclick=()=>{S.active=b.dataset.sw;save();fWeight='Alle';render();toast('Profil gewechselt');});
 $('#npAdd').onclick=()=>{const n=$('#npName').value.trim();if(!n)return;newProfile(n);fWeight='Alle';render();toast('Profil angelegt');};
 $('#rnGo').onclick=()=>{const n=$('#rnName').value.trim();if(!n)return;P().name=n;save();render();};
 v.querySelectorAll('[data-set]').forEach(el=>el.onchange=()=>{const v2=Math.max(1,parseInt(el.value)||1);settings()[el.dataset.set]=v2;el.value=v2;save();});
 v.querySelectorAll('[data-inv]').forEach(el=>el.onchange=()=>{inv[el.dataset.inv]=Math.max(0,parseInt(el.value)||0);save();});
 $('#exp').onclick=()=>{const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='fitness-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
 $('#impBtn').onclick=()=>$('#imp').click();
 $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x.profiles||!x.data)throw 0;
  if(!confirm('Alle aktuellen Daten durch die Sicherung ersetzen?'))return;S=x;if(!P())S.active=S.profiles[0]?.id||null;save();render();toast('Sicherung geladen');}catch(err){toast('Datei ist keine gültige Sicherung');}};
 $('#delProf').onclick=()=>{if(!confirm(`Profil „${P().name}“ mit allen Trainings löschen?`))return;delete S.data[S.active];S.profiles=S.profiles.filter(p=>p.id!==S.active);S.active=S.profiles[0]?.id||null;save();view='exercises';render();};}
