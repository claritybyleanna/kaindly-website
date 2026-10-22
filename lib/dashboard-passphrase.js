import {scryptSync, randomBytes, createHmac, timingSafeEqual, createHash} from 'node:crypto';
import {getWorkbookQuery} from './blead-db.js';
const COOKIE='__Host-kaindly_facilitator';
const AGE=4*60*60*1000;
export function passphraseConfigured(env=process.env){return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.DASHBOARD_PASSPHRASE_HASH||'') && /^[a-f0-9]{64}$/.test(env.DASHBOARD_PASSPHRASE_SESSION_SECRET||'');}
export function hashPassphrase(value,salt=randomBytes(16).toString('hex')){return `scrypt:${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
export function matchPassphrase(value,hash){if(typeof value!=='string'||value.length<16||value.length>256||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash||''))return false;const [,salt,digest]=hash.split(':');return timingSafeEqual(scryptSync(value,salt,64),Buffer.from(digest,'hex'));}
function mac(body,env){return createHmac('sha256',env.DASHBOARD_PASSPHRASE_SESSION_SECRET).update(body).digest('base64url');}
export function issueSession(env=process.env,now=Date.now()){const body=Buffer.from(JSON.stringify({exp:now+AGE,iat:now,nonce:randomBytes(16).toString('hex')})).toString('base64url');return `${body}.${mac(body,env)}`;}
export function authorizePassphrase(request,env=process.env,now=Date.now()){
 if(!passphraseConfigured(env))return null;
 try{const token=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||token.length>600)return null;const [body,signature,...extra]=token.split('.');if(extra.length)return null;const expected=Buffer.from(mac(body,env));const actual=Buffer.from(signature||'');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const data=JSON.parse(Buffer.from(body,'base64url'));if(!Number.isFinite(data.iat)||data.iat>now||data.exp!==data.iat+AGE||now>=data.exp)return null;return {userId:'facilitator-passphrase',sessionId:data.nonce,email:'leanna.baker@kaindly.ai'};}catch{return null;}
}
export async function consumeAttempt(request,env=process.env,query=getWorkbookQuery(),now=Date.now()){
 const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown';
 const key=createHmac('sha256',env.DASHBOARD_PASSPHRASE_SESSION_SECRET).update(ip.split(',')[0].trim()).digest('hex').slice(0,32);
 const id=`${key.slice(0,8)}-${key.slice(8,12)}-4${key.slice(13,16)}-a${key.slice(17,20)}-${key.slice(20)}`;
 const bucket=Math.floor(now/(15*60*1000));
 const rows=await query(`INSERT INTO blead_workbook_responses (client_id,program_id,participant_id,workbook_id,exercise_id,payload,delete_after)
 VALUES ('kaindly','facilitator-auth',$1,'dashboard-auth-rate','attempts',jsonb_build_object('bucket',$2::bigint,'attempts',1),now()+interval '1 day')
 ON CONFLICT(participant_id,workbook_id,exercise_id) DO UPDATE SET payload=jsonb_build_object('bucket',$2::bigint,'attempts',CASE WHEN (blead_workbook_responses.payload->>'bucket')::bigint=$2 THEN (blead_workbook_responses.payload->>'attempts')::int+1 ELSE 1 END),updated_at=now(),delete_after=now()+interval '1 day'
 RETURNING (payload->>'attempts')::int AS attempts`,[id,bucket]);
 return Number(rows[0]?.attempts)<=10;
}
export async function handlePassphraseLogin(request,{env=process.env,attempt=consumeAttempt}={}){
 const headers={'Cache-Control':'private, no-store','Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex, nofollow'};
 const url=new URL(request.url);
 if(request.method!=='POST'||url.protocol!=='https:'||request.headers.get('origin')!==url.origin)return new Response('Request not accepted.',{status:403,headers});
 if(!passphraseConfigured(env))return new Response('Facilitator passphrase setup is not complete. The workshop presenter is available at /OWR/present/.',{status:503,headers});
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Request not accepted.',{status:413,headers});
 try{
  if(!await attempt(request,env))return new Response('Too many attempts. Please wait 15 minutes.',{status:429,headers:{...headers,'Retry-After':'900'}});
  const data=await request.formData();
  if(!matchPassphrase(data.get('passphrase'),env.DASHBOARD_PASSPHRASE_HASH))return new Response(null,{status:303,headers:{...headers,Location:'/dashboard/access/?error=1'}});
  const requested=String(data.get('returnTo')||'');const target=/^\/dashboard\/(?:[a-z0-9-]+\/)*(?:\?[^#\r\n]*)?$/i.test(requested)?requested:'/dashboard/owr/';
  return new Response(null,{status:303,headers:{...headers,Location:target,'Set-Cookie':`${COOKIE}=${issueSession(env)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400`}});
 }catch{return new Response('Sign-in is temporarily unavailable. Please try again shortly.',{status:503,headers});}
}
export function handlePassphraseLogout(request){
 const url=new URL(request.url);
 if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return new Response('Request not accepted.',{status:403,headers:{'Cache-Control':'no-store'}});
 return new Response(null,{status:303,headers:{Location:'/dashboard/access/','Cache-Control':'private, no-store','Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});
}
