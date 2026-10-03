// Cloud-Speicher (Firebase): Anmeldung, Laden und Synchronisieren der Daten
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// Die Konfiguration ist öffentlich. Geschützt sind die Daten über die Firestore-Regeln: users/{uid}/** nur für den angemeldeten Nutzer.
const FB_CONFIG={apiKey:'AIzaSyCl_-Q4HPoJddXBtgyCCvw5aPiwoDXqA0g',authDomain:'fitness-app-b7e07.firebaseapp.com',projectId:'fitness-app-b7e07',
 storageBucket:'fitness-app-b7e07.firebasestorage.app',messagingSenderId:'987023877077',appId:'1:987023877077:web:978b98b2fa2267082a135c'};
const LOCAL_ONLY_KEY='fitapp.localOnly';
// Anmeldung per Benutzername: intern als E-Mail-Adresse dieser Domain (es werden keine E-Mails verschickt)
const USER_DOMAIN='user.fitness-app-b7e07.firebaseapp.com';
const UNAME_RE=/^[a-z0-9._-]{3,20}$/;
const unameOf=e=>String(e||'').replace(/@.*$/,'');
const unameToMail=u=>u+'@'+USER_DOMAIN;
let fbAuth=null,fbDb=null,CU=null,pushTimer=0,pushed={},syncState='',IS_ADMIN=false,pendingName='';
// Anzeigename mit Groß-/Kleinschreibung wie bei der Registrierung eingegeben
const uDisplay=()=>(CU&&(CU.displayName||(pendingName&&pendingName.toLowerCase()===unameOf(CU.email)?pendingName:'')))||unameOf(CU&&CU.email);

