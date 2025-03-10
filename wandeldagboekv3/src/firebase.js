// Firebase configuratie
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Je Firebase configuratie
const firebaseConfig = {
  apiKey: "AIzaSyAf_bJUMjnn3tQ4bKu8jKa8mFaFHm4lQhA",
  authDomain: "wandeldagboekv3.firebaseapp.com",
  projectId: "wandeldagboekv3",
  storageBucket: "wandeldagboekv3.appspot.com",
  messagingSenderId: "529125720773",
  appId: "1:529125720773:web:6d37357c4d5a2a38f566ac",
  measurementId: "G-CSKD17033K"
};

console.log('Firebase configuratie:', firebaseConfig);

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);

// Exporteer Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Configureer Firestore met de juiste database naam
// Uncomment deze regels als je problemen hebt met de Firestore-verbinding
// import { setLogLevel } from 'firebase/firestore';
// setLogLevel('debug');

export default app; 