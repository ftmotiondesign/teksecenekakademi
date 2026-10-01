import { auth, db } from './firebase-core.js';
import {
  collection, deleteDoc, doc, getDocs, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const LOCAL_KEY='tsa_results_v1';

async function requireAdmin(){
  if(typeof auth.authStateReady==='function') await auth.authStateReady();
  const user=auth.currentUser;
  if(!user) throw new Error('Yönetici Firebase oturumu bulunamadı.');
  if(String(user.email||'').trim().toLowerCase()!==ADMIN_EMAIL) throw new Error('Bu Firebase hesabının yönetici yetkisi yok.');
  return user;
}
function cleanResult(x,id){
  return {
    id:String(id||x.id||''),
    name:String(x.name||''),
    studentNo:String(x.studentNo||''),
    category:String(x.category||''),
    examName:String(x.examName||''),
    code:String(x.code||''),
    score:String(x.score||''),
    percentile:String(x.percentile||''),
    rank:String(x.rank||''),
    turkce:String(x.turkce||''),
    matematik:String(x.matematik||''),
    fen:String(x.fen||''),
    inkilap:String(x.inkilap||''),
    din:String(x.din||''),
    ingilizce:String(x.ingilizce||''),
    createdAt:String(x.createdAt||new Date().toISOString())
  };
}
function isRealResult(x){
  return !!(String(x.name||'').trim() || String(x.studentNo||'').trim() || String(x.code||'').trim() || String(x.examName||'').trim());
}
function mirror(rows){
  localStorage.setItem(LOCAL_KEY,JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('tsa:results-updated',{detail:rows}));
}
async function readRemote(){
  const snap=await getDocs(collection(db,'results'));
  const rows=[];
  snap.forEach(d=>{
    const x=d.data()||{};
    const row={...x,id:d.id};
    if(isRealResult(row)) rows.push(row);
  });
  rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  return rows;
}
async function migrateLocalIfNeeded(remote){
  if(remote.length) return remote;
  let local=[];
  try{ local=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]'); }catch(e){}
  local=Array.isArray(local)?local.filter(isRealResult):[];
  if(!local.length) return remote;
  for(let i=0;i<local.length;i+=100){
    await Promise.all(local.slice(i,i+100).map((x,j)=>{
      const id=String(x.id||('result-'+Date.now()+'-'+(i+j)));
      const row=cleanResult(x,id);
      return setDoc(doc(db,'results',id),{...row,migratedAt:serverTimestamp()},{merge:true});
    }));
  }
  return readRemote();
}
async function load(){
  await requireAdmin();
  let rows=await readRemote();
  rows=await migrateLocalIfNeeded(rows);
  mirror(rows);
  return rows;
}
async function add(result){
  await requireAdmin();
  const id=String(result.id||('result-'+Date.now()));
  const row=cleanResult(result,id);
  await setDoc(doc(db,'results',id),{...row,createdAtServer:serverTimestamp()});
  return load();
}
async function addMany(results){
  await requireAdmin();
  const list=(Array.isArray(results)?results:[]).filter(isRealResult);
  for(let i=0;i<list.length;i+=100){
    await Promise.all(list.slice(i,i+100).map((x,j)=>{
      const id=String(x.id||('result-'+Date.now()+'-'+(i+j)));
      const row=cleanResult(x,id);
      return setDoc(doc(db,'results',id),{...row,createdAtServer:serverTimestamp()});
    }));
  }
  return load();
}
async function remove(id){
  await requireAdmin();
  await deleteDoc(doc(db,'results',String(id)));
  return load();
}
window.TSAFirebaseResults={load,add,addMany,remove};

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{ if(auth.currentUser) load().catch(err=>console.error('Firestore sonuç yükleme hatası:',err)); });
}else if(auth.currentUser){
  load().catch(err=>console.error('Firestore sonuç yükleme hatası:',err));
}
