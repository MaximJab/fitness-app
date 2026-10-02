// Detailansicht mit 3D-Modell und Mini-Animationen
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
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
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('#sheet').hidden)closeSheet();else if(!$('#startSheet').hidden)closeStart();});

// ---------- Mini-Animationen in Übungsliste, Workout und Start-Übersicht (ein gemeinsamer Renderer, nur sichtbare Zeilen)
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
function observeThumbs(){if(!initThumbs())return;TH.io.disconnect();TH.vis.clear();document.querySelectorAll('main canvas.thumb, #startBody canvas.thumb').forEach(c=>{c._drawn=false;TH.io.observe(c);});}
function drawStill(c,ex){if(!ex||!ex.keys)return;const cm=Object.assign({x:0,y:.92,R:3.9,h:1.2,az:.45},ex.cam||{});
 TH.E.setProps(ex);TH.E.apply(ex,.4);TH.camera.position.set(cm.x+cm.R*.95*Math.sin(cm.az),cm.h,cm.R*.95*Math.cos(cm.az));TH.camera.lookAt(cm.x,cm.y,0);
 TH.renderer.render(TH.scene,TH.camera);const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(TH.renderer.domElement,0,0,c.width,c.height);}
function thumbLoop(now){requestAnimationFrame(thumbLoop);
 // Bei offener Start-Übersicht nur deren Bilder animieren, sonst die der Liste bzw. des Workouts
 const inStart=!$('#startSheet').hidden;
 if(now-TH.last<50||!$('#sheet').hidden||(!inStart&&view!=='exercises'&&view!=='workout'))return;TH.last=now;
 TH.vis.forEach(c=>{const ex=byId[c.dataset.ex];if(!ex||!ex.keys||(TH.still&&c._drawn)||inStart!==!!c.closest('#startBody'))return;
  const t=TH.still?.35:(now/1000/ex.period)%1,cm=Object.assign({x:0,y:.92,R:3.9,h:1.2,az:.45},ex.cam||{});
  TH.E.setProps(ex);TH.E.apply(ex,t);
  TH.camera.position.set(cm.x+cm.R*.95*Math.sin(cm.az),cm.h,cm.R*.95*Math.cos(cm.az));TH.camera.lookAt(cm.x,cm.y,0);
  TH.renderer.render(TH.scene,TH.camera);const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(TH.renderer.domElement,0,0,c.width,c.height);c._drawn=true;});}
