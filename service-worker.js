/* =========================================================
   EDUBOOK LMS — SERVICE WORKER  (offline-first, cache-then-network)

   Strategy:
   • App shell files   → Cache-First  (instant load, works offline)
   • Supabase API/WS   → Network-Only (no point caching live data)
   • Everything else   → Network-First with cache fallback

   The service worker is registered by index.html on first page load.
   After that it keeps running in the background — even when the tab
   is closed — so the app loads instantly and fully offline on the
   next visit.
========================================================= */

const CACHE_NAME  = "edubook-lms-v22";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

/* All files the app needs to render — even with zero network. */
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/supabase-client.js",
  "./js/data.js",
  "./js/app.js",
  "./manifest.json",
  "./school_bsu.jpg",
  "./Batangas_State_Logo.png",
  "./assets/ttl_cover.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  SUPABASE_CDN          // cache the Supabase client lib so it works offline too
];

/* ── INSTALL: pre-cache the app shell ─────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())          // activate immediately
      .catch((err) => console.warn("[SW] Pre-cache failed:", err))
  );
});

/* ── ACTIVATE: remove old caches ──────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())        // take control of all open tabs
  );
});

/* ── FETCH: serve from cache when offline ─────────────────── */
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip non-GET and Supabase API/realtime calls — those always need the network
  if (event.request.method !== "GET") return;
  if (url.includes("supabase.co")) return;     // let app.js handle offline gracefully

  // Cache-first for app shell files (HTML, CSS, JS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache immediately, then update cache in background
        const networkUpdate = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, response.clone()))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => {});  // network failed — that's fine, we already served from cache
        void networkUpdate;
        return cached;
      }

      // Not in cache yet — try network and cache the response
      return fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() => {
          // Complete network failure and nothing cached — return offline fallback
          return caches.match("./index.html");
        });
    })
  );
});