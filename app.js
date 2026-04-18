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

function show(el){ if (el) el.classList.remove('hidden'); }
function hide(el){ if (el) el.classList.add('hidden'); }
function normalize(v){ return String(v || '').trim().toLowerCase(); }

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
  liveArr.forEach(item => {
    const key = getKey(item);
    const i = merged.findIndex(x => getKey(x) === key);
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
    if ($('categorySheet') && !$('categorySheet').classList.contains('hidden')) renderCategorySheet();
    if ($('cartSheet') && !$('cartSheet').classList.contains('hidden')) renderCartSheet();
  } catch (e) {
    console.warn('rerenderLive failed', e);
  }
}

async function initFirebase() {
  try {
    const fallbackConfig = {
      apiKey: "AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA",
      authDomain: "devindra-mart.firebaseapp.com",
      projectId: "devindra-mart",
      storageBucket: "devindra-mart.firebasestorage.app",
      messagingSenderId: "394816688594",
      appId: "1:394816688594:web:77577dbcade5f19942b80b"
    };

    const cfg = (window.firebaseConfig && window.firebaseConfig.apiKey)
      ? window.firebaseConfig
      : fallbackConfig;

    const app = initializeApp(cfg);
    appDb = getFirestore(app);
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
      const liveCats = catSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          subcategories: Array.isArray(data.subcategories)
            ? data.subcategories
            : String(data.subcategory || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
        };
      });
      categories = mergeByName(sampleCategories, liveCats, x => normalize(x.name || getName(x) || x.id));
    }

    if (!prodSnap.empty) {
      const liveProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      products = mergeByName(sampleProducts, liveProducts, x => normalize(x.name || getName(x) || x.id));
    }

    if (!promoSnap.empty) promos = promoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(e);
  }
}

function bindLiveData() {
  if (!appDb) return;

  onSnapshot(collection(appDb, 'categories'), (snap) => {
    const liveCats = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        subcategories: Array.isArray(data.subcategories)
          ? data.subcategories
          : String(data.subcategory || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
      };
    });
    categories = mergeByName(sampleCategories, liveCats, x => normalize(x.name || getName(x) || x.id));
    rerenderLive();
  });

  onSnapshot(collection(appDb, 'products'), (snap) => {
    const liveProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    products = mergeByName(sampleProducts, liveProducts, x => normalize(x.name || getName(x) || x.id));
    rerenderLive();
  });

  onSnapshot(collection(appDb, 'promos'), (snap) => {
    const livePromos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  root.innerHTML = `<div class="promo-slide"><img src="${p.media}" alt="promo" class="promo-media"><div class="promo-overlay"><h2>${p.title || ''}</h2><p>${p.text || ''}</p></div></div>`;
}

function renderTopCategories() {
  if (!$('topCategories')) return;

  $('topCategories').innerHTML =
    `<button class="chip" data-cat="all">All</button>` +
    categories.map(c => `<button class="chip" data-cat="${c.id}">${getName(c)}</button>`).join('');

  document.querySelectorAll('.chip').forEach(btn => btn.onclick = () => {
    selectedCategory = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
    selectedSubcategory = null;
    renderProducts();
  });
}

function renderCategorySheet() {
  if (!$('mainCategoryList') || !$('subCategoryList')) return;

  $('mainCategoryList').innerHTML =
    `<button class="main-cat-btn ${selectedCategory===null ? 'active' : ''}" data-cat="all">All</button>` +
    categories.map(c => `<button class="main-cat-btn ${selectedCategory===c.id ? 'active' : ''}" data-cat="${c.id}">${getName(c)}</button>`).join('');

  document.querySelectorAll('.main-cat-btn').forEach(btn => btn.onclick = () => {
    selectedCategory = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
    selectedSubcategory = null;
    renderCategorySheet();
    renderProducts();
  });

  if (!selectedCategory) {
    $('subCategoryList').innerHTML = `<div class="sub-head muted small">Select a category to view subcategories</div>`;
    return;
  }

  const cat = categories.find(c => c.id === selectedCategory) || categories[0];
  const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];
  $('subCategoryList').innerHTML = subs.map(s => `<button class="sub-chip ${selectedSubcategory===s ? 'active' : ''}" data-sub="${s}">${s}</button>`).join('');

  document.querySelectorAll('.sub-chip').forEach(btn => btn.onclick = () => {
    selectedSubcategory = btn.dataset.sub;
    hide($('categorySheet'));
    renderProducts();
  });
}

