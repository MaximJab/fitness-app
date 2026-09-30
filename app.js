// Fitness-App: Profile, Übungen, Workout, Verlauf. Daten liegen lokal auf dem Gerät (localStorage).
(function(){
const KEY='fitapp.v1';
const KB_SIZES=[4,6,8,10,12,14,16,20,24,28,32];
const byId=Object.fromEntries(EX.map(e=>[e.id,e]));
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

// ---------- Speicher
let S;
try{S=JSON.parse(localStorage.getItem(KEY));}catch(e){S=null;}
if(!S||!S.profiles)S={profiles:[],active:null,data:{}};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast('Speichern fehlgeschlagen');}}
const P=()=>S.profiles.find(p=>p.id===S.active);
const D=()=>S.data[S.active];
function newProfile(name){const id=uid();S.profiles.push({id,name,created:new Date().toISOString()});
 S.data[id]={weights:{},inventory:{8:1,12:1,16:1},draft:{name:'',items:[]},templates:[],sessions:[]};S.active=id;save();}

// ---------- Hilfen
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),1800);}
function defaultPlan(ex){const m=/(\d+)\s*×\s*(\d+)/.exec(ex.volume||'');return{sets:m?+m[1]:3,reps:m?+m[2]:10};}
function defaultWeight(ex){if(ex.kbCount===0)return 0;const w=D().weights[ex.id];if(w!=null)return w;
 const inv=Object.keys(D().inventory).map(Number).filter(k=>D().inventory[k]>0).sort((a,b)=>a-b);return inv[0]??8;}
const kbLabel=ex=>ex.kbCount===2?'2 Kettlebells':ex.kbCount===1?'1 Kettlebell':'ohne Kettlebell';
const fmtDate=iso=>new Date(iso).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});

// ---------- Navigation
let view='exercises';
const TITLES={exercises:'Übungen',workout:'Workout',history:'Verlauf',profile:'Profil'};
function go(v){view=v;document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-'+v);
 document.querySelectorAll('.tabbar button').forEach(b=>b.toggleAttribute('aria-current',b.dataset.view===v));
 if(document.querySelector('.tabbar button[aria-current]'))document.querySelector('.tabbar button[aria-current]').setAttribute('aria-current','page');
 $('#title').textContent=TITLES[v];render();window.scrollTo(0,0);}
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>{if(!P())return;go(b.dataset.view);});
$('#profilePill').onclick=()=>{if(P())go('profile');};

function render(){
 if(!P()){renderOnboarding();return;}
 document.querySelector('.tabbar').hidden=false;
 $('#profilePill').textContent=P().name;$('#profilePill').hidden=false;
 const n=D().draft.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;
 ({exercises:renderExercises,workout:renderWorkout,history:renderHistory,profile:renderProfile})[view]();}

