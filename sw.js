const CACHE='adc-ascent-static-v8';
const ASSETS=['./','./index.html','./styles.css','./data.js','./app.js','./teamfights.js','./capture-ui.js','./mechanics-ui.js','./metric-engine.js','./metric-scoring.js','./scoring-ui.js','./match-intelligence.js','./analytics-core.js','./analytics-ui.js','./analytics.css','./profile-search-ui.js','./intelligence-ui.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
