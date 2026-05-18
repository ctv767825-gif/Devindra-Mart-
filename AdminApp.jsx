import Shell from "../../shared/Shell";
import { SUPPORT } from "../../shared/engines";
export default function AdminApp(){return <Shell title="Devindra Admin" subtitle="Master Control Center"><section className="grid">{["Merchant Approval","Rider Approval","Excel Upload","Banner/Video Promo","Delivery Rules","Khata Verification","Notification Automation","Support: "+SUPPORT.phone].map(x=><div className="card" key={x}><h3>{x}</h3><p>Admin controlled</p><button>Manage</button></div>)}</section></Shell>}
