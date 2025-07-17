import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByStRITUXbN2RTJLDkNf8q6acQrL3Ojnc",
  authDomain: "sololeveling-4e71e.firebaseapp.com",
  projectId: "sololeveling-4e71e",
  storageBucket: "sololeveling-4e71e.appspot.com",
  messagingSenderId: "516166797408",
  appId: "1:516166797408:web:577c159f5ea7246d319b05",
  measurementId: "G-D1YM8MX5C8"
};  

const app = initializeApp(firebaseConfig);
export const provider = new GoogleAuthProvider(); // ✅ Export this
export const auth = getAuth(app);
export const db = getFirestore(app);