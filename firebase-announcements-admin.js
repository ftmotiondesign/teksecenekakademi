import { auth, db } from './firebase-core.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection, addDoc, deleteDoc, doc, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const LOCAL_KEY='tsa_announcements_v1';

function normalize(snapshot){
  const rows=[];
  snapshot.forEach(d=>{
    const v=d.data()||{};
    rows.push({
      id:d.id,
      head:String(v.head||''),
      text:String(v.text||''),
      createdAt:v.createdAt&&typeof v.createdAt.toMillis==='function'?v.createdAt.toMillis():0
    });
  });
  rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return rows;
}
function mirror(rows){
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:announcements-updated',{detail:rows}));
}
async function load(){
  const snap=await getDocs(collection(db,'announcements'));
  const rows=normalize(snap);
  mirror(rows);
  return rows;
}
async function add(head,text){
  const user=auth.currentUser;
  if(!user || String(user.email||'').toLowerCase()!==ADMIN_EMAIL) throw new Error('Yönetici Firebase oturumu bulunamadı.');
  await addDoc(collection(db,'announcements'),{
    head:String(head||'').trim(),
    text:String(text||'').trim(),
    createdAt:serverTimestamp()
  });
  return load();
}
async function remove(id){
  const user=auth.currentUser;
  if(!user || String(user.email||'').toLowerCase()!==ADMIN_EMAIL) throw new Error('Yönetici Firebase oturumu bulunamadı.');
  await deleteDoc(doc(db,'announcements',String(id)));
  return load();
}
window.TSAFirebaseAnnouncements={load,add,remove};

onAuthStateChanged(auth,async user=>{
  if(!user || String(user.email||'').toLowerCase()!==ADMIN_EMAIL) return;
  try{ await load(); }
  catch(err){
    console.error('Firestore duyuru yükleme hatası:',err);
    window.dispatchEvent(new CustomEvent('tsa:firebase-error',{detail:err}));
  }
});
