import {readCookie} from './blead-auth.js';
import {OWR_COOKIE_NAME,verifyOwrSession} from './owr-auth.js';
import {readParticipantIdentity} from './owr-participant.js';
export const EVENT='owr-connections-2026-10-20';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','x-robots-tag':'noindex,nofollow'}});
const pair=(a,b)=>{const ids=[a,b].sort();return[ids[0],'pair:'+ids[1]];};
const publicProfile=row=>({id:row.participant_id,...Object.fromEntries(['name','intro','offer','looking','company'].map(key=>[key,String(row.payload[key]||'')]))});
function linkedin(value){if(!value)return '';const url=new URL(value);if(url.protocol!=='https:'||!['linkedin.com','www.linkedin.com'].includes(url.hostname)||!/^\/in\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)||url.username||url.password||url.search||url.hash||url.port)throw Error();return url.href;}
export function createLiveConnectionsHandler({query,secret=process.env.OWR_SESSION_SECRET}){
 const rows=(id,exercise)=>query('SELECT participant_id,exercise_id,payload FROM blead_workbook_responses WHERE workbook_id=$1 AND participant_id=$2 AND exercise_id=$3',[EVENT,id,exercise]);
 const ownContact=async id=>(await query("SELECT payload FROM blead_workbook_responses WHERE workbook_id='owr-purposeful-next-move' AND participant_id=$1 AND exercise_id='identity'",[id]))[0]?.payload?.fields;
 const insert=async(id,exercise,payload,update=false)=>query(`INSERT INTO blead_workbook_responses(client_id,program_id,participant_id,workbook_id,exercise_id,payload,delete_after) VALUES('onewe-reach','career-architecture-ai-era',$1,$2,$3,$4::jsonb,'2027-03-01T06:00:00Z') ON CONFLICT(participant_id,workbook_id,exercise_id) ${update?'DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()':'DO NOTHING'} RETURNING payload`,[id,EVENT,exercise,JSON.stringify(payload)]);
 return async request=>{
  if(!await verifyOwrSession(readCookie(request.headers.get('cookie'),OWR_COOKIE_NAME),secret))return json({error:'Workshop PIN access required.'},401);
  const id=await readParticipantIdentity(request,{secret});if(!id)return json({error:'Open your workbook on this browser first.'},401);
  try{
   const mine=(await rows(id,'profile'))[0],contact=await ownContact(id);
   if(request.method==='GET'){
    const profiles=await query("SELECT participant_id,exercise_id,payload FROM blead_workbook_responses WHERE workbook_id=$1 AND exercise_id='profile' AND payload->>'published'='true'",[EVENT]);
    const requests=await query("SELECT payload FROM blead_workbook_responses WHERE workbook_id=$1 AND exercise_id LIKE 'pair:%' AND (payload->>'from'=$2 OR payload->>'to'=$2)",[EVENT,id]);
    const blocked=new Set(requests.filter(r=>r.payload.status==='blocked').map(r=>r.payload.from===id?r.payload.to:r.payload.from));
    return json({event:'OneWe Reach · October 20, 2026',me:id,contactReady:Boolean(contact?.name&&contact?.email),myProfile:mine?.payload||null,directory:mine?.payload?.published?profiles.filter(row=>row.participant_id!==id&&!blocked.has(row.participant_id)).map(publicProfile):[],requests:requests.map(({payload:p})=>({other:p.from===id?p.to:p.from,direction:p.from===id?'outgoing':'incoming',status:p.status,...(p.status==='accepted'&&p.fromConsent===true&&p.toConsent===true?{contact:p.from===id?p.toContact:p.fromContact}:{})}))});
   }
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request not accepted'},403);
   const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>12000)return json({error:'Request too large'},413);let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
   if(input.action==='withdraw'){if(mine)await insert(id,'profile',{...mine.payload,published:false},true);return json({saved:true});}
   if(!contact?.name||!contact?.email)return json({error:'Save your name and email in the workbook first.'},409);
   if(input.action==='publish'){
    if(input.consent!==true)return json({error:'Review and opt in before publishing.'},400);
    const profile={published:true,consentAt:new Date().toISOString()};
    for(const [key,max]of Object.entries({name:100,intro:900,offer:500,looking:500,company:160,linkedin:300})){if(typeof input[key]!=='string'||input[key].length>max)return json({error:'Check the profile fields and length limits.'},400);profile[key]=input[key].trim();}
    if(!profile.name||!profile.intro)return json({error:'Add a display name and introduction.'},400);
    try{profile.linkedin=linkedin(profile.linkedin);}catch{return json({error:'Use a full HTTPS linkedin.com/in/ profile link, or leave it blank.'},400);}
    await insert(id,'profile',profile,true);return json({saved:true});
   }
   const other=input.other;if(!UUID.test(other||'')||other===id)return json({error:'Choose another participant.'},400);
   const [owner,exercise]=pair(id,other),existing=(await rows(owner,exercise))[0]?.payload;
   if(input.action==='block'){
    if(existing)await query("UPDATE blead_workbook_responses SET payload=payload||'{\"status\":\"blocked\"}'::jsonb,updated_at=now() WHERE workbook_id=$1 AND participant_id=$2 AND exercise_id=$3",[EVENT,owner,exercise]);
    else await insert(owner,exercise,{from:id,to:other,status:'blocked',fromConsent:false,toConsent:false});
    return json({saved:true});
   }
   if(!mine?.payload?.published)return json({error:'Opt in with a profile first.'},409);
   const target=(await rows(other,'profile'))[0];if(!target?.payload?.published)return json({error:'This participant is no longer available.'},409);
   if(input.action==='request'){
    if(input.consent!==true)return json({error:'Consent to share your contact details if they accept.'},400);
    if(existing)return json({error:'A request already exists for this pair. Check your requests.'},409);
    const total=await query("SELECT count(*)::int AS count FROM blead_workbook_responses WHERE workbook_id=$1 AND exercise_id LIKE 'pair:%' AND payload->>'from'=$2",[EVENT,id]);if(total[0].count>=30)return json({error:'Workshop request limit reached.'},429);
    const saved=await insert(owner,exercise,{from:id,to:other,status:'pending',fromConsent:true,toConsent:false,fromContact:{email:contact.email,linkedin:mine.payload.linkedin||''},createdAt:new Date().toISOString()});return saved.length?json({saved:true}):json({error:'A request already exists. Refresh your requests.'},409);
   }
   if(!existing||existing.status!=='pending')return json({error:'This request is no longer pending.'},409);
   if(input.action==='accept'&&existing.to===id){
    if(input.consent!==true)return json({error:'Consent to share your contact details before accepting.'},400);
    const saved=await query("UPDATE blead_workbook_responses SET payload=payload||$4::jsonb,updated_at=now() WHERE workbook_id=$1 AND participant_id=$2 AND exercise_id=$3 AND payload->>'status'='pending' AND payload->>'to'=$5 RETURNING payload",[EVENT,owner,exercise,JSON.stringify({status:'accepted',toConsent:true,toContact:{email:contact.email,linkedin:mine.payload.linkedin||''},acceptedAt:new Date().toISOString()}),id]);return saved.length?json({saved:true}):json({error:'Request changed. Refresh.'},409);
   }
   if((input.action==='decline'&&existing.to===id)||(input.action==='cancel'&&existing.from===id)){
    await query("UPDATE blead_workbook_responses SET payload=payload||'{\"status\":\"closed\"}'::jsonb,updated_at=now() WHERE workbook_id=$1 AND participant_id=$2 AND exercise_id=$3 AND payload->>'status'='pending'",[EVENT,owner,exercise]);return json({saved:true});
   }
   return json({error:'Action not allowed.'},403);
  }catch{return json({error:'Connections could not be loaded or saved. Please retry.'},503);}
 };
}
