import { sampleSettings, sampleCategories, sampleProducts, samplePromos } from './data.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
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
  hinglish: { allProducts:'All Products', search:'Products search karein', minOrder:'Minimum order value ₹500 hai', add:'Cart me add karein', support:'Support', category:'Category', orderSuccess:'Order successfully bhej diya gaya ✅' }
};

const firebaseConfig = {
  apiKey: "AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA",
  authDomain: "devindra-mart.firebaseapp.com",
  projectId: "devindra-mart",
  storageBucket: "devindra-mart.firebasestorage.app",
  messagingSenderId: "394816688594",
  appId: "1:394816688594:web:77577dbcade5f19942b80b"
};

let appDb = null;
let settings = structuredClone(sampleSettings);
let categories = structuredClone(sampleCategories);
let products = structuredClone(sampleProducts);
let promos = structuredClone(samplePromos);
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

function persistCart(){ localStorage.setItem(LS.cart, JSON.stringify(cart)); }

function clone(v){
  try { return structuredClone(v); }
  catch(e){ return JSON.parse(JSON.stringify(v)); }
}

function mergeByNameOrId(baseArr, liveArr) {
  const merged = [...clone(baseArr)];
  liveArr.forEach(item => {
    const idx = merged.findIndex(x =>
      (x.id && item.id && normalize(x.id) === normalize(item.id)) ||
      (x.name && item.name && normalize(x.name) === normalize(item.name)) ||
      (getName(x) && item.name && normalize(getName(x)) === normalize(item.name))
    );
    if (idx >= 0) merged[idx] = { ...merged[idx], ...item };
    else merged.push(item);
  });
  return merged;
}

