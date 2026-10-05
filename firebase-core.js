import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
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

export const OWNER_EMAIL='ftmotiondesign@gmail.com';
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

function normalizeEmail(v){
  return String(v||'').trim().toLowerCase();
}

export async function isAdminUser(user=auth.currentUser){
  if(!user)return false;
  const email=normalizeEmail(user.email);
  if(email===OWNER_EMAIL)return true;
  try{
    const snap=await getDoc(doc(db,'admins',String(user.uid)));
    if(!snap.exists())return false;
    const data=snap.data()||{};
    return data.active!==false && normalizeEmail(data.email)===email;
  }catch(err){
    console.error('Yönetici yetki kontrolü başarısız:',err);
    return false;
  }
}

export async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const user=auth.currentUser;
  if(!user)throw new Error('Yönetici Firebase oturumu bulunamadı.');
  if(!(await isAdminUser(user)))throw new Error('Bu Firebase hesabının yönetici yetkisi yok.');
  return user;
}
