
const P = window.DM_PRODUCTS || [];
const STATS = window.DM_STATS || {};
const stores = [
  {id:'devindra-wholesale',name:'Devindra Mart Wholesale',type:'wholesale',emoji:'🏆',area:'All Areas',desc:'Bulk kirana, carton, loose/patta rate, khata available',priority:true,minOrder:500},
  {id:'hungry-point',name:'Hungry Point',type:'retail',emoji:'🍔',area:'Warisnagar',desc:'Food retail shop',priority:false,minOrder:0},
  {id:'glow-cosmetic',name:'Glow Cosmetic',type:'retail',emoji:'💄',area:'Samastipur',desc:'Cosmetic retail shop',priority:false,minOrder:0},
  {id:'maa-medical',name:'Maa Medical',type:'retail',emoji:'💊',area:'Warisnagar',desc:'Medicine retail shop',priority:false,minOrder:0}
];
const state = {
  mode: localStorage.getItem('dm_mode') || 'both',
  profile: JSON.parse(localStorage.getItem('dm_profile')||'{}'),
  selectedStore: 'devindra-wholesale',
  cart: JSON.parse(localStorage.getItem('dm_cart')||'[]'),
  orders: JSON.parse(localStorage.getItem('dm_orders')||'[]'),
  riderId: localStorage.getItem('dm_rider') || 'RIDER-001'
};
function save(){localStorage.setItem('dm_cart',JSON.stringify(state.cart));localStorage.setItem('dm_orders',JSON.stringify(state.orders));localStorage.setItem('dm_profile',JSON.stringify(state.profile));localStorage.setItem('dm_mode',state.mode)}
function money(n){return '₹'+Math.round(Number(n)||0).toLocaleString('en-IN')}
function qs(id){return document.getElementById(id)}
function toast(msg){let t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
function iconFor(cat){cat=(cat||'').toLowerCase(); if(cat.includes('toffee')||cat.includes('fast'))return '🍬'; if(cat.includes('oil'))return '🛢️'; if(cat.includes('biscuit'))return '🍪'; if(cat.includes('masala'))return '🌶️'; if(cat.includes('snack'))return '🍿'; if(cat.includes('station'))return '✏️'; if(cat.includes('soap')||cat.includes('deterg'))return '🧼'; return '📦'}
function productPrice(p){return Number(p.wholesalePrice || p.retailRefPrice || p.basePrice || 0)}
function selectedStore(){return stores.find(s=>s.id===state.selectedStore)||stores[0]}
function deliveryCharge(store,total){ if(store.type==='wholesale') return total>=5000?0:total>=3000?10:total>=1000?20:50; return 0 }
function cartTotal(){let subtotal=state.cart.reduce((a,i)=>a+(i.price*i.qty),0);let del=deliveryCharge(selectedStore(),subtotal);return {subtotal,delivery:del,total:subtotal+del}}
function newOrder(){let c=cartTotal(), st=selectedStore();return {id:'ORD-'+Date.now(),storeId:st.id,storeName:st.name,storeType:st.type,status:'Accepted',paymentMethod:st.type==='wholesale'?qs('payMethod')?.value||'COD':qs('payMethod')?.value||'COD',items:state.cart,total:c.total,subtotal:c.subtotal,delivery:c.delivery,pickupCode:'DMQ-'+Math.floor(100000+Math.random()*900000),createdAt:new Date().toLocaleString(),customerPhone:state.profile.phone||'',customerName:state.profile.name||''}}
function canCancel(o){return ['Placed','Accepted','Pending'].includes(o.status)}
function setStatus(id,status){let o=state.orders.find(x=>x.id===id); if(o){o.status=status; save(); renderAll&&renderAll(); toast('Status updated: '+status)}}
function cancelOrder(id){let o=state.orders.find(x=>x.id===id); if(!o)return; if(!canCancel(o))return toast('Cancel not allowed now'); o.status='CancelledByCustomer'; o.refundStatus=o.paymentMethod==='Pay Online'?'refund_pending':'not_required'; save(); renderAll&&renderAll(); toast('Order cancelled')}
function orderTimeline(o){const steps=['Placed','Accepted','Ready','Picked','On The Way','Delivered'];let idx=steps.indexOf(o.status);return `<div class="timeline">${steps.map((s,i)=>`<div class="${i<=idx?'done':''}">${i<=idx?'✅':'⬜'} ${s}</div>`).join('')}</div>`}
function nav(active){return ''}
async function tryFirebaseSave(collection, data){ /* backend hook ready; localStorage fallback active */ return {ok:false,mode:'local'}; }

function init(){
  
  if(state.profile.phone){qs('loginScreen').classList.add('hidden');qs('appScreen').classList.remove('hidden')}
  renderAll();
}
function renderAll(){renderStores();renderCategories();renderProducts();renderCart();renderOrders();renderProfile();}
function login(){
  let phone=qs('loginPhone').value.trim(); if(phone.length<10)return toast('Mobile number check karo');
  if(!qs('robotCheck').checked)return toast('Robot verify tick karo');
  state.profile.phone=phone;save();qs('loginScreen').classList.add('hidden');qs('addressScreen').classList.remove('hidden');qs('profilePhone').value=phone;
}
function saveAddress(){
  state.profile.name=qs('profileName').value;state.profile.address=qs('profileAddress').value;state.profile.area=qs('area').value;state.mode=qs('shoppingMode').value;save();
  qs('addressScreen').classList.add('hidden');qs('appScreen').classList.remove('hidden');renderAll()
}
function visibleStores(){
  return stores.filter(s=>s.priority || state.mode==='both' || s.type===state.mode);
}
function renderStores(){
  qs('storesBox').innerHTML=visibleStores().map(s=>`<div class="store">
    <span class="badge ${s.type==='wholesale'?'gold':'green'}">${s.type}</span>
    <h3>${s.emoji} ${s.name}</h3><p class="muted">${s.desc}</p><p><b>Area:</b> ${s.area}</p>
    <button onclick="state.selectedStore='${s.id}';state.cart=[];save();renderAll()">Open Store</button>
  </div>`).join('');
  qs('storeTitle').textContent=selectedStore().name;
}
function renderCategories(){
  let cats=[...new Set(P.map(p=>p.category).filter(Boolean))].slice(0,20);
  qs('categoryTabs').innerHTML=`<button class="active" onclick="qs('searchInput').value='';renderProducts()">All</button>`+cats.map(c=>`<button onclick="qs('searchInput').value='${c.replace(/'/g,"")}';renderProducts()">${c}</button>`).join('');
}
function filteredProducts(){
  let q=(qs('searchInput')?.value||'').toLowerCase();
  let list=P;
  if(q) list=P.filter(p=>[p.name,p.brand,p.category,p.subCategory,p.variant,p.localName,p.tags].join(' ').toLowerCase().includes(q));
  return list.slice(0,120);
}
function renderProducts(){
  qs('productsBox').innerHTML=filteredProducts().map((p,i)=>`<div class="product">
    <div class="productImage">${p.imageUrl?`<img src="${p.imageUrl}">`:iconFor(p.category)}</div>
    <span class="badge">${p.category}</span>
    <h3>${p.name} ${p.variant?'- '+p.variant:''}</h3>
    <p class="muted">${p.brand||''} • ${p.unitType||''} • Stock ${p.stock}</p>
    <div class="price">${money(productPrice(p))}</div>
    <p class="small">Carton: ${p.cartonQty||'-'} • Bundle: ${p.bundleQty||'-'}</p>
    <button onclick="addProduct('${p.sku}')">Add to Cart</button>
  </div>`).join('');
}
function addProduct(sku){let p=P.find(x=>x.sku===sku); if(!p)return; let ex=state.cart.find(x=>x.sku===sku); if(ex)ex.qty++; else state.cart.push({sku:p.sku,name:p.name,variant:p.variant,price:productPrice(p),qty:1,storeId:state.selectedStore}); save(); renderCart(); toast('Added')}
function changeQty(sku,d){let i=state.cart.find(x=>x.sku===sku); if(!i)return; i.qty+=d; if(i.qty<=0)state.cart=state.cart.filter(x=>x.sku!==sku); save(); renderCart();}
function renderCart(){
  let c=cartTotal();
  qs('cartSummary').innerHTML=state.cart.length?state.cart.map(i=>`<div class="rowBox"><b>${i.name}</b><p>${i.variant||''} • ${money(i.price)} x ${i.qty}</p><div class="qty"><button onclick="changeQty('${i.sku}',-1)">−</button><b>${i.qty}</b><button onclick="changeQty('${i.sku}',1)">+</button></div></div>`).join(''):'Cart empty';
  qs('cartTotal').innerHTML=state.cart.length?`Subtotal ${money(c.subtotal)} ${selectedStore().type==='wholesale'?' + Delivery '+money(c.delivery):' + Delivery included'} = <b>${money(c.total)}</b>`:'Cart empty';
  qs('payMethod').innerHTML=(selectedStore().type==='wholesale'?['COD','Pay Online','Khata']:['COD','Pay Online']).map(x=>`<option>${x}</option>`).join('');
}
function placeOrder(){
  let c=cartTotal(), st=selectedStore(); if(!state.cart.length)return toast('Cart empty');
  if(st.type==='wholesale' && c.subtotal<500)return toast('Wholesale minimum ₹500 required');
  let o=newOrder(); state.orders.unshift(o); state.cart=[]; save(); renderAll(); toast('Order placed: '+o.id)
}
function renderOrders(){
  qs('ordersBox').innerHTML=state.orders.map(o=>`<div class="order"><b>${o.storeName}</b><p>${o.id}<br>${money(o.total)} • ${o.paymentMethod}<br><span class="status ${o.status}">${o.status}</span></p>${orderTimeline(o)}${canCancel(o)?`<button class="red" onclick="cancelOrder('${o.id}')">Cancel Order</button>`:''}</div>`).join('')||'<p class="muted">No orders yet</p>';
}
function renderProfile(){qs('profileView').innerHTML=`<b>${state.profile.name||'Customer'}</b><br>${state.profile.phone||''}<br>${state.profile.address||'Address not saved'}<br><span class="badge green">Khata wholesale only</span>`}
function logout(){localStorage.removeItem('dm_profile');location.reload()}
document.addEventListener('DOMContentLoaded',init);
