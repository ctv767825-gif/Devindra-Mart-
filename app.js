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
setDoc,
updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
const LS = {
  profile: 'dm_profile',
  cart: 'dm_cart',
  lang: 'dm_lang',
  loggedIn: 'dm_loggedin'
};

const LANG = {
  en: {
    allProducts: 'All Products',
    search: 'Search all products',
    minOrder: 'Minimum order value is ₹500',
    add: 'Add to Cart',
    remove: 'Remove',
    support: 'Support',
    category: 'Category',
    orderSuccess: 'Order sent successfully ✅',
    saved: 'Saved successfully ✅',
    noItems: 'No items found',
    addLocation: 'Please add your current location first 📍'
  },
  hi: {
    allProducts: 'सभी उत्पाद',
    search: 'सभी उत्पाद खोजें',
    minOrder: 'न्यूनतम ऑर्डर राशि ₹500 है',
    add: 'कार्ट में जोड़ें',
    remove: 'हटाएं',
    support: 'सहायता',
    category: 'श्रेणी',
    orderSuccess: 'ऑर्डर सफलतापूर्वक भेजा गया ✅',
    saved: 'सफलतापूर्वक सेव हुआ ✅',
    noItems: 'कोई आइटम नहीं मिला',
    addLocation: 'कृपया पहले अपनी current location जोड़ें 📍'
  },
  hinglish: {
    allProducts: 'All Products',
    search: 'Search all products',
    minOrder: 'Minimum order value ₹500 hai',
    add: 'Add to Cart',
    remove: 'Remove',
    support: 'Support',
    category: 'Category',
    orderSuccess: 'Order successfully bhej diya gaya ✅',
    saved: 'Saved successfully ✅',
    noItems: 'No items found',
    addLocation: 'Pehle current location add karo 📍'
  }
};

let appDb = null;
let appStorage = null;
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
const getName = (obj) =>
  obj?.[`name_${currentLang}`] ||
  obj?.name_hinglish ||
  obj?.name_en ||
  obj?.name_hi ||
  obj?.name ||
  '';

function show(el) {
  if (el) el.classList.remove('hidden');
}

function hide(el) {
  if (el) el.classList.add('hidden');
}

function normalize(v) {
  return String(v || '').trim().toLowerCase();
}

function safeProfile() {
  return JSON.parse(
    localStorage.getItem(LS.profile) ||
      '{"name":"Aditya jha ब्राह्मण","phone":"","address":"","landmark":"","city":"","state":"","pincode":"","locationLink":""}'
  );
}

function showToast(message) {
  const toast = $('successToast');
  if (!toast) return;
  toast.textContent = message;
  show(toast);
  toast.classList.add('show');
  setTimeout(() => {
    hide(toast);
    toast.classList.remove('show');
  }, 2200);
}

function mergeByName(baseArr, liveArr, getKey) {
  const merged = [...baseArr];
  liveArr.forEach((item) => {
    const key = getKey(item);
    const i = merged.findIndex((x) => getKey(x) === key);
    if (i >= 0) merged[i] = { ...merged[i], ...item };
    else merged.push(item);
  });
  return merged;
}

function rerenderLive() {
  try {
    seedUI();
    renderPromos();
    renderTopCategories();
    renderProducts();
    renderCartBar();
    if ($('categorySheet') && !$('categorySheet').classList.contains('hidden')) {
      renderCategorySheet();
    }
    if ($('cartSheet') && !$('cartSheet').classList.contains('hidden')) {
      renderCartSheet();
    }
  } catch (e) {
    console.warn('rerenderLive failed', e);
  }
}

async function initFirebase() {
  try {
    const fallbackConfig = {
      apiKey: 'AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA',
      authDomain: 'devindra-mart.firebaseapp.com',
      projectId: 'devindra-mart',
      storageBucket: 'devindra-mart.firebasestorage.app',
      messagingSenderId: '394816688594',
      appId: '1:394816688594:web:77577dbcade5f19942b80b'
    };

    const cfg =
      window.firebaseConfig && window.firebaseConfig.apiKey
        ? window.firebaseConfig
        : fallbackConfig;

    const app = initializeApp(cfg);
    appDb = getFirestore(app);
    appStorage = getStorage(app);
    await loadRemoteData();
    bindLiveData();
  } catch (e) {
    console.warn('Firestore fallback', e);
  }
}

