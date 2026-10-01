import { db } from './firebase-core.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

async function submitApplication(app){
  const clean={
    id:String(app.id||''),
    basvuruNo:String(app.basvuruNo||''),
    type:String(app.type||''),
    ad:String(app.ad||''),
    veliAd:String(app.veliAd||''),
    ogrenciTelefon:String(app.ogrenciTelefon||''),
    telefon:String(app.telefon||''),
    sinif:String(app.sinif||''),
    program:String(app.program||''),
    ilce:String(app.ilce||''),
    okul:String(app.okul||''),
    not:String(app.not||''),
    status:'Yeni Başvuru',
    createdAt:String(app.createdAt||new Date().toISOString()),
    createdAtServer:serverTimestamp()
  };
  if(!clean.id || !clean.basvuruNo || !clean.ad || !clean.telefon) throw new Error('Başvuru bilgileri eksik.');
  await setDoc(doc(db,'applications',clean.id),clean);
  return clean;
}
window.TSAFirebaseApplicationsPublic={submit:submitApplication};
