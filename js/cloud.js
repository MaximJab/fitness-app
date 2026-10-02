// Cloud-Speicher (Firebase): Anmeldung, Laden und Synchronisieren der Daten
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// Die Konfiguration ist öffentlich. Geschützt sind die Daten über die Firestore-Regeln: users/{uid}/** nur für den angemeldeten Nutzer.
const FB_CONFIG={apiKey:'AIzaSyCl_-Q4HPoJddXBtgyCCvw5aPiwoDXqA0g',authDomain:'fitness-app-b7e07.firebaseapp.com',projectId:'fitness-app-b7e07',
 storageBucket:'fitness-app-b7e07.firebasestorage.app',messagingSenderId:'987023877077',appId:'1:987023877077:web:978b98b2fa2267082a135c'};
const LOCAL_ONLY_KEY='fitapp.localOnly';
let fbAuth=null,fbDb=null,CU=null,pushTimer=0,pushed={},syncState='';

function cloudInit(){
 if(!window.firebase){render();return;}
 try{firebase.initializeApp(FB_CONFIG);fbAuth=firebase.auth();fbDb=firebase.firestore();
  fbDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(e){render();return;}
 renderLoading();
 fbAuth.onAuthStateChanged(async u=>{CU=u;
  if(!u){if(localStorage.getItem(LOCAL_ONLY_KEY)==='1')render();else renderLogin();return;}
  localStorage.removeItem(LOCAL_ONLY_KEY);
  try{await pullCloud(true);}catch(e){toast('Cloud nicht erreichbar, lokale Daten werden genutzt');}
  render();});
 document.addEventListener('visibilitychange',async()=>{if(document.hidden||!CU||pushTimer||S.dirty)return;
  const before=JSON.stringify(S);try{await pullCloud(false);}catch(e){return;}if(JSON.stringify(S)!==before&&$('#sheet').hidden&&$('#startSheet').hidden)render();});}

const userRef=()=>fbDb.collection('users').doc(CU.uid);
// Cloud-Stand laden: Metadaten (Profile, Workouts, Einstellungen) + Trainings als Einzeldokumente
async function readCloud(){const [meta,ss]=await Promise.all([userRef().collection('meta').doc('state').get(),userRef().collection('sessions').get()]);
 if(!meta.exists)return null;const m=meta.data(),c={profiles:m.profiles||[],active:m.active||null,data:{}};
 Object.entries(m.data||{}).forEach(([pid,d])=>c.data[pid]={...d,sessions:[]});
 ss.forEach(doc=>{const {pid,...s}=doc.data();if(c.data[pid])c.data[pid].sessions.push(s);});
 Object.values(c.data).forEach(d=>d.sessions.sort((a,b)=>String(a.date).localeCompare(String(b.date))));
 return c;}
function rememberPushed(){pushed={};Object.entries(S.data).forEach(([pid,d])=>(d.sessions||[]).forEach(s=>pushed[s.id]=pid+JSON.stringify(s)));}
async function pullCloud(initial){const c=await readCloud(),uid=CU.uid;
 if(initial&&S.owner!==uid){
  const localHas=S.profiles.length>0;
  if(!c){S={...S,owner:uid};pushed={};}
  else if(localHas&&confirm('Auf diesem Gerät gibt es Daten, die noch nicht in deinem Konto sind. Mit deinem Konto zusammenführen?\n\nAbbrechen: nur die Daten aus dem Konto verwenden.')){S=mergeData(c,S);S.owner=uid;pushed={};}
  else{S={...c,owner:uid};rememberPushed();}
  localSave();cloudQueue(true);return;}
 if(S.dirty){cloudQueue(true);return;}
 if(c){S={...c,owner:uid};rememberPushed();localSave();}}
// Zusammenführen: Profile, Trainings und gespeicherte Workouts werden über ihre IDs vereinigt
function mergeData(a,b){const r={profiles:[...a.profiles],active:a.active||b.active,data:{...a.data}};
 b.profiles.forEach(p=>{if(!r.profiles.some(x=>x.id===p.id))r.profiles.push(p);});
 Object.entries(b.data).forEach(([pid,d])=>{const x=r.data[pid];if(!x){r.data[pid]=d;return;}
  const u=(k)=>{const m=new Map((x[k]||[]).map(i=>[i.id,i]));(d[k]||[]).forEach(i=>{if(!m.has(i.id))m.set(i.id,i);});return[...m.values()];};
  r.data[pid]={...x,sessions:u('sessions').sort((p,q)=>String(p.date).localeCompare(String(q.date))),templates:u('templates'),weights:{...d.weights,...x.weights}};});
 return r;}
function localSave(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

// Änderungen gesammelt (nach kurzer Pause) in die Cloud schreiben
function cloudQueue(now){if(!CU||!fbDb)return;S.dirty=true;localSave();clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,now?0:800);setSync('pending');}
async function pushCloud(){pushTimer=0;if(!CU)return;const uid=CU.uid;
 const data={};Object.entries(S.data).forEach(([pid,d])=>{const {sessions,...rest}=d;data[pid]=JSON.parse(JSON.stringify(rest));});
 const ops=[b=>b.set(userRef().collection('meta').doc('state'),{profiles:S.profiles,active:S.active,data,updated:firebase.firestore.FieldValue.serverTimestamp()})];
 const now={};Object.entries(S.data).forEach(([pid,d])=>(d.sessions||[]).forEach(s=>{const h=pid+JSON.stringify(s);now[s.id]=h;
  if(pushed[s.id]!==h)ops.push(b=>b.set(userRef().collection('sessions').doc(s.id),{pid,...JSON.parse(JSON.stringify(s))}));}));
 Object.keys(pushed).forEach(id=>{if(!now[id])ops.push(b=>b.delete(userRef().collection('sessions').doc(id)));});
 try{for(let i=0;i<ops.length;i+=400){const b=fbDb.batch();ops.slice(i,i+400).forEach(f=>f(b));const p=b.commit();
   if(!navigator.onLine)setSync('offline');await p;}
  if(!CU||CU.uid!==uid)return;pushed=now;if(!pushTimer){S.dirty=false;localSave();setSync('ok');}}
 catch(e){setSync('error');}}
function setSync(s){syncState=s;const el=$('#syncState');if(el)el.textContent=syncText();}
const syncText=()=>({pending:'Wird synchronisiert …',offline:'Offline, wird später übertragen',ok:'In der Cloud gespeichert',error:'Synchronisierung fehlgeschlagen, wird erneut versucht'})[syncState]||'In der Cloud gespeichert';
addEventListener('online',()=>{if(CU&&S.dirty)cloudQueue(true);});

// ---------- Anmeldung
function renderLoading(){document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML='<p class="empty">Wird geladen …</p>';}
function renderLogin(){document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML=`<div class="onboard"><h2>Anmelden</h2><p class="note">Mit einem Konto werden deine Trainings in der Cloud gespeichert und sind auf iPhone und Computer gleich.</p>
 <div class="login"><input class="field" id="lgMail" type="email" autocomplete="email" placeholder="E-Mail-Adresse" aria-label="E-Mail-Adresse">
 <input class="field" id="lgPw" type="password" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)" aria-label="Passwort">
 <p class="login-err" id="lgErr" role="alert"></p>
 <button class="btn" id="lgIn">Anmelden</button><button class="btn sec" id="lgNew">Neues Konto erstellen</button>
 <button class="link" id="lgReset">Passwort vergessen?</button><button class="link" id="lgLocal">Ohne Konto nutzen (nur auf diesem Gerät)</button></div></div>`;
 const mail=()=>$('#lgMail').value.trim(),pw=()=>$('#lgPw').value,err=m=>{$('#lgErr').textContent=m;};
 const run=async f=>{err('');document.querySelectorAll('.login button').forEach(b=>b.disabled=true);
  try{await f();}catch(e){err(authMsg(e));}document.querySelectorAll('.login button').forEach(b=>b.disabled=false);};
 $('#lgIn').onclick=()=>run(()=>fbAuth.signInWithEmailAndPassword(mail(),pw()));
 $('#lgPw').onkeydown=e=>{if(e.key==='Enter')$('#lgIn').click();};
 $('#lgNew').onclick=()=>run(()=>fbAuth.createUserWithEmailAndPassword(mail(),pw()));
 $('#lgReset').onclick=()=>run(async()=>{if(!mail())throw{code:'auth/missing-email'};await fbAuth.sendPasswordResetEmail(mail());err('Wir haben dir eine E-Mail zum Zurücksetzen geschickt.');});
 $('#lgLocal').onclick=()=>{localStorage.setItem(LOCAL_ONLY_KEY,'1');render();};}
function authMsg(e){return({'auth/invalid-credential':'E-Mail oder Passwort ist falsch.','auth/wrong-password':'E-Mail oder Passwort ist falsch.','auth/user-not-found':'E-Mail oder Passwort ist falsch.',
 'auth/invalid-email':'Bitte eine gültige E-Mail-Adresse eingeben.','auth/missing-email':'Bitte zuerst die E-Mail-Adresse eingeben.','auth/missing-password':'Bitte ein Passwort eingeben.',
 'auth/email-already-in-use':'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.','auth/weak-password':'Das Passwort braucht mindestens 6 Zeichen.',
 'auth/network-request-failed':'Keine Internetverbindung.','auth/too-many-requests':'Zu viele Versuche. Bitte später erneut probieren.'})[e&&e.code]||'Das hat nicht geklappt. Bitte erneut versuchen.';}

// Karte „Konto“ im Profil
function accountCardHtml(){if(!fbAuth)return'';
 return CU?`<div class="card"><h3>Konto</h3><p class="note">Angemeldet als <b>${esc(CU.email)}</b></p><p class="note" id="syncState">${syncText()}</p><button class="btn sec" id="acOut">Abmelden</button></div>`
 :`<div class="card"><h3>Konto</h3><p class="note">Deine Daten liegen nur auf diesem Gerät.</p><button class="btn" id="acIn">Anmelden und in der Cloud speichern</button></div>`;}
function bindAccountCard(){const o=$('#acOut'),i=$('#acIn');
 if(i)i.onclick=()=>{localStorage.removeItem(LOCAL_ONLY_KEY);renderLogin();};
 if(o)o.onclick=async()=>{if(!confirm('Abmelden? Deine Daten bleiben in der Cloud gespeichert und werden von diesem Gerät entfernt.'))return;
  if(pushTimer){clearTimeout(pushTimer);await pushCloud();}
  try{await Promise.race([fbDb.waitForPendingWrites(),new Promise(r=>setTimeout(r,4000))]);}catch(e){}
  await fbAuth.signOut();S={profiles:[],active:null,data:{}};pushed={};localSave();view='exercises';};}
