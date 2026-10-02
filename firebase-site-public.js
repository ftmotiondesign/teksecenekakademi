import { db } from './firebase-core.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const SITE_CONTENT_KEY='tsa_site_content_v1';
const HERO_KEY='tsa_hero_slides_v1';
const SETTINGS_KEY='tsa_site_settings_v1';

async function loadSiteContent(){
  const snap=await getDoc(doc(db,'siteConfig','content'));
  if(!snap.exists())return {};
  const data=snap.data()||{};
  localStorage.setItem(SITE_CONTENT_KEY,JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('tsa:site-content-updated',{detail:data}));
  return data;
}

async function loadSettings(){
  const snap=await getDoc(doc(db,'siteConfig','settings'));
  if(!snap.exists())return {};
  const data=snap.data()||{};
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('tsa:settings-updated',{detail:data}));
  return data;
}

async function loadHero(){
  const snap=await getDoc(doc(db,'siteConfig','hero'));
  if(!snap.exists())return [];
  const data=snap.data()||{};
  const slides=Array.isArray(data.slides)?data.slides:[];
  localStorage.setItem(HERO_KEY,JSON.stringify(slides));
  window.dispatchEvent(new CustomEvent('tsa:hero-updated',{detail:slides}));
  return slides;
}

window.TSAFirebaseSitePublic={loadSiteContent,loadHero,loadSettings,loadAll:async()=>({content:await loadSiteContent(),hero:await loadHero(),settings:await loadSettings()})};
Promise.all([loadSiteContent(),loadHero(),loadSettings()]).catch(err=>console.error('Site ayarları Firebase’den yüklenemedi:',err));
