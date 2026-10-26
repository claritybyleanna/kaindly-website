// Session contact workbooks are separate from existing exercise/identity records.
export const SESSION_CAPTURES = Object.freeze([
  {id:'executive-alpha',title:'Executive Alpha · Barbara Salami',prefix:'/owref2026',client:{id:'onewe-reach',name:'OneWe Reach'},program:{id:'executive-alpha',name:'Executive Alpha'},secret:'OWREF2026_SESSION_SECRET'},
  {id:'owr-career-architecture',title:'Career Architecture in the AI Era',prefix:'/OWR',client:{id:'onewe-reach',name:'OneWe Reach'},program:{id:'career-architecture-ai-era',name:'Career Architecture in the AI Era'},secret:'OWR_SESSION_SECRET'},
  {id:'bracco-leadership',title:'AI Leadership Accelerator',prefix:'/Blead',client:{id:'bracco',name:'Bracco'},program:{id:'leadership-accelerator',name:'AI Leadership Accelerator'},secret:'BLEAD_SESSION_SECRET'},
  {id:'bracco-sales',title:'Sales Team AI Working Session',prefix:'/bsales',client:{id:'bracco',name:'Bracco'},program:{id:'sales-ai-working-session',name:'Sales Team AI Working Session'},secret:'BSALES_SESSION_SECRET'},
  {id:'mclendon',title:'Working Smarter From Day One',prefix:'/McLendon',client:{id:'mclendon-working-smarter',name:'The McLendon Foundation'},program:{id:'working-smarter-from-day-one',name:'Working Smarter From Day One'},secret:'MCLENDON_SESSION_SECRET'},
]);
export function captureRegistrations(deleteAfter){
  return SESSION_CAPTURES.map(s=>({key:'session-'+s.id,client:s.client,program:s.program,workbook:{id:'session-'+s.id,name:s.title+' · session contacts'},hubUrl:s.prefix+'/',routePrefix:s.prefix+'/',participantApiPath:s.prefix+'/?kaindly-register=1',deleteAfter,exportPrefix:'session-'+s.id,exercises:[{id:'identity',title:'Session registration',fields:[
    {id:'name',label:'Name'},{id:'email',label:'Email (self-reported)'},{id:'source',label:'Session entry page'},
    {id:'submitted_at',label:'Submitted at (UTC)'},{id:'marketing_opt_in',label:'Optional marketing opt-in (no automatic subscription)'},{id:'record_type',label:'Record type'},
  ]}]}));
}
