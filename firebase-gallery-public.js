import { db } from './firebase-core.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const LOCAL_KEY='tsa_gallery_v1';
async function load(){
  const snap=await getDocs(collection(db,'gallery'));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:gallery-public-updated',{detail:rows}));
  return rows;
}
window.TSAFirebaseGalleryPublic={load};
load().catch(err=>console.error('Galeri Firestore yükleme hatası:',err));
