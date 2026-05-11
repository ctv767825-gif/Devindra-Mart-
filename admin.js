
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
function nav(active){return `<nav class="bottomNav">
<a href="index.html" class="${active==='customer'?'active':''}">🛒<br>Customer</a>
<a href="admin.html">👑<br>Admin</a>
<a href="billing.html">🧾<br>Billing</a>
<a href="rider.html">🛵<br>Rider</a>
<button onclick="toast('PWA install/offline structure ready')">📲<br>PWA</button>
</nav>`}
async function tryFirebaseSave(collection, data){ /* backend hook ready; localStorage fallback active */ return {ok:false,mode:'local'}; }

function init(){document.body.insertAdjacentHTML('beforeend',nav('admin'));renderAll();}
function renderAll(){renderStats();renderOrders();renderProductsAdmin();renderSettings();}
function renderStats(){
  let total=state.orders.reduce((a,o)=>a+Number(o.total||0),0);
  qs('stats').innerHTML=`<div class="card"><h2>${STATS.products||P.length}</h2><p>Excel Products</p></div><div class="card"><h2>${stores.length}</h2><p>Stores</p></div><div class="card"><h2>${state.orders.length}</h2><p>Orders</p></div><div class="card"><h2>${money(total)}</h2><p>Total Value</p></div>`;
}
function renderOrders(){
  qs('ordersTable').innerHTML=`<table class="table"><tr><th>Order</th><th>Store</th><th>Status</th><th>Total</th><th>Action</th></tr>${state.orders.map(o=>`<tr><td>${o.id}</td><td>${o.storeName}</td><td><span class="status ${o.status}">${o.status}</span></td><td>${money(o.total)}</td><td><button onclick="setStatus('${o.id}','Ready')">Ready</button> <button onclick="setStatus('${o.id}','Delivered')" class="green">Delivered</button></td></tr>`).join('')}</table>`;
}
function renderProductsAdmin(){
  qs('productsAdmin').innerHTML=P.slice(0,80).map(p=>`<div class="rowBox"><b>${p.name} ${p.variant||''}</b><p>${p.category} / ${p.subCategory}<br>Wholesale ${money(productPrice(p))} • Stock ${p.stock} • Low alert ${p.lowStockAlert}</p></div>`).join('');
}
function renderSettings(){
  qs('settingsBox').innerHTML=`<ul><li>Admin full A-Z control</li><li>ShopOwner own store isolation</li><li>Delivery rules: wholesale visible, retail hidden</li><li>Commission and settlement fields ready</li><li>Payment webhook / FCM / printer bridge hooks ready</li></ul>`;
}
document.addEventListener('DOMContentLoaded',init);
