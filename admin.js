
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const config = window.firebaseConfig || {
  apiKey: "AIzaSyAkFnUnVgcc8WzougbBjC7x_PXrb0xKBTA",
  authDomain: "devindra-mart.firebaseapp.com",
  projectId: "devindra-mart",
  storageBucket: "devindra-mart.firebasestorage.app",
  messagingSenderId: "394816688594",
  appId: "1:394816688594:web:77577dbcade5f19942b80b"
};

const app = initializeApp(config);
const db = getFirestore(app);
const LOGIN_KEY = 'dm_admin_login_ok';
const $ = (id) => document.getElementById(id);

const defaults = {
  storeName: 'Devindra Mart',
  tagline: 'Ab ghar tak paaye bazaar jaise rate',
  logo: '',
  banner: '',
  noticeText: 'Fresh deals today • Minimum order ₹500 • Fast delivery',
  whatsappNumber: '7678256489',
  supportNumber: '7678256489',
  minOrder: 500,
  deliveryRules: [
    { min: 0, max: 999, charge: 50 },
    { min: 1000, max: 2999, charge: 30 },
    { min: 3000, max: 4999, charge: 20 },
    { min: 5000, max: 999999, charge: 10 }
  ],
  storeLocation: '',
  storeMapLink: ''
};

let storeSettings = { ...defaults };
let categories = [];
let products = [];
let promos = [];
let orders = [];

function toast(msg) {
  const el = $('successToast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getAdminCreds() {
  const snap = await getDoc(doc(db, 'adminSettings', 'auth'));
  if (snap.exists()) return snap.data();
  return { username: 'admin', password: 'admin123' };
}

async function tryLogin() {
  const creds = await getAdminCreds();
  const u = $('loginUsername').value.trim();
  const p = $('loginPassword').value.trim();
  if (u === creds.username && p === creds.password) {
    localStorage.setItem(LOGIN_KEY, 'yes');
    showAdmin();
    await bootstrap();
  } else {
    toast('Wrong username/password ❌');
  }
}

function showAdmin() {
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.remove('hidden');
}

function renderTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-menu-btn').forEach(b => b.classList.remove('active'));
  $(tab + 'Tab').classList.add('active');
  document.querySelector(`.admin-menu-btn[data-tab="${tab}"]`)?.classList.add('active');
}

function fillSettings() {
  $('storeName').value = storeSettings.storeName || '';
  $('tagline').value = storeSettings.tagline || '';
  $('logoUrl').value = storeSettings.logo || '';
  $('bannerUrl').value = storeSettings.banner || '';
  $('noticeText').value = storeSettings.noticeText || '';
  $('noticeTextSecondary').value = storeSettings.noticeText || '';
  $('whatsappNumber').value = storeSettings.whatsappNumber || '7678256489';
  $('supportNumber').value = storeSettings.supportNumber || '7678256489';
  $('minOrder').value = storeSettings.minOrder || 500;
  $('storeLocation').value = storeSettings.storeLocation || '';
  $('storeMapLink').value = storeSettings.storeMapLink || '';
  $('delivery0to999').value = storeSettings.deliveryRules?.[0]?.charge ?? 50;
  $('delivery1000to2999').value = storeSettings.deliveryRules?.[1]?.charge ?? 30;
  $('delivery3000to4999').value = storeSettings.deliveryRules?.[2]?.charge ?? 20;
  $('delivery5000plus').value = storeSettings.deliveryRules?.[3]?.charge ?? 10;
}

async function loadAll() {
  const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
  if (settingsSnap.exists()) storeSettings = { ...defaults, ...settingsSnap.data() };

  const [catSnap, prodSnap, promoSnap, orderSnap] = await Promise.all([
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'promos')),
    getDocs(collection(db, 'orders'))
  ]);

  categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  promos = promoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderStats() {
  $('statCategories').textContent = String(categories.length);
  $('statProducts').textContent = String(products.length);
  $('statPromos').textContent = String(promos.length);
  $('statOrders').textContent = String(orders.length);
}

