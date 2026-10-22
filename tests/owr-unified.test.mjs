import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('presenter demo uses its own memory and never calls participant storage or network', async () => {
  const module = await import('../assets/js/owr-workbook-mode.js').catch(() => ({}));
  assert.equal(typeof module.createWorkbookRuntime, 'function', 'isolated demo runtime exists');
  let reads = 0, requests = 0;
  const runtime = module.createWorkbookRuntime({search:'?demo=1', workbookId:'owr-career-architecture', endpoint:'/OWR/api/responses', getStorage:()=>{reads++; throw Error('private storage accessed');}, fetchImpl:()=>{requests++; throw Error('live API called');}});
  assert.equal(runtime.demo, true);
  assert.deepEqual(await runtime.client.load(), []);
  await runtime.client.save('ex1', {experience:'fictional example'});
  assert.equal((await runtime.client.load())[0].payload.fields.experience, 'fictional example');
  assert.equal(reads,0); assert.equal(requests,0);
});

test('presenter page isolates the workbook demo, opens live Connections and has local slide controls', async () => {
  const html = await readFile(new URL('../OWR/present/index.html',import.meta.url),'utf8').catch(()=> '');
  assert.match(html,/application\/pdf/);
  assert.match(html,/\/OWR\/next-move\/\?demo=1/);
  assert.match(html,/\/OWR\/next-move\/connections\//);
  assert.doesNotMatch(html,/Ready to project|Connections Demo|Fictional Connections/);
  assert.match(html,/id="pdf-page"/);
  assert.doesNotMatch(html,/\/dashboard\/api\/|kaindly-connections-demo\.novalyse/);
});

test('revised workshop uses a separate version while retaining old responses', async () => {
  const { getWorkbookRegistration } = await import('../lib/workbook-registry.js');
  const revised=getWorkbookRegistration('owr-purposeful-next-move');
  assert.ok(revised,'revised registration exists');
  assert.deepEqual(revised.exercises.map(e=>e.id),['context','possibilities','evidence','next-move','identity']);
  assert.equal(getWorkbookRegistration('owr-career-architecture').exercises.length,5);
  assert.equal(revised.participantApiPath,'/OWR/next-move/api/responses');
});

test('dashboard associates revised worksheet fields and Q&A with the saved contact',async()=>{
 const {createDashboardHandlers}=await import('../lib/workbook-response-api.js');const {getWorkbookRegistration}=await import('../lib/workbook-registry.js');
 const registration=getWorkbookRegistration('owr-purposeful-next-move'),id='11111111-1111-4111-8111-111111111111';
 const base={client_id:registration.client.id,program_id:registration.program.id,workbook_id:registration.workbook.id,participant_id:id,created_at:'2026-10-20T18:00:00Z',updated_at:'2026-10-20T18:00:00Z',delete_after:registration.deleteAfter};
 const rows=[{...base,exercise_id:'identity',payload:{fields:{name:'Fictional Workshop Person',email:'person@example.invalid'}}},{...base,exercise_id:'context',payload:{fields:{experience:'My saved experience'},questions:[{question:'My question',answer:'Facilitator reply',status:'answered'}]}}];
 const handlers=createDashboardHandlers({authorize:async()=>true,registry:[registration],store:{listDashboard:async()=>rows,countDashboard:async()=>[{clients:1,workbooks:1,participants:1,responses:2}]}});
 const body=await(await handlers.GET(new Request('https://www.kaindly.ai/dashboard/api/responses'))).json();const response=body.responses.find(row=>row.exercise.id==='context');assert.equal(response.contact?.name,'Fictional Workshop Person');assert.ok(response.fields.some(field=>field.value==='Facilitator reply'));
});

 test('Activity 1 copy includes all selected context without identity or questions',async()=>{const {compileActivityPrompt}=await import('../OWR/next-move/content.js');const prompt=compileActivityPrompt('context',{identity:{email:'PRIVATE EMAIL'},context:{experience:'SELECTED HISTORY',context:'MY CONTEXT',learned:'LESSON',more:'MORE',less:'LESS',protect:'CONSTRAINT',change:'CHANGE'},question:'PRIVATE QUESTION'});for(const value of ['SELECTED HISTORY','MY CONTEXT','LESSON','MORE','LESS','CONSTRAINT','CHANGE'])assert.ok(prompt.includes(value));assert.ok(!prompt.includes('PRIVATE EMAIL'));assert.ok(!prompt.includes('PRIVATE QUESTION'));assert.ok(compileActivityPrompt('context').includes('résumé text OR LinkedIn text OR a short work-history summary'));});
