import { auth, db, storage, requireAdmin } from './firebase-core.js?v=2';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const MAP={
  teacher:{collection:'teachers',local:'tsa_teachers_v1'},
  success:{collection:'success',local:'tsa_success_v1'},
  review:{collection:'reviews',local:'tsa_reviews_v1'}
};

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
async function add(type,head,text,extra){
  await requireAdmin();
  const cfg=MAP[type];
  if(!cfg)throw new Error('Geçersiz içerik türü.');
  const payload={
    head:String(head||'').trim(),
    text:String(text||'').trim(),
    createdAt:serverTimestamp()
  };
  if(type==='teacher' && extra && extra.image)payload.image=String(extra.image||'').trim();
  if(type==='review' && extra){
    payload.source=String(extra.source||'').trim();
    payload.rating=Number(extra.rating||0);
    payload.authorUri=String(extra.authorUri||'').trim();
    payload.relativeTime=String(extra.relativeTime||'').trim();
    payload.googleReviewKey=String(extra.googleReviewKey||'').trim();
  }
  await addDoc(collection(db,cfg.collection),payload);
  return load(type);
}
async function update(type,id,patch){
  await requireAdmin();
  const cfg=MAP[type];
  if(!cfg)throw new Error('Geçersiz içerik türü.');
  const ref=doc(db,cfg.collection,String(id));
  const snap=await getDoc(ref);
  if(!snap.exists())throw new Error('Kayıt bulunamadı.');
  const old=snap.data()||{};
  const payload={
    head:String(patch&&patch.head!=null?patch.head:(old.head||'')).trim(),
    text:String(patch&&patch.text!=null?patch.text:(old.text||'')).trim(),
    updatedAt:serverTimestamp()
  };
  if(type==='teacher')payload.image=String(patch&&patch.image!=null?patch.image:(old.image||'')).trim();
  await setDoc(ref,payload,{merge:true});
  return load(type);
}
async function uploadTeacherImage(file){
  await requireAdmin();
  if(!file)throw new Error('Fotoğraf seçilmedi.');
  if(!String(file.type||'').match(/^image\/(png|jpeg|webp)$/))throw new Error('Fotoğraf JPG, PNG veya WebP olmalı.');
  if(file.size>10*1024*1024)throw new Error('Fotoğraf en fazla 10 MB olabilir.');
  const ext=(String(file.name||'foto.jpg').split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
  const path='site/teachers/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const storageRef=ref(storage,path);
  await uploadBytes(storageRef,file,{contentType:file.type});
  return getDownloadURL(storageRef);
}
async function remove(type,id){
  await requireAdmin();
  const cfg=MAP[type];
  if(!cfg)throw new Error('Geçersiz içerik türü.');
  await deleteDoc(doc(db,cfg.collection,String(id)));
  return load(type);
}
window.TSAFirebaseSimpleContent={load,loadAll,add,update,remove,uploadTeacherImage};

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)loadAll().catch(err=>console.error('Site içerikleri Firebase yükleme hatası:',err))});
}
