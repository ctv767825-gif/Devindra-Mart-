import { Link } from "react-router-dom";
import { logout } from "../auth/auth";
export default function Shell({title,subtitle,children}){
 return <div className="shell"><header className="top"><div><b>{title}</b><p>{subtitle}</p></div><nav><Link to="/about">About</Link><button onClick={logout}>Logout</button></nav></header><main>{children}</main></div>
}
