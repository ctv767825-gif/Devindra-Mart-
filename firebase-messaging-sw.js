importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA",
  authDomain: "devindra-mart.firebaseapp.com",
  projectId: "devindra-mart",
  storageBucket: "devindra-mart.firebasestorage.app",
  messagingSenderId: "394816688594",
  appId: "1:394816688594:web:77577dbcade5f19942b80b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Devindra Mart';
  const options = {
    body: payload.notification?.body || 'New update',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});