async function loadRemoteData() {
  try {
    const sRef = doc(appDb, 'settings', 'store');
    const sSnap = await getDoc(sRef);
    if (sSnap.exists()) settings = { ...settings, ...sSnap.data() };

    const [catSnap, prodSnap, promoSnap] = await Promise.all([
      getDocs(collection(appDb, 'categories')),
      getDocs(collection(appDb, 'products')),
      getDocs(collection(appDb, 'promos'))
    ]);

    if (!catSnap.empty) {
      const liveCats = catSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          subcategories: Array.isArray(data.subcategories)
            ? data.subcategories
            : String(data.subcategory || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
        };
      });
      categories = mergeByName(
        sampleCategories,
        liveCats,
        (x) => normalize(x.name || getName(x) || x.id)
      );
    }

    if (!prodSnap.empty) {
      const liveProducts = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      products = mergeByName(
        sampleProducts,
        liveProducts,
        (x) => normalize(x.name || getName(x) || x.id)
      );
    }

    if (!promoSnap.empty) {
      promos = promoSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }
}

function bindLiveData() {
  if (!appDb) return;

  onSnapshot(collection(appDb, 'categories'), (snap) => {
    const liveCats = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        subcategories: Array.isArray(data.subcategories)
          ? data.subcategories
          : String(data.subcategory || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
      };
    });

    categories = mergeByName(
      sampleCategories,
      liveCats,
      (x) => normalize(x.name || getName(x) || x.id)
    );
    rerenderLive();
  });

  onSnapshot(collection(appDb, 'products'), (snap) => {
    const liveProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products = mergeByName(
      sampleProducts,
      liveProducts,
      (x) => normalize(x.name || getName(x) || x.id)
    );
    rerenderLive();
  });

  onSnapshot(collection(appDb, 'promos'), (snap) => {
    const livePromos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    promos = livePromos.length ? livePromos : [...samplePromos];
    promoIndex = 0;
    rerenderLive();
  });

  onSnapshot(doc(appDb, 'settings', 'store'), (sSnap) => {
    if (sSnap.exists()) {
      settings = { ...settings, ...sSnap.data() };
      rerenderLive();
    }
  });
}

function seedUI() {
  if ($('storeName')) $('storeName').textContent = settings.storeName;

  if ($('storeTagline')) {
    $('storeTagline').innerHTML =
      `<span class="owner-badge">Founder: Aditya Jha ब्राह्मण</span><br>${settings.tagline}`;
  }

  if ($('noticeBar')) $('noticeBar').textContent = settings.noticeText;
  if ($('allProductsTitle')) $('allProductsTitle').textContent = t('allProducts');
  if ($('searchInput')) $('searchInput').placeholder = t('search');
  if ($('helpCall')) $('helpCall').href = `tel:${settings.supportNumber}`;
  if ($('helpWhatsApp')) $('helpWhatsApp').href = `https://wa.me/91${settings.whatsappNumber}`;
}

function renderPromos() {
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

function renderTopCategories() {
  if (!$('topCategories')) return;

  $('topCategories').innerHTML =
    `<button class="chip" data-cat="all">All</button>` +
    categories
      .map((c) => `<button class="chip" data-cat="${c.id}">${getName(c)}</button>`)
      .join('');

  document.querySelectorAll('.chip').forEach((btn) => {
    btn.onclick = () => {
      selectedCategory = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
      selectedSubcategory = null;
      renderProducts();
    };
  });
}

function renderCategorySheet() {
  if (!$('mainCategoryList') || !$('subCategoryList')) return;

  $('mainCategoryList').innerHTML =
    `<button class="main-cat-btn ${selectedCategory === null ? 'active' : ''}" data-cat="all">All</button>` +
    categories
      .map(
        (c) =>
          `<button class="main-cat-btn ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${getName(c)}</button>`
      )
      .join('');

  document.querySelectorAll('.main-cat-btn').forEach((btn) => {
    btn.onclick = () => {
      selectedCategory = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
      selectedSubcategory = null;
      renderCategorySheet();
      renderProducts();
    };
  });

  if (!selectedCategory) {
    $('subCategoryList').innerHTML =
      `<div class="muted small">Select a category to view subcategories</div>`;
    return;
  }

  const cat = categories.find((c) => c.id === selectedCategory) || categories[0];
  const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];

  $('subCategoryList').innerHTML = subs
    .map(
      (s) =>
        `<button class="sub-chip ${selectedSubcategory === s ? 'active' : ''}" data-sub="${s}">${s}</button>`
    )
    .join('');

  document.querySelectorAll('.sub-chip').forEach((btn) => {
    btn.onclick = () => {
      selectedSubcategory = btn.dataset.sub;
      hide($('categorySheet'));
      renderProducts();
    };
  });
}

