import { sampleSettings, sampleCategories, sampleProducts, samplePromos } from './data.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const getName = (obj) => obj[`name_${currentLang}`] || obj.name_hinglish || obj.name_en || obj.name_hi || obj.name || '';

function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }

function safeProfile(){
  return JSON.parse(localStorage.getItem(LS.profile) || '{"name":"Aditya jha ब्राह्मण","phone":"","address":"","landmark":"","city":"","state":"","pincode":"","locationLink":""}');
}

async function initFirebase(){
  try {
    const app = initializeApp(window.firebaseConfig);
    appDb = getFirestore(app);
    await loadRemoteData();
  } catch(e){
    console.warn('Firestore fallback', e);
  }
}

async function loadRemoteData(){
  try {
    const sRef = doc(appDb, 'settings', 'store');
    const sSnap = await getDoc(sRef);
    if (sSnap.exists()) settings = { ...settings, ...sSnap.data() };
    const [catSnap, prodSnap, promoSnap] = await Promise.all([
      getDocs(collection(appDb,'categories')),
      getDocs(collection(appDb,'products')),
      getDocs(collection(appDb,'promos'))
    ]);
    if (!catSnap.empty) categories = catSnap.docs.map(d=>({id:d.id,...d.data()}));
    if (!prodSnap.empty) products = prodSnap.docs.map(d=>({id:d.id,...d.data()}));
    if (!promoSnap.empty) promos = promoSnap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e){ console.warn(e); }
}

function seedUI(){
  $('storeName').textContent = settings.storeName;
  $('storeTagline').textContent = settings.tagline;
  $('noticeBar').textContent = settings.noticeText;
  $('allProductsTitle').textContent = t('allProducts');
  $('searchInput').placeholder = t('search');
  $('helpCall').href = `tel:${settings.supportNumber}`;
  $('helpWhatsApp').href = `https://wa.me/91${settings.whatsappNumber}`;
}

function renderPromos(){
  const root = $('promoSlider');
  if (!promos.length) return root.innerHTML = '';
  const p = promos[promoIndex % promos.length];
  root.innerHTML = `<div class="promo-slide"><img src="${p.media}" alt="promo" class="promo-media"><div class="promo-overlay"><h2>${p.title||''}</h2><p>${p.text||''}</p></div></div>`;
}

function renderTopCategories(){
  $('topCategories').innerHTML = categories.map(c=>`<button class="chip" data-cat="${c.id}">${getName(c)}</button>`).join('');
  document.querySelectorAll('.chip').forEach(btn => btn.onclick = ()=>{ selectedCategory = btn.dataset.cat; selectedSubcategory = null; renderProducts(); });
}

function renderCategorySheet(){
  $('mainCategoryList').innerHTML = categories.map(c=>`<button class="main-cat-btn ${selectedCategory===c.id?'active':''}" data-cat="${c.id}">${getName(c)}</button>`).join('');
  document.querySelectorAll('.main-cat-btn').forEach(btn=>btn.onclick=()=>{ selectedCategory = btn.dataset.cat; selectedSubcategory = null; renderCategorySheet(); renderProducts(); });
  const cat = categories.find(c=>c.id===selectedCategory) || categories[0];
  const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];
  $('subCategoryList').innerHTML = subs.map(s=>`<button class="sub-chip ${selectedSubcategory===s?'active':''}" data-sub="${s}">${s}</button>`).join('');
  document.querySelectorAll('.sub-chip').forEach(btn=>btn.onclick=()=>{ selectedSubcategory = btn.dataset.sub; hide($('categorySheet')); renderProducts(); });
}

function filteredProducts(){
  return products.filter(p => {
    const catOk = !selectedCategory || normalize(p.category) === normalize(getName(categories.find(c=>c.id===selectedCategory)||{})) || normalize(p.category)===normalize(selectedCategory);
    const subOk = !selectedSubcategory || normalize(p.subcategory)===normalize(selectedSubcategory);
    const q = ($('searchInput')?.value || '').trim().toLowerCase();
    const searchOk = !q || [p.name_en,p.name_hi,p.name_hinglish,p.category,p.subcategory].join(' ').toLowerCase().includes(q);
    return catOk && subOk && searchOk;
  });
}
function normalize(v){ return String(v||'').toLowerCase(); }

function renderProducts(){
  const root = $('productsGrid');
  root.className = viewMode==='grid' ? 'products-grid' : 'products-list';
  const list = filteredProducts();
  root.innerHTML = list.map(p=>`
    <article class="product-card ${viewMode}">
      <img class="product-img" src="${p.image}" alt="${getName(p)}">
      <div class="product-body">
        <div class="badge">${p.badge || 'Featured'}</div>
        <h4>${getName(p)}</h4>
        <div class="meta">${p.category} • ${p.subcategory || ''}</div>
        <div class="price-row"><strong>₹${p.price}</strong><button class="add-btn" data-id="${p.id}">${t('add')}</button></div>
      </div>
    </article>
  `).join('');
  document.querySelectorAll('.add-btn').forEach(btn=>btn.onclick=()=>addToCart(btn.dataset.id));
  const active = [];
  if (selectedCategory){ const c=categories.find(x=>x.id===selectedCategory); if(c) active.push(getName(c)); }
  if (selectedSubcategory) active.push(selectedSubcategory);
  if (active.length){ $('activeFilterBar').innerHTML = active.map(a=>`<span class="filter-pill">${a}</span>`).join(''); show($('activeFilterBar')); } else hide($('activeFilterBar'));
}

