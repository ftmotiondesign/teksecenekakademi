import { db } from './firebase-core.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const LOCAL_KEY='tsa_result_categories_v1';

async function load(){
  const snap=await getDocs(collection(db,'resultCategories'));
  const rows=[];
  snap.forEach(d=>{
    const x=d.data()||{};
    rows.push({id:d.id,name:String(x.name||''),active:x.active!==false});
  });
  rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'tr'));
  if(rows.length){
    localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent('tsa:result-categories-updated',{detail:rows}));
  }
  return rows;
}
window.TSAFirebaseResultCategoriesPublic={load};
load().catch(err=>console.error('Sonuç kategorileri yüklenemedi:',err));
