import test from 'node:test';
import assert from 'node:assert/strict';
const row={participant_id:'anonymous-id',workbook_id:'owr-purposeful-next-move',exercise_id:'context',payload:{fields:{__help:'Can you help me phrase this?',__help_location:'Table 3',experience:'PRIVATE CAREER DETAILS'}},updated_at:'2026-10-20T18:00:00.000Z'};
test('help queue uses facilitator auth and never returns private career fields',async()=>{
 const module=await import('../lib/owr-help.js').catch(()=>({}));assert.equal(typeof module.createOwrHelpHandler,'function');
 const handler=module.createOwrHelpHandler({authorize:async()=>true,store:{listDashboard:async()=>[row]}});
 const count=await (await handler(new Request('https://www.kaindly.ai/dashboard/api/owr-help?summary=1'))).json();assert.deepEqual(count,{count:1});
 const full=await (await handler(new Request('https://www.kaindly.ai/dashboard/api/owr-help'))).json();assert.equal(full.questions[0].message,row.payload.fields.__help);assert.equal(full.questions[0].location,'Table 3');assert.ok(!JSON.stringify(full).includes('PRIVATE CAREER DETAILS'));
 let reads=0;const denied=module.createOwrHelpHandler({authorize:async()=>false,store:{listDashboard:async()=>{reads++;return[row];}}});assert.equal((await denied(new Request('https://www.kaindly.ai/dashboard/api/owr-help'))).status,401);assert.equal(reads,0);
});