function addToCart(id){
  const item = products.find(p=>p.id===id); if(!item) return;
  const found = cart.find(c=>c.id===id);
  if(found) found.qty += 1; else cart.push({...item, qty:1});
  persistCart(); renderCartBar();
}
function persistCart(){ localStorage.setItem(LS.cart, JSON.stringify(cart)); }
function deliveryCharge(subtotal){
  const r = settings.deliveryRules.find(r=>subtotal>=r.min && subtotal<=r.max);
  return r ? r.charge : 0;
}
function totals(){
  const subtotal = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  const delivery = subtotal ? deliveryCharge(subtotal) : 0;
  return { subtotal, delivery, total: subtotal+delivery };
}
function renderCartBar(){
  if(!cart.length){ hide($('cartBar')); return; }
  const {total} = totals();
  $('cartCountText').textContent = `${cart.reduce((s,i)=>s+i.qty,0)} items`;
  $('cartTotalText').textContent = `₹${total}`;
  show($('cartBar'));
}
function renderCartSheet(){
  const root = $('cartItems');
  if(!cart.length){ root.innerHTML = '<p class="muted">Cart is empty</p>'; }
  else root.innerHTML = cart.map(i=>`<div class="cart-item"><img src="${i.image}"><div><strong>${getName(i)}</strong><div>${i.qty} x ₹${i.price}</div></div><button class="qty-btn" data-id="${i.id}">Remove</button></div>`).join('');
  document.querySelectorAll('.qty-btn').forEach(btn=>btn.onclick=()=>{ cart=cart.filter(i=>i.id!==btn.dataset.id); persistCart(); renderCartSheet(); renderCartBar(); });
  const {subtotal,delivery,total}=totals();
  $('subtotalText').textContent=`₹${subtotal}`; $('deliveryText').textContent=`₹${delivery}`; $('finalTotalText').textContent=`₹${total}`;
}

function bindSheets(){
  document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>hide($(btn.dataset.close)));
  $('supportBtn').onclick=()=>show($('supportSheet'));
  $('categoryBtn').onclick=()=>{ show($('categorySheet')); if(!selectedCategory && categories[0]) selectedCategory=categories[0].id; renderCategorySheet(); };
  $('profileBtn').onclick=()=>{ loadProfileForm(); show($('profileSheet')); };
  $('langBtn').onclick=()=>show($('langSheet'));
  $('openCartBtn').onclick=()=>{ renderCartSheet(); show($('cartSheet')); };
}

function loadProfileForm(){
  const p = safeProfile();
  $('editName').value = p.name || 'Aditya jha ब्राह्मण';
  $('editPhone').value = p.phone || '';
  $('editAddress').value = p.address || '';
  $('editLandmark').value = p.landmark || '';
  $('editCity').value = p.city || '';
  $('editState').value = p.state || '';
  $('editPincode').value = p.pincode || '';
}

function saveProfile(partial={}){
  const existing = safeProfile();
  const next = { ...existing, ...partial };
  localStorage.setItem(LS.profile, JSON.stringify(next));
}

function bindAuth(){
  const phone = localStorage.getItem('login_phone') || '';
  if(localStorage.getItem(LS.loggedIn)==='yes'){
    hide($('loginScreen')); hide($('addressScreen')); show($('appScreen')); return;
  }
  $('showRobotBtn').onclick = ()=>{
    const num = ($('loginPhone').value || '').trim();
    if(num.length < 10) return alert('Enter valid mobile number');
    show($('robotWrap'));
  };
  $('verifyBtn').onclick = ()=>{
    const num = ($('loginPhone').value || '').trim();
    if(!$('robotCheck').checked) return alert("Please verify you're not a robot");
    localStorage.setItem('login_phone', num);
    saveProfile({ phone: num, name: safeProfile().name || 'Aditya jha ब्राह्मण' });
    hide($('loginScreen')); show($('addressScreen')); $('profilePhone').value = num;
  };
  $('detectLocationBtn').onclick = ()=>captureLocation('profileAddress', 'locationHint');
  $('saveAddressBtn').onclick = ()=>{
    saveProfile({
      name: $('profileName').value || 'Aditya jha ब्राह्मण',
      phone: $('profilePhone').value,
      address: $('profileAddress').value,
      landmark: $('profileLandmark').value
    });
    localStorage.setItem(LS.loggedIn,'yes');
    hide($('addressScreen')); show($('appScreen'));
  };
}

