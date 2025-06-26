// service-worker/index.js

/**
 * Service Worker Global Scope
 *
 * This file contains the JavaScript code for your service worker.
 * Service workers run in a separate thread from the main browser process
 * and can intercept network requests, manage caches, and enable features
 * like push notifications and background sync.
 *
 * This specific version is designed to:
 * 1. Act as a pass-through for all network requests (no caching implemented).
 * 2. Provide a boilerplate for Push Notifications (commented out by default).
 *
 * Important: Service workers require HTTPS for deployment (except for localhost).
 */

// ============================================================================
// 1. Fetch Event Handler
//    This event fires for every network request made by the controlled page.
//    In this setup, it simply lets the browser proceed with the network request
//    without caching any responses.
// ============================================================================
self.addEventListener('fetch', (event) => {
  // Log the fetch request for debugging purposes.
  // This helps confirm that the service worker is intercepting requests.
  console.log(`[Service Worker] Fetching: ${event.request.url}`);

  // Check if the request is for the same origin as the service worker.
  // This helps avoid intercepting requests to third-party domains,
  // which might not be intended or necessary for a simple pass-through.
  if (event.request.url.startsWith(self.location.origin)) {
    // Respond with the network request.
    // The `fetch(event.request)` call ensures the request goes out to the network.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // You can inspect the network response here if needed,
          // but no caching or modification is performed.
          console.log(`[Service Worker] Network response for ${event.request.url}: ${response.status}`);
          return response;
        })
        .catch((error) => {
          // Log any errors that occur during the network fetch.
          // For a no-caching service worker, network failures will typically
          // result in the browser's default offline/error page.
          console.error(`[Service Worker] Network request failed for ${event.request.url}:`, error);
          // If you wanted to show a specific offline page *without* caching it,
          // you'd need a very specific, hardcoded way to serve it here,
          // which is complex without the Cache API. It's usually better to
          // rely on the browser's default for a "no caching" scenario.
          throw error; // Re-throw the error to ensure the browser handles it appropriately.
        })
    );
  } else {
    // For cross-origin requests, let the request proceed normally without intervention.
    console.log(`[Service Worker] Bypassing cross-origin fetch: ${event.request.url}`);
  }
});


// ============================================================================
// 2. Install Event Handler
//    While this service worker doesn't perform caching, the `install` event
//    is still part of the service worker lifecycle.
//    `self.skipWaiting()` is kept to ensure the service worker activates
//    immediately upon successful installation, taking control of open pages
//    without requiring a refresh.
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event triggered. Skipping waiting...');
  // `self.skipWaiting()` forces the waiting service worker to become the active service worker.
  // This means the new service worker will take control of the page immediately.
  event.waitUntil(self.skipWaiting());
});


// ============================================================================
// 3. Activate Event Handler
//    The `activate` event is also part of the lifecycle.
//    `self.clients.claim()` is kept to allow the service worker to take control
//    of existing clients (pages) that were already open before the service
//    worker became active.
//    No cache cleanup logic is present as no caches are being managed.
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event triggered. Claiming clients...');
  // `self.clients.claim()` makes the newly active service worker take control of any
  // clients (pages) that were already open when the service worker was activated.
  event.waitUntil(self.clients.claim());
});


// ============================================================================
// 4. Push Notification Event Handlers (Optional - Uncomment to use)
//    These event listeners are for handling push messages sent from a server
//    and for user interactions with notifications.
//    To use these, you'll need a backend that can send Web Push Protocol messages
//    and frontend code to subscribe the user to push notifications.
// ============================================================================
/*
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  // Parse the data sent with the push event.
  // It's good practice to ensure the data is JSON.
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'New Update';
  const options = {
    body: data.body || 'You have a new notification from the application.',
    icon: data.icon || '/images/notification-icon.png', // Path to your notification icon
    badge: data.badge || '/images/notification-badge.png', // Path to your notification badge
    data: data.url ? { url: data.url } : null // Optional: Pass a URL to open on click
  };

  // Show the notification. `self.registration.showNotification` displays the notification.
  // `event.waitUntil` ensures the service worker stays alive until the notification is shown.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.');

  // Close the notification once it's clicked.
  event.notification.close();

  // Determine the URL to open based on data passed with the notification,
  // or a default URL.
  const targetUrl = event.notification.data && event.notification.data.url
                      ? event.notification.data.url
                      : '/'; // Default to homepage

  // `event.waitUntil` keeps the service worker alive until the window is opened or focused.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Look for an existing client (browser tab) that matches the target URL.
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus(); // Focus on the existing tab
          }
        }
        // If no matching tab is found, open a new window.
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
*/