function filteredProducts() {
  const q = normalize($('searchInput')?.value || '');

  let list = products.filter((p) => {
    const selectedCatObj = categories.find((c) => c.id === selectedCategory) || {};
    const selectedCatName = getName(selectedCatObj);

    const catOk =
      !selectedCategory ||
      normalize(p.category) === normalize(selectedCatName) ||
      normalize(p.category) === normalize(selectedCategory) ||
      normalize(p.category) === normalize(selectedCatObj.name);

    const subOk =
      !selectedSubcategory || normalize(p.subcategory) === normalize(selectedSubcategory);

    const hay = [
      p.name_en,
      p.name_hi,
      p.name_hinglish,
      p.name,
      p.category,
      p.subcategory
    ]
      .join(' ')
      .toLowerCase();

    const searchOk = !q || hay.includes(q);
    return catOk && subOk && searchOk;
  });

  if (!list.length && q) {
    const hayMatch = (p) => {
      const hay = [
        p.name_en,
        p.name_hi,
        p.name_hinglish,
        p.name,
        p.category,
        p.subcategory
      ]
        .join(' ')
        .toLowerCase();

      return (
        hay.includes(q.slice(0, 3)) ||
        q.includes(normalize(p.category)) ||
        q.includes(normalize(p.subcategory))
      );
    };

    list = products.filter(hayMatch);
  }

  return list;
}

// 2️⃣ FINAL B2B PRODUCT SYSTEM
function renderProducts() {
  const root = $('productsGrid');
  if (!root) return;

  const list = filteredProducts();

  root.innerHTML = list.map(p => `
  <article class="product-card ${viewMode}">
    
    <img class="product-img" src="${p.image}" alt="${getName(p)}" onerror="this.src='logo.svg'">

    <div class="product-body">
      <h4>${getName(p)}</h4>

      <div class="meta">${p.category} • ${p.subcategory || ''}</div>

      <select class="variant-select" data-id="${p.id}">
        ${(p.variants || [p]).map(v => `
          <option value="${v.price}">
            ${v.label || `₹${v.price} Pack`}
          </option>
        `).join('')}
      </select>

      <div class="price-row">
        <strong>₹${p.price}</strong>

        <div class="qty-box">
          <button class="minus" data-id="${p.id}">-</button>
          <span>${getQty(p.id)}</span>
          <button class="plus" data-id="${p.id}">+</button>
        </div>
      </div>

    </div>
  </article>
`).join('');
  document.querySelectorAll('.plus').forEach(btn=>{
  btn.onclick = ()=>{
    addToCart(btn.dataset.id);
  };
});

document.querySelectorAll('.minus').forEach(btn=>{
  btn.onclick = ()=>{
    removeFromCart(btn.dataset.id);
  };
});
}      
  
// 🔥 NEW ADD TO CART (FINAL)
function addToCart(id){
  const product = products.find(p=>p.id===id);
  if(!product) return;

  const select = document.querySelector(`.variant-select[data-id="${id}"]`);
  const price = select ? Number(select.value) : Number(product.price || 0);

  const found = cart.find(i=>i.id===id);

  if(found){
    found.qty += 1;
  }else{
    cart.push({...product, price, qty:1});
  }

  persistCart();
  renderCartBar();
  renderProducts();
}
// 🔥 QTY CONTROL
function getQty(id){
  const item = cart.find(i=>i.id===id);
  return item ? item.qty : 0;
}

