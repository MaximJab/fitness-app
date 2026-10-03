// Offline-Cache. Bei jeder Änderung an App-Dateien VERSION erhöhen.
const VERSION='v18';
const CACHE='fitapp-'+VERSION;
const FILES=['./','index.html','app.css','workout.css','engine.js','exercises.js','js/core.js','js/exercises-view.js','js/workout.js','js/saved.js','js/history-profile.js','js/cloud.js','js/admin.js','js/detail.js','js/main.js','manifest.webmanifest','icon.svg',
 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// Netzwerk zuerst (damit Updates sofort ankommen), bei Offline aus dem Cache.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));});
