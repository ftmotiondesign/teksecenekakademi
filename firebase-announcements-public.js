import { db } from './firebase-core.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
async function loadAnnouncements(){
  try{
    const snap=await getDocs(collection(db,'announcements'));
    const rows=[];
    snap.forEach(d=>{
      const v=d.data()||{};
      rows.push({
        id:d.id,
        head:String(v.head||''),
        text:String(v.text||''),
        createdAt:v.createdAt&&typeof v.createdAt.toMillis==='function'?v.createdAt.toMillis():0
      });
    });
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(!rows.length) return;
    localStorage.setItem('tsa_announcements_v1',JSON.stringify(rows));
    const target=document.getElementById('announcementList');
    if(target){
      target.innerHTML=rows.map(x=>'<div class="announcement"><b>'+esc(x.head)+'</b><span>'+esc(x.text)+'</span></div>').join('');
    }
  }catch(err){
    console.warn('Firestore duyuruları alınamadı; mevcut içerik gösteriliyor.',err);
  }
}
loadAnnouncements();
