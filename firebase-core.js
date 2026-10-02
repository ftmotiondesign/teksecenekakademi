import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDtca9HS5LONXdLjbaCNpI_9GjhYqhOaDo',
  authDomain: 'teksecenekakademi-1f2b6.firebaseapp.com',
  projectId: 'teksecenekakademi-1f2b6',
  storageBucket: 'teksecenekakademi-1f2b6.firebasestorage.app',
  messagingSenderId: '908097319502',
  appId: '1:908097319502:web:bfbcfaa843d60a88d3491f',
  measurementId: 'G-QJRJHJRM5V'
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
