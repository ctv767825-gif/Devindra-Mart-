
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

function init(){document.body.insertAdjacentHTML('beforeend',nav('rider'));qs('riderId').value=state.riderId;renderAll();}
function renderAll(){renderUnlocked();renderSettlement();}
function unlock(){
  state.riderId=qs('riderId').value||'RIDER-001';localStorage.setItem('dm_rider',state.riderId);
  let code=qs('pickupCode').value.trim().toUpperCase();let o=state.orders.find(x=>x.pickupCode===code);
  if(!o)return toast('Pickup code not found'); if(String(o.status).includes('Cancelled'))return toast('Order cancelled');
  o.riderId=state.riderId;o.unlockedBy=state.riderId;o.status='Picked';save();renderAll();toast('Order unlocked')
}
function renderUnlocked(){
  qs('unlockedBox').innerHTML=state.orders.filter(o=>o.riderId===state.riderId||o.unlockedBy===state.riderId).map(o=>`<div class="order"><b>${o.id}</b><p>${o.storeName}<br>${o.paymentMethod==='COD'?'Collect cash':'No cash collection'}<br>${money(o.total)} • ${o.status}</p><button onclick="setStatus('${o.id}','On The Way')">On The Way</button><button class="green" onclick="setStatus('${o.id}','Delivered')">Delivered</button></div>`).join('')||'<p class="muted">No unlocked orders. Enter pickup code.</p>';
}
function renderSettlement(){
  let cod=state.orders.filter(o=>(o.riderId===state.riderId||o.unlockedBy===state.riderId)&&o.paymentMethod==='COD'&&o.status==='Delivered').reduce((a,o)=>a+Number(o.total||0),0);
  qs('settlementBox').innerHTML=`Expected COD: <b>${money(cod)}</b><br><input id="cashEntered" placeholder="Enter cash amount"><button onclick="checkCash(${cod})">Submit Settlement</button>`;
}
function checkCash(expected){let v=Number(qs('cashEntered').value||0); if(v!==expected)return toast('Mismatch blocked. Exact cash required.'); toast('Settlement submitted')}
document.addEventListener('DOMContentLoaded',init);