function removeFromCart(id){
  const item = cart.find(i=>i.id===id);
  if(!item) return;

  item.qty--;

  if(item.qty<=0){
    cart = cart.filter(i=>i.id!==id);
  }

  persistCart();
  renderCartBar();
  renderProducts();
}
function persistCart() {
  localStorage.setItem(LS.cart, JSON.stringify(cart));
}

function deliveryCharge(subtotal) {
  const rules = Array.isArray(settings.deliveryRules)
    ? settings.deliveryRules
    : [
        { min: 0, max: 999, charge: 50 },
        { min: 1000, max: 2999, charge: 30 },
        { min: 3000, max: 4999, charge: 20 },
        { min: 5000, max: 999999, charge: 10 }
      ];

  const r = rules.find((rule) => subtotal >= rule.min && subtotal <= rule.max);
  return r ? r.charge : 0;
}

function totals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal ? deliveryCharge(subtotal) : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

function renderCartBar() {
  if (!cart.length) {
    hide($('cartBar'));
    return;
  }

  const { total } = totals();
  if ($('cartCountText')) {
    $('cartCountText').textContent = `${cart.reduce((s, i) => s + i.qty, 0)} items`;
  }
  if ($('cartTotalText')) {
    $('cartTotalText').textContent = `₹${total}`;
  }

  show($('cartBar'));
}

function renderCartSheet() {
  const root = $('cartItems');
  if (!root) return;

  if (!cart.length) {
    root.innerHTML = '<p class="muted">Cart is empty</p>';
  } else {
    root.innerHTML = cart
      .map(
        (i) => `
        <div class="cart-item">
          <img src="${i.image}" onerror="this.src='logo.svg'">
          <div>
            <strong>${getName(i)}</strong>
            <div>${i.qty} x ₹${i.price}</div>
          </div>
          <button class="qty-btn" data-id="${i.id}">${t('remove')}</button>
        </div>
      `
      )
      .join('');
  }

  document.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.onclick = () => {
      cart = cart.filter((i) => i.id !== btn.dataset.id);
      persistCart();
      renderCartSheet();
      renderCartBar();
    }
  });

  const { subtotal, delivery, total } = totals();
  if ($('subtotalText')) $('subtotalText').textContent = `₹${subtotal}`;
  if ($('deliveryText')) $('deliveryText').textContent = `₹${delivery}`;
  if ($('finalTotalText')) $('finalTotalText').textContent = `₹${total}`;
}

function bindSheets() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.onclick = () => hide($(btn.dataset.close));
  });

  if ($('supportBtn')) $('supportBtn').onclick = () => show($('supportSheet'));

  if ($('categoryBtn')) {
    $('categoryBtn').onclick = () => {
      show($('categorySheet'));
      renderCategorySheet();
    };
  }

  if ($('profileBtn')) {
    $('profileBtn').onclick = () => {
      loadProfileForm();
      show($('profileSheet'));
    };
  }

  if ($('langBtn')) $('langBtn').onclick = () => show($('langSheet'));

  if ($('openCartBtn')) {
    $('openCartBtn').onclick = () => {
      renderCartSheet();
      show($('cartSheet'));
    };
  }
}

function loadProfileForm() {
  const p = safeProfile();
  if ($('editName')) $('editName').value = p.name || 'Aditya jha ब्राह्मण';
  if ($('editPhone')) $('editPhone').value = p.phone || '';
  if ($('editAddress')) $('editAddress').value = p.address || '';
  if ($('editLandmark')) $('editLandmark').value = p.landmark || '';
  if ($('editCity')) $('editCity').value = p.city || '';
  if ($('editState')) $('editState').value = p.state || '';
  if ($('editPincode')) $('editPincode').value = p.pincode || '';
}

function saveProfile(partial = {}) {
  const existing = safeProfile();
  const next = { ...existing, ...partial };
  localStorage.setItem(LS.profile, JSON.stringify(next));
  showToast(t('saved'));
}