// ---------- Onboarding
function renderOnboarding(){document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML=`<div class="onboard"><h2>Willkommen</h2><p class="note">Lege ein Profil an, um Workouts zu planen und dein Training zu dokumentieren.</p>
 <div class="inline"><input class="field" id="obName" placeholder="Dein Name" autocomplete="given-name"><button class="add" id="obGo" aria-label="Profil anlegen">→</button></div></div>`;
 const go1=()=>{const v=$('#obName').value.trim();if(!v){$('#obName').focus();return;}newProfile(v);go('exercises');};
 $('#obGo').onclick=go1;$('#obName').onkeydown=e=>{if(e.key==='Enter')go1();};}

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
   ${w!=null&&e.kbCount?`<span class="wt">${w} kg</span>`:''}<button class="add${inW.has(e.id)?' in':''}" data-add="${e.id}" aria-label="${esc(e.name)} zum Workout hinzufügen">${inW.has(e.id)?'✓':'+'}</button></div>`;});});
 $('#exList').innerHTML=html||'<p class="empty">Keine Übung gefunden.</p>';
 $('#exList').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 observeThumbs();
 $('#exList').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{addToWorkout(b.dataset.add);renderExercises();});}
$('#q').addEventListener('input',()=>renderExercises());

function addToWorkout(exId){const ex=byId[exId],d=D().draft;
 if(d.items.some(i=>i.exId===exId)){toast('Schon im Workout');return;}
 const pl=defaultPlan(ex),w=defaultWeight(ex);d.items.push({exId,sets:Array.from({length:pl.sets},()=>({w,r:pl.reps,done:false}))});
 save();toast(ex.name+' hinzugefügt');const n=d.items.length;$('#wBadge').hidden=!n;$('#wBadge').textContent=n;}

// ---------- Workout
function kbNeeds(items){const need={};
 items.forEach(it=>{const ex=byId[it.exId];if(!ex||!ex.kbCount)return;
  new Set(it.sets.map(s=>+s.w).filter(w=>w>0)).forEach(w=>{need[w]=Math.max(need[w]||0,ex.kbCount);});});
 return Object.entries(need).map(([w,n])=>({w:+w,n})).sort((a,b)=>a.w-b.w);}
function renderWorkout(){const d=D().draft,v=$('#view-workout');
 const tpl=D().templates;
 const tplHtml=tpl.length?`<div class="card"><h3>Gespeicherte Workouts</h3>${tpl.map(t=>`<div class="prof"><b>${esc(t.name)}</b><span class="note">${t.items.length} Übungen</span><button class="icon-btn" data-load="${t.id}" aria-label="${esc(t.name)} laden">↺</button><button class="icon-btn" data-deltpl="${t.id}" aria-label="${esc(t.name)} löschen">✕</button></div>`).join('')}</div>`:'';
 if(!d.items.length){v.innerHTML=`<p class="empty">Noch keine Übungen im Workout.<br>Tippe in der Übungsliste auf <b>+</b>.</p><button class="btn" id="toEx">Übungen ansehen</button>${tplHtml}`;
  $('#toEx').onclick=()=>go('exercises');bindTpl();return;}
 const needs=kbNeeds(d.items),inv=D().inventory;
 let html=`<input class="field" id="wName" placeholder="Name des Workouts (optional)" value="${esc(d.name)}">
 <div class="card"><h3>Benötigte Kettlebells</h3>${needs.length?`<div class="kb-need">${needs.map(x=>{const have=+inv[x.w]||0,miss=Math.max(0,x.n-have);return`<span class="${miss?'miss':''}">${x.n} × ${x.w} kg${miss?` <em>(${miss} fehlt)</em>`:''}</span>`;}).join('')}</div>`:'<p class="note">Keine Kettlebells nötig.</p>'}</div>`;
 d.items.forEach((it,i)=>{const ex=byId[it.exId];if(!ex)return;
  html+=`<div class="card" data-i="${i}"><div class="ex-head"><button class="name" data-open="${ex.id}">${esc(ex.name)}<small>${esc(kbLabel(ex))}, Ziel ${esc(ex.volume)}</small></button>
  <div class="inline"><button class="icon-btn" data-up="${i}" aria-label="Nach oben" ${i?'':'disabled'}>↑</button><button class="icon-btn" data-rm="${i}" aria-label="${esc(ex.name)} entfernen">✕</button></div></div>
  <table class="sets"><thead><tr><th>Satz</th><th>${ex.kbCount?'kg'+(ex.kbCount===2?' je Glocke':''):'kg'}</th><th>Wdh.</th><th class="chk">✓</th><th></th></tr></thead><tbody>
  ${it.sets.map((s,j)=>`<tr class="${s.done?'done':''}"><td class="n">${j+1}</td><td><input type="number" inputmode="decimal" min="0" step="0.5" value="${s.w}" data-w="${i}.${j}" aria-label="Gewicht Satz ${j+1}"></td>
   <td><input type="number" inputmode="numeric" min="0" step="1" value="${s.r}" data-r="${i}.${j}" aria-label="Wiederholungen Satz ${j+1}"></td>
   <td class="chk"><input type="checkbox" ${s.done?'checked':''} data-d="${i}.${j}" aria-label="Satz ${j+1} erledigt"></td>
   <td class="del"><button class="icon-btn" data-ds="${i}.${j}" aria-label="Satz ${j+1} löschen">−</button></td></tr>`).join('')}
  </tbody></table><button class="link" data-as="${i}">+ Satz</button></div>`;});
 html+=`<button class="btn" id="finish">Training speichern</button><div class="btn-row"><button class="btn sec" id="saveTpl">Als Workout speichern</button><button class="btn danger" id="clear">Leeren</button></div>${tplHtml}`;
 v.innerHTML=html;
 const at=s=>s.split('.').map(Number);
 $('#wName').oninput=e=>{d.name=e.target.value;save();};
 v.querySelectorAll('[data-w]').forEach(el=>el.onchange=()=>{const[i,j]=at(el.dataset.w);d.items[i].sets[j].w=Math.max(0,parseFloat(el.value)||0);
  for(let k=j+1;k<d.items[i].sets.length;k++)if(!d.items[i].sets[k].done)d.items[i].sets[k].w=d.items[i].sets[j].w;save();renderWorkout();});
 v.querySelectorAll('[data-r]').forEach(el=>el.onchange=()=>{const[i,j]=at(el.dataset.r);d.items[i].sets[j].r=Math.max(0,parseInt(el.value)||0);save();});
 v.querySelectorAll('[data-d]').forEach(el=>el.onchange=()=>{const[i,j]=at(el.dataset.d);d.items[i].sets[j].done=el.checked;el.closest('tr').classList.toggle('done',el.checked);save();});
 v.querySelectorAll('[data-ds]').forEach(el=>el.onclick=()=>{const[i,j]=at(el.dataset.ds);d.items[i].sets.splice(j,1);if(!d.items[i].sets.length)d.items.splice(i,1);save();render();});
 v.querySelectorAll('[data-as]').forEach(el=>el.onclick=()=>{const it=d.items[+el.dataset.as],l=it.sets[it.sets.length-1];it.sets.push({w:l?l.w:defaultWeight(byId[it.exId]),r:l?l.r:10,done:false});save();renderWorkout();});
 v.querySelectorAll('[data-rm]').forEach(el=>el.onclick=()=>{d.items.splice(+el.dataset.rm,1);save();render();});
 v.querySelectorAll('[data-up]').forEach(el=>el.onclick=()=>{const i=+el.dataset.up;[d.items[i-1],d.items[i]]=[d.items[i],d.items[i-1]];save();renderWorkout();});
 v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));
 $('#finish').onclick=finishWorkout;
 $('#saveTpl').onclick=()=>{const name=(d.name||'').trim()||prompt('Name für das Workout:','Mein Workout');if(!name)return;
  const items=d.items.map(it=>({exId:it.exId,sets:it.sets.map(s=>({w:s.w,r:s.r}))}));
  const ex=D().templates.find(t=>t.name===name);if(ex){if(!confirm(`„${name}“ überschreiben?`))return;ex.items=items;}else D().templates.push({id:uid(),name,items});
  d.name=name;save();toast('Workout gespeichert');renderWorkout();};
 $('#clear').onclick=()=>{if(!confirm('Workout leeren? Nicht gespeicherte Einträge gehen verloren.'))return;d.items=[];d.name='';save();render();};
 bindTpl();}
function bindTpl(){const v=$('#view-workout'),d=D().draft;
 v.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.load);if(!t)return;
  if(d.items.length&&!confirm('Aktuelles Workout ersetzen?'))return;
  d.name=t.name;d.items=t.items.filter(it=>byId[it.exId]).map(it=>({exId:it.exId,sets:it.sets.map(s=>({w:D().weights[it.exId]??s.w,r:s.r,done:false}))}));save();render();});
 v.querySelectorAll('[data-deltpl]').forEach(b=>b.onclick=()=>{const t=D().templates.find(x=>x.id===b.dataset.deltpl);if(!t||!confirm(`„${t.name}“ löschen?`))return;D().templates=D().templates.filter(x=>x!==t);save();renderWorkout();});}
function finishWorkout(){const d=D().draft;
 const entries=d.items.map(it=>({exId:it.exId,sets:it.sets.filter(s=>s.done||s.r>0).map(s=>({w:+s.w,r:+s.r}))})).filter(e=>e.sets.length);
 if(!entries.length){toast('Keine Sätze eingetragen');return;}
 const undone=d.items.some(it=>it.sets.some(s=>!s.done));
 if(undone&&!confirm('Nicht alle Sätze sind abgehakt. Trotzdem mit den eingetragenen Werten speichern?'))return;
 D().sessions.push({id:uid(),date:new Date().toISOString(),name:d.name||'Training',entries});
 entries.forEach(e=>{if(byId[e.exId]&&byId[e.exId].kbCount){D().weights[e.exId]=Math.max(...e.sets.map(s=>s.w));}});
 d.items.forEach(it=>it.sets.forEach(s=>s.done=false));
 save();toast('Training gespeichert');go('history');}

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
 <div class="card"><h3>Meine Kettlebells</h3><p class="note">Anzahl pro Gewicht. Das Workout zeigt, welche Glocken dir fehlen.</p>
  <div class="inv">${KB_SIZES.map(k=>`<label>${k} kg<input type="number" inputmode="numeric" min="0" max="9" value="${+inv[k]||0}" data-inv="${k}"></label>`).join('')}</div></div>
 <div class="card"><h3>Datensicherung</h3><p class="note">Alle Daten liegen nur auf diesem Gerät im Browser. Sichere sie regelmäßig als Datei. Beim Löschen der Website-Daten in Safari gehen sie sonst verloren.</p>
  <div class="btn-row"><button class="btn sec" id="exp">Exportieren</button><button class="btn sec" id="impBtn">Importieren</button></div><input type="file" id="imp" accept="application/json,.json" hidden></div>
 <button class="btn danger" id="delProf">Profil „${esc(P().name)}“ löschen</button>`;
 v.querySelectorAll('[data-sw]').forEach(b=>b.onclick=()=>{S.active=b.dataset.sw;save();fWeight='Alle';render();toast('Profil gewechselt');});
 $('#npAdd').onclick=()=>{const n=$('#npName').value.trim();if(!n)return;newProfile(n);fWeight='Alle';render();toast('Profil angelegt');};
 $('#rnGo').onclick=()=>{const n=$('#rnName').value.trim();if(!n)return;P().name=n;save();render();};
 v.querySelectorAll('[data-inv]').forEach(el=>el.onchange=()=>{inv[el.dataset.inv]=Math.max(0,parseInt(el.value)||0);save();});
 $('#exp').onclick=()=>{const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='fitness-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
 $('#impBtn').onclick=()=>$('#imp').click();
 $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x.profiles||!x.data)throw 0;
  if(!confirm('Alle aktuellen Daten durch die Sicherung ersetzen?'))return;S=x;if(!P())S.active=S.profiles[0]?.id||null;save();render();toast('Sicherung geladen');}catch(err){toast('Datei ist keine gültige Sicherung');}};
 $('#delProf').onclick=()=>{if(!confirm(`Profil „${P().name}“ mit allen Trainings löschen?`))return;delete S.data[S.active];S.profiles=S.profiles.filter(p=>p.id!==S.active);S.active=S.profiles[0]?.id||null;save();view='exercises';render();};}

