import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA4y5n3BhbgIvE1-owBqO0fFycrKXi2grw",
  authDomain: "devindra-mart-main-21205.firebaseapp.com",
  projectId: "devindra-mart-main-21205",
  storageBucket: "devindra-mart-main-21205.firebasestorage.app",
  messagingSenderId: "513697622138",
  appId: "1:513697622138:web:a150445a5abe1d9985b3c3",
  measurementId: "G-SLX40MKP4D"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
enableIndexedDbPersistence(db).catch(()=>{});
