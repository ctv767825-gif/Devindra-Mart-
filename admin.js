(async function(){
  const $ = id => document.getElementById(id);
  await window.DMData.ensureSeed();
  let settings = await window.DMData.getSettings();
  let categories = await window.DMData.getCollection('categories');
  let products = await window.DMData.getCollection('products');
  let promos = await window.DMData.getCollection('promos');
  let orders = await window.DMData.getCollection('orders');
  let future = JSON.parse(localStorage.getItem('dm_future_integrations')||'{}');

  function tab(tabId){
    document.querySelectorAll('.admin-section').forEach(x=>x.classList.add('hidden'));
    $(tabId).classList.remove('hidden');
    document.querySelectorAll('.admin-nav button').forEach(x=>x.classList.toggle('active', x.dataset.tab===tabId));
  }
  document.querySelectorAll('.admin-nav button').forEach(btn=>btn.onclick=()=>tab(btn.dataset.tab));

  function renderDashboard(){
    $('dashCategories').textContent = categories.length;
    $('dashProducts').textContent = products.length;
    $('dashOrders').textContent = orders.length;
  }
  function fillSettings(){
    $('setStoreName').value = settings.storeName||'';
    $('setTagline').value = settings.tagline||'';
    $('setSubtitle').value = settings.subtitle||'';
    $('setLogoUrl').value = settings.logoUrl||'';
    $('setSupportPhone').value = settings.supportPhone||'';
    $('setWhatsapp').value = settings.whatsapp||'';
    $('setMinOrder').value = settings.minOrder||500;
    $('setNotificationText').value = settings.notificationText||'';
    $('setHelpHeading').value = settings.helpHeading||'';
    $('setHelpText').value = settings.helpText||'';
    const rules = settings.deliveryRules||[];
    $('rule1').value = '0-999=50'; $('rule2').value='1000-2999=30'; $('rule3').value='3000-4999=20'; $('rule4').value='5000+=10';
  }
  function renderCategories(){
    $('categoryTableWrap').innerHTML = `<table class="table"><tr><th>Name</th><th>Support</th><th>Subcategories</th><th></th></tr>${categories.map(c=>`<tr><td>${c.name}</td><td>${c.supportType}: ${c.supportValue}</td><td>${(c.subcategories||[]).join(', ')}</td><td><button onclick="DMAdmin.editCategory('${c.id}')">Edit</button> <button onclick="DMAdmin.removeCategory('${c.id}')">Delete</button></td></tr>`).join('')}</table>`;
    $('prodCategory').innerHTML = categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }
  function renderProducts(){
    $('productTableWrap').innerHTML = `<table class="table"><tr><th>Name</th><th>Category</th><th>Price</th><th></th></tr>${products.map(p=>`<tr><td>${p.name}</td><td>${(categories.find(c=>c.id===p.categoryId)||{}).name||''} / ${p.subcategory||''}</td><td>₹${p.price}</td><td><button onclick="DMAdmin.editProduct('${p.id}')">Edit</button> <button onclick="DMAdmin.removeProduct('${p.id}')">Delete</button></td></tr>`).join('')}</table>`;
  }
  function renderPromos(){
    $('promoTableWrap').innerHTML = `<table class="table"><tr><th>Title</th><th>Type</th><th>Order</th><th></th></tr>${promos.map(p=>`<tr><td>${p.title}</td><td>${p.type}</td><td>${p.order}</td><td><button onclick="DMAdmin.editPromo('${p.id}')">Edit</button> <button onclick="DMAdmin.removePromo('${p.id}')">Delete</button></td></tr>`).join('')}</table>`;
  }
  function renderOrders(){
    $('ordersTableWrap').innerHTML = `<table class="table"><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th></tr>${orders.map(o=>`<tr><td>${o.id}</td><td>${o.address?.name||''}<br><span class="meta">${o.mobile||''}</span></td><td>₹${o.total}</td><td><span class="badge">${o.status}</span></td></tr>`).join('')}</table>`;
  }
  function fillFuture(){
    $('futureRiderName').value = future.riderName||''; $('futureRiderLink').value = future.riderLink||'';
    $('futureBillingName').value = future.billingName||''; $('futureBillingLink').value = future.billingLink||'';
    $('futureReceiptPrefix').value = future.receiptPrefix||''; $('futureReceiptTemplate').value = future.receiptTemplate||'';
  }

  $('saveSettingsBtn').onclick = async ()=>{
    settings.storeName = $('setStoreName').value.trim();
    settings.tagline = $('setTagline').value.trim();
    settings.subtitle = $('setSubtitle').value.trim();
    settings.logoUrl = $('setLogoUrl').value.trim();
    settings.supportPhone = $('setSupportPhone').value.trim();
    settings.whatsapp = $('setWhatsapp').value.trim();
    settings.minOrder = Number($('setMinOrder').value||500);
    settings.notificationEnabled = true;
    settings.notificationText = $('setNotificationText').value.trim();
    settings.helpHeading = $('setHelpHeading').value.trim();
    settings.helpText = $('setHelpText').value.trim();
    settings.deliveryRules = [
      {min:0,max:999,charge:50},{min:1000,max:2999,charge:30},{min:3000,max:4999,charge:20},{min:5000,max:999999,charge:10}
    ];
    await window.DMData.saveSettings(settings); alert('Settings saved');
  };

  $('saveCategoryBtn').onclick = async ()=>{
    const item = {
      id: $('catId').value.trim() || ('cat-' + Date.now()),
      name: $('catName').value.trim(),
      image: $('catImage').value.trim(),
      order: Number($('catOrder').value||categories.length+1),
      supportType: $('catSupportType').value,
      supportValue: $('catSupportValue').value.trim(),
      active: true,
      subcategories: $('catSubcats').value.split(',').map(x=>x.trim()).filter(Boolean)
    };
    await window.DMData.upsertDoc('categories', item); categories = await window.DMData.getCollection('categories'); renderCategories(); renderDashboard(); alert('Category saved');
  };

  $('saveProductBtn').onclick = async ()=>{
    const item = {
      id: $('prodId').value.trim() || ('prod-' + Date.now()),
      name: $('prodName').value.trim(),
      image: $('prodImage').value.trim(),
      price: Number($('prodPrice').value||0),
      mrp: Number($('prodMrp').value||0),
      categoryId: $('prodCategory').value,
      subcategory: $('prodSubcategory').value.trim(),
      stock: true,
      featured: false
    };
    await window.DMData.upsertDoc('products', item); products = await window.DMData.getCollection('products'); renderProducts(); renderDashboard(); alert('Product saved');
  };

  $('saveNotifBtn').onclick = async ()=>{ settings.notificationText = $('notifText').value.trim(); settings.notificationEnabled = true; await window.DMData.saveSettings(settings); alert('Notification saved'); };
  $('savePromoBtn').onclick = async ()=>{
    const item = {
      id: $('promoId').value.trim() || ('promo-' + Date.now()),
      title: $('promoTitle').value.trim(),
      subtitle: $('promoSubtitle').value.trim(),
      type: $('promoType').value,
      mediaUrl: $('promoMedia').value.trim(),
      order: Number($('promoOrder').value||1),
      duration: Number($('promoDuration').value||3000),
      active: true
    };
    await window.DMData.upsertDoc('promos', item); promos = await window.DMData.getCollection('promos'); renderPromos(); alert('Promo saved');
  };
  $('saveFutureBtn').onclick = ()=>{ future = {riderName:$('futureRiderName').value.trim(), riderLink:$('futureRiderLink').value.trim(), billingName:$('futureBillingName').value.trim(), billingLink:$('futureBillingLink').value.trim(), receiptPrefix:$('futureReceiptPrefix').value.trim(), receiptTemplate:$('futureReceiptTemplate').value.trim()}; localStorage.setItem('dm_future_integrations', JSON.stringify(future)); alert('Future structure saved'); };

  window.DMAdmin = {
    editCategory(id){ const c=categories.find(x=>x.id===id); if(!c) return; $('catId').value=c.id; $('catName').value=c.name; $('catImage').value=c.image||''; $('catOrder').value=c.order||''; $('catSupportType').value=c.supportType||'call'; $('catSupportValue').value=c.supportValue||''; $('catSubcats').value=(c.subcategories||[]).join(', '); tab('categoriesTab'); },
    async removeCategory(id){ await window.DMData.deleteDocById('categories', id); categories = await window.DMData.getCollection('categories'); renderCategories(); renderDashboard(); },
    editProduct(id){ const p=products.find(x=>x.id===id); if(!p) return; $('prodId').value=p.id; $('prodName').value=p.name; $('prodImage').value=p.image||''; $('prodPrice').value=p.price||''; $('prodMrp').value=p.mrp||''; $('prodCategory').value=p.categoryId||''; $('prodSubcategory').value=p.subcategory||''; tab('productsTab'); },
    async removeProduct(id){ await window.DMData.deleteDocById('products', id); products = await window.DMData.getCollection('products'); renderProducts(); renderDashboard(); },
    editPromo(id){ const p=promos.find(x=>x.id===id); if(!p) return; $('promoId').value=p.id; $('promoTitle').value=p.title||''; $('promoSubtitle').value=p.subtitle||''; $('promoType').value=p.type||'image'; $('promoMedia').value=p.mediaUrl||''; $('promoOrder').value=p.order||1; $('promoDuration').value=p.duration||3000; tab('promoTab'); },
    async removePromo(id){ await window.DMData.deleteDocById('promos', id); promos = await window.DMData.getCollection('promos'); renderPromos(); },
  };

  fillSettings(); renderDashboard(); renderCategories(); renderProducts(); renderPromos(); renderOrders(); fillFuture();
  $('notifText').value = settings.notificationText || '';
})();
