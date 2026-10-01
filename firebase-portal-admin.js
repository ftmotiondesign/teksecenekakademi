import { auth, db } from './firebase-core.js';
import {
  collection, deleteDoc, doc, getDocs, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const APP_KEY='tsa_applications_v1';
const RESULT_KEY='tsa_results_v1';

async function getRemoteCollection(name){
  const snap=await getDocs(collection(db,name));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  return rows;
}
function normPhone(v){
  let p=String(v||'').replace(/\D/g,'');
  if(p.startsWith('90')&&p.length===12)p=p.slice(2);
  if(p.startsWith('0')&&p.length===11)p=p.slice(1);
  if(p.length>10)p=p.slice(-10);
  return p;
}
function normId(v){
  return String(v||'').trim().replace(/\s+/g,'').toUpperCase();
}
async function sha256(v){
  const bytes=new TextEncoder().encode(v);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function publicApp(a){
  return {
    id:String(a.id||''),
    basvuruNo:String(a.basvuruNo||''),
    type:String(a.type||''),
    ad:String(a.ad||''),
    veliAd:String(a.veliAd||''),
    ogrenciTelefon:String(a.ogrenciTelefon||''),
    telefon:String(a.telefon||''),
    sinif:String(a.sinif||''),
    program:String(a.program||''),
    ilce:String(a.ilce||''),
    okul:String(a.okul||''),
    status:String(a.status||'Yeni Başvuru'),
    studentNo:String(a.studentNo||''),
    studentAction:String(a.studentAction||''),
    studentActionUpdatedAt:String(a.studentActionUpdatedAt||''),
    studentHistory:Array.isArray(a.studentHistory)?a.studentHistory.slice(0,30):[],
    veliStatus:String(a.veliStatus||''),
    veliStatusUpdatedAt:String(a.veliStatusUpdatedAt||''),
    veliHistory:Array.isArray(a.veliHistory)?a.veliHistory.slice(0,30):[]
  };
}
function publicResult(r){
  return {
    id:String(r.id||''),
    name:String(r.name||''),
    studentNo:String(r.studentNo||''),
    category:String(r.category||''),
    examName:String(r.examName||''),
    code:String(r.code||''),
    score:String(r.score||''),
    percentile:String(r.percentile||''),
    rank:String(r.rank||''),
    turkce:String(r.turkce||''),
    matematik:String(r.matematik||''),
    fen:String(r.fen||''),
    inkilap:String(r.inkilap||''),
    din:String(r.din||''),
    ingilizce:String(r.ingilizce||''),
    createdAt:String(r.createdAt||'')
  };
}
function matchingResults(app,all){
  const no=String(app.studentNo||'').trim();
  const name=String(app.ad||'').trim().toLocaleLowerCase('tr-TR');
  return all.filter(r=>{
    if(no && String(r.studentNo||'').trim()===no)return true;
    return name && String(r.name||'').trim().toLocaleLowerCase('tr-TR')===name;
  }).map(publicResult);
}
async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || String(u.email||'').trim().toLowerCase()!==ADMIN_EMAIL)throw new Error('Yönetici Firebase oturumu bulunamadı.');
}
let timer=null;
async function syncNow(){
  await requireAdmin();
  const apps=await getRemoteCollection('applications');
  const allResults=await getRemoteCollection('results');
  const desired=new Map();
  for(const app of apps){
    const phone=normPhone(app.telefon);
    if(!phone)continue;
    const results=matchingResults(app,allResults);
    const identifiers=new Set();
    [app.basvuruNo,app.studentNo].forEach(v=>{if(normId(v))identifiers.add(normId(v))});
    results.forEach(r=>{
      if(normId(r.studentNo))identifiers.add(normId(r.studentNo));
      if(normId(r.code))identifiers.add(normId(r.code));
    });
    for(const identifier of identifiers){
      const id=await sha256(identifier+'|'+phone);
      desired.set(id,{
        app:publicApp(app),
        results,
        lookupType:identifier===normId(app.basvuruNo)?'application':'student-result',
        updatedAt:serverTimestamp()
      });
    }
  }
  const existing=await getDocs(collection(db,'portal'));
  const deletes=[];
  existing.forEach(s=>{if(!desired.has(s.id))deletes.push(deleteDoc(doc(db,'portal',s.id)))});
  await Promise.all(deletes);
  for(const [id,data] of desired){
    await setDoc(doc(db,'portal',id),data);
  }
  console.log('Firebase portal senkronize edildi:',desired.size);
  return desired.size;
}
function schedule(){
  clearTimeout(timer);
  timer=setTimeout(()=>syncNow().catch(err=>console.error('Portal senkronizasyon hatası:',err)),700);
}
window.addEventListener('tsa:applications-updated',schedule);
window.addEventListener('tsa:results-updated',schedule);
window.TSAFirebasePortalAdmin={sync:syncNow};
if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)syncNow().catch(err=>console.error('Portal ilk senkronizasyon hatası:',err))});
}


function bindManualSync(){
  const btn=document.getElementById('syncPortal');
  if(!btn)return;
  btn.addEventListener('click',async()=>{
    const old=btn.textContent;
    btn.disabled=true;
    btn.textContent='Senkronize ediliyor...';
    try{
      const count=await syncNow();
      alert('Veli / öğrenci portalı Firebase ile senkronize edildi. '+count+' giriş anahtarı hazırlandı.');
    }catch(err){
      console.error(err);
      alert('Portal senkronizasyonu başarısız: '+(err&&err.message?err.message:err));
    }finally{
      btn.disabled=false;
      btn.textContent=old;
    }
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindManualSync);
else bindManualSync();
