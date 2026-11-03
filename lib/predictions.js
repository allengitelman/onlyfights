// Prediction ledger: one row per account and bout, frozen at that fight's start, graded once from confirmed results.
import {gradePick} from './pick-engine.js';
const COLUMNS='user_id,event_id,fight_id,event_name,event_date,athlete_id,opponent_id,fighter,opponent,method,round,lock,segment,weightclass,rounds,pick_odds,pick_opp_odds,method_odds,odds_source,cutoff,published,picked_at,updated_at';
export const fightCutoff=(event,fight)=>fight.startTime||event.startTime||event.date;
const ml=(fight,id)=>{const v=fight.quote?.fighters?.[id]?.ml;return Number.isFinite(v)&&Math.abs(v)>=100?Math.round(v):null};
// Saves the account's picks for every fight that has not started. Started fights keep whatever was locked in.
// The price is captured when a side is first chosen; re-saving the same side never reprices it.
export async function syncPredictions(db,{userId,event,picks,published=false,now}){
 const at=new Date(now).toISOString(),existing=new Map((await db.prepare('SELECT fight_id,athlete_id,method,round,picked_at,pick_odds,pick_opp_odds,method_odds,odds_source,published FROM app_predictions WHERE user_id=? AND event_id=?').bind(userId,event.id).all()).results.map(r=>[r.fight_id,r]));
 const statements=[];let tracked=0,frozen=0;
 for(const f of event.fights){
  const cutoff=fightCutoff(event,f),open=Number.isFinite(Date.parse(cutoff))&&now<Date.parse(cutoff)&&!f.completed,p=picks.find(p=>p.fightId===f.id),old=existing.get(f.id);
  if(!open){if(p||old)frozen++;continue;}
  if(!p||!f.fighters.some(a=>a.id===p.athleteId)||!f.fighters.some(a=>a.id===p.opponentId)){if(old)statements.push(db.prepare('DELETE FROM app_predictions WHERE user_id=? AND event_id=? AND fight_id=?').bind(userId,event.id,f.id));continue;}
  const a=f.fighters.find(a=>a.id===p.athleteId),b=f.fighters.find(a=>a.id===p.opponentId),same=old?.athlete_id===p.athleteId,method=p.method||null,round=method&&method!=='Decision'&&p.round?p.round:null;
  const methodOdds=method?(same&&old.method===method&&old.method_odds!=null?old.method_odds:(v=>Number.isFinite(v)&&Math.abs(v)>=100?Math.round(v):null)(f.quote?.fighters?.[a.id]?.methods?.[method])):null;
  // Changing a published pick privately means the public card no longer shows it, so it drops off the public record until republished.
  const unchanged=same&&old.method===method&&old.round===round,isPublished=published||(unchanged&&old.published===1);
  statements.push(db.prepare('INSERT INTO app_predictions ('+COLUMNS+') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,event_id,fight_id) DO UPDATE SET athlete_id=excluded.athlete_id,opponent_id=excluded.opponent_id,fighter=excluded.fighter,opponent=excluded.opponent,method=excluded.method,round=excluded.round,lock=excluded.lock,segment=excluded.segment,weightclass=excluded.weightclass,rounds=excluded.rounds,pick_odds=excluded.pick_odds,pick_opp_odds=excluded.pick_opp_odds,method_odds=excluded.method_odds,odds_source=excluded.odds_source,cutoff=excluded.cutoff,published=excluded.published,picked_at=excluded.picked_at,updated_at=excluded.updated_at,event_name=excluded.event_name,event_date=excluded.event_date').bind(
   userId,event.id,f.id,event.name||'UFC fight night',String(event.date||cutoff).slice(0,10),a.id,b.id,a.name,b.name,method,round,p.lock===true?1:0,f.segment||'Fight card',f.weightclass||null,f.rounds||null,
   same?old.pick_odds:ml(f,a.id),same?old.pick_opp_odds:ml(f,b.id),methodOdds,same?old.odds_source:(f.quote?.source||null),cutoff,isPublished?1:0,same?old.picked_at:at,at));
  tracked++;
 }
 if(statements.length)await db.batch(statements);
 return {tracked,frozen};
}
// Records the latest pre-fight price on open picks. The last write before the cutoff is the closing line.
export async function captureClosingLines(db,event,now){
 const open=event.fights.filter(f=>!f.completed&&f.quote&&now<Date.parse(fightCutoff(event,f)));if(!open.length)return;
 const any=await db.prepare('SELECT 1 FROM app_predictions WHERE event_id=? AND cutoff>? LIMIT 1').bind(event.id,new Date(now).toISOString()).first();if(!any)return;
 const at=new Date(now).toISOString(),statements=[];
 for(const f of open)for(const [a,b] of [f.fighters,[...f.fighters].reverse()]){const p=ml(f,a.id),q=ml(f,b.id);if(p!=null)statements.push(db.prepare('UPDATE app_predictions SET close_odds=?,close_opp_odds=?,close_at=? WHERE event_id=? AND fight_id=? AND athlete_id=? AND cutoff>?').bind(p,q,at,event.id,f.id,a.id,at));}
 if(statements.length)await db.batch(statements);
}
const gradeStatement=(db,row,grade,extra,at)=>db.prepare('UPDATE app_predictions SET winner_grade=?,method_grade=?,round_grade=?,result_method=?,result_round=?,void_reason=?,audit_id=?,graded_at=? WHERE user_id=? AND event_id=? AND fight_id=?').bind(grade.winner,grade.method,grade.round,extra.method??null,extra.round??null,extra.voidReason??null,extra.auditId??null,at,row.user_id,row.event_id,row.fight_id);
const toPick=r=>({athleteId:r.athlete_id,opponentId:r.opponent_id,method:r.method,round:r.round});
const voidReason=(grade,result)=>grade.winner!=='void'?null:result?.kind==='draw'?'draw':result?.kind==='no_contest'?'no_contest':'card_changed';
// Grades from stored results first (including later source corrections), then fetches a few unresolved cards per call,
// newest first so a card the source never finalizes cannot starve the ones behind it.
export async function gradePredictions(db,{userId,eventService,now,maxFetch=4}){
 const at=new Date(now).toISOString(),scope=userId?' AND p.user_id=?':'',args=userId?[userId]:[];
 const fromAudit=async()=>{
  const rows=(await db.prepare('SELECT p.*,a.id AS latest_audit,a.payload AS audit_payload FROM app_predictions p JOIN app_result_audit a ON a.id=(SELECT MAX(id) FROM app_result_audit x WHERE x.event_id=p.event_id AND x.fight_id=p.fight_id) WHERE (p.audit_id IS NULL OR p.audit_id<a.id) AND p.cutoff<=?'+scope).bind(at,...args).all()).results;
  const statements=rows.map(r=>{const {fighters,result}=JSON.parse(r.audit_payload),grade=gradePick(toPick(r),{fighters:fighters.map(id=>({id})),completed:true,result});return gradeStatement(db,r,grade,{method:result?.method,round:result?.round,voidReason:voidReason(grade,result),auditId:r.latest_audit},at)});
  if(statements.length)await db.batch(statements);
 };
 await fromAudit();
 const pending=(await db.prepare('SELECT event_id,MIN(cutoff) AS first FROM app_predictions p WHERE winner_grade=\'pending\' AND cutoff<=?'+scope+' GROUP BY event_id ORDER BY first DESC LIMIT ?').bind(at,...args,maxFetch).all()).results;
 if(!pending.length||!eventService)return;
 const statements=[];
 for(const {event_id} of pending){
  let event;try{event=await eventService.get(event_id)}catch{continue}
  const rows=(await db.prepare('SELECT * FROM app_predictions p WHERE event_id=? AND winner_grade=\'pending\' AND cutoff<=?'+scope).bind(event_id,at,...args).all()).results;
  for(const r of rows){const bout=event.fights.find(f=>f.id===r.fight_id);
   if(!bout){if(event.completed)statements.push(gradeStatement(db,r,{winner:'void',method:r.method?'void':null,round:r.round?'void':null},{voidReason:'cancelled'},at));continue;}
   const grade=gradePick(toPick(r),bout);if(grade.winner==='pending')continue;
   statements.push(gradeStatement(db,r,grade,{method:bout.result?.method,round:bout.result?.round,voidReason:voidReason(grade,bout.result)},at));}
 }
 if(statements.length)await db.batch(statements);
 // Event reads may have written fresh audit rows; attach them so later corrections are detected.
 await fromAudit();
}
export async function loadPredictions(db,userId,{publishedOnly=false}={}){
 return (await db.prepare('SELECT * FROM app_predictions WHERE user_id=?'+(publishedOnly?' AND published=1':'')+' ORDER BY cutoff DESC,fight_id LIMIT 1000').bind(userId).all()).results;
}
export const predictionJSON=r=>({event:r.event_id,eventName:r.event_name,date:r.event_date,pick:{fightId:r.fight_id,athleteId:r.athlete_id,opponentId:r.opponent_id,fighter:r.fighter,opponent:r.opponent,method:r.method,round:r.round,lock:!!r.lock,segment:r.segment},
 grade:{winner:r.winner_grade,method:r.method?(r.method_grade||'pending'):null,round:r.round?(r.round_grade||'pending'):null},result:r.winner_grade==='pending'?null:{method:r.result_method,round:r.result_round,voidReason:r.void_reason},
 odds:{pick:r.pick_odds,opponent:r.pick_opp_odds,method:r.method_odds,close:r.close_odds,source:r.odds_source},weightclass:r.weightclass,published:!!r.published,pickedAt:r.picked_at,cutoff:r.cutoff,
 source:r.winner_grade==='pending'?'Awaiting confirmed result':'ESPN confirmed result',checkedAt:r.graded_at||r.updated_at});