function bindProfile(){
  $('saveProfileBtn').onclick = ()=>{
    saveProfile({
      name: $('editName').value,
      address: $('editAddress').value,
      landmark: $('editLandmark').value,
      city: $('editCity').value,
      state: $('editState').value,
      pincode: $('editPincode').value
    });
    hide($('profileSheet'));
  };
  $('profileLocationBtn').onclick = ()=>captureLocation(null, null, true);
  $('logoutBtn').onclick = ()=>{
    localStorage.removeItem(LS.loggedIn);
    localStorage.removeItem(LS.cart);
    cart = [];
    hide($('appScreen')); hide($('profileSheet')); show($('loginScreen'));
  };
}

function captureLocation(targetId, hintId, forProfile=false){
  if(!navigator.geolocation) return alert('Location not supported');
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    if(targetId) $(targetId).value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    if(hintId) $(hintId).textContent = 'Location added successfully';
    if(forProfile) saveProfile({ locationLink: mapLink });
    else saveProfile({ locationLink: mapLink });
  }, ()=>alert('Unable to fetch current location'));
}

function bindLanguage(){
  document.querySelectorAll('.lang-opt').forEach(btn=>btn.onclick=()=>{
    currentLang = btn.dataset.lang; localStorage.setItem(LS.lang, currentLang); hide($('langSheet')); seedUI(); renderTopCategories(); renderProducts(); renderCartBar();
  });
}

function bindSearchAndView(){
  $('searchInput').oninput = renderProducts;
  $('gridBtn').onclick = ()=>{ viewMode='grid'; $('gridBtn').classList.add('active'); $('listBtn').classList.remove('active'); renderProducts(); };
  $('listBtn').onclick = ()=>{ viewMode='list'; $('listBtn').classList.add('active'); $('gridBtn').classList.remove('active'); renderProducts(); };
  $('voiceBtn').onclick = ()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return alert('Voice search not supported on this device');
    const rec = new SR(); rec.lang='en-IN'; rec.onresult=(e)=>{ $('searchInput').value = e.results[0][0].transcript; renderProducts(); }; rec.start();
  };
}

function bindHelperBot(){
  document.querySelectorAll('[data-bot]').forEach(btn=>btn.onclick=()=>{
    const type = btn.dataset.bot; let msg='';
    if(type==='stock') msg='Stock available for top categories. Open Category to browse current items.';
    if(type==='delivery') msg='Delivery charges: ₹50 up to ₹999, ₹30 up to ₹2999, ₹20 up to ₹4999, ₹10 above ₹5000.';
    if(type==='minimum') msg='Minimum order is ₹500.';
    if(type==='support') msg=`Support & WhatsApp: ${settings.supportNumber}`;
    const div = document.createElement('div'); div.className='bot-msg'; div.textContent=msg; $('botMessages').appendChild(div);
  });
}

function bindCheckout(){
  $('checkoutBtn').onclick = async ()=>{
    const profile = safeProfile();
    if(!cart.length) return alert('Cart is empty');
    const { subtotal, delivery, total } = totals();
    if(total < settings.minOrder) return alert(t('minOrder'));
    const lines = cart.map(i=>`• ${getName(i)} x${i.qty} = ₹${i.qty*i.price}`).join('%0A');
    const map = encodeURIComponent(profile.locationLink || settings.storeMapLink || '');
    const text = `New Order%0A%0AName: ${encodeURIComponent(profile.name||'')}%0APhone: ${encodeURIComponent(profile.phone||'')}%0AAddress: ${encodeURIComponent(profile.address||'')}%0ALandmark: ${encodeURIComponent(profile.landmark||'')}%0AMap: ${map}%0A%0AItems:%0A${lines}%0A%0ASubtotal: ₹${subtotal}%0ADelivery: ₹${delivery}%0ATotal: ₹${total}`;
    window.open(`https://wa.me/91${settings.whatsappNumber}?text=${text}`, '_blank');
    try { if(appDb) await addDoc(collection(appDb,'orders'), { profile, cart, subtotal, delivery, total, createdAt: Date.now() }); } catch(e){}
    cart=[]; persistCart(); renderCartBar(); renderCartSheet();
    $('successToast').textContent = t('orderSuccess'); show($('successToast')); setTimeout(()=>hide($('successToast')), 2500);
    hide($('cartSheet'));
  };
}

function renderEverything(){
  seedUI(); renderPromos(); renderTopCategories(); renderProducts(); renderCartBar(); bindSheets(); bindProfile(); bindLanguage(); bindSearchAndView(); bindHelperBot(); bindCheckout();
}

function startPromoLoop(){ setInterval(()=>{ promoIndex=(promoIndex+1)%promos.length; renderPromos(); }, 3500); }

window.addEventListener('DOMContentLoaded', async ()=>{
  setTimeout(()=>hide($('splash')), 1200);
  await initFirebase();
  bindAuth();
  renderEverything();
  startPromoLoop();
});
