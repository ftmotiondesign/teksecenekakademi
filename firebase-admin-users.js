import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db, firebaseConfig, OWNER_EMAIL, requireAdmin } from './firebase-core.js';

const SECONDARY_APP_NAME='tsa-admin-creator';

function normEmail(v){return String(v||'').trim().toLowerCase()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]))}

async function ensureOwnerRecord(){
  const user=await requireAdmin();
  if(normEmail(user.email)!==OWNER_EMAIL)return;
  await setDoc(doc(db,'admins',String(user.uid)),{
    email:OWNER_EMAIL,
    name:'Ana Yönetici',
    role:'owner',
    active:true,
    protected:true,
    updatedAt:serverTimestamp()
  },{merge:true});
}

async function readAdmins(){
  await requireAdmin();
  await ensureOwnerRecord();
  const snap=await getDocs(collection(db,'admins'));
  const rows=[];
  snap.forEach(d=>rows.push({id:d.id,...(d.data()||{})}));
  rows.sort((a,b)=>{
    if(normEmail(a.email)===OWNER_EMAIL)return -1;
    if(normEmail(b.email)===OWNER_EMAIL)return 1;
    return String(a.name||a.email||'').localeCompare(String(b.name||b.email||''),'tr');
  });
  return rows;
}

function render(rows){
  const el=document.getElementById('adminUsersList');
  if(!el)return;
  if(!rows.length){
    el.innerHTML='<div class="empty">Henüz yönetici kaydı yok.</div>';
    return;
  }
  el.innerHTML='<div class="table-wrap"><table class="table" style="min-width:720px"><thead><tr><th>Yönetici</th><th>E-posta</th><th>Rol</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>'+
    rows.map(x=>{
      const owner=normEmail(x.email)===OWNER_EMAIL || x.role==='owner';
      const active=x.active!==false;
      return '<tr>'+
        '<td><b>'+esc(x.name||'Yönetici')+'</b></td>'+
        '<td>'+esc(x.email||'-')+'</td>'+
        '<td><span class="pill">'+(owner?'Ana Yönetici':'Yönetici')+'</span></td>'+
        '<td><span class="pill" style="'+(active?'background:#e9f8f0;color:#187f4a':'background:#ffeded;color:#bd3030')+'">'+(active?'Aktif':'Pasif')+'</span></td>'+
        '<td style="display:flex;gap:7px;flex-wrap:wrap">'+
          '<button class="secondary" type="button" data-admin-reset="'+esc(x.email||'')+'">Şifre Sıfırla</button>'+
          (owner?'':'<button class="'+(active?'danger':'primary')+'" type="button" data-admin-toggle="'+esc(x.id)+'" data-admin-active="'+(active?'1':'0')+'">'+(active?'Pasif Yap':'Aktif Yap')+'</button>')+
        '</td>'+
      '</tr>';
    }).join('')+
  '</tbody></table></div>';
}

async function load(){
  const rows=await readAdmins();
  render(rows);
  window.dispatchEvent(new CustomEvent('tsa:admins-updated',{detail:rows}));
  return rows;
}

function getSecondaryAuth(){
  let secondary=getApps().find(a=>a.name===SECONDARY_APP_NAME);
  if(!secondary)secondary=initializeApp(firebaseConfig,SECONDARY_APP_NAME);
  return getAuth(secondary);
}

