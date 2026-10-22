// Visibility is memory-only on this device. It is never synchronized or restored.
let opened=false,sequence=0,editing=false;
const drafts=new Map();
const toggle=document.querySelector('#questions-toggle'),panel=document.querySelector('#question-queue'),list=document.querySelector('#question-list'),count=document.querySelector('#question-count'),connection=document.querySelector('#question-connection'),signin=document.querySelector('#question-signin');
function close(){opened=false;sequence++;panel.hidden=true;list.replaceChildren();toggle.setAttribute('aria-expanded','false');}
function textElement(tag,text,cls){const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;}
async function refresh(){
 const requestSequence=++sequence,wasOpen=opened;
 try{
  const response=await fetch('/dashboard/api/owr-help'+(wasOpen?'':'?summary=1'),{credentials:'same-origin',cache:'no-store'});
  if(requestSequence!==sequence)return;
  if(response.status===401||response.status===403){count.textContent='—';connection.hidden=false;connection.textContent='Private queue requires facilitator sign-in.';signin.hidden=false;list.replaceChildren();return;}
  if(!response.ok)throw Error();
  const data=await response.json();if(requestSequence!==sequence)return;
  if(!Number.isSafeInteger(data.count)||data.count<0)throw Error();
  count.textContent=String(data.count);connection.textContent='';connection.hidden=true;signin.hidden=true;
  if(!opened||!wasOpen||(editing&&list.childElementCount))return;
  list.replaceChildren();
  if(!data.questions?.length){list.append(textElement('p','No saved questions right now.'));return;}
  for(const question of data.questions){
   const article=document.createElement('article');article.className='question-item';
   article.append(textElement('h3',question.name||question.location||'Participant '+String(question.participant).slice(0,8)),textElement('p',question.message),textElement('p',question.activity+' · '+question.status+' · '+new Date(question.updatedAt).toLocaleTimeString(),'small'));
   if(question.email)article.append(textElement('p',question.email+' · Provided for workshop support; no email is sent here.','small'));
   if(question.replyable){
    const key=question.participant+':'+question.id;
    const label=document.createElement('label');label.textContent='Your answer';const answer=document.createElement('textarea');answer.value=drafts.get(key)??question.answer??'';answer.maxLength=6000;label.append(answer);article.append(label);answer.addEventListener('input',()=>{drafts.set(key,answer.value);editing=true;});
    const status=textElement('p','','small');const actions=document.createElement('div');actions.className='actions';
    for(const [label,nextStatus] of [['Save answer','open'],['Save and mark answered','answered']]){const button=textElement('button',label,'secondary');button.addEventListener('click',async()=>{
     button.disabled=true;status.textContent='Saving…';const submittedAnswer=answer.value;
     try{const response=await fetch('/dashboard/api/owr-help',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({participantId:question.participant,exerciseId:question.activity,questionId:question.id,answer:submittedAnswer,status:nextStatus})});if(!response.ok)throw Error();status.textContent='Answer saved. The participant can see it in their workbook.';if(drafts.get(key)===submittedAnswer)drafts.delete(key);editing=drafts.size>0;await refresh();}catch{status.textContent='Answer was not saved. Keep your draft here and retry.';}finally{button.disabled=false;}
    });actions.append(button);}article.append(actions,status);
   }else article.append(textElement('p','Earlier workbook help note. Reply in person; this version has no participant reply thread.','small'));
   list.append(article);
  }
 }catch{if(requestSequence!==sequence)return;count.textContent='—';connection.hidden=false;connection.textContent='Questions unavailable. Please raise your hand.';if(!editing)list.replaceChildren();}
}
toggle.addEventListener('click',()=>{if(opened){close();void refresh();return;}opened=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');void refresh();});
document.querySelector('#questions-close').addEventListener('click',()=>{close();void refresh();toggle.focus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)close();else void refresh();});window.addEventListener('pagehide',close);
window.addEventListener('beforeunload',event=>{if(editing){event.preventDefault();event.returnValue='';}});
setInterval(()=>{if(!document.hidden)void refresh();},15000);close();void refresh();
