import {appError} from './app-auth.js';
import {portraitURL} from './social-core.js';
import {attachMarketOdds} from './odds-api.js';
// ESPN rejects scoreboard ranges longer than about a year (HTTP 400), so the upcoming window stays well inside it.
const SCORE='https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',CORE='https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/';
const text=s=>String(s||'').replace(/[<>"&]/g,'').slice(0,160);
const american=n=>n!=null&&Number.isFinite(Number(n))&&Math.abs(Number(n))>=100?Number(n):null;
const price=x=>american(x?.american??x?.alternateDisplayValue);
export function normalizeEvent(e){
 const competitions=(e.competitions||[]).filter(c=>c.competitors?.length===2),times=[...new Set(competitions.map(c=>c.startDate||c.date).filter(Boolean))].sort();
 const fights=competitions.slice().reverse().map(c=>{
  const fighters=[...c.competitors].sort((a,b)=>(a.order||0)-(b.order||0)).map(a=>({id:String(a.athlete?.id||a.id),name:text(a.athlete?.fullName),photo:portraitURL(a.athlete?.headshot?.href)||'https://a.espncdn.com/i/headshots/mma/players/full/'+(a.athlete?.id||a.id)+'.png'}));
  const completed=c.status?.type?.completed===true,winners=c.competitors.filter(a=>a.winner===true),desc=(c.details||[]).map(d=>d.type?.text||'').join(' ').toLowerCase();
  const method=/submission/.test(desc)?'Submission':/ko\s*\/\s*tko|kotko|knockout|technical knockout/.test(desc)?'KO / TKO':/decision/.test(desc)?'Decision':null;
  const kind=/no contest/.test(desc)?'no_contest':/draw/.test(desc)?'draw':null;
  return {id:String(c.id),startTime:c.startDate||c.date||null,segment:times.length<2?'Fight card':(c.startDate||c.date)===times.at(-1)?'Main Card':times.length>2&&(c.startDate||c.date)===times[0]?'Early Prelims':'Prelims',fighters,weightclass:text(c.type?.abbreviation||'Weight class TBA'),rounds:c.format?.regulation?.periods===5?5:3,completed,result:completed?{kind,winnerId:winners.length===1?String(winners[0].athlete?.id||winners[0].id):null,method,round:Number.isInteger(c.status?.period)?c.status.period:null}:null};
 });
 const dates=[e.date,...times].map(Date.parse).filter(Number.isFinite);return {id:String(e.id),name:text(e.name),date:e.date,startTime:dates.length?new Date(Math.min(...dates)).toISOString():null,venue:text(competitions[0]?.venue?.fullName||'Venue TBA'),fights,completed:e.status?.type?.completed===true||(fights.length>0&&fights.every(f=>f.completed))};
}
function quote(data,fight,checkedAt){
 const q=data.items?.find(q=>q.homeAthleteOdds||q.awayAthleteOdds);if(!q)return null;const fighters={};
 for(const s of ['homeAthleteOdds','awayAthleteOdds']){const a=q[s],id=a?.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1];if(!id||!fight.fighters.some(f=>f.id===id))continue;const c=a.current||{};fighters[id]={ml:price(c.moneyLine)??american(a.moneyLine),methods:{'KO / TKO':price(c.victoryMethod?.koTkoDq),Submission:price(c.victoryMethod?.submission),Decision:price(c.victoryMethod?.points)}};}
 return {fighters,total:Number(q.overUnder)>0?Number(q.overUnder):null,over:price(q.current?.over)??american(q.overOdds),under:price(q.current?.under)??american(q.underOdds),source:text(q.provider?.name||'Sportsbook via ESPN'),checkedAt};
}
/** @param {{fetcher?:typeof fetch,clock?:()=>number,odds?:{lines:()=>Promise<{lines:any[],fetchedAt:string}|null>}}} [options] */
export function createEventService({fetcher=fetch,clock=Date.now,odds}={}){
 let cache=null,pending=null;const details=new Map();
 const getJSON=async url=>{let r;try{r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});}catch{throw appError('The fight feed is unavailable. Try again shortly.',503,'feed_unavailable');}if(!r.ok)throw appError('The fight feed is unavailable.',503,'feed_unavailable');return r.json();};
 const list=async()=>{if(cache&&clock()-cache.at<60000)return cache.value;if(pending)return pending;pending=(async()=>{const start=new Date(clock()-21*86400000),end=new Date(clock()+300*86400000),key=d=>d.toISOString().slice(0,10).replaceAll('-','');const d=await getJSON(SCORE+'?dates='+key(start)+'-'+key(end)+'&limit=1000'),checkedAt=new Date(clock()).toISOString(),value=(d.events||[]).filter(e=>/^\d{1,16}$/.test(e.id)).map(e=>({...normalizeEvent(e),checkedAt,source:'ESPN event feed'})).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));cache={at:clock(),value};return value;})();try{return await pending;}finally{pending=null;}};
 return {list,async historical(id,date){if(!/^\d{1,16}$/.test(id)||!Number.isFinite(Date.parse(date)))throw appError('Card not found.',404);const t=Date.parse(date),key=n=>new Date(n).toISOString().slice(0,10).replaceAll('-',''),d=await getJSON(SCORE+'?dates='+key(t-86400000)+'-'+key(t+2*86400000)+'&limit=1000'),e=d.events?.find(e=>String(e.id)===id);if(!e)throw appError('Historical result not available.',404);return {...normalizeEvent(e),checkedAt:new Date(clock()).toISOString(),source:'ESPN historical event feed'};},async get(id){if(!/^\d{1,16}$/.test(id))throw appError('Card not found.',404);const old=details.get(id);if(old&&clock()-old.at<60000)return old.value;const listEvents=await list();let event=listEvents.find(e=>e.id===id);if(!event)throw appError('This card is not in the current feed.',404);event=structuredClone(event);let index=0;await Promise.all(Array.from({length:Math.min(4,event.fights.length)},async()=>{while(index<event.fights.length){const f=event.fights[index++];try{f.quote=quote(await getJSON(CORE+id+'/competitions/'+f.id+'/odds'),f,new Date(clock()).toISOString());}catch{f.quote=null;}}}));if(odds){const market=await odds.lines();if(market)attachMarketOdds(event,market.lines,market.fetchedAt);}if(details.size>30)details.clear();details.set(id,{at:clock(),value:event});return event;}};
}
