import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, createCipheriv } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
const modulePath = new URL('../lib/owref2026.js', import.meta.url);
const original = '<h1>Private test prompt</h1><script>window.test = true;</script>';
const key=Buffer.alloc(32,1), iv=Buffer.alloc(12,2), cipher=createCipheriv('aes-256-gcm',key,iv);
const data=Buffer.concat([cipher.update(original),cipher.final()]);
const config = { verifier: 'test-salt:' + pbkdf2Sync('test-only-password', 'test-salt', 100000, 32, 'sha256').toString('hex'), secret: 'test-only-independent-session-secret-123456789', contentKey:key.toString('hex'), payload:{iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),data:data.toString('base64')} };
async function handle(req, options = {}) {
  assert.ok(existsSync(modulePath), 'Executive Alpha protected route must exist');
  return (await import(modulePath)).handleExecutiveAlpha(req, {...config, ...options});
}
function request(method='GET', password, cookie, origin='https://www.kaindly.ai') {
  return new Request('https://www.kaindly.ai/owref2026', {method, headers: {...(cookie ? {cookie}:{}), ...(method==='POST' ? {'content-type':'application/x-www-form-urlencoded',origin}: {})}, ...(method==='POST' ? {body:new URLSearchParams({password})} : {})});
}
test('anonymous and spoofed identity requests cannot read prompts', async () => {
  for (const cookie of [undefined, 'kaindly_owref2026=forged']) {
    const res=await handle(request('GET',undefined,cookie));
    assert.equal(res.status,200); const body=await res.text();
    assert.match(body,/type="password"/); assert.doesNotMatch(body,/id="prompt-|localStorage|Strategic/);
    assert.match(res.headers.get('cache-control'),/no-store/);
  }
});
test('missing runtime secrets fail closed', async()=>{ assert.equal((await handle(request(),{verifier:undefined,secret:undefined})).status,503); });
test('wrong password and foreign origin are denied',async()=>{
  assert.equal((await handle(request('POST','wrong'))).status,401);
  assert.equal((await handle(request('POST','test-only-password',undefined,'https://evil.invalid'))).status,403);
});
test('correct password unlocks exact authored source and session survives reload',async()=>{
  const login=await handle(request('POST','test-only-password'));
  assert.equal(login.status,303); assert.equal(login.headers.get('location'),'/owref2026');
  const cookie=login.headers.get('set-cookie');
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/owref2026']) assert.ok(cookie.includes(flag));
  const res=await handle(request('GET',undefined,cookie.split(';')[0]));
  assert.equal(res.status,200);
  assert.ok((await res.text()).includes(original));
  const tampered=cookie.split(';')[0]+'bad';
  assert.match(await (await handle(request('GET',undefined,tampered))).text(),/type="password"/);
  assert.match(await (await handle(request('GET',undefined,cookie.split(';')[0]),{now:Date.now()+49*60*60*1000})).text(),/type="password"/);
});
test('native middleware intercepts both printed URL variants without changing public home', async()=>{
  process.env.VERCEL_ENV='production';
  const middleware=(await import('../middleware.js')).default;
  for(const path of ['/owref2026','/owref2026/','/owref2026/index.html']) {
    const res=await middleware(new Request('https://www.kaindly.ai'+path));
    assert.equal(res.status,503);
    assert.equal(await res.text(),'Workshop access is temporarily unavailable.');
  }
  const home=await middleware(new Request('https://www.kaindly.ai/'));
  assert.equal(home.headers.get('x-middleware-next'),'1');
});

test('protected index entry keeps password posts and redirects on the native entry',async()=>{
  const req=new Request('https://www.kaindly.ai/owref2026/index.html');
  assert.match(await (await handle(req)).text(),/action="\/owref2026\/index.html"/);
  const post=new Request(req.url,{method:'POST',headers:{origin:'https://www.kaindly.ai','content-type':'application/x-www-form-urlencoded'},body:'password=test-only-password'});
  assert.equal((await handle(post)).headers.get('location'),'/owref2026/index.html');
});

test('session slides are offered only after authentication and direct downloads stay protected',async()=>{
 const path='/owref2026/materials/Executive-Alpha-v4-20261022-web.pdf';
 const anonymous=await handle(new Request('https://www.kaindly.ai'+path));
 assert.match(await anonymous.text(),/type="password"/);
 assert.notEqual(anonymous.headers.get('x-middleware-next'),'1');
 const login=await handle(request('POST','test-only-password'));
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const page=await handle(request('GET',undefined,cookie));
 assert.match(await page.text(),/Barbara&#39;s Session Slides \(PDF\)/);
 const download=await handle(new Request('https://www.kaindly.ai'+path,{headers:{cookie}}));
 assert.equal(download.headers.get('x-middleware-next'),'1');
 assert.match(download.headers.get('content-disposition'),/attachment/);
 assert.match(download.headers.get('cache-control'),/no-store/);
 assert.equal((await handle(new Request('https://www.kaindly.ai'+path,{method:'POST',headers:{cookie}}))).status,405);
});

test('native slide download requires both workshop access and the existing capture receipt',async()=>{
 const envNames=['OWREF2026_PASSWORD_VERIFIER','OWREF2026_SESSION_SECRET','OWREF2026_CONTENT_KEY'];
 const before=envNames.map(key=>process.env[key]);
 try {
  [process.env.OWREF2026_PASSWORD_VERIFIER,process.env.OWREF2026_SESSION_SECRET,process.env.OWREF2026_CONTENT_KEY]=[config.verifier,config.secret,config.contentKey];
  process.env.VERCEL_ENV='production';
  const middleware=(await import('../middleware.js')).default;
  const url='https://www.kaindly.ai/owref2026/materials/Executive-Alpha-v4-20261022-web.pdf';
  for(const suffix of ['/', '/index.html', '.backup']) {
    const unknown=await middleware(new Request(url+suffix));
    assert.equal(unknown.status,404);
    assert.notEqual(unknown.headers.get('x-middleware-next'),'1');
  }
  const anonymous=await middleware(new Request(url));
  assert.notEqual(anonymous.headers.get('x-middleware-next'),'1');
  assert.match(await anonymous.text(),/type="password"/);
  const auth=(await handle(request('POST','test-only-password'))).headers.get('set-cookie').split(';')[0];
  const pending=await middleware(new Request(url,{headers:{cookie:auth}}));
  assert.notEqual(pending.headers.get('x-middleware-next'),'1');
  assert.match(await pending.text(),/Save and open session/);
  const {createSessionCaptureGate}=await import('../lib/session-capture.js');
  const gate=createSessionCaptureGate({save:async()=>[{participant_id:'mock-local-only'}]});
  const receipt=await gate(new Request(url+'?kaindly-register=1',{method:'POST',headers:{cookie:auth,origin:'https://www.kaindly.ai','content-type':'application/x-www-form-urlencoded'},body:'name=Local+Fixture&email=local-fixture%40example.com'}));
  const cookies=auth+'; '+receipt.headers.get('set-cookie').split(';')[0];
  const ready=await middleware(new Request(url,{headers:{cookie:cookies}}));
  assert.equal(ready.headers.get('x-middleware-next'),'1');
  assert.equal(ready.headers.get('content-type'),'application/pdf');
 } finally {envNames.forEach((key,index)=>before[index]===undefined?delete process.env[key]:process.env[key]=before[index]);}
});
