const WORKBOOKS=new Set(['owr-career-architecture','owr-purposeful-next-move']);
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-robots-tag':'noindex,nofollow'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createOwrHelpHandler({authorize,store}) {
 return async request=>{
  try{if(!await authorize(request))return json({error:'Facilitator sign-in required'},401);}catch{return json({error:'Facilitator sign-in required'},401);}
  if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request not accepted'},403);
   let input;try{const text=await request.text();if(new TextEncoder().encode(text).byteLength>16000)throw Error();input=JSON.parse(text);}catch{return json({error:'Invalid answer'},400);}
   if(!UUID.test(input.participantId||'')||!UUID.test(input.questionId||'')||!['context','possibilities','evidence','next-move'].includes(input.exerciseId)||typeof input.answer!=='string'||input.answer.length>6000||!['open','answered'].includes(input.status))return json({error:'Invalid answer'},400);
   try{const rows=await store.answer(input);return rows.length?json({saved:true}):json({error:'Question no longer available'},404);}catch{return json({error:'Answer could not be saved. Try again.'},503);}
  }
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  try{
   const rows=await store.listDashboard({clientId:'onewe-reach'});
   const identities=new Map(rows.filter(row=>row.workbook_id==='owr-purposeful-next-move'&&row.exercise_id==='identity').map(row=>[row.participant_id,row.payload?.fields||{}]));
   const questions=rows.filter(row=>WORKBOOKS.has(row.workbook_id)).flatMap(row=>{
    const contact=identities.get(row.participant_id)||{};
    const base={participant:row.participant_id,activity:row.exercise_id,name:String(contact.name||''),email:String(contact.email||'')};
    const saved=Array.isArray(row.payload?.questions)?row.payload.questions.map(q=>({...base,id:q.id,message:String(q.question||''),answer:String(q.answer||''),status:q.status==='answered'?'answered':'open',updatedAt:q.answeredAt||q.askedAt||row.updated_at,replyable:row.workbook_id==='owr-purposeful-next-move'})):[];
    if(typeof row.payload?.fields?.__help==='string'&&row.payload.fields.__help.trim())saved.push({...base,id:`${row.workbook_id}:${row.participant_id}:${row.exercise_id}`,message:row.payload.fields.__help.trim(),location:String(row.payload.fields.__help_location||''),answer:'',status:'open',updatedAt:row.updated_at,replyable:false});
    return saved;
   }).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
   const count=questions.filter(question=>question.status==='open').length;
   if(new URL(request.url).searchParams.get('summary')==='1')return json({count});
   return json({count,questions});
  }catch{return json({error:'Help queue unavailable. Ask participants to raise their hand.'},503);}
 };
}
