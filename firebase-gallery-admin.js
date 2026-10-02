import { auth, db } from './firebase-core.js';
import {
  collection, deleteDoc, doc, getDoc, getDocs, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const LOCAL_KEY='tsa_gallery_v1';
const DEFAULTS=[
  {id:'g1',type:'image',src:'bina.png',title:'Tek Seçenek Akademi',text:'Kurum binamız',createdAt:'2026-01-03T00:00:00.000Z'},
  {id:'g2',type:'image',src:'Başlıksız-1.png',title:'Kurum Galerisi',text:'Kurum görseli',createdAt:'2026-01-02T00:00:00.000Z'},
  {id:'g3',type:'image',src:'Başlıksız-2.png',title:'Eğitim Ortamımız',text:'Kurum görseli',createdAt:'2026-01-01T00:00:00.000Z'}
];

async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || String(u.email||'').trim().toLowerCase()!==ADMIN_EMAIL)throw new Error('Yönetici Firebase oturumu bulunamadı.');
}
function mirror(rows){
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:gallery-updated',{detail:rows}));
}
async function readAll(){
  const snap=await getDocs(collection(db,'gallery'));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  return rows;
}
async function seed(){
  let rows=await readAll();
  if(rows.length)return rows;
  for(const x of DEFAULTS){
    await setDoc(doc(db,'gallery',x.id),{...x,createdAt:x.createdAt,createdAtServer:serverTimestamp()});
  }
  return readAll();
}
async function load(){
  await requireAdmin();
  const rows=await seed();
  mirror(rows);
  return rows;
}
async function add(item){
  await requireAdmin();
  const id=String(item.id||('g-'+Date.now()));
  const payload={
    title:String(item.title||'Galeri').trim(),
    text:String(item.text||'').trim(),
    type:item.type==='video'?'video':'image',
    src:String(item.src||'').trim(),
    createdAt:item.createdAt||new Date().toISOString(),
    updatedAt:serverTimestamp()
  };
  if(!payload.src)throw new Error('Görsel/video yolu veya URL gerekli.');
  await setDoc(doc(db,'gallery',id),payload);
  return load();
}
async function update(id,patch){
  await requireAdmin();
  const ref=doc(db,'gallery',String(id));
  const snap=await getDoc(ref);
  if(!snap.exists())throw new Error('Galeri kaydı bulunamadı.');
  const old=snap.data()||{};
  const payload={
    title:String(patch.title??old.title??'Galeri').trim(),
    text:String(patch.text??old.text??'').trim(),
    type:(patch.type??old.type)==='video'?'video':'image',
    src:String(patch.src??old.src??'').trim(),
    createdAt:old.createdAt||new Date().toISOString(),
    updatedAt:serverTimestamp()
  };
  if(!payload.src)throw new Error('Görsel/video yolu veya URL gerekli.');
  await setDoc(ref,payload,{merge:true});
  return load();
}
async function remove(id){
  await requireAdmin();
  await deleteDoc(doc(db,'gallery',String(id)));
  return load();
}
window.TSAFirebaseGallery={load,add,update,remove};
if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)load().catch(err=>console.error('Galeri Firebase yükleme hatası:',err))});
}
