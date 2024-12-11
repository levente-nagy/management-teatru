// Import the functions you need from the SDKs you need
import { FirebaseApp, initializeApp } from "firebase/app";
import { getFirestore as getFirestoreFromSDK } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCGQmOFHCow3lnWSR6mvHACL0FrKUf40Lo",
  authDomain: "tema13-9b11b.firebaseapp.com",
  projectId: "tema13-9b11b",
  storageBucket: "tema13-9b11b.firebasestorage.app",
  messagingSenderId: "217978189251",
  appId: "1:217978189251:web:30aa4e97c8a3fca8203976",
  measurementId: "G-RQRH3GLC4G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function getFirestore(app: FirebaseApp) {
  return getFirestoreFromSDK(app);
}

export const db = getFirestore(app); 

