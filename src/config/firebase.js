import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmEHxalxZJMLHDLJl3_9TeeKzO4raCZHU",
  authDomain: "exam-portal-2548d.firebaseapp.com",
  projectId: "exam-portal-2548d",
  storageBucket: "exam-portal-2548d.firebasestorage.app",
  messagingSenderId: "997635878788",
  appId: "1:997635878788:web:f83d2f656a2341151737d1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
