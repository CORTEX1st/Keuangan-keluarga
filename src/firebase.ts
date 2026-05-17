import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCViRoK2fG801wTjmXBVX31qXu-jeNz2Pk",
  authDomain: "keuangan-keluarga-e21f4.firebaseapp.com",
  projectId: "keuangan-keluarga-e21f4",
  storageBucket: "keuangan-keluarga-e21f4.firebasestorage.app",
  messagingSenderId: "8797442361",
  appId: "1:8797442361:web:3cd27f7d557ee8aa0e18e8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);