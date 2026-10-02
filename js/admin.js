// Verwaltung (nur für Admins): Nutzer anzeigen, Daten löschen und Zugang sperren
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// Admin ist, wer ein Dokument admins/{uid} hat. Dieses wird nur in der Firebase-Konsole angelegt (Regeln verbieten das Schreiben aus der App).
const FB_USERS_URL='https://console.firebase.google.com/project/fitness-app-b7e07/authentication/users';
const tsText=t=>{if(!t)return'–';const d=t.toDate?t.toDate():new Date(t);return isNaN(d)?'–':d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
async function renderAdmin(){const v=$('#view-admin');
 if(!IS_ADMIN||!fbDb){v.innerHTML='<p class="empty">Kein Zugriff.</p>';return;}
 v.innerHTML='<p class="empty">Wird geladen …</p>';
 let users=[],blocked=[];
 try{const [u,b]=await Promise.all([fbDb.collection('users').get(),fbDb.collection('blocked').get()]);
  u.forEach(d=>users.push({id:d.id,...d.data()}));b.forEach(d=>blocked.push({id:d.id,...d.data()}));}
 catch(e){v.innerHTML='<p class="empty">Nutzer konnten nicht geladen werden.</p>';return;}
 const nm=u=>u.username||unameOf(u.email)||u.id;
 users.sort((a,b)=>nm(a).localeCompare(nm(b)));
 v.innerHTML=`<p class="note">${users.length} Nutzer mit gespeicherten Daten. Nutzer erscheinen hier nach ihrer ersten Synchronisierung.</p>
 ${users.map(u=>`<div class="card adm-user"><div class="adm-head"><b>${esc(nm(u))}</b>${u.id===CU.uid?'<span class="cur">Du</span>':''}</div>
  <dl><dt>Registriert</dt><dd>${tsText(u.created)}</dd><dt>Zuletzt aktiv</dt><dd>${tsText(u.lastSeen)}</dd><dt>Profile</dt><dd>${u.profiles??'–'}</dd><dt>Trainings</dt><dd>${u.sessions??'–'}</dd></dl>
  ${u.id===CU.uid?'':`<button class="btn danger" data-del="${u.id}" data-mail="${esc(nm(u))}">Nutzer löschen und sperren</button>`}</div>`).join('')}
 <div class="card"><h3>Gesperrte Nutzer</h3>${blocked.length?blocked.map(b=>`<div class="prof"><b>${esc(nm(b))}</b><span class="note">${tsText(b.at)}</span><button class="chip" data-unblock="${b.id}">Entsperren</button></div>`).join(''):'<p class="note">Keine.</p>'}
 <p class="note">Das Login selbst (Benutzername und Passwort) löschst du endgültig in der <a href="${FB_USERS_URL}" target="_blank" rel="noopener">Firebase-Konsole</a>.</p></div>`;
 v.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>adminDelete(b.dataset.del,b.dataset.mail));
 v.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=async()=>{if(!confirm('Sperre aufheben? Der Nutzer kann die App dann wieder verwenden.'))return;
  try{await fbDb.collection('blocked').doc(b.dataset.unblock).delete();toast('Sperre aufgehoben');}catch(e){toast('Das hat nicht geklappt');}renderAdmin();});}
async function adminDelete(uid,mail){
 if(!confirm(`Alle Trainingsdaten von ${mail||uid} unwiderruflich löschen und den Zugang sperren?`))return;
 const ref=fbDb.collection('users').doc(uid);
 try{const ss=await ref.collection('sessions').get(),docs=[ref.collection('meta').doc('state'),ref];ss.forEach(d=>docs.push(d.ref));
  for(let i=0;i<docs.length;i+=400){const b=fbDb.batch();docs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}
  await fbDb.collection('blocked').doc(uid).set({username:mail||'',at:firebase.firestore.FieldValue.serverTimestamp()});
  toast('Nutzer gelöscht und gesperrt');}
 catch(e){toast('Löschen fehlgeschlagen');}
 renderAdmin();}
