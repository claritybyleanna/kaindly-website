import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../middleware.js';
import {signOwrSession,serializeOwrSession} from '../lib/owr-auth.js';
import {signBleadSession,serializeBleadSession} from '../lib/blead-auth.js';
import {signBsalesSession,serializeBsalesSession} from '../lib/bsales-auth.js';
import {listWorkbookRegistrations} from '../lib/workbook-registry.js';
import {createDashboardHandlers,parseDashboardFilters} from '../lib/workbook-response-api.js';
import {createWorkbookResponseStore} from '../lib/workbook-response-store.js';
const secret='synthetic-gate-secret-32-characters-long-123';
process.env.VERCEL_ENV='production';
for(const group of ['OWR','BLEAD','BSALES','MCLENDON'])process.env[group+'_SESSION_SECRET']=secret+group;
for(const group of ['OWR','BLEAD','BSALES'])process.env[group+'_PASSWORD']='synthetic-password';
test('native middleware requires capture after existing workshop authentication on all static entry variants',async()=>{
 for(const [prefix,sign,serialize,env] of [['/OWR',signOwrSession,serializeOwrSession,'OWR'],['/Blead',signBleadSession,serializeBleadSession,'BLEAD'],['/bsales',signBsalesSession,serializeBsalesSession,'BSALES']]){
  const cookie=serialize(await sign({secret:process.env[env+'_SESSION_SECRET'],expiresAt:Date.now()+3600000})).split(';')[0];
  for(const suffix of ['','/','/index.html',env==='OWR'?'/workbook/index.html':env==='BLEAD'?'/session-1-prompts/':'/prompt-pack-2/']){
   const res=await middleware(new Request('https://www.kaindly.ai'+prefix+suffix,{headers:{cookie}}));assert.match(await res.text(),/Save and open session/,prefix+suffix);assert.notEqual(res.headers.get('x-middleware-next'),'1');
  }
 }
 for(const suffix of ['','/','/index.html'])assert.match(await (await middleware(new Request('https://www.kaindly.ai/McLendon'+suffix))).text(),/Save and open session/);
});
test('password gates and public pages remain intact',async()=>{
 assert.equal((await middleware(new Request('https://www.kaindly.ai/OWR/'))).status,303);
 assert.equal((await middleware(new Request('https://www.kaindly.ai/'))).headers.get('x-middleware-next'),'1');
 assert.equal((await middleware(new Request('https://www.kaindly.ai/contact/'))).headers.get('x-middleware-next'),'1');
});
test('registered session identities display in owner dashboard and export with exact attribution and consent',async()=>{
 const registry=listWorkbookRegistrations(),registration=registry.find(r=>r.key==='session-executive-alpha');assert.ok(registration,'Barbara session contacts must be registered');
 const row={client_id:'onewe-reach',program_id:'executive-alpha',workbook_id:'session-executive-alpha',participant_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',exercise_id:'identity',payload:{fields:{name:'TEST QA',email:'qa@example.com',source:'/owref2026',submitted_at:'2026-10-26T16:00:00.000Z',marketing_opt_in:'No',record_type:'TEST — synthetic verification'},capture:{isTest:true}},created_at:'2026-10-26T16:00:00.000Z',updated_at:'2026-10-26T16:00:00.000Z',delete_after:registration.deleteAfter};
 const store={listDashboard:async()=>[row],countDashboard:async()=>[{clients:1,workbooks:1,participants:1,responses:1}]};
 const api=createDashboardHandlers({authorize:async()=>true,store,registry});
 const query='?client=onewe-reach&workbook=session-executive-alpha&includeTests=1';
 const response=await api.GET(new Request('https://www.kaindly.ai/dashboard/api/responses'+query));assert.equal(response.status,200);const data=await response.json();assert.equal(data.responses[0].contact.email,'qa@example.com');
 const csv=await (await api.EXPORT(new Request('https://www.kaindly.ai/dashboard/api/export.csv'+query))).text();for(const s of ['Executive Alpha','qa@example.com','/owref2026','No','TEST'])assert.ok(csv.includes(s),s);
 assert.equal((await createDashboardHandlers({authorize:async()=>false,store,registry}).GET(new Request('https://www.kaindly.ai/dashboard/api/responses'))).status,401);
});
test('synthetic records are excluded by default but explicitly inspectable and exportable by owner',async()=>{
 const sql=[];const store=createWorkbookResponseStore(async(q,v)=>{sql.push(q);return [];});
 await store.listDashboard();assert.match(sql[0],/isTest/);
 await store.listDashboard({includeTests:true});assert.doesNotMatch(sql[1],/isTest/);
 assert.deepEqual(parseDashboardFilters(new URL('https://www.kaindly.ai/dashboard/?includeTests=1')),{includeTests:true});
 assert.throws(()=>parseDashboardFilters(new URL('https://www.kaindly.ai/dashboard/?includeTests=yes')));
});
