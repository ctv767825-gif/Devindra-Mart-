// ⚡ SAME IMPORTS (unchanged)
import { sampleSettings, sampleCategories, sampleProducts, samplePromos } from './data.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const LS = {
  profile: 'dm_profile',
  cart: 'dm_cart',
  lang: 'dm_lang',
  loggedIn: 'dm_loggedin'
};

const LANG = {
  en: { allProducts:'All Products', search:'Search products', minOrder:'Minimum order value is ₹500', add:'Add to Cart', support:'Support', category:'Category', orderSuccess:'Order sent successfully ✅' },
  hi: { allProducts:'सभी उत्पाद', search:'उत्पाद खोजें', minOrder:'न्यूनतम ऑर्डर राशि ₹500 है', add:'कार्ट में जोड़ें', support:'सहायता', category:'श्रेणी', orderSuccess:'ऑर्डर सफलतापूर्वक भेजा गया ✅' },
  hinglish: { allProducts:'All Products', search:'Products search karein', minOrder:'Minimum order value ₹500 hai', add:'Add to Cart', support:'Support', category:'Category', orderSuccess:'Order successfully bhej diya gaya ✅' }
};

let appDb = null;
let settings = structuredClone(sampleSettings);
let categories = [...sampleCategories];
let products = [...sampleProducts];
let promos = [...samplePromos];
let cart = JSON.parse(localStorage.getItem(LS.cart) || '[]');
let currentLang = localStorage.getItem(LS.lang) || 'hinglish';
let selectedCategory = null;
let selectedSubcategory = null;
let viewMode = 'grid';
let promoIndex = 0;

const $ = (id) => document.getElementById(id);
const t = (k) => LANG[currentLang]?.[k] || k;
const getName = (obj) => obj?.[`name_${currentLang}`] || obj?.name_hinglish || obj?.name_en || obj?.name_hi || obj?.name || '';

function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }
function normalize(v){ return String(v || '').trim().toLowerCase(); }

function safeProfile(){
  return JSON.parse(localStorage.getItem(LS.profile) || '{"name":"Aditya jha ब्राह्मण","phone":"","address":"","landmark":"","city":"","state":"","pincode":"","locationLink":""}');
}

// 👑 OWNER NAME FIX
function seedUI(){
  if ($('storeName')) $('storeName').textContent = settings.storeName;

  if ($('storeTagline')) {
    $('storeTagline').innerHTML =
      `<span class="owner-badge">Founder: Aditya Jha ब्राह्मण</span><br>${settings.tagline}`;
  }

  if ($('noticeBar')) $('noticeBar').textContent = settings.noticeText;
  if ($('allProductsTitle')) $('allProductsTitle').textContent = t('allProducts');
  if ($('searchInput')) $('searchInput').placeholder = t('search');
}

// 🟢 ALL CATEGORY
function renderTopCategories(){
  if (!$('topCategories')) return;

  $('topCategories').innerHTML =
    `<button class="chip" data-cat="all">All</button>` +
    categories.map(c=>`<button class="chip" data-cat="${c.id}">${getName(c)}</button>`).join('');

  document.querySelectorAll('.chip').forEach(btn => btn.onclick = ()=>{
    selectedCategory = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
    selectedSubcategory = null;
    renderProducts();
  });
}

// 🔍 FILTER + SEARCH
function filteredProducts(){
  return products.filter(p => {
    const catOk = !selectedCategory || p.category === selectedCategory;
    const subOk = !selectedSubcategory || p.subcategory === selectedSubcategory;
    const q = ($('searchInput')?.value || '').toLowerCase();
    const searchOk = !q || getName(p).toLowerCase().includes(q);
    return catOk && subOk && searchOk;
  });
}

// 📭 EMPTY STATE
function renderProducts(){
  const root = $('productsGrid');
  if (!root) return;

  const list = filteredProducts();

  if (!list.length) {
    root.innerHTML = `<div class="empty-state">No items found</div>`;
    return;
  }

  root.innerHTML = list.map(p=>`
    <div class="product-card">
      <img src="${p.image}" class="product-img">
      <div class="product-body">
        <h4>${getName(p)}</h4>
        <strong>₹${p.price}</strong>
        <button onclick="addToCart('${p.id}')" class="add-btn">${t('add')}</button>
      </div>
    </div>
  `).join('');
}

// ➕ CART
window.addToCart = function(id){
  const item = products.find(p=>p.id===id);
  if(!item) return;
  cart.push({...item, qty:1});
  localStorage.setItem(LS.cart, JSON.stringify(cart));
};

// 💾 SAVE POPUP
function saveProfile(partial={}){
  const existing = safeProfile();
  const next = { ...existing, ...partial };
  localStorage.setItem(LS.profile, JSON.stringify(next));

  if ($('successToast')) {
    $('successToast').textContent = "Saved successfully ✅";
    show($('successToast'));
    setTimeout(()=>hide($('successToast')), 2000);
  }
}

// 📍 LOCATION CHECK
function bindCheckout(){
  if (!$('checkoutBtn')) return;

  $('checkoutBtn').onclick = ()=>{
    const profile = safeProfile();

    if (!profile.locationLink) {
      alert('Pehle current location add karo 📍');
      return;
    }

    alert('Order placed 🚀');
  };
}

// 🚀 INIT
window.addEventListener('DOMContentLoaded', ()=>{
  seedUI();
  renderTopCategories();
  renderProducts();
  bindCheckout();
});
