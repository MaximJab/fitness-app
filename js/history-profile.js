// Reiter „Verlauf“ und „Profil“
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// ---------- Verlauf
function renderHistory(){const ss=[...D().sessions].reverse(),v=$('#view-history');
 if(!ss.length){v.innerHTML='<p class="empty">Noch kein Training gespeichert.</p>';return;}
 // Pro Übung: Gewicht, Anzahl Sätze und Wiederholungen
 const exLine=e=>{const ex=byId[e.exId],rs=[...new Set(e.sets.map(x=>x.r))],w=e.sets[0]?.w;
  return`${ex&&ex.kbCount&&w?`${w} kg${ex.kbCount===2?' × 2':''}, `:''}${e.sets.length} ${e.sets.length===1?'Satz':'Sätze'} × ${rs.join('/')} Wdh.`;};
 v.innerHTML=ss.map(s=>`<details class="card hist-item"><summary><h3>${esc(s.name)}</h3><div class="meta">${fmtDate(s.date)}, ${s.entries.length} Übungen</div></summary>
  ${s.entries.map(e=>`<div class="hist-ex"><b>${esc(byId[e.exId]?.name||e.exId)}</b>${exLine(e)}</div>`).join('')}
  <div class="btn-row"><button class="btn" data-repeat="${s.id}">Training wiederholen</button><button class="btn danger" data-delsess="${s.id}">Löschen</button></div></details>`).join('');
 v.querySelectorAll('[data-delsess]').forEach(b=>b.onclick=()=>{if(!confirm('Dieses Training löschen?'))return;D().sessions=D().sessions.filter(x=>x.id!==b.dataset.delsess);save();renderHistory();});
 v.querySelectorAll('[data-repeat]').forEach(b=>b.onclick=()=>repeatSession(b.dataset.repeat));}
// Training wiederholen: gleiche Übungen, aber mit den aktuellen Werten (letztes Training bzw. aktuelles Gewicht)
function repeatSession(id){const s=D().sessions.find(x=>x.id===id),d=D().draft;if(!s)return;
 if(d.items.length&&!confirm('Die aktuelle Auswahl im Workout wird ersetzt. Fortfahren?'))return;
 d.items=s.entries.filter(e=>byId[e.exId]).map(e=>{const ex=byId[e.exId],pl=defaultPlan(ex);return{exId:e.exId,sets:pl.sets,reps:pl.reps,w:ex.kbCount?defaultWeight(ex):0};});
 d.name=s.name||'';save();toast('Training übernommen');go('workout');}

// ---------- Profil
function renderProfile(){const v=$('#view-profile');
 v.innerHTML=`${typeof accountCardHtml==='function'?accountCardHtml():''}
 <div class="card"><h3>Standardwerte für neue Übungen</h3><p class="note">Gilt, wenn eine Übung noch nie trainiert wurde. Sonst werden Sätze, Wiederholungen und Gewicht vom letzten Training übernommen.</p>
  <div class="inv"><label>Sätze<input type="number" inputmode="numeric" min="1" max="20" value="${settings().sets}" data-set="sets"></label><label>Wiederholungen<input type="number" inputmode="numeric" min="1" max="100" value="${settings().reps}" data-set="reps"></label></div></div>
 <div class="card"><h3>Datensicherung</h3><p class="note">${typeof CU!=='undefined'&&CU?'Deine Daten liegen in der Cloud. Zusätzlich kannst du sie als Datei sichern.':'Ohne Konto liegen die Daten nur auf diesem Gerät. Sichere sie regelmäßig als Datei.'}</p>
  <div class="btn-row"><button class="btn sec" id="exp">Exportieren</button><button class="btn sec" id="impBtn">Importieren</button></div><input type="file" id="imp" accept="application/json,.json" hidden></div>
 ${typeof CU!=='undefined'&&CU?'<button class="btn danger" id="delAcc">Konto löschen</button>':''}`;
 v.querySelectorAll('[data-set]').forEach(el=>el.onchange=()=>{const v2=Math.max(1,parseInt(el.value)||1);settings()[el.dataset.set]=v2;el.value=v2;save();});
 $('#exp').onclick=()=>{const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='fitness-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
 $('#impBtn').onclick=()=>$('#imp').click();
 $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x.profiles||!x.data)throw 0;
  if(!confirm('Alle aktuellen Daten durch die Sicherung ersetzen?'))return;S=x;if(!P())S.active=S.profiles[0]?.id||null;save();render();toast('Sicherung geladen');}catch(err){toast('Datei ist keine gültige Sicherung');}};
 if(typeof bindAccountCard==='function')bindAccountCard();
 if($('#delAcc'))$('#delAcc').onclick=()=>deleteAccount();}
