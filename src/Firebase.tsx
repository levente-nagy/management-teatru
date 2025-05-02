
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore as getFirestoreFromSDK } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGQmOFHCow3lnWSR6mvHACL0FrKUf40Lo",
  authDomain: "tema13-9b11b.firebaseapp.com",
  projectId: "tema13-9b11b",
  storageBucket: "tema13-9b11b.firebasestorage.app",
  messagingSenderId: "217978189251",
  appId: "1:217978189251:web:30aa4e97c8a3fca8203976",
  measurementId: "G-RQRH3GLC4G"
};

const app = initializeApp(firebaseConfig);

function getFirestore(app: FirebaseApp) {
  return getFirestoreFromSDK(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app); 

