const ADMIN_CACHE="moriah-admin-shell-v1";

self.addEventListener("install",event=>{
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("moriah-admin-")&&key!==ADMIN_CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  // Nunca armazenar HTML administrativo, APIs ou dados autenticados.
  if(url.pathname.startsWith("/admin")||url.pathname.startsWith("/api"))return;

  if(url.pathname.startsWith("/_next/static/")||url.pathname==="/icon.svg"){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
      if(response.ok)caches.open(ADMIN_CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    })));
  }
});

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{}
  const notification=data.notification||{};
  const payload=data.data||{};
  const target=String(payload.url||notification.click_action||"/admin");
  const safeUrl=target.startsWith("/admin")?target:"/admin";

  event.waitUntil(self.registration.showNotification(
    notification.title||"Moriah Admin",
    {
      body:notification.body||"Há uma nova atualização operacional.",
      icon:"/icon.svg",
      badge:"/icon.svg",
      tag:payload.tag||undefined,
      data:{url:safeUrl}
    }
  ));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=event.notification.data?.url||"/admin";
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus" in client){
        if("navigate" in client)await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