function bindAuth() {
  if (localStorage.getItem(LS.loggedIn) === 'yes') {
    hide($('loginScreen'));
    hide($('addressScreen'));
    show($('appScreen'));
    return;
  }

  if ($('showRobotBtn')) {
    $('showRobotBtn').onclick = () => {
      const num = ($('loginPhone')?.value || '').trim();
      if (num.length < 10) return alert('Enter valid mobile number');
      show($('robotWrap'));
    };
  }

  if ($('verifyBtn')) {
    $('verifyBtn').onclick = () => {
      const num = ($('loginPhone')?.value || '').trim();
      if (!$('robotCheck')?.checked) return alert("Please verify you're not a robot");

      localStorage.setItem('login_phone', num);
      saveProfile({ phone: num, name: safeProfile().name || 'Aditya jha ब्राह्मण' });
      hide($('loginScreen'));
      show($('addressScreen'));

      if ($('profilePhone')) $('profilePhone').value = num;
    };
  }

  if ($('detectLocationBtn')) {
    $('detectLocationBtn').onclick = () =>
      captureLocation('profileAddress', 'locationHint');
  }

  if ($('saveAddressBtn')) {
    $('saveAddressBtn').onclick = () => {
      saveProfile({
        name: $('profileName')?.value || 'Aditya jha ब्राह्मण',
        phone: $('profilePhone')?.value || '',
        address: $('profileAddress')?.value || '',
        landmark: $('profileLandmark')?.value || ''
      });

      localStorage.setItem(LS.loggedIn, 'yes');
      hide($('addressScreen'));
      show($('appScreen'));
    };
  }
}

function bindProfile() {
  if ($('saveProfileBtn')) {
    $('saveProfileBtn').onclick = () => {
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
  }

  if ($('profileLocationBtn')) {
    $('profileLocationBtn').onclick = () => captureLocation(null, null, true);
  }

  if ($('logoutBtn')) {
    $('logoutBtn').onclick = () => {
      localStorage.removeItem(LS.loggedIn);
      localStorage.removeItem(LS.cart);
      cart = [];
      hide($('appScreen'));
      hide($('profileSheet'));
      show($('loginScreen'));
    };
  }
}

function captureLocation(targetId, hintId, forProfile = false) {
  if (!navigator.geolocation) return alert('Location not supported');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      if (targetId && $(targetId)) {
        $(targetId).value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
      if (hintId && $(hintId)) {
        $(hintId).textContent = 'Location added successfully';
      }

      if (forProfile) saveProfile({ locationLink: mapLink });
      else saveProfile({ locationLink: mapLink });
    },
    () => alert('Unable to fetch current location')
  );
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
    if ($('cartSheet') && !$('cartSheet').classList.contains('hidden')) renderCartSheet();
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
    if(!SR) return showToast('Voice search not supported on this device');
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
  const user = safeProfile();
const customerName = user.name ? user.name.split(" ")[0] : "Customer";
    let msg='';
    if(!type){
  msg = `Hi ${customerName} 👋 Ask me about stock, delivery charges, minimum order, or products.`;
    }
    if(type==='stock') msg='Stock available for top categories. Open Category to browse current items.';
    if(type==='delivery') msg='Delivery charges: ₹50 up to ₹999, ₹30 up to ₹2999, ₹20 up to ₹4999, ₹10 above ₹5000.';
    if(type==='minimum') msg='Minimum order is ₹500.';
    if(type==='support') msg=`Support & WhatsApp: ${settings.supportNumber}`;
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
    // 🔥 Aadhaar verification check
if(!profile.aadharVerified || !profile.aadharLast4){
  showToast("Aadhaar verify karo pehle");
  return;
}
if(!cart.length) return alert('Cart is empty');

    if (!profile.locationLink || profile.locationLink === '') {
      alert(t('addLocation'));
      return;
    }

    const { subtotal, delivery, total } = totals();
    if(total < (settings.minOrder || 500)) return alert(t('minOrder'));

    const lines = cart.map(i=>`• ${getName(i)} x${i.qty} = ₹${i.qty*i.price}`).join('%0A');
    const map = encodeURIComponent(profile.locationLink || settings.storeMapLink || '');
    const text = `New Order%0A%0AName: ${encodeURIComponent(profile.name||'')}%0APhone: ${encodeURIComponent(profile.phone||'')}%0AAddress: ${encodeURIComponent(profile.address||'')}%0ALandmark: ${encodeURIComponent(profile.landmark||'')}%0AMap: ${map}%0A%0AItems:%0A${lines}%0A%0ASubtotal: ₹${subtotal}%0ADelivery: ₹${delivery}%0ATotal: ₹${total}`;

    window.open(`https://wa.me/91${settings.whatsappNumber}?text=${text}`, '_blank');

 try {
  if(appDb) {
    await addDoc(collection(appDb,'orders'), {
      name: profile.name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      landmark: profile.landmark || '',
      location: profile.locationLink || '',

      // Aadhaar / KYC
      aadharLast4: profile.aadharLast4 || '',
      aadharVerified: profile.aadharVerified || false,
      kycStatus: profile.kycStatus || 'Pending',

      // Billing / Khata
      subtotal,
      delivery,
      total,
      paymentStatus: 'unpaid',
      khataType: 'udhaar',

      // Order
      items: cart,
      status: 'pending',
      source: 'customer_app',
      createdAt: Date.now()
    });
  }
} catch(e){}   
// 🔥 Local Khata Entry
let khata = JSON.parse(localStorage.getItem('dm_khata') || '[]');

khata.push({
  amount: total,
  type: 'udhaar',
  status: 'unpaid',
  date: new Date().toLocaleString()
});

localStorage.setItem('dm_khata', JSON.stringify(khata));
cart = [];
persistCart();
renderCartBar();
renderCartSheet();
showToast(t('orderSuccess'));
hide($('cartSheet'));
  };
}
function renderEverything(){
  seedUI();
  renderPromos();
  renderTopCategories();
  renderProducts();
  renderCartBar();
  bindSheets();
  bindProfile();
  bindLanguage();
  bindSearchAndView();
  bindHelperBot();
  bindCheckout();
bindAdvancedFeatures();
}

