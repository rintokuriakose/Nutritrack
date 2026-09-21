const CACHE='nutritrack-v9-glass-compact';
const ASSETS=['./','./index.html','./styles.css','./glass-ui.css','./app.js','./online-food-search.js','./weight-plan.js','./tracking-upgrade.js','./glass-ui.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
    if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return resp;
  }).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):undefined)));
});
