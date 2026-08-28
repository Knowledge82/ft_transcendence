// Service worker mínimo — existe ÚNICAMENTE para satisfacer el
// requisito de instalabilidad de Chrome (versiones más antiguas o
// algunas configuraciones no muestran el botón de instalación sin un
// service worker registrado con un manejador de "fetch"). No cachea
// nada ni ofrece soporte offline real: dada la naturaleza del propio
// proyecto (chat en vivo por WebSocket, peticiones en vivo a la IA),
// el soporte offline real no tendría demasiado sentido, como ya se
// decidió conscientemente. Esto es un simple "paso a través": cada
// petición va a la red exactamente igual que si no existiera ningún
// service worker.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
