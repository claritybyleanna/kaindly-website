import {createHmac,timingSafeEqual} from 'node:crypto';
import {SESSION_CAPTURES} from './session-capture-registry.js';
import {getWorkbookQuery} from './blead-db.js';
import {WORKBOOK_DELETE_AFTER} from './workbook-registry.js';
import {readCookie,verifyBleadSession} from './blead-auth.js';
import {verifyOwrSession,OWR_COOKIE_NAME} from './owr-auth.js';
import {verifyBsalesSession,BSALES_COOKIE_NAME} from './bsales-auth.js';
import {isValidMclendonSessionSecret} from './mclendon-auth.js';
import {hasExecutiveAlphaAccess} from './owref2026.js';
const AGE=30*86400000;
const headers={'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','cdn-cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','referrer-policy':'same-origin','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sessionForPath(path){
  try{path=decodeURIComponent(path).replace(/\/{2,}/g,'/');}catch{return null;}
  const s=SESSION_CAPTURES.find(s=>path===s.prefix||path.startsWith(s.prefix+'/'));
  if(!s)return null;
  if(/^\/(?:access|logout|facilitator|api)(?:\/|$)/.test(path.slice(s.prefix.length))||/\/api(?:\/|$)/.test(path))return null;
  return s;
}
async function authorize(request,s,secret){
  if(typeof secret!=='string'||Buffer.byteLength(secret)<32)return false;
  if(s.id==='executive-alpha')return hasExecutiveAlphaAccess(request,secret);
  if(s.id==='mclendon')return isValidMclendonSessionSecret(secret,{reservedSecrets:[process.env.BLEAD_SESSION_SECRET,process.env.BLEAD_FACILITATOR_SESSION_SECRET,process.env.BSALES_SESSION_SECRET]}); // No password, but preserve key isolation.
  const cookies=request.headers.get('cookie');
  if(s.id==='owr-career-architecture')return verifyOwrSession(readCookie(cookies,OWR_COOKIE_NAME),secret);
  if(s.id==='bracco-sales')return verifyBsalesSession(readCookie(cookies,BSALES_COOKIE_NAME),secret);
  return verifyBleadSession(readCookie(cookies,'kaindly_blead_session'),secret);
}
const cookieName=s=>'kaindly_capture_'+s.id.replaceAll('-','_');
const mac=(body,s,secret)=>createHmac('sha256',secret).update('kaindly-session-capture-v1:'+s.id+':'+body).digest('base64url');
function validCapture(request,s,secret,now){
  try{
    const token=readCookie(request.headers.get('cookie'),cookieName(s));if(!token||token.length>512)return false;
    const [body,sig,...rest]=token.split('.');if(rest.length)return false;
    const a=Buffer.from(sig||''),b=Buffer.from(mac(body,s,secret));if(a.length!==b.length||!timingSafeEqual(a,b))return false;
    const p=JSON.parse(Buffer.from(body,'base64url'));return /^[0-9a-f-]{36}$/.test(p.id)&&p.iat<=now&&p.exp===p.iat+AGE&&p.exp>now&&now<Date.parse(WORKBOOK_DELETE_AFTER);
  }catch{return false;}
}
function participantId(email,s,secret){
  const h=createHmac('sha256',secret).update('kaindly-session-contact-id-v1:'+s.id+':'+email).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export async function saveSessionContact(snapshot){
  const rows=await getWorkbookQuery()(`INSERT INTO blead_workbook_responses
    (client_id,program_id,participant_id,workbook_id,exercise_id,payload,delete_after)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz)
    ON CONFLICT (participant_id,workbook_id,exercise_id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()
    RETURNING participant_id`,[snapshot.clientId,snapshot.programId,snapshot.participantId,snapshot.workbookId,snapshot.exerciseId,JSON.stringify(snapshot.payload),snapshot.deleteAfter]);
  return rows;
}
function form(s,url,{error='',name='',email='',marketing=false}={}){
  const action=new URL(url);action.searchParams.set('kaindly-register','1');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Join ${escape(s.title)} | KAINDLY</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f5f9;color:#242424;font:17px/1.5 system-ui,sans-serif}main{width:min(100% - 32px,520px);margin:clamp(24px,6vh,70px) auto;padding:clamp(20px,5vw,36px);background:#fff;border-radius:16px}h1{font-size:clamp(25px,5vw,34px);line-height:1.2;color:#634cc8}label{display:block;font-weight:600;margin-top:20px}input:not([type=checkbox]),button{font:inherit;width:100%;min-height:48px;padding:12px;border:1px solid #777;border-radius:6px;margin-top:7px}button{background:#634cc8;color:#fff;border:0;margin-top:24px;cursor:pointer}input:focus,button:focus,a:focus{outline:3px solid #8c6efc;outline-offset:3px}.optional{display:flex;gap:12px;font-size:15px;font-weight:400;align-items:flex-start}.optional input{width:22px;height:22px;flex-shrink:0}small{display:block;color:#555;margin-top:12px}a{color:#51409b}[role=alert]{color:#9b263b;font-weight:600}</style></head><body><main><p>KAINDLY · SESSION ACCESS</p><h1>${escape(s.title)}</h1><p>Enter your name and email to open the session materials. KAINDLY saves these details for attendance and session follow-up in the private facilitator dashboard.</p>${error?`<p role="alert">${escape(error)}</p>`:''}<form method="post" action="${escape(action.pathname+action.search)}"><label for="name">Name</label><input id="name" name="name" autocomplete="name" maxlength="160" required value="${escape(name)}"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required value="${escape(email)}"><label class="optional"><input type="checkbox" name="marketing" value="yes"${marketing?' checked':''}><span>Optional: I would also like KAINDLY news and future session invitations.</span></label><small>You can access the materials without choosing the optional updates. Your details are not shared with other attendees. Session records are retained until March 1, 2027. <a href="/privacy/">Privacy policy</a></small><button type="submit">Save and open session</button></form></main></body></html>`;
}
export function createSessionCaptureGate({authorize:check=authorize,secretFor=s=>process.env[s.secret],save=saveSessionContact,now=Date.now}={}){
  return async request=>{
    const url=new URL(request.url),s=sessionForPath(url.pathname);if(!s)return null;
    const registration=request.method==='POST'&&url.searchParams.get('kaindly-register')==='1';
    if(!registration&&!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,allow:'GET, HEAD, POST'}});
    const secret=secretFor(s);let allowed=false;try{allowed=await check(request,s,secret);}catch{}
    if(!allowed)return registration?new Response('Workshop access required. Open the session link and enter its password first.',{status:401,headers}):null;
    const current=now();
    if(!registration&&validCapture(request,s,secret,current))return null;
    const reply=(status,values={})=>new Response(request.method==='HEAD'?null:form(s,url,values),{status,headers});
    if(current>=Date.parse(WORKBOOK_DELETE_AFTER))return reply(410,{error:'This session is no longer accepting registrations.'});
    if(!registration)return reply(200);
    if(url.protocol!=='https:'||request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'Please submit this form from the session page.'});
    if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return reply(415,{error:'Please use the session registration form.'});
    let data;try{
      const reader=request.body?.getReader();let size=0;const chunks=[];if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'Please enter a shorter name and email.'});}chunks.push(value);}
      data=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    }catch{return reply(400,{error:'Please enter your name and email again.'});}
    const name=(data.get('name')||'').trim(),email=(data.get('email')||'').trim().toLowerCase(),marketing=data.get('marketing')==='yes';
    if(!name||name.length>160||/[\x00-\x1f\x7f]/.test(name)||email.length>254||!/^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/.test(email))return reply(400,{error:'Enter your name and a valid email address.',name:name.slice(0,160),email:email.slice(0,254),marketing});
    const id=participantId(email,s,secret),isTest=/^TEST\b/i.test(name)&&/@(?:example\.(?:com|org|net)|[^@]+\.test)$/.test(email);
    try{
      const saved=await save({clientId:s.client.id,programId:s.program.id,workbookId:'session-'+s.id,exerciseId:'identity',participantId:id,deleteAfter:WORKBOOK_DELETE_AFTER,payload:{fields:{name,email,source:s.prefix,submitted_at:new Date(current).toISOString(),marketing_opt_in:marketing?'Yes':'No',record_type:isTest?'TEST — synthetic verification':'Session contact'},capture:{version:1,isTest}}});
      if(!saved?.length)throw Error('Save not confirmed');
    }catch{return reply(503,{error:'Your details could not be saved. Please try again. The session will open after they are saved.',name,email,marketing});}
    const body=Buffer.from(JSON.stringify({id,iat:current,exp:current+AGE})).toString('base64url');url.searchParams.delete('kaindly-register');
    return new Response(null,{status:303,headers:{...headers,location:url.pathname+url.search,'set-cookie':`${cookieName(s)}=${body}.${mac(body,s,secret)}; Path=/; Max-Age=${AGE/1000}; HttpOnly; Secure; SameSite=Strict`}});
  };
}
