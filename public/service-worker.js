const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/index.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
  ];
  
  const STATIC_CACHE = "static-cache-v1";
  const RUNTIME_CACHE = "runtime-cache";
  
  // install to perform install steps
  self.addEventListener("install", (event) => {
    // waitUntil method takes a promise and uses it to know how long installation takes, and whether it succeeded or not.
    event.waitUntil(
      caches 
        // Open a cache
        .open(STATIC_CACHE)
        // Cache our files
        .then(cache => cache.addAll(FILES_TO_CACHE))
        // skipWaiting will only have an effect if there's a newly installed service worker that might otherwise remain in the waiting state
        .then(() => self.skipWaiting())
    );
  });
  
  // activate to make sure everything is up to date 
  self.addEventListener("activate", (event) => {
    const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
  
    event.waitUntil(
      caches  
        // get keys to all of our caches 
        .keys()
        .then(cacheNames => {
          // look through all caches availble to service worker 
          // filter cache names - if it does not include a defined cache name, it will be dropped 
          return cacheNames.filter(name => !currentCaches.includes(name))
        })
        .then(cachesToDelete => {
          // return array of cache names that are old to delete
          return Promise.all(cachesToDelete.map(name => caches.delete(name)))
        })
        // allows an active service worker to set itself as the controller for all clients within its scope
        .then(() => self.clients.claim())
    );
  });
  
  // fetch
  self.addEventListener("fetch", (event) => {
    // non GET requests are not cached and requests to other origins are not cached
    if (
      event.request.method !== "GET" ||
      !event.request.url.startsWith(self.location.origin)
    ) {
      event.respondWith(fetch(event.request));
      return;
    }
  
    // handle runtime GET requests for data from /api routes
    if(event.request.url.includes("/api/")) {
      // make network request and fallback to cache if network request fails (offline)
      event.respondWith(
        caches
          .open(RUNTIME_CACHE)
          .then(cache => {
            return fetch(event.request)
              .then(response => {
                // If the response was good, clone it and store it in the cache.
                cache.put(event.request, response.clone());
  
                return response;
              })
              // Network request failed, try to get it from the cache.
              .catch(() => caches.match(event.request));
          })
        );
        
      return;
    }
  
    // use cache first for all other requests for performance
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse
          }
          // request is not in cache. make network request and cache the response
          caches
            .open(RUNTIME_CACHE)
            .then(response => {
              return response || fetch(event.request)
            });
        })
    );
  
  });