// ---------- Detailansicht mit 3D-Modell
let R=null;
function initRenderer(){if(R||!window.THREE)return R;const stage=$('#stage');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));stage.insertBefore(renderer.domElement,$('#phase'));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,50);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6b6b6b,.95));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(2,4,3);scene.add(dl);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.2,48),new THREE.MeshStandardMaterial({color:0x9aa4ad,transparent:true,opacity:.45}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 R={renderer,scene,camera,E:KBEngine(THREE,scene),t:0,play:!matchMedia('(prefers-reduced-motion: reduce)').matches,slow:false,az:.45,cm:null,ex:null,raf:0,last:0};
 const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 new ResizeObserver(resize).observe(stage);R.resize=resize;
 let drag=false,lx=0;stage.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;});
 addEventListener('pointerup',()=>drag=false);addEventListener('pointermove',e=>{if(!drag)return;R.az-=(e.clientX-lx)*.01;lx=e.clientX;cam();});
 $('#pp').onclick=()=>{R.play=!R.play;$('#pp').textContent=R.play?'Pause':'Abspielen';};
 $('#sl').onclick=()=>{R.slow=!R.slow;$('#sl').textContent=R.slow?'Normal':'Zeitlupe';};
 $('#pp').textContent=R.play?'Pause':'Abspielen';return R;}