async function createAdmin({name,email,password}){
  const current=await requireAdmin();
  name=String(name||'').trim();
  email=normEmail(email);
  password=String(password||'');
  if(!name)throw new Error('Yönetici adı gerekli.');
  if(!email || !email.includes('@'))throw new Error('Geçerli bir e-posta adresi yazın.');
  if(password.length<6)throw new Error('Şifre en az 6 karakter olmalı.');
  if(email===OWNER_EMAIL)throw new Error('Bu e-posta zaten ana yönetici hesabına ait.');

  const secondaryAuth=getSecondaryAuth();
  let credential=null;
  try{
    credential=await createUserWithEmailAndPassword(secondaryAuth,email,password);
    await updateProfile(credential.user,{displayName:name});
    await setDoc(doc(db,'admins',String(credential.user.uid)),{
      email,
      name,
      role:'admin',
      active:true,
      protected:false,
      createdBy:String(current.uid||''),
      createdByEmail:normEmail(current.email),
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{merge:false});
    await signOut(secondaryAuth);
  }catch(err){
    if(credential && credential.user){
      try{await deleteUser(credential.user)}catch(e){console.warn('Yetkisiz kullanıcı geri alınamadı:',e)}
    }
    try{await signOut(secondaryAuth)}catch(e){}
    if(err && err.code==='auth/email-already-in-use')throw new Error('Bu e-posta Firebase Authentication içinde zaten kayıtlı.');
    if(err && err.code==='auth/weak-password')throw new Error('Şifre en az 6 karakter olmalı.');
    if(err && err.code==='auth/invalid-email')throw new Error('E-posta adresi geçersiz.');
    throw err;
  }
  return load();
}

async function setActive(id,active){
  await requireAdmin();
  const rows=await readAdmins();
  const row=rows.find(x=>String(x.id)===String(id));
  if(!row)throw new Error('Yönetici bulunamadı.');
  if(normEmail(row.email)===OWNER_EMAIL || row.role==='owner')throw new Error('Ana yönetici pasif yapılamaz.');
  await updateDoc(doc(db,'admins',String(id)),{active:!!active,updatedAt:serverTimestamp()});
  return load();
}

async function resetPassword(email){
  await requireAdmin();
  email=normEmail(email);
  if(!email)throw new Error('E-posta bulunamadı.');
  await sendPasswordResetEmail(auth,email);
  return true;
}

function showMessage(text,type='ok'){
  const box=document.getElementById('adminUsersMessage');
  if(!box)return;
  box.textContent=text;
  box.style.display='block';
  box.style.background=type==='error'?'#ffeded':'#e9f8f0';
  box.style.color=type==='error'?'#bd3030':'#187f4a';
}

function bind(){
  const form=document.getElementById('adminCreateForm');
  if(form && !form.dataset.bound){
    form.dataset.bound='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=document.getElementById('createAdminBtn');
      const old=btn.textContent;
      btn.disabled=true;btn.textContent='Oluşturuluyor...';
      try{
        await createAdmin({
          name:document.getElementById('newAdminName').value,
          email:document.getElementById('newAdminEmail').value,
          password:document.getElementById('newAdminPassword').value
        });
        form.reset();
        showMessage('✓ Yeni yönetici oluşturuldu ve aktif edildi.');
      }catch(err){
        showMessage('Yönetici oluşturulamadı: '+(err&&err.message?err.message:err),'error');
      }finally{
        btn.disabled=false;btn.textContent=old;
      }
    });
  }

  const list=document.getElementById('adminUsersList');
  if(list && !list.dataset.bound){
    list.dataset.bound='1';
    list.addEventListener('click',async e=>{
      const reset=e.target.closest('[data-admin-reset]');
      const toggle=e.target.closest('[data-admin-toggle]');
      if(reset){
        const email=reset.getAttribute('data-admin-reset');
        reset.disabled=true;
        try{await resetPassword(email);showMessage('Şifre sıfırlama bağlantısı '+email+' adresine gönderildi.')}
        catch(err){showMessage('Şifre sıfırlama gönderilemedi: '+(err&&err.message?err.message:err),'error')}
        finally{reset.disabled=false}
        return;
      }
      if(toggle){
        const id=toggle.getAttribute('data-admin-toggle');
        const currentlyActive=toggle.getAttribute('data-admin-active')==='1';
        if(currentlyActive && !confirm('Bu yöneticiyi pasif yapmak istiyor musunuz?'))return;
        toggle.disabled=true;
        try{
          await setActive(id,!currentlyActive);
          showMessage(currentlyActive?'Yönetici pasif yapıldı.':'Yönetici yeniden aktif edildi.');
        }catch(err){showMessage('İşlem başarısız: '+(err&&err.message?err.message:err),'error')}
        finally{toggle.disabled=false}
      }
    });
  }
}

window.TSAFirebaseAdminUsers={load,createAdmin,setActive,resetPassword};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();

if(typeof auth.authStateReady==='function'){
  auth.authStateReady().then(()=>{if(auth.currentUser)load().catch(err=>console.error('Yöneticiler yüklenemedi:',err))});
}