function filteredProducts() {
  const q = normalize($('searchInput')?.value || '');

  let list = products.filter(p => {
    const selectedCatObj = categories.find(c => c.id === selectedCategory) || {};
    const selectedCatName = getName(selectedCatObj);

    const catOk =
      !selectedCategory ||
      normalize(p.category) === normalize(selectedCatName) ||
      normalize(p.category) === normalize(selectedCategory) ||
      normalize(p.category) === normalize(selectedCatObj.name);

    const subOk = !selectedSubcategory || normalize(p.subcategory) === normalize(selectedSubcategory);

    const hay = [
      p.name_en,
      p.name_hi,
      p.name_hinglish,
      p.name,
      p.category,
      p.subcategory
    ].join(' ').toLowerCase();

    const searchOk = !q || hay.includes(q);
    return catOk && subOk && searchOk;
  });

  if (!list.length && q) {
    const qParts = q.split(' ').filter(Boolean);
    list = products.filter(p => {
      const hay = [
        p.name_en,
        p.name_hi,
        p.name_hinglish,
        p.name,
        p.category,
        p.subcategory
      ].join(' ').toLowerCase();

      return qParts.some(part => hay.includes(part)) ||
             hay.includes(q.slice(0, 3)) ||
             q.includes(normalize(p.category)) ||
             q.includes(normalize(p.subcategory));
    });
  }

  return list;
}

function renderProducts() {
  const root = $('productsGrid');
  if (!root) return;

  root.className = viewMode === 'grid' ? 'products-grid' : 'products-list';
  const list = filteredProducts();

  if (!list.length) {
    root.innerHTML = `<div class="empty-state">${t('noItems')}</div>`;
    if ($('activeFilterBar')) hide($('activeFilterBar'));
    return;
  }

  root.innerHTML = list.map(p => `
    <article class="product-card ${viewMode}">
      <img class="product-img" src="${p.image}" alt="${getName(p)}" onerror="this.src='logo.svg'">
      <div class="product-body">
        <div class="badge">${p.badge || 'Featured'}</div>
        <h4>${getName(p)}</h4>
        <div class="meta">${p.category} • ${p.subcategory || ''}</div>
        <div class="price-row"><strong>₹${p.price}</strong><button class="add-btn" data-id="${p.id}">${t('add')}</button></div>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.add-btn').forEach(btn => btn.onclick = () => addToCart(btn.dataset.id));

  const active = [];
  if (selectedCategory) {
    const c = categories.find(x => x.id === selectedCategory);
    if (c) active.push(getName(c));
  }
  if (selectedSubcategory) active.push(selectedSubcategory);

  if ($('activeFilterBar')) {
    if (active.length) {
      $('activeFilterBar').innerHTML = active.map(a => `<span class="filter-pill">${a}</span>`).join('');
      show($('activeFilterBar'));
    } else {
      hide($('activeFilterBar'));
    }
  }
}

function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!item) return;
  const found = cart.find(c => c.id === id);
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  persistCart();
  renderCartBar();
}

function persistCart() {
  localStorage.setItem(LS.cart, JSON.stringify(cart));
}

function deliveryCharge(subtotal) {
  const rules = Array.isArray(settings.deliveryRules) ? settings.deliveryRules : [
    { min: 0, max: 999, charge: 50 },
    { min: 1000, max: 2999, charge: 30 },
    { min: 3000, max: 4999, charge: 20 },
    { min: 5000, max: 999999, charge: 10 }
  ];
  const r = rules.find(r => subtotal >= r.min && subtotal <= r.max);
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
  if ($('cartCountText')) $('cartCountText').textContent = `${cart.reduce((s, i) => s + i.qty, 0)} items`;
  if ($('cartTotalText')) $('cartTotalText').textContent = `₹${total}`;
  show($('cartBar'));
}

function renderCartSheet() {
  const root = $('cartItems');
  if (!root) return;

  if (!cart.length) {
    root.innerHTML = '<p class="muted">Cart is empty</p>';
  } else {
    root.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${i.image}" onerror="this.src='logo.svg'">
        <div>
          <strong>${getName(i)}</strong>
          <div>${i.qty} x ₹${i.price}</div>
        </div>
        <button class="qty-btn" data-id="${i.id}">${t('remove')}</button>
      </div>
    `).join('');
  }

  document.querySelectorAll('.qty-btn').forEach(btn => btn.onclick = () => {
    cart = cart.filter(i => i.id !== btn.dataset.id);
    persistCart();
    renderCartSheet();
    renderCartBar();
  });

  const { subtotal, delivery, total } = totals();
  if ($('subtotalText')) $('subtotalText').textContent = `₹${subtotal}`;
  if ($('deliveryText')) $('deliveryText').textContent = `₹${delivery}`;
  if ($('finalTotalText')) $('finalTotalText').textContent = `₹${total}`;
}