function startPromoLoop(){
  setInterval(()=>{
    if (!promos.length) return;
    promoIndex = (promoIndex + 1) % promos.length;
    renderPromos();
  }, 3500);
}

window.addEventListener('DOMContentLoaded', async ()=>{
  try {
    setTimeout(()=>hide($('splash')), 1200);

    // 🔥 SAFE INIT
    try {
      await initFirebase();
    } catch(e){
      console.log("Firebase error ignore:", e);
    }

    try {
      bindAuth();
    } catch(e){
      console.log("Auth error ignore:", e);
    }

    renderEverything();
    startPromoLoop();

  } catch (e) {
    console.error('App init error:', e);
    setTimeout(()=>hide($('splash')), 1200);
  }
});

  
// 🔥 Aadhaar Upload + KYC Helpers
function uploadAadhaar(file){
  const reader = new FileReader();

  reader.onload = function(e){
    const base64 = e.target.result;
    const p = safeProfile();

    p.aadhaarImage = base64;
    p.kycStatus = "Pending";
    p.aadharVerified = false;

    localStorage.setItem(LS.profile, JSON.stringify(p));
    showToast("Aadhaar uploaded. Verification pending.");
  };

  reader.readAsDataURL(file);
}

function saveAadhaarLast4(last4){
  const clean = String(last4 || "").replace(/\D/g, "");

  if(clean.length !== 4){
    alert("Aadhaar ke last 4 digit sahi daalo");
    return;
  }

  const p = safeProfile();
  p.aadharLast4 = clean;
  p.kycStatus = "Pending";
  p.aadharVerified = false;

  localStorage.setItem(LS.profile, JSON.stringify(p));
  showToast("Aadhaar last 4 saved");
    }
// ===== ADVANCED CUSTOMER FEATURES =====

// Parcha Upload + Firestore Draft
async function uploadParcha(file){
  if(!file) return showToast("Parcha file select karo");

  try{
    if(!appStorage) return showToast("Storage not ready");
    if(!appDb) return showToast("Database not ready");

    const profile = safeProfile();
    const safeName = String(file.name || "parcha.jpg").replace(/\s+/g, "_");
    const fileName = `parcha/${profile.phone || "guest"}_${Date.now()}_${safeName}`;
    const storageRef = ref(appStorage, fileName);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(appDb, "parchaDrafts"), {
      customerName: profile.name || "",
      customerPhone: profile.phone || "",
      customerAddress: profile.address || "",
      image: url,
      items: [],
      status: "draft",
      source: "customer_app",
      createdAt: Date.now()
    });

    showToast("✅ Parcha uploaded. Admin verify karega.");
    return url;

  }catch(e){
    console.error("Parcha upload failed:", e);
    showToast("❌ Parcha upload failed");
  }
}

