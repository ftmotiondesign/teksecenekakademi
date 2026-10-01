import { db } from './firebase-core.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const MAP={
  teacher:{collection:'teachers',local:'tsa_teachers_v1'},
  success:{collection:'success',local:'tsa_success_v1'},
  review:{collection:'reviews',local:'tsa_reviews_v1'}
};

async function load(type){
  const cfg=MAP[type];
  const snap=await getDocs(collection(db,cfg.collection));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>{
    const aa=a.createdAt&&typeof a.createdAt.toMillis==='function'?a.createdAt.toMillis():0;
    const bb=b.createdAt&&typeof b.createdAt.toMillis==='function'?b.createdAt.toMillis():0;
    return bb-aa;
  });
  localStorage.setItem(cfg.local,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:simple-public-updated',{detail:{type,rows}}));
  return rows;
}
async function loadAll(){
  const out={};
  for(const type of Object.keys(MAP))out[type]=await load(type);
  return out;
}
window.TSAFirebaseSimplePublic={load,loadAll};
loadAll().catch(err=>console.error('Site içerikleri yüklenemedi:',err));
