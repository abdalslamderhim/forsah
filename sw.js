const CACHE_NAME = "forsah-v1";

const urlsToCache = [
  "/forsah/",
  "/forsah/index.html",
  "/forsah/style.css",
  "/forsah/logo.png",
  "/forsah/icon-192.png",
  "/forsah/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