// Voice Order → Cart Add
function startVoiceOrder(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return showToast("Voice not supported");

  const rec = new SR();
  rec.lang = "hi-IN";

  rec.onresult = (e)=>{
    const text = e.results[0][0].transcript.toLowerCase();
    let added = 0;

    products.forEach(p=>{
      const name = getName(p).toLowerCase();
      const firstWord = name.split(" ")[0];

      if(text.includes(name) || text.includes(firstWord)){
        addToCart(p.id);
        added++;
      }
    });

    showToast(added ? `✅ ${added} item cart me add hua` : "Item match nahi hua");
  };

  rec.onerror = ()=>{
    showToast("Voice error, dobara try karo");
  };

  rec.start();
}

// Notify Me / Back in Stock
async function notifyMe(productId){
  try{
    if(!appDb) return showToast("Database not ready");

    const profile = safeProfile();

    await addDoc(collection(appDb, "notifyRequests"), {
      productId,
      customerName: profile.name || "",
      customerPhone: profile.phone || "",
      createdAt: Date.now()
    });

    showToast("✅ Stock aate hi notify karenge");

  }catch(e){
    console.error("Notify failed:", e);
    showToast("Notify request failed");
  }
}

// UPI Pay Now
function payNowUPI(amount){
  const upiId = settings.upiId || "upi@upi";
  const store = encodeURIComponent(settings.storeName || "Devindra Mart");
  const payAmount = Number(amount || 0);

  if(!payAmount) return showToast("Amount missing");

  window.location.href = `upi://pay?pa=${upiId}&pn=${store}&am=${payAmount}&cu=INR`;
}