function cam(){const c=R.cm;R.camera.position.set(c.x+c.R*Math.sin(R.az),c.h,c.R*Math.cos(R.az));R.camera.lookAt(c.x,c.y,0);}
function loop(now){if(!R.ex)return;const dt=Math.min(.05,(now-R.last)/1000);R.last=now;if(R.play)R.t=(R.t+dt/(R.ex.period*(R.slow?2.8:1)))%1;
 const txt=R.E.apply(R.ex,R.t);if($('#phase').textContent!==txt)$('#phase').textContent=txt;R.renderer.render(R.scene,R.camera);R.raf=requestAnimationFrame(loop);}
function openSheet(id){const ex=byId[id];if(!ex)return;const hasAnim=!!ex.keys;
 $('#sheet').hidden=false;document.body.style.overflow='hidden';
 $('#stage').style.display=hasAnim?'':'none';document.querySelector('.stage-controls').style.display=hasAnim?'':'none';
 if(hasAnim&&initRenderer()){R.ex=ex;R.t=0;R.E.setProps(ex);R.cm=Object.assign({x:0,y:.92,R:3.9,h:1.2,az:.45},ex.cam||{});R.az=R.cm.az;cam();R.resize();R.last=performance.now();cancelAnimationFrame(R.raf);R.raf=requestAnimationFrame(loop);}
 else if(hasAnim){$('#phase').textContent='3D-Ansicht konnte nicht geladen werden.';}
 const hist=D().sessions.filter(s=>s.entries.some(e=>e.exId===id)).slice(-5).reverse();
 const inW=D().draft.items.some(i=>i.exId===id),w=D().weights[id];
 $('#sheetBody').innerHTML=`<div class="detail"><p class="grp">${esc(ex.group)}</p><h2 id="sheetTitle">${esc(ex.name)}</h2>
 <dl><dt>Zielmuskeln</dt><dd>${esc(ex.muscles)}</dd><dt>Niveau</dt><dd>${esc(ex.level)}</dd><dt>Ausrüstung</dt><dd>${esc(ex.equip||kbLabel(ex))}</dd><dt>Umfang</dt><dd>${esc(ex.volume)}</dd></dl>
 ${ex.kbCount?`<div class="card"><h3>Mein aktuelles Gewicht</h3><div class="inline"><input class="field" type="number" inputmode="decimal" min="0" step="0.5" id="curW" value="${w??''}" placeholder="noch keins" aria-label="Aktuelles Gewicht in kg"><span>kg${ex.kbCount===2?' je Glocke':''}</span></div><p class="note">Wird nach jedem gespeicherten Training automatisch aktualisiert.</p></div>`:''}
 <button class="btn" id="sheetAdd" ${inW?'disabled':''}>${inW?'Schon im Workout':'Zum Workout hinzufügen'}</button>
 <h3 style="margin-top:18px">Ausführung</h3><ol class="steps">${ex.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
 <div class="mistake"><strong>Typischer Fehler</strong>${esc(ex.mistake)}</div>
 <div class="card"><h3>Letzte Trainings</h3>${hist.length?hist.map(s=>`<div class="hist-ex"><b>${fmtDate(s.date)}</b>${s.entries.filter(e=>e.exId===id).flatMap(e=>e.sets).map(x=>`${x.w} kg × ${x.r}`).join(', ')}</div>`).join(''):'<p class="note">Noch nicht trainiert.</p>'}</div></div>`;
 const cw=$('#curW');if(cw)cw.onchange=()=>{const v=parseFloat(cw.value);if(isNaN(v))delete D().weights[id];else D().weights[id]=Math.max(0,v);save();render();};
 $('#sheetAdd').onclick=()=>{addToWorkout(id);$('#sheetAdd').disabled=true;$('#sheetAdd').textContent='Schon im Workout';render();};
 $('#sheetClose').focus();}
