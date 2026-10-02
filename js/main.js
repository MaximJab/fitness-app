// Start der App
// Teil der Fitness-App. Alle js/*.js-Dateien teilen sich den globalen Gültigkeitsbereich; Reihenfolge siehe index.html.
// ---------- Start
if(S.active&&!P())S.active=S.profiles[0]?.id||null;
if(typeof cloudInit==='function')cloudInit();else render();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
