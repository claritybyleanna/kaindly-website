import {readCookie,signScopedSession,verifyScopedSession} from './blead-auth.js';
export const PARTICIPANT_COOKIE='kaindly_owr_participant';
const AGE_SECONDS=30*24*60*60;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function issueParticipantCookie({secret,now=Date.now(),secure=true}={}){
 const id=crypto.randomUUID();const token=await signScopedSession({secret,scope:'owr-participant:'+id,expiresAt:now+AGE_SECONDS*1000});
 return {id,cookie:[`${PARTICIPANT_COOKIE}=${id}~${token}`,'Path=/OWR/next-move/',`Max-Age=${AGE_SECONDS}`,'HttpOnly','SameSite=Strict',secure?'Secure':''].filter(Boolean).join('; ')};
}
export async function readParticipantIdentity(request,{secret,now=Date.now()}={}){
 const value=readCookie(request.headers.get('cookie'),PARTICIPANT_COOKIE)||'';const [id,token,extra]=value.split('~');
 if(extra!==undefined||!UUID.test(id||''))return null;
 return await verifyScopedSession(token,secret,'owr-participant:'+id,now)?id:null;
}
