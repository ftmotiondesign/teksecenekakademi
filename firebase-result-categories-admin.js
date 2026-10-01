import { auth, db } from './firebase-core.js';
import {
  addDoc, collection, deleteDoc, doc, getDocs, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const LOCAL_KEY='tsa_result_categories_v1';
const DEFAULTS=[
  {name:'LGS',active:true},
  {name:'Kurum İçi Deneme',active:true},
  {name:'Türkiye Geneli Deneme',active:true}
];

async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || String(u.email||'').trim().toLowerCase()!==ADMIN_EMAIL)throw new Error('Yönetici Firebase oturumu bulunamadı.');
}
function mirror(rows){
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:result-categories-updated',{detail:rows}));
}
async function readRemote(){
  const snap=await getDocs(collection(db,'resultCategories'));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'tr'));
  return rows;
}
async function seedIfEmpty(rows){
  if(rows.length)return rows;
  let local=[];
  try{local=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch(e){}
  const seed=Array.isArray(local)&&local.length?local:DEFAULTS;
  for(const x of seed){
    await addDoc(collection(db,'resultCategories'),{
      name:String(x.name||'').trim(),
      active:x.active!==false,
      createdAt:serverTimestamp()
    });
  }
  return readRemote();
}
async function load(){
  await requireAdmin();
  let rows=await readRemote();
  rows=await seedIfEmpty(rows);
  mirror(rows);
  return rows;
}
async function add(name){
  await requireAdmin();
  name=String(name||'').trim();
  if(!name)throw new Error('Kategori adı gerekli.');
  await addDoc(collection(db,'resultCategories'),{name,active:true,createdAt:serverTimestamp()});
  return load();
}
async function update(id,patch){
  await requireAdmin();
  await updateDoc(doc(db,'resultCategories',String(id)),{...patch,updatedAt:serverTimestamp()});
  return load();
}
async function remove(id){
  await requireAdmin();
  await deleteDoc(doc(db,'resultCategories',String(id)));
  return load();
}
window.TSAFirebaseResultCategories={load,add,update,remove};

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)load().catch(err=>console.error('Sonuç kategorileri Firebase yükleme hatası:',err))});
}
