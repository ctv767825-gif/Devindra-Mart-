import { ensureSeed, getSettings, getCollection, createOrder } from './data.js';

const state = {
  settings: null,
  categories: [],
  products: [],
  promos: [],
  orders: [],
  cart: JSON.parse(localStorage.getItem('dm_cart') || '{}'),
  activeTab: 'home',
  activeCategory: 'all',
  viewMode: localStorage.getItem('dm_view_mode') || 'grid',
  profile: JSON.parse(localStorage.getItem('dm_profile') || 'null'),
  session: JSON.parse(localStorage.getItem('dm_session') || 'null'),
  search: '',
  promoIndex: 0,
  promoTimer: null
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function money(n){ return '₹' + Number(n || 0).toFixed(0); }
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 2200); }
function saveProfile(){ localStorage.setItem('dm_profile', JSON.stringify(state.profile)); }
function saveSession(){ localStorage.setItem('dm_session', JSON.stringify(state.session)); }
function saveCart(){ localStorage.setItem('dm_cart', JSON.stringify(state.cart)); }
function slug(text){ return String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }

function getDeliveryCharge(subtotal){
  const slabs = state.settings.deliverySlabs || [];
  const found = slabs.find(s => subtotal >= s.min && subtotal <= s.max);
  return found ? Number(found.charge || 0) : 0;
}
function getNextSlabText(subtotal){
  const slabs = state.settings.deliverySlabs || [];
  const next = slabs.find(s => subtotal < s.min);
  if (!next) return 'Best slab active';
  return `${money(next.min - subtotal)} aur add karo`;
}
function categoryById(id){ return state.categories.find(c => c.id === id); }
function getFilteredProducts(){
  return state.products.filter(p => {
    const catOk = state.activeCategory === 'all' || p.categoryId === state.activeCategory;
    const q = state.search.trim().toLowerCase();
    const txt = [p.name,p.brand,p.size,categoryById(p.categoryId)?.name].join(' ').toLowerCase();
    const searchOk = !q || txt.includes(q);
    return catOk && searchOk;
  });
}
function qtyOf(id){ return Number(state.cart[id] || 0); }
function cartSubtotal(){
  return Object.entries(state.cart).reduce((sum,[id,qty]) => {
    const p = state.products.find(x => x.id === id); return sum + (p ? p.price * qty : 0);
  },0);
}

