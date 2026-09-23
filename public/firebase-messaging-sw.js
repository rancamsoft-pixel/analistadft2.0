// Firebase Messaging Service Worker para notificaciones push en segundo plano

importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

// Configuración básica del cliente (los valores reales se sincronizan en runtime)
const firebaseConfig = {
  apiKey: "AIzaSyMockKeyForServiceWorkerPushReceiver",
  authDomain: "bet-analyzer.firebaseapp.com",
  projectId: "bet-analyzer",
  storageBucket: "bet-analyzer.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:mockapp"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje push en segundo plano recibido:', payload);

    const notificationTitle = payload.notification?.title || '⚽ Tu análisis diario está listo';
    const notificationOptions = {
      body: payload.notification?.body || 'Tu análisis cuantitativo encontró nuevas oportunidades para revisar.',
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      data: payload.data || { url: '/dashboard/focus' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Inicialización en modo offline/mock:', e);
}

// Manejo de clic en la notificación: abrir o enfocar la app en /dashboard/focus
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard/focus';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