function cloudInit(){
 if(!window.firebase){render();return;}
 try{firebase.initializeApp(FB_CONFIG);fbAuth=firebase.auth();fbDb=firebase.firestore();
  fbDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(e){render();return;}
 renderLoading();
 fbAuth.onAuthStateChanged(async u=>{CU=u;
  if(!u){if(localStorage.getItem(LOCAL_ONLY_KEY)==='1')render();else renderLogin('login');return;}
  localStorage.removeItem(LOCAL_ONLY_KEY);
  IS_ADMIN=false;
  // Sperre zuerst prüfen (gesperrte Nutzer dürfen ihre übrigen Daten nicht mehr lesen)
  try{const b=await fbDb.collection('blocked').doc(u.uid).get();
   if(b.exists){if(b.data().deleted){await removeDeletedLogin(u);return;}renderBlocked();return;}}catch(e){}
  try{const [a,ud]=await Promise.all([fbDb.collection('admins').doc(u.uid).get(),fbDb.collection('users').doc(u.uid).get()]);
   IS_ADMIN=a.exists;if(ud.exists&&ud.data().mustChangePw){renderChangePw();return;}}catch(e){}
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
 const nSess=Object.values(S.data).reduce((a,d)=>a+(d.sessions||[]).length,0);
 const ops=[b=>b.set(userRef().collection('meta').doc('state'),{profiles:S.profiles,active:S.active,data,updated:firebase.firestore.FieldValue.serverTimestamp()}),
  // Übersichtsdokument für die Verwaltung (E-Mail, Aktivität, Anzahl)
  b=>b.set(userRef(),{email:CU.email||'',username:uDisplay(),created:(CU.metadata&&CU.metadata.creationTime)||'',lastSeen:firebase.firestore.FieldValue.serverTimestamp(),profiles:S.profiles.length,sessions:nSess},{merge:true})];
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
function renderLogin(mode,preUser){const signup=mode==='signup';
 document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML=`<div class="onboard"><h2>${signup?'Neues Konto':'Anmelden'}</h2><p class="note">Mit einem Konto werden deine Trainings in der Cloud gespeichert und sind auf iPhone und Computer gleich.</p>
 <div class="login"><input class="field" id="lgUser" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Benutzername" aria-label="Benutzername" value="${esc(preUser||'')}">
 <input class="field" id="lgPw" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="Passwort (mind. 6 Zeichen)" aria-label="Passwort">
 ${signup?'<input class="field" id="lgPw2" type="password" autocomplete="new-password" placeholder="Passwort wiederholen" aria-label="Passwort wiederholen">':''}
 <p class="login-err" id="lgErr" role="alert"></p>
 ${signup?'<button class="btn" id="lgNew">Konto erstellen</button><button class="btn sec" id="lgMode">Ich habe schon ein Konto</button>'
  :'<button class="btn" id="lgIn">Anmelden</button><button class="btn sec" id="lgMode">Neues Konto erstellen</button>'}
 <p class="note">Benutzername: 3 bis 20 Zeichen, nur Buchstaben, Zahlen, Punkt, Binde- und Unterstrich. Merke dir dein Passwort gut, es lässt sich nicht per E-Mail zurücksetzen.</p>
 <button class="link" id="lgLocal">Ohne Konto nutzen (nur auf diesem Gerät)</button></div></div>`;
 const raw=()=>$('#lgUser').value.trim(),pw=()=>$('#lgPw').value,err=m=>{$('#lgErr').textContent=m;};
 const mail=()=>{const u=raw().toLowerCase();if(!u)throw{code:'auth/missing-email'};if(!UNAME_RE.test(u))throw{code:'auth/invalid-email'};return unameToMail(u);};
 const run=async f=>{err('');document.querySelectorAll('.login button').forEach(b=>b.disabled=true);
  try{await f();}catch(e){err(authMsg(e));}document.querySelectorAll('.login button').forEach(b=>b.disabled=false);};
 $('#lgMode').onclick=()=>renderLogin(signup?'login':'signup',raw());
 $('#lgLocal').onclick=()=>{localStorage.setItem(LOCAL_ONLY_KEY,'1');render();};
 if(signup){
  $('#lgNew').onclick=()=>run(async()=>{const m=mail();if(pw().length<6)throw{code:'auth/weak-password'};if(pw()!==$('#lgPw2').value)throw{code:'pw-mismatch'};
   pendingName=raw();const r=await fbAuth.createUserWithEmailAndPassword(m,pw());
   try{await (r&&r.user?r.user:fbAuth.currentUser).updateProfile({displayName:pendingName});}catch(e){}});
  $('#lgPw2').onkeydown=e=>{if(e.key==='Enter')$('#lgNew').click();};}
 else{
  $('#lgIn').onclick=()=>run(()=>fbAuth.signInWithEmailAndPassword(mail(),pw()));
  $('#lgPw').onkeydown=e=>{if(e.key==='Enter')$('#lgIn').click();};}}
function authMsg(e){return({'auth/invalid-credential':'Benutzername oder Passwort ist falsch.','auth/wrong-password':'Benutzername oder Passwort ist falsch.','auth/user-not-found':'Benutzername oder Passwort ist falsch.',
 'auth/invalid-email':'Der Benutzername darf nur Buchstaben, Zahlen, Punkt, Binde- und Unterstrich enthalten (3 bis 20 Zeichen).','auth/missing-email':'Bitte einen Benutzernamen eingeben.','auth/missing-password':'Bitte ein Passwort eingeben.',
 'auth/email-already-in-use':'Dieser Benutzername ist schon vergeben.','pw-mismatch':'Die Passwörter stimmen nicht überein.','auth/weak-password':'Das Passwort braucht mindestens 6 Zeichen.',
 'auth/network-request-failed':'Keine Internetverbindung.','auth/too-many-requests':'Zu viele Versuche. Bitte später erneut probieren.'})[e&&e.code]||'Das hat nicht geklappt. Bitte erneut versuchen.';}

// Vom Admin gelöschtes Konto: Login beim Anmeldeversuch entfernen
async function removeDeletedLogin(u){try{await fbDb.collection('blocked').doc(u.uid).delete();}catch(e){}
 S={profiles:[],active:null,data:{}};localSave();
 try{await u.delete();}catch(e){await fbAuth.signOut();}
 toast('Dieses Konto wurde vom Administrator gelöscht');}
// Passwort wurde vom Admin zurückgesetzt: eigenes Passwort festlegen
function renderChangePw(){document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML=`<div class="onboard"><h2>Neues Passwort</h2><p class="note">Dein Passwort wurde vom Administrator zurückgesetzt. Lege jetzt ein eigenes Passwort fest.</p>
 <div class="login"><input class="field" id="cpPw" type="password" autocomplete="new-password" placeholder="Neues Passwort (mind. 6 Zeichen)" aria-label="Neues Passwort">
 <input class="field" id="cpPw2" type="password" autocomplete="new-password" placeholder="Passwort wiederholen" aria-label="Passwort wiederholen">
 <p class="login-err" id="cpErr" role="alert"></p><button class="btn" id="cpGo">Passwort speichern</button><button class="btn sec" id="cpOut">Abmelden</button></div></div>`;
 $('#cpOut').onclick=()=>fbAuth.signOut();
 $('#cpGo').onclick=async()=>{const p1=$('#cpPw').value,p2=$('#cpPw2').value,err=m=>$('#cpErr').textContent=m;
  if(p1.length<6)return err('Das Passwort braucht mindestens 6 Zeichen.');if(p1!==p2)return err('Die Passwörter stimmen nicht überein.');
  if(p1===RESET_PW)return err('Bitte ein anderes Passwort als das vorläufige wählen.');
  $('#cpGo').disabled=true;
  try{await CU.updatePassword(p1);await userRef().set({mustChangePw:false},{merge:true});toast('Passwort geändert');
   try{await pullCloud(true);}catch(e){}render();}
  catch(e){$('#cpGo').disabled=false;err(e&&e.code==='auth/requires-recent-login'?'Bitte ab- und mit dem vorläufigen Passwort neu anmelden.':'Das hat nicht geklappt. Bitte erneut versuchen.');}};}
// Gesperrter Zugang
function renderBlocked(){document.querySelector('.tabbar').hidden=true;$('#profilePill').hidden=true;
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-profile');$('#title').textContent='';
 $('#view-profile').innerHTML=`<div class="onboard"><h2>Zugang gesperrt</h2><p class="note">Dieses Konto wurde vom Administrator deaktiviert.</p><button class="btn sec" id="blOut">Abmelden</button></div>`;
 $('#blOut').onclick=async()=>{await fbAuth.signOut();S={profiles:[],active:null,data:{}};localSave();};}
// Karte „Konto“ im Profil
function accountCardHtml(){if(!fbAuth)return'';
 return CU?`<div class="card"><h3>Konto</h3><p class="note">Angemeldet als <b>${esc(uDisplay())}</b></p><p class="note" id="syncState">${syncText()}</p>${IS_ADMIN?'<button class="btn" id="acAdmin">Verwaltung öffnen</button>':''}<button class="btn sec" id="acOut">Abmelden</button></div>
 <div class="card"><h3>Passwort ändern</h3><div class="login"><input class="field" id="pwNew" type="password" autocomplete="new-password" placeholder="Neues Passwort (mind. 6 Zeichen)" aria-label="Neues Passwort">
 <input class="field" id="pwNew2" type="password" autocomplete="new-password" placeholder="Neues Passwort wiederholen" aria-label="Neues Passwort wiederholen">
 <p class="login-err" id="pwErr" role="alert"></p><button class="btn sec" id="pwGo">Passwort ändern</button></div></div>`
 :`<div class="card"><h3>Konto</h3><p class="note">Deine Daten liegen nur auf diesem Gerät.</p><button class="btn" id="acIn">Anmelden und in der Cloud speichern</button></div>`;}
function bindAccountCard(){const o=$('#acOut'),i=$('#acIn'),ad=$('#acAdmin');
 if(ad)ad.onclick=()=>go('admin');
 const pg=$('#pwGo');if(pg)pg.onclick=async()=>{const p1=$('#pwNew').value,p2=$('#pwNew2').value,err=m=>$('#pwErr').textContent=m;err('');
  if(p1.length<6)return err('Das Passwort braucht mindestens 6 Zeichen.');if(p1!==p2)return err('Die Passwörter stimmen nicht überein.');
  pg.disabled=true;
  try{try{await CU.updatePassword(p1);}catch(e){
    // Firebase verlangt bei länger zurückliegender Anmeldung das bisherige Passwort
    if(!(e&&e.code==='auth/requires-recent-login'))throw e;const old=prompt('Zur Sicherheit bitte dein bisheriges Passwort eingeben:');if(!old)throw{code:'cancel'};
    await CU.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(CU.email,old));await CU.updatePassword(p1);}
   $('#pwNew').value='';$('#pwNew2').value='';toast('Passwort geändert');}
  catch(e){if(!(e&&e.code==='cancel'))err(e&&(e.code==='auth/invalid-credential'||e.code==='auth/wrong-password')?'Bisheriges Passwort ist falsch.':e&&e.code==='auth/weak-password'?'Das Passwort braucht mindestens 6 Zeichen.':'Das hat nicht geklappt. Bitte erneut versuchen.');}
  pg.disabled=false;};
 if(i)i.onclick=()=>{localStorage.removeItem(LOCAL_ONLY_KEY);renderLogin('login');};
 if(o)o.onclick=async()=>{if(!confirm('Abmelden? Deine Daten bleiben in der Cloud gespeichert und werden von diesem Gerät entfernt.'))return;
  if(pushTimer){clearTimeout(pushTimer);await pushCloud();}
  try{await Promise.race([fbDb.waitForPendingWrites(),new Promise(r=>setTimeout(r,4000))]);}catch(e){}
  await fbAuth.signOut();IS_ADMIN=false;S={profiles:[],active:null,data:{}};pushed={};localSave();view='exercises';};}
// Eigenes Konto löschen: erst alle Daten in Firestore, dann das Login. Danach erscheint die Anmeldeseite.
async function deleteAccount(){if(!CU)return;
 if(!confirm(`Konto „${uDisplay()}“ endgültig löschen?\n\nAlle Profile, Trainings und gespeicherten Workouts werden gelöscht. Das lässt sich nicht rückgängig machen.`))return;
 clearTimeout(pushTimer);pushTimer=0;
 const delAuth=async()=>{try{await CU.delete();}catch(e){
   if(e&&e.code==='auth/requires-recent-login'){const pw=prompt('Zur Sicherheit bitte dein Passwort eingeben:');if(!pw)throw{code:'cancel'};
    await CU.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(CU.email,pw));await CU.delete();}
   else throw e;}};
 try{const ref=userRef(),ss=await ref.collection('sessions').get(),docs=[ref.collection('meta').doc('state'),ref];ss.forEach(d=>docs.push(d.ref));
  for(let i=0;i<docs.length;i+=400){const b=fbDb.batch();docs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}
  pushed={};S={profiles:[],active:null,data:{}};localSave();view='exercises';
  await delAuth();IS_ADMIN=false;toast('Konto gelöscht');}
 catch(e){if(e&&e.code==='cancel')return;toast(e&&e.code==='auth/invalid-credential'?'Passwort falsch, Konto nicht gelöscht':'Löschen fehlgeschlagen');}}
