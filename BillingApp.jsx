import Shell from "../../shared/Shell";
import { merchantSettlement } from "../../shared/engines";
export default function BillingApp(){ const s=merchantSettlement({productAmount:10000,commissionPercent:20}); return <Shell title="Devindra Billing" subtitle="Merchant / Billing App"><section className="grid">{["KYC Approval Pending","Product Management","Order Ready Button","Invoice / Packing Slip","Rider Assign","Weekly Settlement ₹"+s.merchantPayable].map(x=><div className="card" key={x}><h3>{x}</h3><p>Merchant own store only</p><button>Open</button></div>)}</section></Shell>}
