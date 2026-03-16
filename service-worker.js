/**
 * service-worker.js
 * PWA offline caching — Section 8.0
 */

const CACHE_NAME = "radmonitor-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/assets/css/style.css",
  "/assets/js/status.js",
  "/assets/js/radnet.js",
  "/assets/js/map.js",
  "/assets/js/app.js",
  "/data/fallback-stations.json",
  "/manifest.json",
  "/pages/about.html",
  "/pages/faq.html",
  "/pages/support.html",
  "/pages/radiation-basics.html",
  "/pages/emergency-preparedness.html",
  "/pages/methodology.html",
  "/pages/privacy.html",
  "/pages/terms.html",
  "/pages/contact.html",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;700&display=swap",
];

// Install — cache app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for shell, network-first for EPA data
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // EPA RadNet data — network first, no cache
  if (url.hostname.includes("radnet.epa.gov")) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  // Everything else — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