function renderLoginTexts(){
  $('#loginHero').textContent = state.settings.heroTitle;
  $('#loginSub').textContent = state.settings.heroSub;
  $('#loginLogo').src = state.settings.logoUrl || 'logo.svg';
}
function renderHeader(){
  $('#topLogo').src = state.settings.logoUrl || 'logo.svg';
  $('#brandNameTiny').textContent = state.settings.storeName;
  $('#topHero').textContent = state.settings.heroTitle;
  $('#heroTitle').textContent = state.settings.heroTitle;
  $('#heroSub').textContent = state.settings.heroSub;
  $('#offerRun').textContent = state.settings.offerMarquee || '';
  $('#minBadge').textContent = `Min ${money(state.settings.minOrderValue)}`;
  const notice = $('#noticeBox');
  if (state.settings.notificationEnabled && state.settings.notificationText) {
    notice.textContent = state.settings.notificationText;
    notice.classList.remove('hidden');
  } else notice.classList.add('hidden');
}
function renderPromos(){
  const root = $('#promoSlider');
  const promos = [...state.promos].filter(p => p.enabled).sort((a,b)=>(a.order||0)-(b.order||0));
  if (!promos.length) { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  root.innerHTML = promos.map((p,idx)=>`<div class="slide ${idx===0?'active':''}" data-index="${idx}">${p.type==='video'?`<video src="${p.url}" playsinline muted autoplay></video>`:`<img src="${p.url}" alt="promo">`}<div class="slide-caption"><div style="font-weight:700">${p.title||''}</div><div class="small muted">${p.subtitle||''}</div></div></div>`).join('') + `<div class="dots">${promos.map((_,idx)=>`<div class="dot ${idx===0?'active':''}" data-index="${idx}"></div>`).join('')}</div>`;
  clearInterval(state.promoTimer);
  state.promoIndex = 0;
  state.promoTimer = setInterval(()=>{
    const slides = $$('.slide'); const dots = $$('.dot');
    if (!slides.length) return;
    slides[state.promoIndex].classList.remove('active'); dots[state.promoIndex].classList.remove('active');
    state.promoIndex = (state.promoIndex + 1) % slides.length;
    slides[state.promoIndex].classList.add('active'); dots[state.promoIndex].classList.add('active');
  }, 3500);
}
function renderCategoryChips(){
  const root = $('#categoryChips');
  const cats = [...state.categories].filter(c=>c.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  root.innerHTML = `<button class="chip ${state.activeCategory==='all'?'active':''}" data-id="all">All</button>` + cats.map(c=>`<button class="chip ${state.activeCategory===c.id?'active':''}" data-id="${c.id}">${c.name}</button>`).join('');
  root.querySelectorAll('.chip').forEach(btn=>btn.onclick=()=>{ state.activeCategory = btn.dataset.id; renderCategoryChips(); renderProducts(); });
}
function renderProducts(){
  const root = $('#productsGrid');
  const items = getFilteredProducts();
  root.className = state.viewMode === 'grid' ? 'grid' : 'grid list';
  $('#viewBtn').textContent = state.viewMode === 'grid' ? 'List View' : 'Grid View';
  $('#listingTitle').textContent = state.activeCategory === 'all' ? 'All Products' : (categoryById(state.activeCategory)?.name || 'Products');
  root.innerHTML = items.map(p => {
    const cat = categoryById(p.categoryId);
    const q = qtyOf(p.id);
    const wrapper = state.viewMode === 'grid' ? 'product' : 'product listitem';
    return `<div class="${wrapper}">
      <img src="${p.image}" alt="${p.name}">
      <div class="pbody">
        <p class="pname">${p.name}</p>
        <div class="psub">${p.brand || ''} ${p.size ? '• ' + p.size : ''}</div>
        <div class="badges"><span class="badge">${cat?.name || ''}</span>${p.stock?'<span class="badge green">In stock</span>':'<span class="badge red">Out of stock</span>'}</div>
        <div class="price-row"><div><div class="price">${money(p.price)}</div>${p.mrp?`<div class="strike">${money(p.mrp)}</div>`:''}</div>
        <div>${q ? `<div class="qty"><button data-minus="${p.id}">-</button><span>${q}</span><button data-plus="${p.id}">+</button></div>` : `<button class="btn" style="width:auto;padding:10px 12px" data-add="${p.id}">Add</button>`}</div></div>
      </div></div>`;
  }).join('');
  root.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
  root.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>addToCart(b.dataset.plus));
  root.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus, -1));
}
function addToCart(id){ state.cart[id] = qtyOf(id) + 1; saveCart(); renderProducts(); renderCart(); toast('Added to cart'); }
function changeQty(id, delta){ const next = Math.max(0, qtyOf(id)+delta); if (!next) delete state.cart[id]; else state.cart[id]=next; saveCart(); renderProducts(); renderCart(); }
function clearCart(){ state.cart = {}; saveCart(); renderProducts(); renderCart(); }
function renderCart(){
  const itemsRoot = $('#cartItems');
  const lines = Object.entries(state.cart).map(([id,qty])=>{
    const p = state.products.find(x=>x.id===id); if (!p) return '';
    return `<div class="item"><div class="between"><div><div style="font-weight:700">${p.name}</div><div class="small muted">${money(p.price)} × ${qty}</div></div><div class="qty"><button data-cm="${id}">-</button><span>${qty}</span><button data-cp="${id}">+</button></div></div></div>`;
  }).join('');
  itemsRoot.innerHTML = lines || '<div class="small muted">Cart empty hai.</div>';
  itemsRoot.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>addToCart(b.dataset.cp));
  itemsRoot.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>changeQty(b.dataset.cm,-1));
  const subtotal = cartSubtotal(); const delivery = subtotal ? getDeliveryCharge(subtotal) : 0; const total = subtotal + delivery;
  $('#subtotalText').textContent = money(subtotal); $('#deliveryText').textContent = money(delivery); $('#totalText').textContent = money(total);
  $('#nextSlabText').textContent = getNextSlabText(subtotal); $('#nextHint').textContent = subtotal < state.settings.minOrderValue ? `${money(state.settings.minOrderValue - subtotal)} aur add karo minimum order ke liye.` : 'Minimum order complete hai.';
  $('#deliverySlabText').textContent = (state.settings.deliverySlabs||[]).map(s=>`${money(s.min)}–${money(s.max)} = ${money(s.charge)}`).join(' • ').replace('₹999999','₹5000+');
}
function renderProfile(){
  const p = state.profile || {};
  $('#profileBox').innerHTML = `<div><b>Name:</b> ${p.name || '-'}</div><div><b>Phone:</b> ${p.phone || '-'}</div><div><b>Address:</b> ${p.address || '-'} ${p.city||''} ${p.state||''} ${p.pincode||''}</div><div><b>Landmark:</b> ${p.landmark || '-'}</div>`;
  $('#helpTitle').textContent = state.settings.helpTitle || 'Help Center';
  $('#helpText').textContent = state.settings.helpText || 'Support ke liye contact karo.';
  $('#callSupportBtn').href = `tel:${state.settings.supportPhone || ''}`;
  $('#waSupportBtn').href = `https://wa.me/${(state.settings.whatsappNumber||'').replace(/\D/g,'')}`;
  const list = $('#categorySupportList');
  list.innerHTML = state.categories.filter(c=>c.active!==false).sort((a,b)=>(a.order||0)-(b.order||0)).map(c=>`<div class="item"><div class="between"><div><div style="font-weight:700">${c.name}</div><div class="small muted">${c.supportType || 'none'} • ${c.supportValue || '-'}</div></div><button class="btn secondary" style="width:auto;padding:8px 12px" data-support="${c.id}">Open</button></div></div>`).join('');
  list.querySelectorAll('[data-support]').forEach(btn=>btn.onclick=()=>openCategorySupport(btn.dataset.support));
}
function openCategorySupport(catId){
  const cat = categoryById(catId); if (!cat) return;
  if (cat.supportType === 'call') window.location.href = `tel:${cat.supportValue}`;
  else if (cat.supportType === 'whatsapp') window.open(`https://wa.me/${String(cat.supportValue).replace(/\D/g,'')}`, '_blank');
  else if (cat.supportType === 'link') window.open(cat.supportValue, '_blank');
  else toast('No support action set');
}
function switchTab(tab){
  state.activeTab = tab;
  ['home','cart','account','help'].forEach(name => $(`#${name}Tab`).classList.toggle('hidden', name !== tab));
  $$('.nav-btn[data-tab]').forEach(btn=>btn.classList.toggle('active', btn.dataset.tab === tab));
}
function scrollToCategories(){ document.getElementById('categoryChips').scrollIntoView({behavior:'smooth', block:'center'}); }

