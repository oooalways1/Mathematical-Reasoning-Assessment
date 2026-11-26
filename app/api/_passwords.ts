// Firebase email/password requires at least six characters. Preserve existing
// credentials verbatim; represent only new 4–5 character app passwords consistently
// across signup, login and administrator resets. No password is persisted here.
export async function firebasePasswordValue(password:string){
 if(password.length>=6)return password;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('numeracy-short-password:v1:'+password.length+':'+password));
 return 'Nsp1!'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
