import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA",
  authDomain: "devindra-mart.firebaseapp.com",
  projectId: "devindra-mart",
  storageBucket: "devindra-mart.firebasestorage.app",
  messagingSenderId: "394816688594",
  appId: "1:394816688594:web:77577dbcade5f19942b80b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
