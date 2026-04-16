(function(){
  const cfg = window.firebaseConfig || null;
  let db = null;
  let firebaseReady = false;
  let fns = {};

  const sampleData = {
    settings: {
      storeName: 'DevIndra Mart',
      tagline: 'Ghar tak paaye bazaar jaise rate',
      subtitle: 'Fast ordering, easy checkout, smart kirana shopping.',
      minOrder: 500,
      supportPhone: '9876543210',
      whatsapp: '919876543210',
      logoUrl: 'logo.svg',
      welcomeNote: '',
      deliveryRules: [
        { min: 0, max: 999, charge: 50 },
        { min: 1000, max: 2999, charge: 30 },
        { min: 3000, max: 4999, charge: 20 },
        { min: 5000, max: 999999, charge: 10 }
      ],
      notificationEnabled: true,
      notificationText: 'Fresh offers live now • Support available on WhatsApp',
      helpHeading: 'Need help with your order?',
      helpText: 'Call or WhatsApp our support team for fast help.'
    },
    promos: [
      {
        id: 'promo-1',
        type: 'image',
        title: 'Daily Grocery Savings',
        subtitle: 'Top deals on kirana, fruits and dairy',
        mediaUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
        order: 1,
        active: true,
        duration: 3000
      },
      {
        id: 'promo-2',
        type: 'image',
        title: 'Medical & Essentials',
        subtitle: 'Quick access to daily health essentials',
        mediaUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=1200&auto=format&fit=crop',
        order: 2,
        active: true,
        duration: 3000
      }
    ],
    categories: [
      {
        id: 'cat-kirana',
        name: 'Kirana',
        image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?q=80&w=800&auto=format&fit=crop',
        supportType: 'whatsapp',
        supportValue: '919876543210',
        order: 1,
        active: true,
        subcategories: ['Atta & Rice', 'Oil & Ghee', 'Masale', 'Snacks']
      },
      {
        id: 'cat-fruits',
        name: 'Fruits',
        image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=800&auto=format&fit=crop',
        supportType: 'call',
        supportValue: '9876543211',
        order: 2,
        active: true,
        subcategories: ['Seasonal', 'Imported', 'Cut Fruits']
      },
      {
        id: 'cat-vegetables',
        name: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
        supportType: 'call',
        supportValue: '9876543212',
        order: 3,
        active: true,
        subcategories: ['Leafy', 'Root', 'Daily Use']
      },
      {
        id: 'cat-dairy',
        name: 'Dairy',
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop',
        supportType: 'whatsapp',
        supportValue: '919876543213',
        order: 4,
        active: true,
        subcategories: ['Milk', 'Paneer', 'Butter & Cheese']
      },
      {
        id: 'cat-medical',
        name: 'Medical',
        image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=800&auto=format&fit=crop',
        supportType: 'link',
        supportValue: 'tel:+919876543214',
        order: 5,
        active: true,
        subcategories: ['First Aid', 'OTC', 'Personal Care']
      }
    ],
    products: [
      { id:'p1', categoryId:'cat-kirana', subcategory:'Atta & Rice', name:'Aashirvaad Atta 5kg', image:'https://images.unsplash.com/photo-1603048297172-c92544798d5a?q=80&w=800&auto=format&fit=crop', price:280, mrp:320, stock:true, featured:true },
      { id:'p2', categoryId:'cat-kirana', subcategory:'Atta & Rice', name:'Basmati Rice 5kg', image:'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop', price:420, mrp:480, stock:true, featured:true },
      { id:'p3', categoryId:'cat-kirana', subcategory:'Oil & Ghee', name:'Fortune Oil 1L', image:'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop', price:165, mrp:180, stock:true, featured:false },
      { id:'p4', categoryId:'cat-kirana', subcategory:'Snacks', name:'Marie Biscuit Pack', image:'https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=800&auto=format&fit=crop', price:35, mrp:40, stock:true, featured:false },
      { id:'p5', categoryId:'cat-fruits', subcategory:'Seasonal', name:'Apple 1kg', image:'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=800&auto=format&fit=crop', price:180, mrp:220, stock:true, featured:true },
      { id:'p6', categoryId:'cat-fruits', subcategory:'Seasonal', name:'Banana 1 dozen', image:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=800&auto=format&fit=crop', price:60, mrp:70, stock:true, featured:false },
      { id:'p7', categoryId:'cat-vegetables', subcategory:'Daily Use', name:'Potato 1kg', image:'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800&auto=format&fit=crop', price:28, mrp:35, stock:true, featured:false },
      { id:'p8', categoryId:'cat-vegetables', subcategory:'Daily Use', name:'Onion 1kg', image:'https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=800&auto=format&fit=crop', price:38, mrp:45, stock:true, featured:false },
      { id:'p9', categoryId:'cat-dairy', subcategory:'Milk', name:'Amul Gold Milk 1L', image:'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800&auto=format&fit=crop', price:68, mrp:72, stock:true, featured:true },
      { id:'p10', categoryId:'cat-dairy', subcategory:'Paneer', name:'Fresh Paneer 200g', image:'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=800&auto=format&fit=crop', price:95, mrp:110, stock:true, featured:false },
      { id:'p11', categoryId:'cat-medical', subcategory:'First Aid', name:'Bandage Roll', image:'https://images.unsplash.com/photo-1584516150909-c43483ee7938?q=80&w=800&auto=format&fit=crop', price:45, mrp:55, stock:true, featured:false },
      { id:'p12', categoryId:'cat-medical', subcategory:'OTC', name:'Pain Relief Balm', image:'https://images.unsplash.com/photo-1584362917165-526a968579e8?q=80&w=800&auto=format&fit=crop', price:120, mrp:140, stock:true, featured:false }
    ],
    orders: []
  };

  async function initFirebase() {
    if (!cfg || !cfg.apiKey) return false;
    if (firebaseReady) return true;
    try {
      const appModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const storeModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const app = appModule.initializeApp(cfg);
      db = storeModule.getFirestore(app);
      fns = storeModule;
      firebaseReady = true;
      return true;
    } catch (e) {
      console.warn('Firebase init failed, using local fallback', e);
      firebaseReady = false;
      return false;
    }
  }

  function localGet(key, fallback) {
    try {
      const value = localStorage.getItem('dm_' + key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function localSet(key, value) {
    localStorage.setItem('dm_' + key, JSON.stringify(value));
  }

  async function ensureSeed() {
    const localSeeded = localStorage.getItem('dm_seeded');
    if (!localSeeded) {
      Object.entries(sampleData).forEach(([k, v]) => localSet(k, v));
      localStorage.setItem('dm_seeded', '1');
    }
    const ok = await initFirebase();
    if (!ok) return;
    try {
      const settingsRef = fns.doc(db, 'app', 'settings');
      const settingsSnap = await fns.getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await fns.setDoc(settingsRef, sampleData.settings);
      }
      for (const cat of sampleData.categories) {
        const ref = fns.doc(db, 'categories', cat.id);
        const snap = await fns.getDoc(ref);
        if (!snap.exists()) await fns.setDoc(ref, cat);
      }
      for (const p of sampleData.products) {
        const ref = fns.doc(db, 'products', p.id);
        const snap = await fns.getDoc(ref);
        if (!snap.exists()) await fns.setDoc(ref, p);
      }
      for (const promo of sampleData.promos) {
        const ref = fns.doc(db, 'promos', promo.id);
        const snap = await fns.getDoc(ref);
        if (!snap.exists()) await fns.setDoc(ref, promo);
      }
    } catch (e) {
      console.warn('Seed issue', e);
    }
  }

  async function getSettings() {
    await ensureSeed();
    if (firebaseReady) {
      try {
        const snap = await fns.getDoc(fns.doc(db, 'app', 'settings'));
        if (snap.exists()) return snap.data();
      } catch {}
    }
    return localGet('settings', sampleData.settings);
  }

  async function saveSettings(settings) {
    localSet('settings', settings);
    const ok = await initFirebase();
    if (ok) await fns.setDoc(fns.doc(db, 'app', 'settings'), settings);
  }

  async function getCollection(name) {
    await ensureSeed();
    const local = localGet(name, sampleData[name] || []);
    if (firebaseReady) {
      try {
        const q = await fns.getDocs(fns.collection(db, name));
        const arr = q.docs.map(d => ({ id: d.id, ...d.data() }));
        if (arr.length) {
          localSet(name, arr);
          return arr;
        }
      } catch {}
    }
    return local;
  }

  async function saveCollection(name, items) {
    localSet(name, items);
    const ok = await initFirebase();
    if (ok) {
      for (const item of items) {
        const id = item.id || crypto.randomUUID();
        item.id = id;
        await fns.setDoc(fns.doc(db, name, id), item);
      }
    }
    return items;
  }

  async function upsertDoc(name, item) {
    const arr = await getCollection(name);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = item; else arr.push(item);
    await saveCollection(name, arr);
    return item;
  }

  async function deleteDocById(name, id) {
    const arr = await getCollection(name);
    const next = arr.filter(x => x.id !== id);
    localSet(name, next);
    const ok = await initFirebase();
    if (ok) await fns.deleteDoc(fns.doc(db, name, id));
    return next;
  }

  async function createOrder(order) {
    order.id = order.id || 'ord-' + Date.now();
    const arr = await getCollection('orders');
    arr.unshift(order);
    await saveCollection('orders', arr);
    return order;
  }

  window.DMData = {
    ensureSeed,
    getSettings,
    saveSettings,
    getCollection,
    saveCollection,
    upsertDoc,
    deleteDocById,
    createOrder,
    sampleData
  };
})();