function bindSheets() {
  document.querySelectorAll('[data-close]').forEach(btn => btn.onclick = () => hide($(btn.dataset.close)));
  if ($('supportBtn')) $('supportBtn').onclick = () => show($('supportSheet'));
  if ($('categoryBtn')) $('categoryBtn').onclick = () => {
    show($('categorySheet'));
    renderCategorySheet();
  };
  if ($('profileBtn')) $('profileBtn').onclick = () => {
    loadProfileForm();
    show($('profileSheet'));
  };
  if ($('langBtn')) $('langBtn').onclick = () => show($('langSheet'));
  if ($('openCartBtn')) $('openCartBtn').onclick = () => {
    renderCartSheet();
    show($('cartSheet'));
  };
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

  if ($('showRobotBtn')) $('showRobotBtn').onclick = () => {
    const num = ($('loginPhone')?.value || '').trim();
    if (num.length < 10) return alert('Enter valid mobile number');
    show($('robotWrap'));
  };

  if ($('verifyBtn')) $('verifyBtn').onclick = () => {
    const num = ($('loginPhone')?.value || '').trim();
    if (!$('robotCheck')?.checked) return alert("Please verify you're not a robot");
    localStorage.setItem('login_phone', num);
    saveProfile({ phone: num, name: safeProfile().name || 'Aditya jha ब्राह्मण' });
    hide($('loginScreen'));
    show($('addressScreen'));
    if ($('profilePhone')) $('profilePhone').value = num;
  };

  if ($('detectLocationBtn')) $('detectLocationBtn').onclick = () => captureLocation('profileAddress', 'locationHint');

  if ($('saveAddressBtn')) $('saveAddressBtn').onclick = () => {
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

function bindProfile() {
  if ($('saveProfileBtn')) $('saveProfileBtn').onclick = () => {
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

  if ($('profileLocationBtn')) $('profileLocationBtn').onclick = () => captureLocation(null, null, true);

  if ($('logoutBtn')) $('logoutBtn').onclick = () => {
    localStorage.removeItem(LS.loggedIn);
    localStorage.removeItem(LS.cart);
    cart = [];
    hide($('appScreen'));
    hide($('profileSheet'));
    show($('loginScreen'));
  };
}

function captureLocation(targetId, hintId, forProfile = false) {
  if (!navigator.geolocation) return alert('Location not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    if (targetId && $(targetId)) $(targetId).value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    if (hintId && $(hintId)) $(hintId).textContent = 'Location added successfully';
    if (forProfile) saveProfile({ locationLink: mapLink });
    else saveProfile({ locationLink: mapLink });
  }, () => alert('Unable to fetch current location'));
}

function bindLanguage() {
  document.querySelectorAll('.lang-opt').forEach(btn => btn.onclick = () => {
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

function bindSearchAndView() {
  if ($('searchInput')) $('searchInput').oninput = renderProducts;
  if ($('gridBtn')) $('gridBtn').onclick = () => {
    viewMode = 'grid';
    $('gridBtn')?.classList.add('active');
    $('listBtn')?.classList.remove('active');
    renderProducts();
  };
  if ($('listBtn')) $('listBtn').onclick = () => {
    viewMode = 'list';
    $('listBtn')?.classList.add('active');
    $('gridBtn')?.classList.remove('active');
    renderProducts();
  };
  if ($('voiceBtn')) $('voiceBtn').onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice search not suppor
