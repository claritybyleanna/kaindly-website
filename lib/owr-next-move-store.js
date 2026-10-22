import {createWorkbookResponseStore} from './workbook-response-store.js';
import {WORKBOOK_DELETE_AFTER} from './workbook-registry.js';
export const NEXT_MOVE='owr-purposeful-next-move';
export function createNextMoveStore(query){
 const base=createWorkbookResponseStore(query);
 return {...base,
  async upsert(snapshot){
   return query(`INSERT INTO blead_workbook_responses (client_id,program_id,participant_id,workbook_id,exercise_id,payload,delete_after)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz)
    ON CONFLICT (participant_id,workbook_id,exercise_id) DO UPDATE SET
    payload=jsonb_set(EXCLUDED.payload,'{questions}',COALESCE(blead_workbook_responses.payload->'questions','[]'::jsonb)),updated_at=now()
    RETURNING *`,[snapshot.clientId,snapshot.programId,snapshot.participantId,snapshot.workbookId,snapshot.exerciseId,JSON.stringify(snapshot.payload),snapshot.deleteAfter]);
  },
  async ask({participantId,exerciseId,message,id}){
   const question={id,question:message,answer:'',status:'open',askedAt:new Date().toISOString()};
   return query(`INSERT INTO blead_workbook_responses (client_id,program_id,participant_id,workbook_id,exercise_id,payload,delete_after)
    VALUES ('onewe-reach','career-architecture-ai-era',$1,$2,$3,jsonb_build_object('fields','{}'::jsonb,'questions',jsonb_build_array($4::jsonb)),$5::timestamptz)
    ON CONFLICT (participant_id,workbook_id,exercise_id) DO UPDATE SET payload=jsonb_set(blead_workbook_responses.payload,'{questions}',COALESCE(blead_workbook_responses.payload->'questions','[]'::jsonb)||jsonb_build_array($4::jsonb)),updated_at=now()
    WHERE NOT COALESCE(blead_workbook_responses.payload->'questions','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',$6::text))
      AND jsonb_array_length(COALESCE(blead_workbook_responses.payload->'questions','[]'::jsonb))<30
    RETURNING *`,[participantId,NEXT_MOVE,exerciseId,JSON.stringify(question),WORKBOOK_DELETE_AFTER,id]);
  },
  async answer({participantId,exerciseId,questionId,answer,status}){
   return query(`UPDATE blead_workbook_responses SET payload=jsonb_set(payload,'{questions}',
    (SELECT jsonb_agg(CASE WHEN item->>'id'=$4 THEN item || jsonb_build_object('answer',$5::text,'status',$6::text,'answeredAt',now()) ELSE item END)
    FROM jsonb_array_elements(COALESCE(payload->'questions','[]'::jsonb)) item)),updated_at=now()
    WHERE participant_id=$1 AND workbook_id=$2 AND exercise_id=$3
      AND COALESCE(payload->'questions','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',$4::text)) RETURNING participant_id`,[participantId,NEXT_MOVE,exerciseId,questionId,answer,status]);
  }
 };
}
