// Offline support: register the service worker (dist/web/sw.js, built from web/sw.template.js).
// A file of its own because the Content-Security-Policy allows no inline scripts.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
