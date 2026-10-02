// Verwaltung (nur für Admins): Nutzer sperren, entsperren, löschen, Passwort zurücksetzen
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// Admin ist, wer ein Dokument admins/{uid} hat. Dieses wird nur in der Firebase-Konsole angelegt (Regeln verbieten das Schreiben aus der App).
// Passwort-Resets erledigt der GitHub-Action-Worker (tools/admin-worker), weil das nur mit Admin-Rechten auf dem Server geht.
const FB_USERS_URL='https://console.firebase.google.com/project/fitness-app-b7e07/authentication/users';
const RESET_PW='Training123';
const tsText=t=>{if(!t)return'–';const d=t.toDate?t.toDate():new Date(t);return isNaN(d)?'–':d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
async function renderAdmin(){const v=$('#view-admin');
 if(!IS_ADMIN||!fbDb){v.innerHTML='<p class="empty">Kein Zugriff.</p>';return;}
 v.innerHTML='<p class="empty">Wird geladen …</p>';
 let users=[],blocked={},reqs={};
 try{const [u,b,r]=await Promise.all([fbDb.collection('users').get(),fbDb.collection('blocked').get(),fbDb.collection('adminRequests').where('status','==','pending').get()]);
  u.forEach(d=>users.push({id:d.id,...d.data()}));b.forEach(d=>blocked[d.id]={id:d.id,...d.data()});r.forEach(d=>{const x=d.data();reqs[x.uid+':'+x.type]=true;});}
 catch(e){v.innerHTML='<p class="empty">Nutzer konnten nicht geladen werden.</p>';return;}
 const nm=u=>u.username||unameOf(u.email)||u.id;
 users.sort((a,b)=>nm(a).localeCompare(nm(b)));
 const deleted=Object.values(blocked).filter(b=>b.deleted);
 v.innerHTML=`<p class="note">${users.length} Nutzer. Nutzer erscheinen hier nach ihrer ersten Synchronisierung.</p>
 ${users.map(u=>{const bl=blocked[u.id]&&!blocked[u.id].deleted,me=u.id===CU.uid,rs=reqs[u.id+':resetPassword'];
  return`<div class="card adm-user"><div class="adm-head"><b>${esc(nm(u))}</b><span>${me?'<span class="cur">Du</span>':''}${bl?'<span class="tag warn">Gesperrt</span>':''}${rs?'<span class="tag">Passwort-Reset läuft</span>':''}${u.mustChangePw&&!rs?'<span class="tag">Muss Passwort ändern</span>':''}</span></div>
  <dl><dt>Registriert</dt><dd>${tsText(u.created)}</dd><dt>Zuletzt aktiv</dt><dd>${tsText(u.lastSeen)}</dd><dt>Trainings</dt><dd>${u.sessions??'–'}</dd></dl>
  ${me?'':`<div class="adm-actions">${bl?`<button class="btn sec" data-unblock="${u.id}">Entsperren</button>`:`<button class="btn sec" data-block="${u.id}" data-name="${esc(nm(u))}">Sperren</button>`}
   <button class="btn sec" data-reset="${u.id}" data-name="${esc(nm(u))}"${rs?' disabled':''}>Passwort zurücksetzen</button>
   <button class="btn danger" data-del="${u.id}" data-name="${esc(nm(u))}">Löschen inkl. aller Daten</button></div>`}</div>`;}).join('')}
 ${deleted.length?`<div class="card"><h3>Gelöschte Konten</h3>${deleted.map(b=>`<div class="prof"><b>${esc(nm(b))}</b><span class="note">${tsText(b.at)}</span></div>`).join('')}
  <p class="note">Die Daten sind gelöscht. Das Login wird automatisch entfernt, sobald der Nutzer sich noch einmal anmelden will oder der Admin-Worker läuft. Sofort geht es in der <a href="${FB_USERS_URL}" target="_blank" rel="noopener">Firebase-Konsole</a>.</p></div>`:''}
 <p class="note">Passwort-Resets setzt der Admin-Worker auf „${RESET_PW}“, er läuft etwa alle 5 Minuten. Beim nächsten Anmelden muss der Nutzer ein eigenes Passwort festlegen.</p>`;
 v.querySelectorAll('[data-block]').forEach(b=>b.onclick=()=>adminAct(async()=>{if(!confirm(`${b.dataset.name} sperren? Die Daten bleiben erhalten.`))return false;
  await fbDb.collection('blocked').doc(b.dataset.block).set({username:b.dataset.name,deleted:false,at:firebase.firestore.FieldValue.serverTimestamp()});return'Nutzer gesperrt';}));
 v.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>adminAct(async()=>{if(!confirm('Sperre aufheben?'))return false;
  await fbDb.collection('blocked').doc(b.dataset.unblock).delete();return'Sperre aufgehoben';}));
 v.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>adminAct(async()=>{if(!confirm(`Passwort von ${b.dataset.name} auf „${RESET_PW}“ zurücksetzen?`))return false;
  await fbDb.collection('adminRequests').add({type:'resetPassword',uid:b.dataset.reset,username:b.dataset.name,status:'pending',by:CU.uid,at:firebase.firestore.FieldValue.serverTimestamp()});return'Reset beauftragt';}));
 v.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>adminAct(()=>adminDelete(b.dataset.del,b.dataset.name)));}
async function adminAct(f){try{const m=await f();if(m===false)return;if(m)toast(m);}catch(e){toast('Das hat nicht geklappt');}renderAdmin();}
async function adminDelete(uid,name){
 if(!confirm(`${name} mit allen Trainingsdaten unwiderruflich löschen?`))return false;
 const ref=fbDb.collection('users').doc(uid),ss=await ref.collection('sessions').get(),docs=[ref.collection('meta').doc('state'),ref];ss.forEach(d=>docs.push(d.ref));
 for(let i=0;i<docs.length;i+=400){const b=fbDb.batch();docs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}
 // Markierung „gelöscht“: sperrt sofort; das Login entfernt der Worker oder die App beim nächsten Anmeldeversuch
 await fbDb.collection('blocked').doc(uid).set({username:name,deleted:true,at:firebase.firestore.FieldValue.serverTimestamp()});
 await fbDb.collection('adminRequests').add({type:'deleteUser',uid,username:name,status:'pending',by:CU.uid,at:firebase.firestore.FieldValue.serverTimestamp()});
 return'Nutzer gelöscht';}
