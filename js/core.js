// Grundlagen: Speicher, Hilfsfunktionen, Navigation, Onboarding
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
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
 S.data[id]={weights:{},inventory:{8:1,12:1,16:1},draft:{name:'',items:[]},templates:[],sessions:[],settings:{sets:3,reps:10}};S.active=id;save();}

// ---------- Hilfen
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),1800);}
const settings=()=>(D().settings||(D().settings={sets:3,reps:10}));
// Vorauswahl: letzte gespeicherte Einheit dieser Übung, sonst Standardwerte aus dem Profil
function lastEntry(exId){const ss=D().sessions;for(let i=ss.length-1;i>=0;i--){const e=ss[i].entries.find(x=>x.exId===exId);if(e&&e.sets.length)return e;}return null;}
function defaultPlan(ex){const last=lastEntry(ex.id),st=settings();
 return last?{sets:last.sets.length,reps:last.sets[0].r}:{sets:st.sets,reps:st.reps};}
function defaultWeight(ex){if(ex.kbCount===0)return 0;const w=D().weights[ex.id];if(w!=null)return w;const le=lastEntry(ex.id);if(le&&le.sets[0].w)return le.sets[0].w;
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
