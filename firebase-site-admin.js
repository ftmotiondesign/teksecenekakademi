import { auth, db } from './firebase-core.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_EMAIL='ftmotiondesign@gmail.com';
const SITE_CONTENT_KEY='tsa_site_content_v1';
const HERO_KEY='tsa_hero_slides_v1';
const SETTINGS_KEY='tsa_site_settings_v1';

async function requireAdmin(){
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || String(u.email||'').trim().toLowerCase()!==ADMIN_EMAIL)throw new Error('Yönetici Firebase oturumu bulunamadı.');
}

function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail}));}

async function loadSiteContent(){
  await requireAdmin();
  const snap=await getDoc(doc(db,'siteConfig','content'));
  if(snap.exists()){
    const data=snap.data()||{};
    localStorage.setItem(SITE_CONTENT_KEY,JSON.stringify(data));
    emit('tsa:site-content-updated',data);
    return data;
  }
  let local={};
  try{local=JSON.parse(localStorage.getItem(SITE_CONTENT_KEY)||'{}')}catch(e){}
  if(local && Object.keys(local).length){
    await saveSiteContent(local);
    return local;
  }
  return {};
}

async function saveSiteContent(data){
  await requireAdmin();
  const payload={...(data||{})};
  await setDoc(doc(db,'siteConfig','content'),{...payload,updatedAt:serverTimestamp()},{merge:true});
  localStorage.setItem(SITE_CONTENT_KEY,JSON.stringify(payload));
  emit('tsa:site-content-updated',payload);
  return payload;
}

async function loadHero(){
  await requireAdmin();
  const snap=await getDoc(doc(db,'siteConfig','hero'));
  if(snap.exists()){
    const data=snap.data()||{};
    const slides=Array.isArray(data.slides)?data.slides:[];
    localStorage.setItem(HERO_KEY,JSON.stringify(slides));
    emit('tsa:hero-updated',slides);
    return slides;
  }
  let local=[];
  try{local=JSON.parse(localStorage.getItem(HERO_KEY)||'[]')}catch(e){}
  if(Array.isArray(local)&&local.length){
    return saveHero(local);
  }
  return [];
}

async function saveHero(slides){
  await requireAdmin();
  if(!Array.isArray(slides))throw new Error('Banner listesi geçersiz.');
  const fallbackImages=['bina.png','Başlıksız-1.png','Başlıksız-2.png'];
  const normalized=slides.map((x,i)=>{
    const item={...(x||{})};
    if(typeof item.image==='string' && item.image.startsWith('data:image/')){
      item.image=fallbackImages[i]||'bina.png';
    }
    return item;
  });
  await setDoc(doc(db,'siteConfig','hero'),{slides:normalized,updatedAt:serverTimestamp()},{merge:false});
  localStorage.setItem(HERO_KEY,JSON.stringify(normalized));
  emit('tsa:hero-updated',normalized);
  return normalized;
}

async function loadSettings(){
  await requireAdmin();
  const snap=await getDoc(doc(db,'siteConfig','settings'));
  if(snap.exists()){
    const data=snap.data()||{};
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(data));
    emit('tsa:settings-updated',data);
    return data;
  }
  let local={};
  try{local=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch(e){}
  const defaults={
    mobile:'0552 695 97 57',
    landline:'0236 238 00 66',
    address:'Utku Mah. Çimentepe Cd. No: 4/4, 45060 Şehzadeler / Manisa',
    instagram:'@manisateksecenekakademi'
  };
  const data=Object.keys(local||{}).length?local:defaults;
  await saveSettings(data);
  return data;
}

async function saveSettings(data){
  await requireAdmin();
  const payload={...(data||{})};
  await setDoc(doc(db,'siteConfig','settings'),{...payload,updatedAt:serverTimestamp()},{merge:true});
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(payload));
  emit('tsa:settings-updated',payload);
  return payload;
}

async function loadAll(){
  await requireAdmin();
  await loadSiteContent();
  await loadHero();
  await loadSettings();
}

window.TSAFirebaseSite={loadAll,loadSiteContent,saveSiteContent,loadHero,saveHero,loadSettings,saveSettings};

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)loadAll().catch(err=>console.error('Site Firebase yükleme hatası:',err))});
}