async function placeOrder(){
  const subtotal = cartSubtotal();
  if (subtotal < state.settings.minOrderValue) { toast(`⚠️ Add more items to continue • Minimum order value is ${money(state.settings.minOrderValue)}`); return; }
  const delivery = getDeliveryCharge(subtotal); const total = subtotal + delivery;
  const items = Object.entries(state.cart).map(([id,qty])=>{ const p = state.products.find(x=>x.id===id); return p?{ id, name:p.name, price:p.price, qty }:null; }).filter(Boolean);
  await createOrder({ profile: state.profile, items, subtotal, delivery, total });
  const orderText = encodeURIComponent(`New Order\nName: ${state.profile.name}\nPhone: ${state.profile.phone}\nAddress: ${state.profile.address}, ${state.profile.city}, ${state.profile.state}, ${state.profile.pincode}\n\nItems:\n${items.map(i=>`- ${i.name} × ${i.qty} = ${money(i.price*i.qty)}`).join('\n')}\n\nSubtotal: ${money(subtotal)}\nDelivery: ${money(delivery)}\nTotal: ${money(total)}`);
  const wa = `https://wa.me/${(state.settings.whatsappNumber||'').replace(/\D/g,'')}?text=${orderText}`;
  toast('Order saved');
  clearCart();
  window.open(wa, '_blank');
}

function bind(){
  $('#loginBtn').onclick = () => {
    const phone = $('#loginPhone').value.trim();
    const robot = $('#robotCheck') ? $('#robotCheck').checked : true;
    if (phone.length < 10) return toast('Valid phone number dalo');
    if (!robot) return toast("Please tick I'm not a robot");
    state.session = { phone }; saveSession();
    $('#phoneField').value = phone;
    $('#loginScreen').classList.add('hidden'); $('#addressScreen').classList.remove('hidden');
  };
  $('#saveAddressBtn').onclick = () => {
    state.profile = { name: $('#nameField').value.trim(), phone: $('#phoneField').value.trim(), address: $('#addressField').value.trim(), city: $('#cityField').value.trim(), state: $('#stateField').value.trim(), pincode: $('#pincodeField').value.trim(), landmark: $('#landmarkField').value.trim() };
    if (!state.profile.name || !state.profile.address) return toast('Name aur address bharo');
    saveProfile();
    $('#addressScreen').classList.add('hidden'); $('#appScreen').classList.remove('hidden');
    renderProfile();
  };
  $('#viewBtn').onclick = () => { state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid'; localStorage.setItem('dm_view_mode', state.viewMode); renderProducts(); };
  $('#searchInput').oninput = e => { state.search = e.target.value || ''; renderProducts(); };
  $('#orderBtn').onclick = placeOrder; $('#clearBtn').onclick = clearCart; $('#editAddressBtn').onclick = () => { $('#appScreen').classList.add('hidden'); $('#addressScreen').classList.remove('hidden'); };
  $$('.nav-btn[data-tab]').forEach(btn=>btn.onclick=()=>switchTab(btn.dataset.tab));
  $('#navCategoryBtn').onclick = scrollToCategories;
  $('#supportQuickBtn').onclick = () => switchTab('help');
}

async function init(){
  await ensureSeed();
  state.settings = await getSettings();
  state.categories = await getCollection('categories');
  state.products = await getCollection('products');
  state.promos = await getCollection('promos');
  renderLoginTexts(); renderHeader(); renderPromos(); renderCategoryChips(); renderProducts(); renderCart(); renderProfile(); bind();
  if (state.profile && state.session) { $('#loginScreen').classList.add('hidden'); $('#addressScreen').classList.add('hidden'); $('#appScreen').classList.remove('hidden'); }
  else if (state.session) { $('#loginScreen').classList.add('hidden'); $('#addressScreen').classList.remove('hidden'); $('#phoneField').value = state.session.phone || ''; }
}

init();
