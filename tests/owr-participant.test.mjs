import test from 'node:test';import assert from 'node:assert/strict';
const secret='local-test-only-secret-with-more-than-32-bytes';
test('participant identity is signed and cannot be selected by name, email or UUID',async()=>{
 const module=await import('../lib/owr-participant.js').catch(()=>({}));assert.equal(typeof module.issueParticipantCookie,'function');
 const issued=await module.issueParticipantCookie({secret,now:1000,secure:false});
 const cookie=issued.cookie.split(';')[0];assert.equal(await module.readParticipantIdentity(new Request('https://example.com',{headers:{cookie}}),{secret,now:1001}),issued.id);
 const forged=cookie.replace(issued.id,'11111111-1111-4111-8111-111111111111');assert.equal(await module.readParticipantIdentity(new Request('https://example.com',{headers:{cookie:forged}}),{secret,now:1001}),null);
 assert.equal(await module.readParticipantIdentity(new Request('https://example.com?email=someone@example.com&participantId='+issued.id),{secret,now:1001}),null);
});
