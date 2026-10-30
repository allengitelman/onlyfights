export const appError=(message,status=400,code='invalid_request')=>Object.assign(new Error(message),{status,code});
export function authConfig(raw={}) {
 try {
  const u=new URL(raw.url);
  if(u.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.pathname!=='/'||u.search||u.hash||u.username||u.password||u.port)return null;
  if(typeof raw.key!=='string'||!raw.key||raw.key.startsWith('sb_secret_'))return null;
  if(!raw.key.startsWith('sb_publishable_')) {const p=JSON.parse(atob(raw.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(p.role!=='anon')return null;}
  return {url:u.origin,key:raw.key};
 }catch{return null;}
}
export function createAppIdentity({database,config,fetcher=fetch}) {
 return async request=>{
  const h=request.headers.get('authorization');if(!h)return null;
  if(!/^Bearer [^\s]{3,8192}$/.test(h))throw appError('Sign in again.',401,'session_expired');
  const c=authConfig(config());if(!c)throw appError('OnlyFights sign-in is not connected yet.',503,'auth_setup_required');
  let r;try{r=await fetcher(c.url+'/auth/v1/user',{headers:{apikey:c.key,Authorization:h},redirect:'manual',signal:AbortSignal.timeout(8000)});}catch{throw appError('Sign-in is temporarily unavailable.',503,'auth_unavailable');}
  if(r.status===401||r.status===403)throw appError('Sign in again.',401,'session_expired');
  if(!r.ok)throw appError('Sign-in is temporarily unavailable.',503,'auth_unavailable');
  const u=await r.json();if(typeof u.id!=='string'||!/^[a-f0-9-]{36}$/i.test(u.id)||u.aud!=='authenticated')throw appError('Sign in again.',401,'session_expired');
  const db=database();if(!db)throw appError('Account storage is unavailable.',503);
  const deletion=await db.prepare('SELECT user_id FROM app_deletions WHERE provider_subject=?').bind(u.id).first();if(deletion)return {userId:deletion.user_id,subject:u.id,deleting:true};
  const link=await db.prepare('SELECT user_id FROM app_identities WHERE provider_subject=?').bind(u.id).first();
  return {userId:link?.user_id||'supabase:'+u.id,subject:u.id};
 };
}