function closeSheet(){$('#sheet').hidden=true;document.body.style.overflow='';if(R){R.ex=null;cancelAnimationFrame(R.raf);}}
$('#sheetClose').onclick=closeSheet;
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden)closeSheet();});

// ---------- Mini-Animationen in der Übungsliste (ein gemeinsamer Renderer, nur sichtbare Zeilen)
let TH=null;
function initThumbs(){if(TH||!window.THREE)return TH;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(1);renderer.setSize(128,128,false);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.1,50);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6b6b6b,.95));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(2,4,3);scene.add(dl);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.2,48),new THREE.MeshStandardMaterial({color:0x9aa4ad,transparent:true,opacity:.45}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const vis=new Set();
 const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?vis.add(e.target):vis.delete(e.target)),{rootMargin:'100px'});
 TH={renderer,scene,camera,E:KBEngine(THREE,scene),vis,io,last:0,still:matchMedia('(prefers-reduced-motion: reduce)').matches};
 requestAnimationFrame(thumbLoop);return TH;}
function observeThumbs(){if(!initThumbs())return;TH.io.disconnect();TH.vis.clear();document.querySelectorAll('#exList canvas.thumb').forEach(c=>{c._drawn=false;TH.io.observe(c);});}
function thumbLoop(now){requestAnimationFrame(thumbLoop);
 if(now-TH.last<50||view!=='exercises'||!$('#sheet').hidden)return;TH.last=now;
 TH.vis.forEach(c=>{const ex=byId[c.dataset.ex];if(!ex||!ex.keys||(TH.still&&c._drawn))return;
  const t=TH.still?.35:(now/1000/ex.period)%1,cm=Object.assign({x:0,y:.92,R:3.9,h:1.2,az:.45},ex.cam||{});
  TH.E.setProps(ex);TH.E.apply(ex,t);
  TH.camera.position.set(cm.x+cm.R*.95*Math.sin(cm.az),cm.h,cm.R*.95*Math.cos(cm.az));TH.camera.lookAt(cm.x,cm.y,0);
  TH.renderer.render(TH.scene,TH.camera);const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(TH.renderer.domElement,0,0,c.width,c.height);c._drawn=true;});}

// ---------- Start
if(S.active&&!P())S.active=S.profiles[0]?.id||null;
render();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
