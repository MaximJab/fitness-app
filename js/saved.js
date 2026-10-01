// Reiter „Gespeichert“: gespeicherte Workouts laden oder löschen
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
function renderSaved(){const v=$('#view-saved'),tpl=D().templates;
 if(!tpl.length){v.innerHTML='<p class="empty">Noch keine Workouts gespeichert.<br>Im Workout oder während des Trainings auf „Workout speichern“ tippen.</p>';return;}
 v.innerHTML=tpl.map(t=>`<div class="card"><h3>${esc(t.name)}</h3><p class="note">${t.items.length} Übungen</p>
  <ol class="saved-list">${t.items.map(it0=>{const it=normItem({...it0}),ex=byId[it.exId];if(!ex)return'';return`<li>${esc(ex.name)}<small>${it.sets} × ${it.reps}${ex.kbCount&&it.w?`, ${it.w} kg`:''}</small></li>`;}).join('')}</ol>
  <div class="btn-row"><button class="btn" data-load="${t.id}">Laden</button><button class="btn danger" data-deltpl="${t.id}">Löschen</button></div></div>`).join('');
 v.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.load),d=D().draft;if(!t)return;
  if(d.items.length&&!confirm('Aktuelles Workout ersetzen?'))return;
  d.name=t.name;delete d.training;delete d.startedAt;
  d.items=t.items.filter(it=>byId[it.exId]).map(it=>normItem({exId:it.exId,sets:Array.isArray(it.sets)?it.sets.map(s=>({r:s.r,w:s.w})):it.sets,reps:it.reps,w:it.w??D().weights[it.exId]}));
  save();toast(`„${t.name}“ geladen`);go('workout');});
 v.querySelectorAll('[data-deltpl]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.deltpl);if(!t||!confirm(`„${t.name}“ löschen?`))return;D().templates=D().templates.filter(x=>x!==t);save();renderSaved();});}