function renderCategories() {
  $('categoriesList').innerHTML = categories.map(item => `
    <div class="entity-row">
      <div class="entity-left">
        <img class="entity-preview" src="${item.image || 'https://via.placeholder.com/100'}" alt="cat" />
        <div>
          <strong>${item.name || ''}</strong>
          <div class="muted small">${item.subcategory || ''}</div>
          <div class="muted small">Support: ${item.support || '7678256489'}</div>
        </div>
      </div>
      <div class="entity-actions">
        <button class="small-btn small-edit" data-edit-category="${item.id}">Edit</button>
        <button class="small-btn small-delete" data-del-category="${item.id}">Delete</button>
      </div>
    </div>
  `).join('') || '<div class="muted">No categories yet</div>';

  document.querySelectorAll('[data-edit-category]').forEach(btn => {
    btn.onclick = () => {
      const item = categories.find(x => x.id === btn.dataset.editCategory);
      if (!item) return;
      $('editingCategoryId').value = item.id;
      $('catName').value = item.name || '';
      $('catSubcategory').value = item.subcategory || '';
      $('catSupport').value = item.support || '7678256489';
      $('catAction').value = item.action || 'whatsapp';
      $('catImage').value = item.image || '';
      $('catAltNumber').value = item.altNumber || '';
      renderTab('categories');
    };
  });

  document.querySelectorAll('[data-del-category]').forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, 'categories', btn.dataset.delCategory));
      toast('Category deleted ✅');
      await bootstrap();
    };
  });
}

function renderProducts() {
  $('productsList').innerHTML = products.map(item => `
    <div class="entity-row">
      <div class="entity-left">
        <img class="entity-preview" src="${item.image || 'https://via.placeholder.com/100'}" alt="prod" />
        <div>
          <strong>${item.name || ''}</strong>
          <div class="muted small">${item.category || ''} • ${item.subcategory || ''}</div>
          <div class="muted small">₹${item.price || 0} • ${item.stock || 'In Stock'}</div>
        </div>
      </div>
      <div class="entity-actions">
        <button class="small-btn small-edit" data-edit-product="${item.id}">Edit</button>
        <button class="small-btn small-delete" data-del-product="${item.id}">Delete</button>
      </div>
    </div>
  `).join('') || '<div class="muted">No products yet</div>';

  document.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.onclick = () => {
      const item = products.find(x => x.id === btn.dataset.editProduct);
      if (!item) return;
      $('editingProductId').value = item.id;
      $('prodName').value = item.name || '';
      $('prodCategory').value = item.category || '';
      $('prodSubcategory').value = item.subcategory || '';
      $('prodPrice').value = item.price || 0;
      $('prodStock').value = item.stock || 'In Stock';
      $('prodBadge').value = item.badge || '';
      $('prodImage').value = item.image || '';
      renderTab('products');
    };
  });

  document.querySelectorAll('[data-del-product]').forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, 'products', btn.dataset.delProduct));
      toast('Product deleted ✅');
      await bootstrap();
    };
  });
}

function renderPromos() {
  $('promosList').innerHTML = promos.map(item => `
    <div class="entity-row">
      <div class="entity-left">
        <img class="entity-preview" src="${item.media || 'https://via.placeholder.com/100'}" alt="promo" />
        <div>
          <strong>${item.title || ''}</strong>
          <div class="muted small">${item.text || ''}</div>
          <div class="muted small">${item.type || 'image'}</div>
        </div>
      </div>
      <div class="entity-actions">
        <button class="small-btn small-edit" data-edit-promo="${item.id}">Edit</button>
        <button class="small-btn small-delete" data-del-promo="${item.id}">Delete</button>
      </div>
    </div>
  `).join('') || '<div class="muted">No promos yet</div>';

  document.querySelectorAll('[data-edit-promo]').forEach(btn => {
    btn.onclick = () => {
      const item = promos.find(x => x.id === btn.dataset.editPromo);
      if (!item) return;
      $('editingPromoId').value = item.id;
      $('promoTitle').value = item.title || '';
      $('promoType').value = item.type || 'image';
      $('promoText').value = item.text || '';
      $('promoMedia').value = item.media || '';
      renderTab('promos');
    };
  });

  document.querySelectorAll('[data-del-promo]').forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, 'promos', btn.dataset.delPromo));
      toast('Promo deleted ✅');
      await bootstrap();
    };
  });
}

