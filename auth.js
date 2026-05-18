import { signInAnonymously, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase-config";

export async function loginAs(role){
  const result=await signInAnonymously(auth);
  await setDoc(doc(db,"users",result.user.uid),{uid:result.user.uid,role,name:role,active:true,updatedAt:serverTimestamp()},{merge:true});
  localStorage.setItem("dm_role",role); localStorage.setItem("dm_uid",result.user.uid);
  return {uid:result.user.uid,role};
}
export function getRole(){ return localStorage.getItem("dm_role"); }
export function getUid(){ return localStorage.getItem("dm_uid"); }
export async function logout(){ localStorage.clear(); return signOut(auth); }
export function routeForRole(role){ if(role==="admin")return"/admin"; if(role==="billing"||role==="merchant")return"/billing"; if(role==="rider")return"/rider"; return"/"; }
