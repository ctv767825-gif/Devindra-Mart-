import { sampleSettings, sampleCategories, sampleProducts, samplePromos } from './data.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = (id) => document.getElementById(id);
let db;

async function init(){
  const app = initializeApp(window.firebaseConfig);
  db = getFirestore(app);
  bindTabs();
  bindActions();
  await loadAll();
}

function bindTabs(){
  document.querySelectorAll('.admin-menu-btn').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.admin-menu-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active'); $(btn.dataset.tab).classList.add('active');
  });
}

function bindActions(){
  $('saveSettingsBtn').onclick = saveSettings;
  $('addCategoryBtn').onclick = addCategory;
  $('addProductBtn').onclick = addProduct;
  $('addPromoBtn').onclick = addPromo;
  $('saveFutureBtn').onclick = saveFuture;
  $('seedDemoBtn').onclick = seedDemo;
}

async function saveSettings(){
  const payload = {
    storeName: $('storeNameInput').value || 'Devindra Mart',
    tagline: $('taglineInput').value || 'Ab ghar tak paaye bazaar jaise rate',
    noticeText: $('noticeInput').value || '',
    whatsappNumber: $('whatsappInput').value || '7678256489',
    supportNumber: $('supportInput').value || '7678256489',
    minOrder: Number($('minOrderInput').value || 500),
    storeMapLink: $('storeMapLinkInput').value || '',
    logoUrl: $('logoInput').value || ''
  };
  await setDoc(doc(db,'settings','store'), payload);
  alert('Settings saved');
}

async function addCategory(){
  const payload = {
    name_en: $('catNameEn').value,
    name_hi: $('catNameHi').value,
    name_hinglish: $('catNameHinglish').value,
    support: $('catSupport').value || '7678256489',
    image: $('catImage').value || '',
    subcategories: ($('catSubs').value || '').split(',').map(v=>v.trim()).filter(Boolean)
  };
  await addDoc(collection(db,'categories'), payload);
  await loadCategories();
}

async function addProduct(){
  const payload = {
    name_en: $('prodNameEn').value,
    name_hi: $('prodNameHi').value,
    name_hinglish: $('prodNameHinglish').value,
    category: $('prodCategory').value,
    subcategory: $('prodSubcategory').value,
    price: Number($('prodPrice').value || 0),
    image: $('prodImage').value || '',
    badge: $('prodBadge').value || ''
  };
  await addDoc(collection(db,'products'), payload);
  await loadProducts();
}

async function addPromo(){
  const payload = {
    title: $('promoTitle').value,
    text: $('promoText').value,
    type: $('promoType').value,
    media: $('promoMedia').value
  };
  await addDoc(collection(db,'promos'), payload);
  await loadPromos();
}

async function saveFuture(){
  await setDoc(doc(db,'settings','future'), {
    riderAppName: $('riderAppName').value,
    riderAppLink: $('riderAppLink').value,
    billingAppName: $('billingAppName').value,
    billingAppLink: $('billingAppLink').value,
    receiptPrefix: $('receiptPrefix').value
  });
  alert('Future settings saved');
}

async function loadAll(){
  await Promise.all([loadSettings(), loadCategories(), loadProducts(), loadPromos(), loadOrders()]);
}

async function loadSettings(){
  const snap = await getDoc(doc(db,'settings','store'));
  const s = snap.exists() ? snap.data() : sampleSettings;
  $('storeNameInput').value = s.storeName || '';
  $('taglineInput').value = s.tagline || '';
  $('noticeInput').value = s.noticeText || '';
  $('whatsappInput').value = s.whatsappNumber || '7678256489';
  $('supportInput').value = s.supportNumber || '7678256489';
  $('minOrderInput').value = s.minOrder || 500;
  $('storeMapLinkInput').value = s.storeMapLink || '';
  $('logoInput').value = s.logoUrl || '';
}

async function loadCategories(){
  const snap = await getDocs(collection(db,'categories'));
  const list = snap.empty ? sampleCategories : snap.docs.map(d=>({id:d.id,...d.data()}));
  $('adminCategoryList').innerHTML = list.map(c=>`<div class="admin-item"><strong>${c.name_hinglish || c.name_en}</strong><span>${(c.subcategories||[]).join(', ')}</span><button data-del-cat="${c.id}">Delete</button></div>`).join('');
  document.querySelectorAll('[data-del-cat]').forEach(btn=>btn.onclick=async()=>{ await deleteDoc(doc(db,'categories',btn.dataset.delCat)); loadCategories(); });
}

async function loadProducts(){
  const snap = await getDocs(collection(db,'products'));
  const list = snap.empty ? sampleProducts : snap.docs.map(d=>({id:d.id,...d.data()}));
  $('adminProductList').innerHTML = list.map(p=>`<div class="admin-item"><strong>${p.name_hinglish || p.name_en}</strong><span>${p.category} • ₹${p.price}</span><button data-del-prod="${p.id}">Delete</button></div>`).join('');
  document.querySelectorAll('[data-del-prod]').forEach(btn=>btn.onclick=async()=>{ await deleteDoc(doc(db,'products',btn.dataset.delProd)); loadProducts(); });
}

async function loadPromos(){
  const snap = await getDocs(collection(db,'promos'));
  const list = snap.empty ? samplePromos : snap.docs.map(d=>({id:d.id,...d.data()}));
  $('adminPromoList').innerHTML = list.map(p=>`<div class="admin-item"><strong>${p.title}</strong><span>${p.type}</span><button data-del-promo="${p.id}">Delete</button></div>`).join('');
  document.querySelectorAll('[data-del-promo]').forEach(btn=>btn.onclick=async()=>{ await deleteDoc(doc(db,'promos',btn.dataset.delPromo)); loadPromos(); });
}

async function loadOrders(){
  const snap = await getDocs(collection(db,'orders'));
  const list = snap.docs.map(d=>({id:d.id,...d.data()}));
  $('adminOrders').innerHTML = list.length ? list.map(o=>`<div class="admin-item"><strong>${o.profile?.name || 'Customer'}</strong><span>₹${o.total || 0} • ${o.profile?.phone || ''}</span></div>`).join('') : '<div class="muted">No orders yet</div>';
}

async function seedDemo(){
  await setDoc(doc(db,'settings','store'), sampleSettings);
  for (const c of sampleCategories) await addDoc(collection(db,'categories'), c);
  for (const p of sampleProducts) await addDoc(collection(db,'products'), p);
  for (const pr of samplePromos) await addDoc(collection(db,'promos'), pr);
  await loadAll();
  alert('Demo data seeded');
}

window.addEventListener('DOMContentLoaded', init);
