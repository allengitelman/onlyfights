// Persist source observations and result corrections, never model-generated outcomes.
export function withEventHistory({database,service,clock=Date.now}){
 const pending=new Map();
 return {list:()=>service.list(),async get(id){if(pending.has(id))return pending.get(id);const task=(async()=>{
  const db=database();if(!db)return service.get(id);
  const row=await db.prepare('SELECT payload,checked_at FROM app_event_snapshots WHERE event_id=?').bind(id).first();const prior=row?JSON.parse(row.payload):null;let event;
  try{try{event=await service.get(id)}catch(e){if(e.status!==404||!prior||!service.historical)throw e;event=await service.historical(id,prior.date)}}catch(e){if(!prior)throw e;return {...prior,stale:true,checkedAt:row.checked_at};}
  const observedAt=event.checkedAt||new Date(clock()).toISOString(),statements=[];
  for(const fight of event.fights){if(!fight.completed||!fight.result)continue;const result=JSON.stringify({fighters:fight.fighters.map(a=>a.id),result:fight.result}),last=await db.prepare('SELECT payload FROM app_result_audit WHERE event_id=? AND fight_id=? ORDER BY id DESC LIMIT 1').bind(id,fight.id).first();if(last?.payload!==result)statements.push(db.prepare('INSERT INTO app_result_audit (event_id,fight_id,payload,checked_at) VALUES (?,?,?,?)').bind(id,fight.id,result,observedAt));}
  statements.push(db.prepare('INSERT INTO app_event_snapshots (event_id,payload,checked_at) VALUES (?,?,?) ON CONFLICT(event_id) DO UPDATE SET payload=excluded.payload,checked_at=excluded.checked_at').bind(id,JSON.stringify(event),observedAt));await db.batch(statements);return event;
 })();pending.set(id,task);try{return await task}finally{pending.delete(id)}}};
}
