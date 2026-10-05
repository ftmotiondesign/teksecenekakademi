import { auth, db, requireAdmin } from './firebase-core.js?v=2';
import {
  collection, deleteDoc, doc, getDocs, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const LOCAL_KEY='tsa_applications_v1';

function normalize(snap){
  const rows=[];
  snap.forEach(d=>{
    const v=d.data()||{};
    rows.push({...v,id:d.id});
  });
  rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  return rows;
}
function mirror(rows){
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:applications-updated',{detail:rows}));
}
async function load(){
  await requireAdmin();
  const snap=await getDocs(collection(db,'applications'));
  const rows=normalize(snap);
  mirror(rows);
  return rows;
}
async function update(id,patch){
  await requireAdmin();
  const clean={...patch,updatedAt:serverTimestamp()};
  delete clean.id;
  await updateDoc(doc(db,'applications',String(id)),clean);
  return load();
}
async function remove(id){
  await requireAdmin();
  await deleteDoc(doc(db,'applications',String(id)));
  return load();
}
window.TSAFirebaseApplications={load,update,remove};

if(auth.currentUser){
  load().catch(err=>console.error('Firestore başvuru yükleme hatası:',err));
}else{
  auth.authStateReady().then(()=>{
    if(auth.currentUser) load().catch(err=>console.error('Firestore başvuru yükleme hatası:',err));
  });
}
