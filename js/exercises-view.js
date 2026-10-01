// Reiter „Übungen“: Liste, Filter
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// ---------- Übungen
let fGroup='Alle',fWeight='Alle';
function weightOptions(){const set=new Set(Object.values(D().weights).filter(w=>w>0));return[...set].sort((a,b)=>a-b);}
function renderExercises(){
 const gc=$('#groupChips');gc.innerHTML=['Alle',...GROUPS].map(g=>`<button class="chip" aria-pressed="${g===fGroup}" data-g="${esc(g)}">${esc(g)}</button>`).join('');
 gc.querySelectorAll('button').forEach(b=>b.onclick=()=>{fGroup=b.dataset.g;renderExercises();});
 const ws=weightOptions();if(fWeight!=='Alle'&&fWeight!=='neu'&&!ws.includes(+fWeight))fWeight='Alle';
 const wc=$('#weightChips');wc.innerHTML=[['Alle','Alle'],...ws.map(w=>[String(w),w+' kg']),['neu','Noch nicht trainiert']].map(([k,l])=>`<button class="chip" aria-pressed="${String(fWeight)===k}" data-w="${k}">${l}</button>`).join('');
 wc.querySelectorAll('button').forEach(b=>b.onclick=()=>{fWeight=b.dataset.w;renderExercises();});
 const q=$('#q').value.trim().toLowerCase(),W=D().weights,inW=new Set(D().draft.items.map(i=>i.exId));
 let html='';
 GROUPS.forEach(g=>{if(fGroup!=='Alle'&&fGroup!==g)return;
  const items=EX.filter(e=>e.group===g&&(!q||(e.name+' '+e.muscles+' '+(e.equip||'')).toLowerCase().includes(q))
   &&(fWeight==='Alle'||(fWeight==='neu'?W[e.id]==null:W[e.id]===+fWeight)));
  if(!items.length)return;
  html+=`<div class="gh">${esc(g)}<span>${items.length}</span></div>`;
  items.forEach(e=>{const w=W[e.id];html+=`<div class="row">${e.keys?`<button class="thumb-btn" data-open="${e.id}" aria-label="${esc(e.name)} ansehen"><canvas class="thumb" width="128" height="128" data-ex="${e.id}"></canvas></button>`:'<span class="thumb-btn none"></span>'}<button class="row-main" data-open="${e.id}"><b>${esc(e.name)}</b><small>${esc(e.level)}, ${esc(e.equip||kbLabel(e))}</small></button>
   ${w!=null&&e.kbCount?`<span class="wt">${w} kg</span>`:''}<button class="add${inW.has(e.id)?' in':''}" data-add="${e.id}" aria-label="${esc(e.name)} ${inW.has(e.id)?'aus dem Workout entfernen':'zum Workout hinzufügen'}">${inW.has(e.id)?'✓':'+'}</button></div>`;});});
 $('#exList').innerHTML=html||'<p class="empty">Keine Übung gefunden.</p>';
 $('#exList').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 observeThumbs();
 $('#exList').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const id=b.dataset.add;if(D().draft.items.some(i=>i.exId===id))removeFromWorkout(id);else addToWorkout(id);renderExercises();});}
$('#q').addEventListener('input',()=>renderExercises());
