// =============================================================================
// RHR ERP/POS — SERVICE WORKER INTELLIGENT OFFLINE-FIRST (M'BATTO)
// Stratégie Hybride :
// 1. Pré-cache des routes critiques & assets de marque (/logo-rhr.jpg, /manifest.json)
// 2. Network-First avec Fallback Cache pour les pages dynamiques (zéro page d'erreur hors-ligne)
// 3. Cache-First pour les images, polices, icônes et bundles statiques (économie data mobile)
// =============================================================================

const CACHE_VERSION = "rhr-mbatto-pwa-v2.8";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_ROUTES = [
  "/",
  "/login",
  "/hotel",
  "/pos",
  "/ceremonies",
  "/qr-menu",
  "/closures",
  "/dashboard",
  "/admin",
  "/inventory",
  "/expenses",
  "/fixed-costs",
  "/logo-rhr.jpg",
  "/manifest.json",
];

// Installation : Pré-chargement résilient des routes critiques
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ROUTES.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-cache" });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignorer si une route n'est pas joignable pendant l'installation initiale
          }
        })
      );
    })
  );
});

// Activation : Nettoyage automatique des anciens caches obsolètes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CORE_CACHE &&
                key !== PAGES_CACHE &&
                key !== ASSETS_CACHE
            )
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Communication avec l'application (mise à jour immédiate sur demande)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Vérifie si une requête concerne un fichier statique (images, polices, icônes, JS/CSS Next)
function isStaticAsset(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".ttf") ||
    pathname.endsWith(".css")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET et les appels API (gérés par la SyncQueue Zustand)
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 1. Stratégie CACHE-FIRST pour les images, polices, icônes & bundles statiques
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Rafraîchissement discret en arrière-plan
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                caches
                  .open(ASSETS_CACHE)
                  .then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const cloned = networkResponse.clone();
              caches
                .open(ASSETS_CACHE)
                .then((cache) => cache.put(request, cloned));
            }
            return networkResponse;
          })
          .catch(() => caches.match("/logo-rhr.jpg"));
      })
    );
    return;
  }

  // 2. Stratégie NETWORK-FIRST avec FALLBACK CACHE pour les pages HTML & navigations Next.js
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches
            .open(PAGES_CACHE)
            .then((cache) => cache.put(request, cloned));
        }
        return networkResponse;
      })
      .catch(async () => {
        // En cas de coupure internet à M'Batto, servir la version en cache local
        const exactMatch = await caches.match(request);
        if (exactMatch) return exactMatch;

        // Essayer sans les paramètres de requête (ex: /qr-menu?loc=Table+1 -> /qr-menu)
        const cleanPathMatch = await caches.match(url.pathname);
        if (cleanPathMatch) return cleanPathMatch;

        // En dernier recours pour une navigation HTML, servir /login depuis le pré-cache
        if (request.mode === "navigate") {
          const loginFallback =
            (await caches.match("/login")) || (await caches.match("/"));
          if (loginFallback) return loginFallback;
        }

        return new Response("Mode Hors-Ligne RHR Actif", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});

