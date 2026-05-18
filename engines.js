import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase-config";

export const SUPPORT = { phone: "7678256489", whatsapp: "7678256489" };
export const MASTER_STORE_ID = "devindra-master";
export const WHATSAPP_ORDER_NUMBER = "7678256489";

export const appLinks = {
  customer: "/", admin: "/admin", billing: "/billing", rider: "/rider", about: "/about"
};

export const lang = {
  hinglish: { home:"Home", support:"Support", cart:"Cart", order:"Order Karo", search:"Search Karo", khata:"Khata", ready:"Ready", unlock:"Code/QR se Unlock", settlement:"Settlement" },
  hindi: { home:"होम", support:"सहायता", cart:"कार्ट", order:"ऑर्डर करें", search:"खोजें", khata:"खाता", ready:"तैयार", unlock:"कोड/QR से अनलॉक", settlement:"सेटलमेंट" },
  english: { home:"Home", support:"Support", cart:"Cart", order:"Order", search:"Search", khata:"Ledger", ready:"Ready", unlock:"Unlock by Code/QR", settlement:"Settlement" }
};
export const t=(key,language="hinglish")=>lang[language]?.[key]||lang.hinglish[key]||key;
export const translated=(item, field, language="hinglish")=> item?.[`${field}_${language}`] || item?.[`${field}_en`] || item?.[field] || "";

export function canUseWhatsAppOrder(store){ return store?.id===MASTER_STORE_ID || store?.slug==="devindra-mart-wholesale"; }
export function resolveStoreOpen(stores=[]){ return stores.length===1 ? { action:"open_direct", store:stores[0] } : { action:"open_store_search", stores }; }

export function makeDateCode(d=new Date()){
  return String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
}
export function generatePickupCode(areaCode="GEN", existing=[]){
  const dateCode=makeDateCode(); let code="";
  do { code=`${areaCode.toUpperCase()}-${dateCode}-${Math.floor(1000+Math.random()*9000)}`; } while(existing.includes(code));
  return code;
}
export function canReuseCode(lastUsedMs){ return Date.now()-Number(lastUsedMs||0) > 7*24*60*60*1000; }

export function storeModeRules(mode){
  if(mode==="retail") return { khata:false, minimumOrder:0, carton:false, bulk:false };
  return { khata:true, minimumOrder:500, carton:true, bulk:true };
}
export function calculateDelivery({amount=0,km=0,perKm=0,freeAbove=999999}){ const delivery=amount>=freeAbove?0:km*perKm; return {delivery, final:amount+delivery}; }
export function merchantSettlement({productAmount=0, commissionPercent=0}){ const commission=productAmount*commissionPercent/100; return {productAmount, commission, merchantPayable:productAmount-commission}; }
export function riderPayout({km=0,perKm=0,fixed=0,bonus=0,penalty=0}){ return fixed+(km*perKm)+bonus-penalty; }
export function calculateCashTotal(notes={}){ return [500,200,100,50,20,10].reduce((s,n)=>s+n*Number(notes[n]||0),0); }
export function verifyCashSettlement(expected,notes){ const entered=calculateCashTotal(notes); return {expected, entered, matched:Number(expected)===entered, message:Number(expected)===entered?"Settlement matched":"₹1 mismatch bhi allowed nahi hai"}; }
export function calculateKhata({oldDue=0,newOrderDue=0,payment=0,overdueDays=0}){ const penalty=overdueDays>30?overdueDays-30:0; return {oldDue,newOrderDue,payment,penalty,finalDue:Math.max(0,oldDue+newOrderDue+penalty-payment)}; }

export function riderOrderView(order, code){
  const unlocked=order.pickupCode===code;
  if(!unlocked) return { id:order.id, storeName:order.storeName, message:"📦 Pickup Ready", locked:true };
  return { id:order.id, orderId:order.orderId, customerName:order.customerName, address:order.address, gps:order.gps, items:order.items, paymentType:order.paymentType, total:order.finalTotal, khataAmount:order.khataAmount||0, callButton:true, phoneVisible:false, locked:false };
}
export function customerCanCancel(status){ return !["picked","on_the_way","delivered"].includes(status); }

export async function uploadToCloudinary(file, folder="devindra-mart"){
  const fd=new FormData(); fd.append("file",file); fd.append("upload_preset","devindra_upload"); fd.append("folder",folder);
  const r=await fetch("https://api.cloudinary.com/v1_1/dmwznjgvr/auto/upload",{method:"POST",body:fd});
  const data=await r.json(); if(!data.secure_url) throw new Error("Cloudinary upload failed"); return data.secure_url;
}
export async function createNotification(data){ return addDoc(collection(db,"notifications"),{...data, read:false, createdAt:serverTimestamp()}); }
export async function createOrder(order){
  if(!order.customerId) throw new Error("Customer missing");
  if(!order.gps) throw new Error("Current location required");
  if(!order.items?.length) throw new Error("Cart empty");
  const orderData={...order, orderId:`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`, pickupCode:generatePickupCode(order.areaCode||"GEN"), pickupLocked:true, status:"placed", merchantAddressVisible:false, phoneTextVisibleToRider:false, createdAt:serverTimestamp()};
  const ref=await addDoc(collection(db,"orders"),orderData);
  await createNotification({title:"New Order",message:`Order ${orderData.orderId} received`,target:"admin_billing",storeId:order.storeId,type:"order"});
  return {id:ref.id,...orderData};
}
export function listenStoreOrders(storeId, cb){ return onSnapshot(query(collection(db,"orders"),where("storeId","==",storeId),orderBy("createdAt","desc")), s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))); }
export function listenCustomerOrders(customerId, cb){ return onSnapshot(query(collection(db,"orders"),where("customerId","==",customerId),orderBy("createdAt","desc")), s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))); }
export async function updateOrderStatus(orderId,status){ return updateDoc(doc(db,"orders",orderId),{status,updatedAt:serverTimestamp()}); }
export async function bulkUploadProducts(products, storeId){ const batch=writeBatch(db); const skipped=[]; products.forEach((p,i)=>{ if(!p.product||!p.category||!p.unit){skipped.push({row:i+1,reason:"Missing product/category/unit"});return;} const ref=doc(collection(db,"products")); batch.set(ref,{...p,storeId,active:true,createdAt:serverTimestamp()}); }); await batch.commit(); return {uploaded:products.length-skipped.length,skipped}; }
export function saveOfflineAction(action){ const q=JSON.parse(localStorage.getItem("dm_offline_queue")||"[]"); q.push(action); localStorage.setItem("dm_offline_queue",JSON.stringify(q)); }
export async function retryOfflineQueue(processor){ const q=JSON.parse(localStorage.getItem("dm_offline_queue")||"[]"); for(const action of q) await processor(action); localStorage.removeItem("dm_offline_queue"); }
