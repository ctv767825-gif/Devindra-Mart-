(async function(){
  const $ = (id)=>document.getElementById(id);
  await window.DMData.ensureSeed();
  let settings = await window.DMData.getSettings();
  let categories = (await window.DMData.getCollection('categories')).filter(x=>x.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  let products = await window.DMData.getCollection('products');
  let promos = (await window.DMData.getCollection('promos')).filter(x=>x.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  let cart = JSON.parse(localStorage.getItem('dm_cart')||'[]');
  let currentView = localStorage.getItem('dm_view') || 'grid';
  let currentCategory = null;
  let currentSubcat = null;
  let promoIndex = 0;
  let promoTimer = null;

  function setText(id, value){ const el=$(id); if(el) el.textContent=value; }
  function money(n){ return '₹' + Number(n||0).toFixed(0); }
  function saveCart(){ localStorage.setItem('dm_cart', JSON.stringify(cart)); }
  function getDelivery(subtotal){
    const rules = settings.deliveryRules||[];
    const hit = rules.find(r=>subtotal >= Number(r.min) && subtotal <= Number(r.max));
    return hit ? Number(hit.charge) : 0;
  }
  function cartSubtotal(){ return cart.reduce((s,x)=>s + x.price*x.qty, 0); }
  function cartTotal(){ const sub = cartSubtotal(); return sub + getDelivery(sub); }

  function applyBrand(){
    setText('storeNameTop', settings.storeName);
    setText('storeTaglineTop', settings.tagline);
    setText('heroTitle', settings.tagline);
    setText('heroSub', settings.subtitle);
    setText('brandSmall', settings.storeName.toUpperCase());
    setText('brandBig', settings.tagline);
    $('storeLogo').src = settings.logoUrl || 'logo.svg';
    setText('minChip', 'Min ₹' + settings.minOrder);
    $('notificationBar').classList.toggle('hidden', !settings.notificationEnabled || !settings.notificationText);
    $('notificationBar').textContent = settings.notificationText || '';
    setText('helpTitle', settings.helpHeading || 'Help Center');
    setText('helpText', settings.helpText || 'Call or WhatsApp our support team for fast help.');
    $('callSupportBtn').href = 'tel:' + (settings.supportPhone || '');
    $('waSupportBtn').href = 'https://wa.me/' + (settings.whatsapp || '');
    $('waLogin').onclick = ()=> window.open('https://wa.me/' + (settings.whatsapp || ''), '_blank');
  }

  function renderTopCategories(){
    $('topCategoryPanel').innerHTML = categories.map(c=>`<button class="category-chip" onclick="window.DMApp.chooseCategory('${c.id}')">${c.name}</button>`).join('');
    $('categorySheetList').innerHTML = categories.map(c=>{
      const sub = (c.subcategories||[]).map(s=>`<button class="btn secondary mt8" onclick="window.DMApp.chooseCategory('${c.id}','${String(s).replace(/'/g,"\\'")}'); window.DMApp.closeCategorySheet();">${s}</button>`).join('');
      return `<div class="card mb16"><div style="font-weight:900;font-size:18px">${c.name}</div>${sub || '<div class="meta mt8">No sub-category</div>'}</div>`;
    }).join('');
  }

  function renderSubcats(){
    if(!currentCategory){ $('subCategoryWrap').innerHTML=''; return; }
    const cat = categories.find(c=>c.id===currentCategory);
    if(!cat){ $('subCategoryWrap').innerHTML=''; return; }
    const chips = ['All', ...(cat.subcategories||[])].map(s=>`<button class="subcat-chip" style="background:${s===currentSubcat || (!currentSubcat&&s==='All') ? '#11213f':'#eef2ff'};color:${s===currentSubcat || (!currentSubcat&&s==='All') ? '#fff':'#11213f'}" onclick="window.DMApp.chooseCategory('${cat.id}','${s==='All'?'':String(s).replace(/'/g,"\\'")}')">${s}</button>`).join('');
    $('subCategoryWrap').innerHTML = chips;
  }

  function filteredProducts(){
    const q = ($('searchInput')?.value || '').toLowerCase().trim();
    return products.filter(p=>{
      const catOk = currentCategory ? p.categoryId===currentCategory : true;
      const subOk = currentSubcat ? p.subcategory===currentSubcat : true;
      const qOk = !q || [p.name,p.subcategory,p.categoryId].join(' ').toLowerCase().includes(q);
      return catOk && subOk && qOk && p.stock !== false;
    });
  }

  function renderProducts(){
    const wrap = $('productList');
    wrap.className = 'products ' + currentView;
    wrap.innerHTML = filteredProducts().map(p=>{
      const inCart = cart.find(x=>x.id===p.id);
      const cat = categories.find(c=>c.id===p.categoryId);
      return `<div class="product">
        <img src="${p.image}" alt="${p.name}">
        <div style="flex:1">
          <div class="pname">${p.name}</div>
          <div class="meta">${cat?.name || ''} • ${p.subcategory || ''}</div>
          <div class="priceRow mt8"><span>${money(p.price)}</span>${p.mrp ? `<span class="mrp">${money(p.mrp)}</span>`:''}</div>
          <div class="qtyWrap mt12">
            <button class="btn ghost" onclick="window.DMApp.contactForCategory('${p.categoryId}')">Support</button>
            ${inCart ? `<div class="qty"><button onclick="window.DMApp.changeQty('${p.id}',-1)">-</button><strong>${inCart.qty}</strong><button onclick="window.DMApp.changeQty('${p.id}',1)">+</button></div>` : `<button class="btn" onclick="window.DMApp.addToCart('${p.id}')">Add</button>`}
          </div>
        </div>
      </div>`;
    }).join('') || `<div class="card">No products found.</div>`;
  }

  function renderCart(){
    $('cartItems').innerHTML = cart.map(item=>`<div class="card mb16"><div style="display:flex;justify-content:space-between;gap:12px"><div><div style="font-weight:800">${item.name}</div><div class="meta">${money(item.price)} × ${item.qty}</div></div><div class="qty"><button onclick="window.DMApp.changeQty('${item.id}',-1)">-</button><strong>${item.qty}</strong><button onclick="window.DMApp.changeQty('${item.id}',1)">+</button></div></div></div>`).join('') || '<div class="meta">Cart is empty.</div>';
    const sub = cartSubtotal();
    const del = getDelivery(sub);
    $('subtotalValue').textContent = money(sub);
    $('deliveryValue').textContent = money(del);
    $('totalValue').textContent = money(sub+del);
    $('minOrderWarning').classList.toggle('hidden', sub >= Number(settings.minOrder||500) || sub===0);
  }

  function showScreen(id){
    ['homeScreen','cartScreen','accountScreen','supportScreen'].forEach(s=>$(s).classList.add('hidden'));
    $(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn[data-screen]').forEach(b=>b.classList.toggle('active', b.dataset.screen===id));
  }

  function renderAccount(){
    const data = JSON.parse(localStorage.getItem('dm_address')||'{}');
    $('accountData').innerHTML = `<div class="row"><div><div class="meta">Name</div><div>${data.name||'-'}</div></div><div><div class="meta">Mobile</div><div>${data.mobile||'-'}</div></div></div>
    <div class="mt12"><div class="meta">Address</div><div>${data.fullAddress||'-'}</div></div>
    <div class="row mt12"><div><div class="meta">City</div><div>${data.city||'-'}</div></div><div><div class="meta">State</div><div>${data.state||'-'}</div></div></div>
    <div class="row mt12"><div><div class="meta">Pincode</div><div>${data.pincode||'-'}</div></div><div><div class="meta">Landmark</div><div>${data.landmark||'-'}</div></div></div>`;
  }

  function renderPromo(){
    const active = promos.filter(x=>x.active!==false);
    const wrap = $('promoWrap');
    if(!active.length){ wrap.innerHTML=''; return; }
    const promo = active[promoIndex % active.length];
    const media = promo.type === 'video'
      ? `<video class="promo-media" muted playsinline autoplay src="${promo.mediaUrl}"></video>`
      : `<img class="promo-media" src="${promo.mediaUrl}" alt="promo">`;
    wrap.innerHTML = `<div class="promo">${media}<div class="promo-content"><div style="font-weight:900;font-size:20px">${promo.title||''}</div><div>${promo.subtitle||''}</div></div></div>`;
    clearTimeout(promoTimer);
    promoTimer = setTimeout(()=>{ promoIndex=(promoIndex+1)%active.length; renderPromo(); }, Number(promo.duration||3000));
  }

  function chooseCategory(catId, sub=''){
    currentCategory = catId || null;
    currentSubcat = sub || null;
    renderSubcats();
    renderProducts();
  }

  function addToCart(id){
    const p = products.find(x=>x.id===id); if(!p) return;
    const existing = cart.find(x=>x.id===id);
    if(existing) existing.qty += 1;
    else cart.push({ id:p.id, name:p.name, price:Number(p.price), qty:1, categoryId:p.categoryId });
    saveCart(); renderProducts(); renderCart();
  }

  function changeQty(id, delta){
    const item = cart.find(x=>x.id===id); if(!item) return;
    item.qty += delta; if(item.qty<=0) cart = cart.filter(x=>x.id!==id);
    saveCart(); renderProducts(); renderCart();
  }

  function contactForCategory(categoryId){
    const cat = categories.find(c=>c.id===categoryId); if(!cat) return;
    if(cat.supportType==='call') window.location.href = 'tel:' + cat.supportValue;
    else if(cat.supportType==='whatsapp') window.open('https://wa.me/' + cat.supportValue, '_blank');
    else window.open(cat.supportValue, '_blank');
  }

  async function placeOrder(){
    const subtotal = cartSubtotal();
    if(subtotal < Number(settings.minOrder||500)) { renderCart(); return; }
    const address = JSON.parse(localStorage.getItem('dm_address')||'{}');
    const order = {
      createdAt: new Date().toISOString(),
      mobile: address.mobile || localStorage.getItem('dm_mobile') || '',
      address,
      items: cart,
      subtotal,
      delivery: getDelivery(subtotal),
      total: cartTotal(),
      status: 'pending'
    };
    await window.DMData.createOrder(order);
    alert('Order placed successfully!');
    cart = []; saveCart(); renderCart(); showScreen('homeScreen');
  }

  function openCategorySheet(){ $('categoryOverlay').classList.remove('hidden'); $('categorySheet').classList.remove('hidden'); }
  function closeCategorySheet(){ $('categoryOverlay').classList.add('hidden'); $('categorySheet').classList.add('hidden'); }

  function setupLoginFlow(){
    const done = localStorage.getItem('dm_address_done') === '1';
    if(done){ $('loginPage').classList.add('hidden'); $('captchaPage').classList.add('hidden'); $('addressPage').classList.add('hidden'); $('appPage').classList.remove('hidden'); return; }
    $('continueBtn').onclick = ()=>{
      const num = $('loginMobile').value.trim();
      if(num.length < 10) return alert('Sahi mobile number daalo');
      localStorage.setItem('dm_mobile', num);
      $('loginPage').classList.add('hidden');
      $('captchaPage').classList.remove('hidden');
    };
    $('verifyBtn').onclick = ()=>{
      if(!$('robotCheck').checked) return alert("Please tick I'm not a robot");
      $('captchaPage').classList.add('hidden');
      $('addressPage').classList.remove('hidden');
      $('addrMobile').value = localStorage.getItem('dm_mobile') || '';
    };
    $('saveAddressBtn').onclick = ()=>{
      const address = {
        name: $('addrName').value.trim(),
        mobile: $('addrMobile').value.trim(),
        fullAddress: $('addrFull').value.trim(),
        city: $('addrCity').value.trim(),
        state: $('addrState').value.trim(),
        pincode: $('addrPincode').value.trim(),
        landmark: $('addrLandmark').value.trim()
      };
      if(!address.name || !address.mobile || !address.fullAddress) return alert('Name, mobile aur address bharo');
      localStorage.setItem('dm_address', JSON.stringify(address));
      localStorage.setItem('dm_address_done', '1');
      $('addressPage').classList.add('hidden');
      $('appPage').classList.remove('hidden');
      renderAccount();
    };
  }

  $('viewToggle').onclick = ()=>{
    currentView = currentView === 'grid' ? 'list' : 'grid';
    localStorage.setItem('dm_view', currentView);
    $('viewToggle').textContent = currentView === 'grid' ? 'List View' : 'Grid View';
    renderProducts();
  };
  $('searchInput').oninput = renderProducts;
  $('placeOrderBtn').onclick = placeOrder;
  document.querySelectorAll('.nav-btn[data-screen]').forEach(btn=>btn.onclick=()=>showScreen(btn.dataset.screen));
  $('categoryNavBtn').onclick = openCategorySheet;
  $('categoryOverlay').onclick = closeCategorySheet;
  $('closeCategorySheet').onclick = closeCategorySheet;

  window.DMApp = { chooseCategory, addToCart, changeQty, contactForCategory, closeCategorySheet };
  setupLoginFlow();
  applyBrand();
  renderTopCategories();
  renderSubcats();
  $('viewToggle').textContent = currentView === 'grid' ? 'List View' : 'Grid View';
  renderProducts();
  renderCart();
  renderAccount();
  renderPromo();
})();
