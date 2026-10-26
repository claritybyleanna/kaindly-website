import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const moduleUrl=new URL('../lib/session-capture.js',import.meta.url);
const secret='synthetic-session-secret-at-least-32-characters';
const now=Date.parse('2026-10-26T16:00:00Z');
async function setup(options={}) {
 assert.ok(existsSync(moduleUrl),'shared session capture gate must exist');
 const {createSessionCaptureGate,sessionForPath}=await import(moduleUrl);
 const saved=[];
 const gate=createSessionCaptureGate({secretFor:()=>secret,authorize:async()=>true,now:()=>now,save:async snapshot=>{saved.push(snapshot);return [snapshot];},...options});
 return {gate,saved,sessionForPath};
}
function req(path='/owref2026',data,cookie,origin='https://www.kaindly.ai'){
 return new Request('https://www.kaindly.ai'+path,{method:data?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(data?{'content-type':'application/x-www-form-urlencoded',origin}:{})},...(data?{body:new URLSearchParams(data)}:{})});
}
const identity={name:'Ada Example',email:'Ada@Example.com'};
const cookieOf=res=>res.headers.get('set-cookie').split(';')[0];
test('session route coverage and public exclusions',async()=>{
 const {sessionForPath}=await setup();
 for(const p of ['/owref2026','/owref2026/','/owref2026/index.html','/OWR/','/OWR/workbook/index.html','/Blead/session-1-prompts/','/bsales/prompt-pack-2/','/McLendon/index.html','/%6fwref2026','//OWR//workbook/'])assert.ok(sessionForPath(p),p);
 for(const p of ['/','/contact/','/dashboard/','/Blead/facilitator/','/OWR/access/','/bsales/logout/','/OWR/next-move/api/responses'])assert.equal(sessionForPath(p),null,p);
});
test('authorized visitor sees a no-script mobile form without content; password access stays first',async()=>{
 const {gate}=await setup();const res=await gate(req());const html=await res.text();
 assert.equal(res.status,200);assert.match(html,/name="name"/);assert.match(html,/type="email"/);assert.match(html,/name="marketing"/);assert.doesNotMatch(html,/checked/);assert.match(html,/viewport/);assert.match(html,/workshop|session/);assert.match(res.headers.get('cache-control'),/no-store/);
 assert.equal(await (await setup({authorize:async()=>false})).gate(req()),null);
});
test('invalid identities and foreign origins cannot save or issue access',async()=>{
 const {gate,saved}=await setup();
 for(const data of [{name:'',email:'a@example.com'},{name:'Ada',email:'bad'},{name:'Ada',email:'a@b'},{name:'x'.repeat(161),email:'a@example.com'}]){
  const res=await gate(req('/owref2026?kaindly-register=1',data));assert.equal(res.status,400);assert.equal(res.headers.get('set-cookie'),null);
 }
 assert.equal((await gate(req('/owref2026?kaindly-register=1',identity,undefined,'https://evil.invalid'))).status,403);assert.equal(saved.length,0);
});
test('persist before unlock, correctly attribute, separate consent and deduplicate',async()=>{
 const {gate,saved}=await setup();
 const res=await gate(req('/owref2026?kaindly-register=1',identity));assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/owref2026');
 assert.equal(saved[0].workbookId,'session-executive-alpha');assert.equal(saved[0].clientId,'onewe-reach');assert.equal(saved[0].payload.fields.email,'ada@example.com');assert.equal(saved[0].payload.fields.marketing_opt_in,'No');assert.equal(saved[0].payload.fields.source,'/owref2026');assert.equal(saved[0].payload.fields.submitted_at,new Date(now).toISOString());
 assert.equal(await gate(req('/owref2026',undefined,cookieOf(res))),null);
 assert.ok(await gate(req('/OWR/',undefined,cookieOf(res))));
 await gate(req('/owref2026?kaindly-register=1',{...identity,email:'ada@example.com',marketing:'yes'}));assert.equal(saved[0].participantId,saved[1].participantId);assert.equal(saved[1].payload.fields.marketing_opt_in,'Yes');
 assert.match(res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
});
test('failed persistence, forged or expired capture cookies fail closed',async()=>{
 const {gate}=await setup({save:async()=>{throw Error('synthetic failure');}});
 const res=await gate(req('/owref2026?kaindly-register=1',identity));assert.equal(res.status,503);assert.equal(res.headers.get('set-cookie'),null);
 const good=await setup();const login=await good.gate(req('/owref2026?kaindly-register=1',identity));const cookie=cookieOf(login);
 assert.ok(await good.gate(req('/owref2026',undefined,cookie+'bad')));
 const expired=await setup({now:()=>now+31*86400000});assert.ok(await expired.gate(req('/owref2026',undefined,cookie)));
});
test('synthetic QA identities are explicitly marked; user cannot set a test flag',async()=>{
 const {gate,saved}=await setup();await gate(req('/owref2026?kaindly-register=1',{name:'TEST KAINDLY Capture',email:'qa-capture@example.com'}));assert.equal(saved[0].payload.capture.isTest,true);
 await gate(req('/owref2026?kaindly-register=1',{...identity,isTest:'true'}));assert.equal(saved[1].payload.capture.isTest,false);
});
