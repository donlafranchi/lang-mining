// lang-mining service worker.
//
// Deliberately small. Lessons, the deck and every API call are private and live in the database, so they are
// never cached here. This worker only does two things:
//   1. When a page cannot be loaded (no connection), show a cached "You are offline" page.
//   2. Keep the static app files (/_next/static and the icons) so the app shell starts fast.
//
// Bump VERSION to drop every cache from older versions.

const VERSION = "v5";
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_STATIC_ENTRIES = 120;
// The stylesheet and scripts the offline page refers to. Without them it would show up unstyled when there is no network.
const ASSET_PATTERN = /\/_next\/static\/[A-Za-z0-9_\-./%]+\.(?:css|js|woff2?)/g;

// Keep the files the stored offline page needs. One that cannot be fetched must not stop the worker installing.
function precacheOfflineAssets(cache) {
  return cache
    .match(OFFLINE_URL)
    .then((page) => (page ? page.text() : ""))
    .then((html) => {
      const urls = Array.from(new Set(html.match(ASSET_PATTERN) || []));
      return Promise.all(urls.map((u) => cache.add(u).catch(() => undefined)));
    })
    .catch(() => undefined);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).then(() => precacheOfflineAssets(cache)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("static-") && n !== STATIC_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function isStaticFile(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/");
}

// Drop the oldest entries so the cache cannot grow forever (every deploy ships new hashed files).
function trim(cache) {
  return cache.keys().then((keys) => {
    if (keys.length <= MAX_STATIC_ENTRIES) return undefined;
    return Promise.all(keys.slice(0, keys.length - MAX_STATIC_ENTRIES).map((k) => cache.delete(k)));
  });
}

function cacheFirst(request) {
  return caches.open(STATIC_CACHE).then((cache) =>
    cache.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        // Only keep good answers, never an error page.
        if (!response || !response.ok) return response;
        return cache
          .put(request, response.clone())
          .then(() => trim(cache))
          .then(() => response);
      });
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Anything that changes data, and anything not from this site, is none of our business.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always ask the network. Only if that fails, show the offline page. Pages are never stored.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((offline) => offline || Response.error())),
    );
    return;
  }

  // Static app files are safe to keep: they carry no user data and their names change when their content does.
  if (isStaticFile(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
  // Everything else (the API, page data requests) goes straight to the network, untouched.
});

// Push: a lesson finished. The server sends { title, body, url }; tapping the notification opens that lesson.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "Lesson ready";
  // The red number on the app icon: one per notification that has not been opened yet.
  const badge = self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => undefined) : Promise.resolve();
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        data: { url: data.url || "/" },
      }),
      badge,
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) {
          w.navigate(url).catch(() => undefined);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
