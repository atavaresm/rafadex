importScripts("precache.js");
const VERSION = "20260811164153";
const SHELL = `rafadex-shell-${VERSION}`;
const RUNTIME = "rafadex-runtime";
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "data/dex.js", "data/type-icons.js", "manifest.json", "assets/fonts/baloo2.woff2",
  "assets/fonts/quicksand.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
const SHELL_OPTIONAL = ["assets/icons/icon-180.png", "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_CORE);
    await Promise.all(SHELL_OPTIONAL.map(url => shell.add(url).catch(() => {})));
    const runtime = await caches.open(RUNTIME);
    await Promise.all(RAFADEX_PRECACHE.map(async url => {
      if (!(await runtime.match(url))) await runtime.add(url).catch(() => {});
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys())
      if (key.startsWith("rafadex-shell-") && key !== SHELL) await caches.delete(key);
    // Migration: reclaims cry audio cached before v1.7. Safe to delete once
    // every install has updated past v1.7.
    const runtime = await caches.open(RUNTIME);
    for (const request of await runtime.keys())
      if (request.url.includes("/assets/cries/")) await runtime.delete(request);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = event.request.url;
  if (!url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const hit = await caches.match(event.request);
    if (hit) return hit;
    try {
      const response = await fetch(event.request);
      if (response.ok && url.includes("/assets/")) {
        const runtime = await caches.open(RUNTIME);
        runtime.put(event.request, response.clone());
      }
      return response;
    } catch (err) {
      return new Response("", { status: 504 });
    }
  })());
});
