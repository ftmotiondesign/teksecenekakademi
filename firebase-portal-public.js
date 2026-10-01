import { db } from './firebase-core.js';
import { collection, doc, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

function normPhone(v){
  let p=String(v||'').replace(/\D/g,'');
  if(p.startsWith('90')&&p.length===12)p=p.slice(2);
  if(p.startsWith('0')&&p.length===11)p=p.slice(1);
  if(p.length>10)p=p.slice(-10);
  return p;
}
function normId(v){return String(v||'').trim().replace(/\s+/g,'').toUpperCase()}
async function sha256(v){
  const bytes=new TextEncoder().encode(v);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function announcements(){
  const snap=await getDocs(collection(db,'announcements'));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>{
    const aa=a.createdAt&&typeof a.createdAt.toMillis==='function'?a.createdAt.toMillis():0;
    const bb=b.createdAt&&typeof b.createdAt.toMillis==='function'?b.createdAt.toMillis():0;
    return bb-aa;
  });
  return rows.map(x=>({id:x.id,head:String(x.head||''),text:String(x.text||'')}));
}
async function lookup(identifier,phone){
  const i=normId(identifier),p=normPhone(phone);
  if(!i || p.length<10)throw new Error('Takip/öğrenci/sonuç kodu ve veli telefonu gerekli.');
  const id=await sha256(i+'|'+p);
  const snap=await getDoc(doc(db,'portal',id));
  if(!snap.exists())return null;
  const data=snap.data()||{};
  const anns=await announcements().catch(()=>[]);
  return {app:data.app||null,results:Array.isArray(data.results)?data.results:[],announcements:anns};
}
function hydrate(data){
  if(!data)return;
  localStorage.setItem('tsa_applications_v1',JSON.stringify(data.app?[data.app]:[]));
  localStorage.setItem('tsa_results_v1',JSON.stringify(data.results||[]));
  localStorage.setItem('tsa_announcements_v1',JSON.stringify(data.announcements||[]));
}
window.TSAFirebasePortal={lookup,hydrate};
