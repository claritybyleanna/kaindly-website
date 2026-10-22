import { createOwrSubmissionClient } from './owr-submissions.js';

// A presentation must never restore the presenter's private participant responses.
export function createWorkbookRuntime({search = '', workbookId, endpoint, getStorage = () => globalThis.localStorage, fetchImpl = globalThis.fetch} = {}) {
  const demo = new URLSearchParams(search).get('demo') === '1';
  if (!demo) {
    let storage;
    try { storage=getStorage(); } catch { const values=new Map(); storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>{values.set(key,String(value));throw Error('Browser storage unavailable');}}; }
    if(workbookId==='owr-purposeful-next-move'){
      let session;
      const ensureSession=()=>session ||= fetchImpl(endpoint+'?operation=session',{credentials:'same-origin'}).then(response=>{if(!response.ok)throw Error('Participant session unavailable');}).catch(error=>{session=null;throw error;});
      const call=async (suffix,method,body)=>{await ensureSession();const response=await fetchImpl(endpoint+suffix,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save');return data;};
      return {demo,storage,client:{load:async()=>(await call('','GET')).responses||[],save:async(exerciseId,fields)=>(await call('','POST',{exerciseId,fields,notes:''})).response,ask:async(exerciseId,message,questionId)=>call('?operation=question','POST',{exerciseId,message,questionId})}};
    }
    return { demo, storage, client: createOwrSubmissionClient({workbookId, endpoint, storage, fetchImpl}) };
  }
  const values = new Map(), responses = new Map();
  const storage = {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,String(value)), removeItem:key=>values.delete(key)};
  const client = {
    load:async () => [...responses.values()].map(row=>structuredClone(row)),
    save:async (exerciseId,fields) => {
      const row = {exercise_id:exerciseId,payload:{fields:structuredClone(fields),questions:structuredClone(responses.get(exerciseId)?.payload.questions||[])}};
      responses.set(exerciseId,row);
      return structuredClone(row);
    },
    ask:async(exerciseId,message,questionId)=>{const row=responses.get(exerciseId)||{exercise_id:exerciseId,payload:{fields:{},questions:[]}};row.payload.questions||=[];row.payload.questions.push({id:questionId,question:message,answer:'',status:'open',askedAt:new Date().toISOString()});responses.set(exerciseId,row);return {saved:true};},
    withdraw:async exerciseId=>responses.delete(exerciseId),
  };
  return {demo,storage,client};
}