function toSubcategoryArray(value){
  if (Array.isArray(value)) {
    return value.map(s => typeof s === 'string' ? s : (s?.name || '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function mapLiveCategory(item){
  const displayName = item.name || item.name_en || item.name_hinglish || item.name_hi || 'Category';
  return {
    id: item.id || displayName.toLowerCase().replace(/\s+/g, '-'),
    name: displayName,
    name_en: item.name_en || displayName,
    name_hi: item.name_hi || displayName,
    name_hinglish: item.name_hinglish || displayName,
    image: item.image || 'https://via.placeholder.com/300',
    support: item.support || '7678256489',
    action: item.action || 'whatsapp',
    subcategories: toSubcategoryArray(item.subcategory || item.subcategories)
  };
}

function mapLiveProduct(item){
  const displayName = item.name || item.name_en || item.name_hinglish || item.name_hi || 'Product';
  return {
    id: item.id || displayName.toLowerCase().replace(/\s+/g, '-'),
    name: displayName,
    name_en: item.name_en || displayName,
    name_hi: item.name_hi || displayName,
    name_hinglish: item.name_hinglish || displayName,
    category: item.category || '',
    subcategory: item.subcategory || '',
    price: Number(item.price || 0),
    image: item.image || 'https://via.placeholder.com/300',
    badge: item.badge || 'Featured',
    stock: item.stock || 'In Stock',
    support: item.support || '7678256489'
  };
}

function mapLivePromo(item){
  return {
    id: item.id || String(Date.now()),
    title: item.title || '',
    text: item.text || '',
    media: item.media || '',
    type: item.type || 'image'
  };
}

function rerenderAfterLiveSync(){
  try {
    seedUI();
    renderPromos();
    renderTopCategories();
    renderProducts();
    renderCartBar();
    if (!$('categorySheet')?.classList.contains('hidden')) renderCategorySheet();
    if (!$('cartSheet')?.classList.contains('hidden')) renderCartSheet();
  } catch(e) {
    console.warn('rerender failed', e);
  }
}

async function initFirebase(){
  try {
    const app = initializeApp(firebaseConfig);
    appDb = getFirestore(app);

    // store settings live
    onSnapshot(doc(appDb, 'settings', 'store'), (snap) => {
      if (snap.exists()) {
        settings = { ...settings, ...snap.data() };
        rerenderAfterLiveSync();
      }
    });

    // categories live
    onSnapshot(collection(appDb, 'categories'), (snap) => {
      const liveCategories = snap.docs.map(d => mapLiveCategory({ id: d.id, ...d.data() }));
      if (liveCategories.length) {
        categories = mergeByNameOrId(sampleCategories, liveCategories);
        if (!selectedCategory && categories[0]) selectedCategory = categories[0].id;
        rerenderAfterLiveSync();
      }
    });

    // products live
    onSnapshot(collection(appDb, 'products'), (snap) => {
      const liveProducts = snap.docs.map(d => mapLiveProduct({ id: d.id, ...d.data() }));
      if (liveProducts.length) {
        products = mergeByNameOrId(sampleProducts, liveProducts);
        rerenderAfterLiveSync();
      }
    });

    // promos live
    onSnapshot(collection(appDb, 'promos'), (snap) => {
      const livePromos = snap.docs.map(d => mapLivePromo({ id: d.id, ...d.data() }));
      if (livePromos.length) {
        promos = livePromos;
        promoIndex = 0;
        rerenderAfterLiveSync();
      }
    });

    // initial settings fallback
    try {
      const sRef = doc(appDb, 'settings', 'store');
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) settings = { ...settings, ...sSnap.data() };
    } catch(e){ console.warn(e); }

  } catch(e){
    console.warn('Firestore fallback', e);
  }
}

function seedUI(){
  if ($('storeName')) $('storeName').textContent = settings.storeName || 'Devindra Mart';
  if ($('storeTagline')) $('storeTagline').textContent = settings.tagline || 'Ab ghar tak paaye bazaar jaise rate';
  if ($('noticeBar')) $('noticeBar').textContent = settings.noticeText || 'Fresh deals today • Minimum order ₹500 • Fast delivery';
  if ($('allProductsTitle')) $('allProductsTitle').textContent = t('allProducts');
  if ($('searchInput')) $('searchInput').placeholder = t('search');
  if ($('helpCall')) $('helpCall').href = `tel:${settings.supportNumber || '7678256489'}`;
  if ($('helpWhatsApp')) $('helpWhatsApp').href = `https://wa.me/91${settings.whatsappNumber || '7678256489'}`;
}

function renderPromos(){
  const root = $('promoSlider');
  if (!root) return;
  if (!promos.length) {
    root.innerHTML = '';
    return;
  }
  const p = promos[promoIndex % promos.length];
  root.innerHTML = `
    <div class="promo-slide">
      <img src="${p.media}" alt="promo" class="promo-media">
      <div class="promo-overlay">
        <h2>${p.title || ''}</h2>
        <p>${p.text || ''}</p>
      </div>
    </div>
  `;
}

function renderTopCategories(){
  const top = $('topCategories');
  if (!top) return;
  top.innerHTML = categories.map(c=>`<button class="chip" data-cat="${c.id}">${getName(c)}</button>`).join('');
  document.querySelectorAll('.chip').forEach(btn => btn.onclick = ()=>{
    selectedCategory = btn.dataset.cat;
    selectedSubcategory = null;
    renderProducts();
  });
}

function renderCategorySheet(){
  const mainList = $('mainCategoryList');
  const subList = $('subCategoryList');
  if (!mainList || !subList) return;

  if (!selectedCategory && categories[0]) selectedCategory = categories[0].id;

  mainList.innerHTML = categories.map(c=>`
    <button class="main-cat-btn ${selectedCategory===c.id?'active':''}" data-cat="${c.id}">
      ${getName(c)}
    </button>
  `).join('');

  document.querySelectorAll('.main-cat-btn').forEach(btn=>btn.onclick=()=>{
    selectedCategory = btn.dataset.cat;
    selectedSubcategory = null;
    renderCategorySheet();
    renderProducts();
  });

  const cat = categories.find(c=>c.id===selectedCategory) || categories[0];
  const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];
  subList.innerHTML = subs.map(s=>`
    <button class="sub-chip ${selectedSubcategory===s?'active':''}" data-sub="${s}">${s}</button>
  `).join('');

  document.querySelectorAll('.sub-chip').forEach(btn=>btn.onclick=()=>{
    selectedSubcategory = btn.dataset.sub;
    hide($('categorySheet'));
    renderProducts();
  });
}

function filteredProducts(){
  return products.filter(p => {
    const selectedCatObj = categories.find(c=>c.id===selectedCategory) || {};
    const selectedCatName = getName(selectedCatObj);

    const catOk =
      !selectedCategory ||
      normalize(p.category) === normalize(selectedCatName) ||
      normalize(p.category) === normalize(selectedCategory) ||
      normalize(p.category) === normalize(selectedCatObj.name);

    const subOk =
      !selectedSubcategory ||
      normalize(p.subcategory) === normalize(selectedSubcategory);

    const q = ($('searchInput')?.value || '').trim().toLowerCase();
    const searchOk = !q || [
      p.name_en, p.name_hi, p.name_hinglish, p.name,
      p.category, p.subcategory
    ].join(' ').toLowerCase().includes(q);

    return catOk && subOk && searchOk;
  });
}

function renderProducts(){
  const root = $('productsGrid');
  if (!root) return;

  root.className = viewMode==='grid' ? 'products-grid' : 'products-list';
  const list = filteredProducts();

  root.innerHTML = list.map(p=>`
    <article class="product-card ${viewMode}">
      <img class="product-img" src="${p.image}" alt="${getName(p)}">
      <div class="product-body">
        <div class="badge">${p.badge || 'Featured'}</div>
        <h4>${getName(p)}</h4>
        <div class="meta">${p.category || ''} • ${p.subcategory || ''}</div>
        <div class="price-row">
          <strong>₹${p.price}</strong>
          <button class="add-btn" data-id="${p.id}">${t('add')}</button>
        </div>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.add-btn').forEach(btn=>btn.onclick=()=>addToCart(btn.dataset.id));

  const active = [];
  if (selectedCategory){
    const c = categories.find(x=>x.id===selectedCategory);
    if(c) active.push(getName(c));
  }
  if (selectedSubcategory) active.push(selectedSubcategory);

  if ($('activeFilterBar')) {
    if (active.length){
      $('activeFilterBar').innerHTML = active.map(a=>`<span class="filter-pill">${a}</span>`).join('');
      show($('activeFilterBar'));
    } else {
      hide($('activeFilterBar'));
    }
  }
}

function addToCart(id){
  const item = products.find(p=>p.id===id);
  if(!item) return;
  const found = cart.find(c=>c.id===id);
  if(found) found.qty += 1;
  else cart.push({...item, qty:1});
  persistCart();
  renderCartBar();
}

function deliveryCharge(subtotal){
  const rules = settings.deliveryRules || [
    { min: 0, max: 999, charge: 50 },
    { min: 1000, max: 2999, charge: 30 },
    { min: 3000, max: 4999, charge: 20 },
    { min: 5000, max: 999999, charge: 10 }
  ];
  const r = rules.find(r=>subtotal>=r.min && subtotal<=r.max);
  return r ? r.charge : 0;
}

function totals(){
  const subtotal = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  const delivery = subtotal ? deliveryCharge(subtotal) : 0;
  return { subtotal, delivery, total: subtotal+delivery };
}

function renderCartBar(){
  if(!cart.length){
    hide($('cartBar'));
    return;
  }
  const {total} = totals();
  if ($('cartCountText')) $('cartCountText').textContent = `${cart.reduce((s,i)=>s+i.qty,0)} items`;
  if ($('cartTotalText')) $('cartTotalText').textContent = `₹${total}`;
  show($('cartBar'));
}

function renderCartSheet(){
  const root = $('cartItems');
  if (!root) return;

  if(!cart.length){
    root.innerHTML = '<p class="muted">Cart is empty</p>';
  } else {
    root.innerHTML = cart.map(i=>`
      <div class="cart-item">
        <img src="${i.image}">
        <div>
          <strong>${getName(i)}</strong>
          <div>${i.qty} x ₹${i.price}</div>
        </div>
        <button class="qty-btn" data-id="${i.id}">Remove</button>
      </div>
    `).join('');
  }

  document.querySelectorAll('.qty-btn').forEach(btn=>btn.onclick=()=>{
    cart = cart.filter(i=>i.id!==btn.dataset.id);
    persistCart();
    renderCartSheet();
    renderCartBar();
  });

  const {subtotal,delivery,total}=totals();
  if ($('subtotalText')) $('subtotalText').textContent=`₹${subtotal}`;
  if ($('deliveryText')) $('deliveryText').textContent=`₹${delivery}`;
  if ($('finalTotalText')) $('finalTotalText').textContent=`₹${total}`;
}

function bindSheets(){
  document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>hide($(btn.dataset.close)));

  if ($('supportBtn')) $('supportBtn').onclick=()=>show($('supportSheet'));
  if ($('categoryBtn')) $('categoryBtn').onclick=()=>{
    show($('categorySheet'));
    if(!selectedCategory && categories[0]) selectedCategory=categories[0].id;
    renderCategorySheet();
  };
  if ($('profileBtn')) $('profileBtn').onclick=()=>{
    loadProfileForm();
    show($('profileSheet'));
  };
  if ($('langBtn')) $('langBtn').onclick=()=>show($('langSheet'));
  if ($('openCartBtn')) $('openCartBtn').onclick=()=>{
    renderCartSheet();
    show($('cartSheet'));
  };
}

function loadProfileForm(){
  const p = safeProfile();
  if ($('editName')) $('editName').value = p.name || 'Aditya jha ब्राह्मण';
  if ($('editPhone')) $('editPhone').value = p.phone || '';
  if ($('editAddress')) $('editAddress').value = p.address || '';
  if ($('editLandmark')) $('editLandmark').value = p.landmark || '';
  if ($('editCity')) $('editCity').value = p.city || '';
  if ($('editState')) $('editState').value = p.state || '';
  if ($('editPincode')) $('editPincode').value = p.pincode || '';
}

function saveProfile(partial={}){
  const existing = safeProfile();
  const next = { ...existing, ...partial };
  localStorage.setItem(LS.profile, JSON.stringify(next));
}

function bindAuth(){
  if(localStorage.getItem(LS.loggedIn)==='yes'){
    hide($('loginScreen'));
    hide($('addressScreen'));
    show($('appScreen'));
    return;
  }

  if ($('showRobotBtn')) $('showRobotBtn').onclick = ()=>{
    const num = ($('loginPhone')?.value || '').trim();
    if(num.length < 10) return alert('Enter valid mobile number');
    show($('robotWrap'));
  };

  if ($('verifyBtn')) $('verifyBtn').onclick = ()=>{
    const num = ($('loginPhone')?.value || '').trim();
    if(!$('robotCheck')?.checked) return alert("Please verify you're not a robot");
    localStorage.setItem('login_phone', num);
    saveProfile({ phone: num, name: safeProfile().name || 'Aditya jha ब्राह्मण' });
    hide($('loginScreen'));
    show($('addressScreen'));
    if ($('profilePhone')) $('profilePhone').value = num;
  };

  if ($('detectLocationBtn')) $('detectLocationBtn').onclick = ()=>captureLocation('profileAddress', 'locationHint');

  if ($('saveAddressBtn')) $('saveAddressBtn').onclick = ()=>{
    saveProfile({
      name: $('profileName')?.value || 'Aditya jha ब्राह्मण',
      phone: $('profilePhone')?.value || '',
      address: $('profileAddress')?.value || '',
      landmark: $('profileLandmark')?.value || ''
    });
    localStorage.setItem(LS.loggedIn,'yes');
    hide($('addressScreen'));
    show($('appScreen'));
  };
}

function bindProfile(){
  if ($('saveProfileBtn')) $('saveProfileBtn').onclick = ()=>{
    saveProfile({
      name: $('editName')?.value || '',
      address: $('editAddress')?.value || '',
      landmark: $('editLandmark')?.value || '',
      city: $('editCity')?.value || '',
      state: $('editState')?.value || '',
      pincode: $('editPincode')?.value || ''
    });
    hide($('profileSheet'));
  };

  if ($('profileLocationBtn')) $('profileLocationBtn').onclick = ()=>captureLocation(null, null, true);

  if ($('logoutBtn')) $('logoutBtn').onclick = ()=>{
    localStorage.removeItem(LS.loggedIn);
    localStorage.removeItem(LS.cart);
    cart = [];
    hide($('appScreen'));
    hide($('profileSheet'));
    show($('loginScreen'));
  };
}

function captureLocation(targetId, hintId, forProfile=false){
  if(!navigator.geolocation) return alert('Location not supported');
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    if(targetId && $(targetId)) $(targetId).value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    if(hintId && $(hintId)) $(hintId).textContent = 'Location added successfully';
    saveProfile({ locationLink: mapLink });
  }, ()=>alert('Unable to fetch current location'));
}

function bindLanguage(){
  document.querySelectorAll('.lang-opt').forEach(btn=>btn.onclick=()=>{
    currentLang = btn.dataset.lang;
    localStorage.setItem(LS.lang, currentLang);
    hide($('langSheet'));
    seedUI();
    renderTopCategories();
    renderProducts();
    renderCartBar();
  });
}

function bindSearchAndView(){
  if ($('searchInput')) $('searchInput').oninput = renderProducts;
  if ($('gridBtn')) $('gridBtn').onclick = ()=>{
    viewMode='grid';
    $('gridBtn')?.classList.add('active');
    $('listBtn')?.classList.remove('active');
    renderProducts();
  };
  if ($('listBtn')) $('listBtn').onclick = ()=>{
    viewMode='list';
    $('listBtn')?.classList.add('active');
    $('gridBtn')?.classList.remove('active');
    renderProducts();
  };
  if ($('voiceBtn')) $('voiceBtn').onclick = ()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return alert('Voice search not supported on this device');
    const rec = new SR();
    rec.lang='en-IN';
    rec.onresult=(e)=>{
      if ($('searchInput')) $('searchInput').value = e.results[0][0].transcript;
      renderProducts();
    };
    rec.start();
  };
}

function bindHelperBot(){
  document.querySelectorAll('[data-bot]').forEach(btn=>btn.onclick=()=>{
    const type = btn.dataset.bot;
    let msg='';
    if(type==='stock') msg='Stock available for top categories. Open Category to browse current items.';
    if(type==='delivery') msg='Delivery charges: ₹50 up to ₹999, ₹30 up to ₹2999, ₹20 up to ₹4999, ₹10 above ₹5000.';
    if(type==='minimum') msg='Minimum order is ₹500.';
    if(type==='support') msg=`Support & WhatsApp: ${settings.supportNumber || '7678256489'}`;
    const div = document.createElement('div');
    div.className='bot-msg';
    div.textContent=msg;
    $('botMessages')?.appendChild(div);
  });
}

function bindCheckout(){
  if (!$('checkoutBtn')) return;

  $('checkoutBtn').onclick = async ()=>{
    const profile = safeProfile();
    if(!cart.length) return alert('Cart is empty');

    const { subtotal, delivery, total } = totals();
    if(total < (settings.minOrder || 500)) return alert(t('minOrder'));

    const lines = cart.map(i=>`• ${getName(i)} x${i.qty} = ₹${i.qty*i.price}`)
