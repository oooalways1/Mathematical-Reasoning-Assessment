import {env} from 'cloudflare:workers';
export const adminEmail=(id:string)=>id.includes('@')?id.toLowerCase():`${id.toLowerCase()}@admins.soori-270e0.invalid`;
export async function firebasePassword(email:string,password:string){
 if(!env.FIREBASE_API_KEY)throw new Error('Firebase unavailable');
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
 const data=await response.json() as {localId?:string};return response.ok&&data.localId?data.localId:null;
}
export async function firebaseIdentity(idToken:string){
 if(!env.FIREBASE_API_KEY)return null;
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});
 const data=await response.json() as {users?:{localId:string;disabled?:boolean}[]};return response.ok&&!data.users?.[0]?.disabled?data.users?.[0]?.localId??null:null;
}