function renderOrders() {
  $('ordersList').innerHTML = orders.map(item => `
    <div class="entity-row">
      <div>
        <strong>${item.profile?.name || 'Order'}</strong>
        <div class="muted small">${item.profile?.phone || ''}</div>
        <div class="muted small">₹${item.total || 0}</div>
      </div>
    </div>
  `).join('') || '<div class="muted">No orders yet</div>';
}

async function saveBranding() {
  let logo = $('logoUrl').value.trim();
  let banner = $('bannerUrl').value.trim();
  if ($('logoFile').files[0]) logo = await readFileAsDataURL($('logoFile').files[0]);
  if ($('bannerFile').files[0]) banner = await readFileAsDataURL($('bannerFile').files[0]);

  storeSettings = {
    ...storeSettings,
    storeName: $('storeName').value.trim() || 'Devindra Mart',
    tagline: $('tagline').value.trim() || '',
    logo,
    banner
  };
  await setDoc(doc(db, 'settings', 'store'), { ...storeSettings, updatedAt: serverTimestamp() }, { merge: true });
  toast('Branding saved ✅');
  await bootstrap();
}

async function saveSettings() {
  storeSettings = {
    ...storeSettings,
    noticeText: $('noticeText').value.trim(),
    whatsappNumber: $('whatsappNumber').value.trim() || '7678256489',
    supportNumber: $('supportNumber').value.trim() || '7678256489',
    minOrder: Number($('minOrder').value || 500),
    storeLocation: $('storeLocation').value.trim(),
    storeMapLink: $('storeMapLink').value.trim(),
    deliveryRules: [
      { min: 0, max: 999, charge: Number($('delivery0to999').value || 50) },
      { min: 1000, max: 2999, charge: Number($('delivery1000to2999').value || 30) },
      { min: 3000, max: 4999, charge: Number($('delivery3000to4999').value || 20) },
      { min: 5000, max: 999999, charge: Number($('delivery5000plus').value || 10) }
    ]
  };
  await setDoc(doc(db, 'settings', 'store'), { ...storeSettings, updatedAt: serverTimestamp() }, { merge: true });
  toast('Settings saved ✅');
  await bootstrap();
}

async function saveNoticeOnly() {
  $('noticeText').value = $('noticeTextSecondary').value;
  await saveSettings();
}

async function saveCategory() {
  let image = $('catImage').value.trim();
  if ($('catImageFile').files[0]) image = await readFileAsDataURL($('catImageFile').files[0]);
  const payload = {
    name: $('catName').value.trim(),
    subcategory: $('catSubcategory').value.trim(),
    support: $('catSupport').value.trim() || '7678256489',
    action: $('catAction').value.trim() || 'whatsapp',
    image: image || 'https://via.placeholder.com/300',
    altNumber: $('catAltNumber').value.trim(),
    updatedAt: serverTimestamp()
  };
  if (!payload.name) return toast('Category name daalo ❌');
  const id = $('editingCategoryId').value;
  if (id) {
    await updateDoc(doc(db, 'categories', id), payload);
    toast('Category updated ✅');
  } else {
    await addDoc(collection(db, 'categories'), { ...payload, createdAt: serverTimestamp() });
    toast('Category saved ✅');
  }
  clearCategory();
  await bootstrap();
}

function clearCategory() {
  $('editingCategoryId').value = '';
  $('catName').value = '';
  $('catSubcategory').value = '';
  $('catSupport').value = '7678256489';
  $('catAction').value = 'whatsapp';
  $('catImage').value = '';
  $('catAltNumber').value = '';
  $('catImageFile').value = '';
}

async function saveProduct() {
  let image = $('prodImage').value.trim();
  if ($('prodImageFile').files[0]) image = await readFileAsDataURL($('prodImageFile').files[0]);
  const payload = {
    name: $('prodName').value.trim(),
    category: $('prodCategory').value.trim(),
    subcategory: $('prodSubcategory').value.trim(),
    price: Number($('prodPrice').value || 0),
    stock: $('prodStock').value.trim() || 'In Stock',
    badge: $('prodBadge').value.trim() || 'Featured',
    image: image || 'https://via.placeholder.com/300',
    updatedAt: serverTimestamp()
  };
  if (!payload.name) return toast('Product name daalo ❌');
  const id = $('editingProductId').value;
  if (id) {
    await updateDoc(doc(db, 'products', id), payload);
    toast('Product updated ✅');
  } else {
    await addDoc(collection(db, 'products'), { ...payload, createdAt: serverTimestamp() });
    toast('Product saved ✅');
  }
  clearProduct();
  await bootstrap();
}