// Bind Advanced Buttons
function bindAdvancedFeatures(){
  const parchaInput = $("parchaInput");
  const parchaBtn = $("parchaBtn");
  const voiceOrderBtn = $("voiceOrderBtn");

  if(parchaBtn && parchaInput){
    parchaBtn.onclick = ()=> parchaInput.click();
  }

  if(parchaInput){
    parchaInput.onchange = (e)=>{
      const file = e.target.files && e.target.files[0];
      if(file) uploadParcha(file);
    };
  }

  if(voiceOrderBtn){
    voiceOrderBtn.onclick = ()=> startVoiceOrder();
  
 if($('paidBtn')){
   $('paidBtn').onclick = ()=> submitPayment();
 }
  }
    // ===== PAYMENT RESET SYSTEM =====

async function submitPayment(){
  const utrEl = document.getElementById("utrInput");
  if(!utrEl) return showToast("UTR input missing");

  const utr = utrEl.value.trim();
  if(!utr) return showToast("UTR daalo");

  if(!/^[0-9]{10,25}$/.test(utr)){
    return showToast("Invalid UTR");
  }

  if(!appDb) return showToast("DB not ready");

  const snap = await getDocs(collection(appDb, "orders"));
  let duplicate = false;

  snap.forEach(d=>{
    if(d.data().utr === utr) duplicate = true;
  });

  if(duplicate) return showToast("UTR already used ❌");

  const { subtotal, delivery, total } = totals();
  const orderId = "ORD_" + Date.now();

  await addDoc(collection(appDb, "orders"), {
    id: orderId,
    items: cart,
    subtotal,
    delivery,
    total,
    utr,
    paymentStatus: "pending",
    source: "customer_app_payment",
    createdAt: Date.now()
  });

  showToast("Payment submitted ✅");
}

function getPaymentBadge(order){
  if(order.paymentStatus === "paid") return "🟢 PAID";
  if(order.paymentStatus === "rejected") return "❌ REJECTED";
  return "🟠 PENDING";
}

async function markOrderPaid(orderId){
  if(!appDb) return;

  const refDoc = doc(appDb, "orders", orderId);

  await updateDoc(refDoc, {
    paymentStatus: "paid",
    paidAt: Date.now()
  });

  showToast("Order marked PAID");
}

async function getAllOrders(){
  if(!appDb) return [];

  const snap = await getDocs(collection(appDb, "orders"));
  const orders = [];

  snap.forEach(d=>{
    orders.push({ id: d.id, ...d.data() });
  });

  return orders;
}

async function verifyOrder(orderId){
  if(!appDb) return;

  const refDoc = doc(appDb, "orders", orderId);

  await updateDoc(refDoc, {
    paymentStatus: "paid",
    verifiedAt: Date.now()
  });

  showToast("✅ Order verified PAID");
}

async function rejectOrder(orderId){
  if(!appDb) return;

  const refDoc = doc(appDb, "orders", orderId);

  await updateDoc(refDoc, {
    paymentStatus: "rejected",
    verifiedAt: Date.now()
  });

  showToast("Order rejected ❌");
    }
// ===== ADVANCED SMART FEATURES PACK =====

// 1) Smart text/voice order: qty + product detect
function parseQty(text){
  const q = normalize(text || "");
  const map = { ek:1, one:1, do:2, two:2, teen:3, three:3, char:4, four:4, paanch:5, five:5 };
  const num = q.match(/\d+/);
  if(num) return Number(num[0]);
  for(const k in map) if(q.includes(k)) return map[k];
  return 1;
}

function addItemsFromText(text){
  const q = normalize(text || "");
  const qty = parseQty(q);
  let added = 0;

  products.forEach(p=>{
    const name = normalize(getName(p));
    const first = name.split(" ")[0];
    if(q.includes(name) || q.includes(first)){
      for(let i=0;i<qty;i++) addToCart(p.id);
      added++;
    }
  });

  return added;
}

function startVoiceOrder(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return showToast("Voice supported nahi hai");

  const rec = new SR();
  rec.lang = "hi-IN";

  rec.onresult = (e)=>{
    const text = e.results[0][0].transcript;
    const added = addItemsFromText(text);
    showToast(added ? `✅ ${added} item add hua` : "Item match nahi hua");
  };

  rec.onerror = ()=> showToast("Voice error");
  rec.start();
}

// 2) Basic AI scan: uploaded parcha name/text se item detect
function scanParchaToItems(text){
  const q = normalize(text || "");
  return products.filter(p=>{
    const name = normalize(getName(p));
    return q.includes(name) || q.includes(name.split(" ")[0]);
  }).slice(0,20).map(p=>({
    id:p.id,
    name:getName(p),
    price:p.price || 0,
    qty:1
  }));
}

// 3) Recommendations
function getRecommendations(){
  if(!cart.length) return products.slice(0,6);
  const cats = cart.map(i=>normalize(i.category));
  return products
    .filter(p=>!cart.find(c=>c.id===p.id))
    .filter(p=>cats.includes(normalize(p.category)))
    .slice(0,6);
}

// 4) Substitute items
function getSubstitutes(productId){
  const product = products.find(p=>p.id===productId);
  if(!product) return [];
  return products
    .filter(p=>p.id!==productId)
    .filter(p=>normalize(p.category)===normalize(product.category))
    .slice(0,5);
}

// 5) Combo / scheme discount
function applySchemes(subtotal){
  const schemes = settings.schemes || [];
  let discount = 0;
  schemes.forEach(s=>{
    if(subtotal >= Number(s.minAmount || 0)){
      discount += Number(s.discount || 0);
    }
  });
  return discount;
}

// 6) Loyalty coins
function getDevindraCoins(){
  return Number(localStorage.getItem("dm_coins") || 0);
}

function addDevindraCoins(total){
  const coins = Math.floor(Number(total || 0) / 1000) * 10;
  localStorage.setItem("dm_coins", String(getDevindraCoins() + coins));
  return coins;
}

// 7) Price alert request
async function savePriceAlert(productId){
  if(!appDb) return showToast("DB not ready");
  const p = safeProfile();

  await addDoc(collection(appDb, "priceAlerts"), {
    productId,
    customerName:p.name || "",
    customerPhone:p.phone || "",
    createdAt:Date.now()
  });

  showToast("Price alert set ✅");
}

// 8) PWA install
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
});

async function installApp(){
  if(!deferredInstallPrompt) return showToast("Install option abhi available nahi");
  deferredInstallPrompt.prompt();
  deferredInstallPrompt = null;
}

// 9) Notification permission
async function enableNotifications(){
  if(!("Notification" in window)) return showToast("Notification support nahi hai");
  const permission = await Notification.requestPermission();
  showToast(permission === "granted" ? "Notifications enabled ✅" : "Notifications blocked");
}
