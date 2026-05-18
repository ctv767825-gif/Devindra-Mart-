import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { loginAs, getRole, routeForRole } from "./auth/auth";
import CustomerApp from "./apps/customer/CustomerApp";
import AdminApp from "./apps/admin/AdminApp";
import BillingApp from "./apps/billing/BillingApp";
import RiderApp from "./apps/rider/RiderApp";
import AboutPage from "./apps/about/AboutPage";

function Login(){
  const nav=useNavigate();
  async function go(role){ await loginAs(role); nav(routeForRole(role)); }
  return <main className="login"><div className="panel"><Logo/><h1>Devindra Mart</h1><p>Choose app</p><button onClick={()=>go("customer")}>Customer App</button><button onClick={()=>go("admin")}>Admin App</button><button onClick={()=>go("billing")}>Billing / Merchant App</button><button onClick={()=>go("rider")}>Rider App</button></div></main>
}
function Logo(){ return <div className="logoSlide"><span>DEVINDRA MART</span><span>🛒</span></div>; }
function Guard({allow,children}){ const role=getRole(); if(!role)return <Navigate to="/login"/>; if(!allow.includes(role))return <Navigate to={routeForRole(role)}/>; return children; }

export default function App(){
 return <Routes>
   <Route path="/login" element={<Login/>}/>
   <Route path="/" element={<Guard allow={["customer"]}><CustomerApp/></Guard>}/>
   <Route path="/admin/*" element={<Guard allow={["admin"]}><AdminApp/></Guard>}/>
   <Route path="/billing/*" element={<Guard allow={["billing","merchant"]}><BillingApp/></Guard>}/>
   <Route path="/rider/*" element={<Guard allow={["rider"]}><RiderApp/></Guard>}/>
   <Route path="/about" element={<AboutPage/>}/>
   <Route path="*" element={<Navigate to="/"/>}/>
 </Routes>
}
