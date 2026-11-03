// The Odds API: multi-book MMA fight-winner prices. Results still come from ESPN (The Odds API has no MMA scores).
const URL_BASE='https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds',CACHE_KEY='mma_h2h_us',WINDOW=36*3600000,STALE_LIMIT=24*3600000;
const tokens=v=>String(v||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>t&&!['jr','sr','ii','iii','iv'].includes(t));
export const fullKey=v=>tokens(v).join('');
export const looseKey=v=>{const t=tokens(v);return t.length?t[0][0]+t.at(-1):''};
export const toAmerican=d=>Number.isFinite(d)&&d>1?(d>=2?Math.round((d-1)*100):Math.round(-100/(d-1))):null;
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const near1=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}return edits+(a.length-i)+(b.length-j)<=1};
const exact=(a,b)=>fullKey(a)===fullKey(b)||(looseKey(a)&&looseKey(a)===looseKey(b));
// Spelling and middle-name variants ("Lorenço"/"Lourenco", "José Souza"/"José Henrique") share a name of 4+ letters or differ by one letter.
const similar=(a,b)=>{const x=tokens(a),y=tokens(b);return x.some(t=>t.length>=4&&y.includes(t))||x.some(t=>y.some(u=>t.length>=5&&near1(t,u)))};
// Both fighters and a start-time window must agree, and the match must be unique; ambiguity yields no price.
// Strict passes need both names to match; the last pass allows one name variant when the opponent matches exactly.
export function matchLine(fight,lines,startTime){
 const [a,b]=fight.fighters,t=Date.parse(startTime),near=lines.filter(l=>!Number.isFinite(t)||Math.abs(Date.parse(l.commence)-t)<=WINDOW);
 const orient=(l,test)=>[[l.home,l.away],[l.away,l.home]].find(([x,y])=>test(a.name,x,b.name,y));
 for(const test of [(p,x,q,y)=>fullKey(p)===fullKey(x)&&fullKey(q)===fullKey(y),(p,x,q,y)=>exact(p,x)&&exact(q,y),(p,x,q,y)=>(exact(p,x)&&similar(q,y))||(exact(q,y)&&similar(p,x))]){
  const found=near.flatMap(l=>{const o=orient(l,test);return o?[{line:l,sides:{[a.id]:o[0],[b.id]:o[1]}}]:[]});
  if(found.length===1)return found[0];if(found.length>1)return null;
 }
 return null;
}
export function consensus(line,outcomeName){
 const prices=[];for(const b of line.books){const o=b.outcomes.find(o=>fullKey(o.name)===fullKey(outcomeName));if(o&&Number.isFinite(o.decimal)&&o.decimal>1)prices.push({book:b.title,decimal:o.decimal});}
 if(!prices.length)return null;const best=prices.reduce((a,b)=>b.decimal>a.decimal?b:a);
 return {ml:toAmerican(median(prices.map(p=>p.decimal))),best:{american:toAmerican(best.decimal),book:best.book},books:prices.length};
}
// Replaces ESPN's single-book moneyline with the multi-book consensus; ESPN method and total prices are kept.
export function attachMarketOdds(event,lines,checkedAt){
 for(const f of event.fights){
  if(f.completed)continue;const match=matchLine(f,lines,f.startTime||event.startTime||event.date);if(!match)continue;
  const prices=Object.fromEntries(f.fighters.map(a=>[a.id,consensus(match.line,match.sides[a.id])]));if(f.fighters.some(a=>!prices[a.id]))continue;
  const base=f.quote||{fighters:{},total:null,over:null,under:null};
  f.quote={...base,fighters:Object.fromEntries(f.fighters.map(a=>[a.id,{...(base.fighters?.[a.id]||{methods:{}}),...prices[a.id]}])),source:'The Odds API',books:Math.min(...f.fighters.map(a=>prices[a.id].books)),checkedAt};
 }
 return event;
}
const shape=data=>Array.isArray(data)?data.filter(e=>e&&typeof e.id==='string'&&e.home_team&&e.away_team).map(e=>({id:e.id,commence:e.commence_time,home:e.home_team,away:e.away_team,books:(e.bookmakers||[]).flatMap(b=>{const m=(b.markets||[]).find(m=>m.key==='h2h');return m?[{key:b.key,title:String(b.title||b.key).slice(0,40),outcomes:(m.outcomes||[]).map(o=>({name:o.name,decimal:Number(o.price)}))}]:[]})})):null;
// One credit per refresh (us region, h2h market). The D1 row shares the cache across Worker isolates, and the 2-hour
// default keeps constant traffic near 360 credits/month, inside the 500-credit free plan.
export function createOddsService({getKey,database,fetcher=fetch,clock=Date.now,ttlMs=120*60000}){
 let memory=null,pending=null;
 const readDB=async()=>{const db=database?.();if(!db)return null;try{const r=await db.prepare('SELECT payload,fetched_at,remaining FROM app_odds_cache WHERE cache_key=?').bind(CACHE_KEY).first();return r?{lines:JSON.parse(r.payload),fetchedAt:r.fetched_at,remaining:r.remaining}:null}catch{return null}};
 const fresh=c=>c&&clock()-Date.parse(c.fetchedAt)<ttlMs;
 const load=async()=>{
  const stored=await readDB();if(fresh(stored))return stored;
  const url=new URL(URL_BASE);Object.entries({apiKey:getKey(),regions:'us',markets:'h2h',oddsFormat:'decimal',dateFormat:'iso'}).forEach(([k,v])=>url.searchParams.set(k,v));
  try{
   const r=await fetcher(url.href,{redirect:'manual',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('odds_'+r.status);
   const lines=shape(await r.json());if(!lines)throw Error('odds_shape');
   const remaining=Number(r.headers.get('x-requests-remaining')),value={lines,fetchedAt:new Date(clock()).toISOString(),remaining:Number.isFinite(remaining)?remaining:null};
   const db=database?.();if(db)try{await db.prepare('INSERT INTO app_odds_cache (cache_key,payload,fetched_at,remaining) VALUES (?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at,remaining=excluded.remaining').bind(CACHE_KEY,JSON.stringify(lines),value.fetchedAt,value.remaining).run()}catch{/* cache write is best effort */}
   return value;
  }catch{return stored&&clock()-Date.parse(stored.fetchedAt)<STALE_LIMIT?stored:null}
 };
 return {
  configured:()=>!!getKey(),
  // Never throws: missing key, quota exhaustion or an outage fall back to ESPN prices.
  async lines(){if(!getKey())return null;if(fresh(memory))return memory;if(!pending)pending=load().then(v=>{if(v)memory=v;return v}).finally(()=>{pending=null});return pending},
  status:()=>({configured:!!getKey(),fetchedAt:memory?.fetchedAt||null,remaining:memory?.remaining??null})
 };
}
