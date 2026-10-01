import { auth, db } from './firebase-core.js';
import {
  addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const MAP={
  teacher:{collection:'teachers',local:'tsa_teachers_v1'},
  success:{collection:'success',local:'tsa_success_v1'},
  review:{collection:'reviews',local:'tsa_reviews_v1'}
};

async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || String(u.email||'').trim().toLowerCase()!==ADMIN_EMAIL)throw new Error('Yönetici Firebase oturumu bulunamadı.');
}
function mirror(type,rows){
  const cfg=MAP[type];
  localStorage.setItem(cfg.local,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:simple-content-updated',{detail:{type,rows}}));
}
async function read(type){
  const cfg=MAP[type];
  const snap=await getDocs(collection(db,cfg.collection));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>{
    const aa=a.createdAt&&typeof a.createdAt.toMillis==='function'?a.createdAt.toMillis():0;
    const bb=b.createdAt&&typeof b.createdAt.toMillis==='function'?b.createdAt.toMillis():0;
    return bb-aa;
  });
  return rows;
}
async function seed(type,rows){
  if(rows.length)return rows;
  const cfg=MAP[type];
  let local=[];
  try{local=JSON.parse(localStorage.getItem(cfg.local)||'[]')}catch(e){}
  local=Array.isArray(local)?local.filter(x=>x&&((x.head||'').trim()||(x.text||'').trim())):[];
  for(const x of local){
    await addDoc(collection(db,cfg.collection),{
      head:String(x.head||''),
      text:String(x.text||''),
      createdAt:serverTimestamp()
    });
  }
  return local.length?read(type):rows;
}
async function load(type){
  await requireAdmin();
  let rows=await read(type);
  rows=await seed(type,rows);
  mirror(type,rows);
  return rows;
}
async function loadAll(){
  await requireAdmin();
  for(const type of Object.keys(MAP))await load(type);
}
async function add(type,head,text){
  await requireAdmin();
  const cfg=MAP[type];
  if(!cfg)throw new Error('Geçersiz içerik türü.');
  await addDoc(collection(db,cfg.collection),{
    head:String(head||'').trim(),
    text:String(text||'').trim(),
    createdAt:serverTimestamp()
  });
  return load(type);
}
async function remove(type,id){
  await requireAdmin();
  const cfg=MAP[type];
  if(!cfg)throw new Error('Geçersiz içerik türü.');
  await deleteDoc(doc(db,cfg.collection,String(id)));
  return load(type);
}
window.TSAFirebaseSimpleContent={load,loadAll,add,remove};

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)loadAll().catch(err=>console.error('Site içerikleri Firebase yükleme hatası:',err))});
}
