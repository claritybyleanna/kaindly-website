import {readCookie} from './blead-auth.js';
import {OWR_COOKIE_NAME,verifyOwrSession} from './owr-auth.js';
import {issueParticipantCookie,readParticipantIdentity} from './owr-participant.js';
import {getWorkbookRegistration} from './workbook-registry.js';
import {createParticipantResponseHandlers} from './workbook-response-api.js';
import {NEXT_MOVE} from './owr-next-move-store.js';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-robots-tag':'noindex,nofollow'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createNextMoveHandlers({store,secret=process.env.OWR_SESSION_SECRET,authorize=async request=>verifyOwrSession(readCookie(request.headers.get('cookie'),OWR_COOKIE_NAME),secret)}={}){
 return async request=>{
  if(!await authorize(request))return json({error:'Workshop access required'},401);
  const url=new URL(request.url),operation=url.searchParams.get('operation');
  let id=await readParticipantIdentity(request,{secret});
  if(operation==='session'&&request.method==='GET'){
   if(id)return json({ready:true});
   try{const issued=await issueParticipantCookie({secret,secure:url.protocol==='https:'});return json({ready:true},200,{'set-cookie':issued.cookie});}catch{return json({error:'Participant access unavailable'},503);}
  }
  if(!id)return json({error:'This browser needs a participant session'},401);
  const registration=getWorkbookRegistration(NEXT_MOVE);
  if(request.method==='POST'){
   if(request.headers.get('origin')!==url.origin)return json({error:'Request not accepted'},403);
   let input;try{const text=await request.text();if(new TextEncoder().encode(text).byteLength>64*1024)throw Error();input=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
   if(input.participantId&&input.participantId!==id)return json({error:'Participant mismatch'},403);
   if(operation==='question'){
    if(Date.now()>=Date.parse(registration.deleteAfter))return json({error:'Workshop no longer accepts questions'},410);
    if(!registration.exercises.some(section=>section.id===input.exerciseId&&section.id!=='identity')||typeof input.message!=='string'||!input.message.trim()||input.message.length>3000||!UUID.test(input.questionId||''))return json({error:'Enter a question of up to 3000 characters'},400);
    try{
     const existing=await store.listByParticipant(id,registration);
     if(!existing.some(row=>row.exercise_id==='identity'&&row.payload?.fields?.name&&row.payload?.fields?.email))return json({error:'Save your workshop name and email first.'},409);
     const saved=await store.ask({participantId:id,exerciseId:input.exerciseId,message:input.message.trim(),id:input.questionId});
     if(!saved.length){const current=await store.listByParticipant(id,registration); const prior=current.find(row=>row.exercise_id===input.exerciseId)?.payload?.questions?.find(question=>question.id===input.questionId); if(!prior)return json({error:"Question limit reached for this activity. Please raise your hand."},429); if(prior.question!==input.message.trim())return json({error:"Please submit this as a new question."},409);}
     return json({saved:true});
    }catch{return json({error:'Question could not be saved. Please raise your hand.'},503);}
   }
   if(input.exerciseId==='identity'){
    const {name,email}=input.fields||{};
    if(typeof name!=='string'||!name.trim()||name.length>160||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Enter your name and email for workshop support'},400);
   }
   const forwarded=new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({...input,participantId:id})});
   return createParticipantResponseHandlers({registration,authorize:async()=>true,store}).POST(forwarded);
  }
  if(request.method==='GET'){
   url.searchParams.set('participantId',id);
   return createParticipantResponseHandlers({registration,authorize:async()=>true,store}).GET(new Request(url,{headers:request.headers}));
  }
  return json({error:'Method not allowed'},405);
 };
}
