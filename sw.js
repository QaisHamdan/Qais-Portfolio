/* Offline cache.
   - Core files + project images + certificate thumbnails are pre-cached on install.
   - Everything else (full certificate images, PDFs, fonts, icons) is cached the first time it is used.
   - Static files: cache first, refreshed in the background. Pages: network first, cache as the offline fallback.
   Bump CACHE whenever you publish a new version so visitors get the update. */
const CACHE = "qh-portfolio-v4";
const CORE = [
  "./", "index.html", "style.css", "script.js", "i18n.js", "manifest.json", "404.html",
  "assets/qh.jpeg", "assets/favicon.svg", "assets/icon-192.png", "assets/icon-512.png", "og-image.png",
  "assets/projects/OnlineCoursePlatform.png", "assets/projects/PosPharmacy.png", "assets/projects/alternative.png",
  "assets/projects/atm-banking.svg", "assets/projects/templates.svg", "assets/projects/js-apps.svg",
  "assets/certs/orange-training-thumb.jpg", "assets/certs/html-thumb.jpg", "assets/certs/css-thumb.jpg", "assets/certs/bootstrap-thumb.jpg",
  "assets/certs/js-101-thumb.jpg", "assets/certs/js-102-thumb.jpg", "assets/certs/js-103-thumb.jpg",
  "assets/certs/csharp-101-thumb.jpg", "assets/certs/csharp-102-thumb.jpg",
  "assets/certs/sql-101-thumb.jpg", "assets/certs/sql-102-thumb.jpg", "assets/certs/sql-103-thumb.jpg",
  "assets/certs/aspnet-101-thumb.jpg", "assets/certs/aspnet-102-thumb.jpg"
];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//;

self.addEventListener("install", (e) => {
  /* one missing file must not break the whole install */
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CDN.test(req.url)) return; /* never touch the contact form or other APIs */

  /* page loads: network first so a new version shows up, cached copy when offline */
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html") || caches.match("./"))));
    return;
  }
  /* everything else: cache first, refresh in the background */
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
