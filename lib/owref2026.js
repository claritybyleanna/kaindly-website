import { createDecipheriv, createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { encryptedPromptPack } from './owref2026-content.js';
const COOKIE = 'kaindly_owref2026';
const MAX_AGE = 48 * 60 * 60;
const gate = (error = '', action = '/owref2026') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Executive Alpha | KAINDLY</title><style>body{margin:0;background:#f6f5f9;color:#242424;font-family:system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}main{max-width:420px;padding:36px;background:white;border-radius:16px;margin:20px}h1{color:#634cc8}label,input,button{display:block}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:10px;border:1px solid #dbd9e0;border-radius:6px;font:inherit}button{background:#634cc8;color:white;cursor:pointer}p[role]{color:#9b263b}</style></head><body><main><p>KAINDLY</p><h1>Executive Alpha</h1><p>Enter your workshop password to open the prompt pack.</p>${error ? '<p role="alert">That password did not match. Please try again.</p>' : ''}<form action="${action}" method="post"><label for="password">Workshop password</label><input id="password" name="password" type="password" required maxlength="256" autocomplete="current-password"><button>Open prompt pack</button></form></main></body></html>`;
function headers(document = '') {
  const hashes = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`).join(' ');
  return {'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':`default-src 'none'; script-src ${hashes || "'none'"}; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'`};
}
function matches(a, b) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
function signature(payload, secret) {return createHmac('sha256',secret).update(payload).digest('base64url');}
function validSession(request,secret,now) {
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token || token.length>512) return false;
  const [v,expiry,nonce,sig,extra]=token.split('.');
  const expires=Number(expiry);
  return v==='v1' && extra===undefined && Number.isSafeInteger(expires) && expires>now && expires<=now+MAX_AGE*1000 && /^[a-f0-9]{32}$/.test(nonce||'') && matches(sig||'',signature(`${v}.${expiry}.${nonce}`,secret));
}
function decrypt(payload,key) {
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(payload.iv,'hex'));
  decipher.setAuthTag(Buffer.from(payload.tag,'hex'));
  return Buffer.concat([decipher.update(Buffer.from(payload.data,'base64')),decipher.final()]).toString('utf8');
}
export async function handleExecutiveAlpha(request, {
  verifier=process.env.OWREF2026_PASSWORD_VERIFIER,
  secret=process.env.OWREF2026_SESSION_SECRET,
  contentKey=process.env.OWREF2026_CONTENT_KEY,
  payload=encryptedPromptPack,
  now=Date.now(),
}={}) {
  const entry=new URL(request.url).pathname === '/owref2026/index.html' ? '/owref2026/index.html' : '/owref2026';
  const reply=(body,status=200,extra={})=>new Response(request.method==='HEAD'?null:body,{status,headers:{...headers(body),...extra}});
  if(!/^[^:\s]{8,128}:[a-f0-9]{64}$/.test(verifier||'') || !secret || Buffer.byteLength(secret)<32 || !/^[a-f0-9]{64}$/.test(contentKey||'')) return reply('Workshop access is temporarily unavailable.',503);
  if(!['GET','HEAD','POST'].includes(request.method)) return reply('Method not allowed',405,{Allow:'GET, HEAD, POST'});
  if(request.method==='POST') {
    const url=new URL(request.url);
    if(request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site') return reply('Forbidden',403);
    if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return reply('Unsupported media type',415);
    const reader=request.body?.getReader();let body='';let size=0;
    if(reader) {const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply('Request too large',413);}body+=decoder.decode(value,{stream:true});}}
    const candidate=new URLSearchParams(body).get('password')||'';
    if(!candidate || candidate.length>256) return reply(gate('invalid',entry),401);
    const [salt,expected]=verifier.split(':');
    const actual=pbkdf2Sync(candidate,salt,100000,32,'sha256').toString('hex');
    if(!matches(actual,expected)) return reply(gate('invalid',entry),401);
    const session=`v1.${now+MAX_AGE*1000}.${randomBytes(16).toString('hex')}`;
    return reply('',303,{Location:entry,'Set-Cookie':`${COOKIE}=${session}.${signature(session,secret)}; Path=/owref2026; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`});
  }
  if(!validSession(request,secret,now)) return reply(gate('',entry));
  try {
    const original=decrypt(payload,contentKey);
    const document=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${original}</body></html>`;
    return reply(document);
  } catch {return reply('Workshop access is temporarily unavailable.',503);}
}
