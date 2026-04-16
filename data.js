const DEFAULT_DATA = {
  settings: {
    storeName: 'DevIndra Mart',
    heroTitle: 'Ghar tak paaye bazaar jaise rate',
    heroSub: 'Fast ordering, easy checkout, smart kirana shopping.',
    logoUrl: 'logo.svg',
    topNotice: 'Fresh items daily • Fast support • Same day delivery in selected areas',
    notificationEnabled: true,
    notificationText: 'Today offer live hai. Minimum order ₹500 hai.',
    supportPhone: '9876543210',
    whatsappNumber: '919876543210',
    minOrderValue: 500,
    deliverySlabs: [
      { min: 0, max: 999, charge: 50 },
      { min: 1000, max: 2999, charge: 30 },
      { min: 3000, max: 4999, charge: 20 },
      { min: 5000, max: 999999, charge: 10 }
    ],
    offerMarquee: '₹699 par SAVE50 • ₹999 par FIRST100 • Voice se bhi order karo',
    helpTitle: 'Help Center',
    helpText: 'Order, delivery, support ya category help ke liye hume contact karo.',
    integrations: {
      riderEnabled: false,
      riderAppName: '',
      riderAppLink: '',
      billingEnabled: false,
      billingAppName: '',
      billingAppLink: '',
      receiptEnabled: false,
      receiptPrefix: 'DM',
      receiptTemplate: 'Standard'
    }
  },
  promos: [
    { id: 'promo1', type: 'image', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop', title: 'Fresh Grocery Deals', subtitle: 'Smart shopping, fast delivery', order: 1, enabled: true },
    { id: 'promo2', type: 'image', url: 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?q=80&w=1200&auto=format&fit=crop', title: 'Daily Essentials', subtitle: 'Kirana, fruits, vegetables, dairy', order: 2, enabled: true }
  ],
  categories: [
    { id: 'kirana', name: 'Kirana', image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?q=80&w=600&auto=format&fit=crop', supportType: 'whatsapp', supportValue: '919876543210', order: 1, active: true },
    { id: 'medical', name: 'Medical', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=600&auto=format&fit=crop', supportType: 'call', supportValue: '9876543211', order: 2, active: true },
    { id: 'fruits', name: 'Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=600&auto=format&fit=crop', supportType: 'whatsapp', supportValue: '919876543212', order: 3, active: true },
    { id: 'vegetables', name: 'Vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop', supportType: 'whatsapp', supportValue: '919876543213', order: 4, active: true },
    { id: 'dairy', name: 'Dairy', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', supportType: 'link', supportValue: 'https://wa.me/919876543214', order: 5, active: true }
  ],
  products: [
    { id: 'p1', name: 'Aashirvaad Atta', brand: 'Aashirvaad', size: '5kg', categoryId: 'kirana', image: 'https://images.unsplash.com/photo-1603048719539-9ecb4d47f4b8?q=80&w=800&auto=format&fit=crop', price: 285, mrp: 320, stock: true, featured: true },
    { id: 'p2', name: 'Tata Salt', brand: 'Tata', size: '1kg', categoryId: 'kirana', image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442f?q=80&w=800&auto=format&fit=crop', price: 25, mrp: 28, stock: true, featured: false },
    { id: 'p3', name: 'Paracetamol', brand: 'Generic', size: '10 tablets', categoryId: 'medical', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop', price: 40, mrp: 50, stock: true, featured: false },
    { id: 'p4', name: 'Fresh Apples', brand: 'Premium', size: '1kg', categoryId: 'fruits', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=800&auto=format&fit=crop', price: 160, mrp: 180, stock: true, featured: true },
    { id: 'p5', name: 'Potato', brand: 'Farm Fresh', size: '1kg', categoryId: 'vegetables', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800&auto=format&fit=crop', price: 35, mrp: 40, stock: true, featured: false },
    { id: 'p6', name: 'Milk Pack', brand: 'Dairy Fresh', size: '500ml', categoryId: 'dairy', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop', price: 32, mrp: 35, stock: true, featured: false }
  ],
  orders: []
};

const LS_PREFIX = 'dm_rebuild_';
let firebaseApi = null;
let firebaseMode = false;

function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function localGet(name, fallback){ try{ const raw = localStorage.getItem(LS_PREFIX + name); return raw ? JSON.parse(raw) : deepClone(fallback); }catch(e){ return deepClone(fallback); } }
function localSet(name, value){ localStorage.setItem(LS_PREFIX + name, JSON.stringify(value)); }

async function initFirebase(){
  if (firebaseApi !== null) return firebaseMode;
  firebaseApi = false;
  const cfg = window.firebaseConfig || {};
  if (!cfg.projectId || String(cfg.projectId).includes('PASTE_YOUR_')) return false;
  try{
    const [{ initializeApp }, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]);
    const app = initializeApp(cfg);
    const db = firestore.getFirestore(app);
    firebaseApi = { db, ...firestore };
    firebaseMode = true;
    return true;
  }catch(err){
    console.warn('Firebase init failed, using local mode', err);
    firebaseApi = false;
    firebaseMode = false;
    return false;
  }
}

async function ensureSeed(){
  const active = await initFirebase();
  if (!active) {
    for (const [k,v] of Object.entries(DEFAULT_DATA)) {
      if (!localStorage.getItem(LS_PREFIX + k)) localSet(k, v);
    }
    return;
  }
  const { db, doc, getDoc, setDoc, collection, getDocs, addDoc, query, limit } = firebaseApi;
  const settingsRef = doc(db, 'app_config', 'settings');
  const settingsSnap = await getDoc(settingsRef);
  if (!settingsSnap.exists()) await setDoc(settingsRef, DEFAULT_DATA.settings);

  async function seedCollection(name, items){
    const snap = await getDocs(query(collection(db, name), limit(1)));
    if (!snap.empty) return;
    for (const item of items) await addDoc(collection(db, name), item);
  }
  await seedCollection('categories', DEFAULT_DATA.categories);
  await seedCollection('products', DEFAULT_DATA.products);
  await seedCollection('promos', DEFAULT_DATA.promos);
}

async function getSettings(){
  if (!(await initFirebase())) return localGet('settings', DEFAULT_DATA.settings);
  const { db, doc, getDoc } = firebaseApi;
  const snap = await getDoc(doc(db, 'app_config', 'settings'));
  return snap.exists() ? snap.data() : deepClone(DEFAULT_DATA.settings);
}
async function saveSettings(value){
  if (!(await initFirebase())) return localSet('settings', value);
  const { db, doc, setDoc } = firebaseApi;
  return setDoc(doc(db, 'app_config', 'settings'), value, { merge: true });
}

async function getCollection(name){
  if (!(await initFirebase())) return localGet(name, DEFAULT_DATA[name] || []);
  const { db, collection, getDocs, query, orderBy } = firebaseApi;
  let q;
  try{ q = query(collection(db, name), orderBy('order', 'asc')); }
  catch(e){ q = collection(db, name); }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveItem(name, item){
  if (!(await initFirebase())) {
    const arr = localGet(name, DEFAULT_DATA[name] || []);
    if (item.id) {
      const idx = arr.findIndex(x => x.id === item.id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
      else arr.push(item);
    } else {
      item.id = 'id_' + Date.now();
      arr.push(item);
    }
    localSet(name, arr);
    return item;
  }
  const { db, collection, addDoc, doc, setDoc } = firebaseApi;
  if (item.id && !String(item.id).startsWith('id_')) {
    await setDoc(doc(db, name, item.id), item, { merge: true });
    return item;
  }
  const cloned = { ...item };
  delete cloned.id;
  const ref = await addDoc(collection(db, name), cloned);
  return { ...item, id: ref.id };
}

async function deleteItem(name, id){
  if (!(await initFirebase())) {
    const arr = localGet(name, DEFAULT_DATA[name] || []).filter(x => x.id !== id);
    localSet(name, arr); return;
  }
  const { db, doc, deleteDoc } = firebaseApi;
  await deleteDoc(doc(db, name, id));
}

async function createOrder(order){
  order.createdAt = Date.now();
  order.status = 'new';
  return saveItem('orders', order);
}

export { DEFAULT_DATA, ensureSeed, getSettings, saveSettings, getCollection, saveItem, deleteItem, createOrder, initFirebase };