function clearProduct() {
  $('editingProductId').value = '';
  $('prodName').value = '';
  $('prodCategory').value = '';
  $('prodSubcategory').value = '';
  $('prodPrice').value = '';
  $('prodStock').value = 'In Stock';
  $('prodBadge').value = '';
  $('prodImage').value = '';
  $('prodImageFile').value = '';
}

async function savePromo() {
  let media = $('promoMedia').value.trim();
  if ($('promoMediaFile').files[0]) media = await readFileAsDataURL($('promoMediaFile').files[0]);
  const payload = {
    title: $('promoTitle').value.trim(),
    type: $('promoType').value.trim() || 'image',
    text: $('promoText').value.trim(),
    media: media || 'https://via.placeholder.com/600x300',
    updatedAt: serverTimestamp()
  };
  if (!payload.title) return toast('Promo title daalo ❌');
  const id = $('editingPromoId').value;
  if (id) {
    await updateDoc(doc(db, 'promos', id), payload);
    toast('Promo updated ✅');
  } else {
    await addDoc(collection(db, 'promos'), { ...payload, createdAt: serverTimestamp() });
    toast('Promo saved ✅');
  }
  clearPromo();
  await bootstrap();
}

function clearPromo() {
  $('editingPromoId').value = '';
  $('promoTitle').value = '';
  $('promoType').value = 'image';
  $('promoText').value = '';
  $('promoMedia').value = '';
  $('promoMediaFile').value = '';
}

async function saveSecurity() {
  const username = $('adminUsername').value.trim() || 'admin';
  const password = $('adminPassword').value.trim() || 'admin123';
  await setDoc(doc(db, 'adminSettings', 'auth'), { username, password, updatedAt: serverTimestamp() });
  toast('Login saved ✅');
}

async function seedDemo() {
  await addDoc(collection(db, 'categories'), { name: 'Kirana', subcategory: 'Rice, Atta, Oil', support: '7678256489', action: 'whatsapp', image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=500', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'products'), { name: 'Rice', category: 'Kirana', subcategory: 'Rice', price: 50, stock: 'In Stock', badge: 'Featured', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'promos'), { title: 'Fresh Deals', type: 'image', text: 'Aaj ke fresh offers', media: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  toast('Demo data added ✅');
  await bootstrap();
}

async function bootstrap() {
  await loadAll();
  fillSettings();
  renderStats();
  renderCategories();
  renderProducts();
  renderPromos();
  renderOrders();

  const auth = await getAdminCreds();
  $('adminUsername').value = auth.username || 'admin';
  $('adminPassword').value = auth.password || 'admin123';
}

function bindUI() {
  $('loginBtn').onclick = tryLogin;
  $('logoutBtn').onclick = () => {
    localStorage.removeItem(LOGIN_KEY);
    location.reload();
  };
  document.querySelectorAll('.admin-menu-btn').forEach(btn => btn.onclick = () => renderTab(btn.dataset.tab));
  $('refreshAllBtn').onclick = bootstrap;
  $('seedDemoBtn').onclick = seedDemo;
  $('saveBrandingBtn').onclick = saveBranding;
  $('previewBrandingBtn').onclick = async () => {
    if ($('logoFile').files[0]) $('logoUrl').value = await readFileAsDataURL($('logoFile').files[0]);
    if ($('bannerFile').files[0]) $('bannerUrl').value = await readFileAsDataURL($('bannerFile').files[0]);
    toast('Preview loaded ✅');
  };
  $('saveSettingsBtn').onclick = saveSettings;
  $('saveNoticeBtn').onclick = saveNoticeOnly;
  $('addCategoryBtn').onclick = saveCategory;
  $('clearCategoryBtn').onclick = clearCategory;
  $('saveProductBtn').onclick = saveProduct;
  $('clearProductBtn').onclick = clearProduct;
  $('savePromoBtn').onclick = savePromo;
  $('clearPromoBtn').onclick = clearPromo;
  $('saveSecurityBtn').onclick = saveSecurity;
}

bindUI();

if (localStorage.getItem(LOGIN_KEY) === 'yes') {
  showAdmin();
  bootstrap();
}
