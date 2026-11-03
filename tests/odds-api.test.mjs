import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {sqliteD1} from './sqlite-d1.mjs';
import {matchLine,consensus,attachMarketOdds,createOddsService,toAmerican} from '../lib/odds-api.js';
import {createEventService} from '../lib/events.js';
const book=(title,home,away)=>({key:title.toLowerCase(),title,outcomes:[{name:'José Aldo Jr.',decimal:home},{name:'Merab Dvalishvili',decimal:away}]});
const line={id:'x1',commence:'2026-11-08T03:00:00Z',home:'José Aldo Jr.',away:'Merab Dvalishvili',books:[book('DraftKings',3.1,1.4),book('FanDuel',3.4,1.35),book('BetMGM',3.0,1.42)]};
const fight={id:'200',startTime:'2026-11-08T02:00:00Z',fighters:[{id:'1',name:'Jose Aldo'},{id:'2',name:'Merab Dvalishvili'}],quote:{source:'ESPN BET',checkedAt:'t',fighters:{'1':{ml:200,methods:{'KO / TKO':450}},'2':{ml:-250,methods:{}}},total:2.5,over:-120,under:100}};
test('fight matching needs both names, a nearby start and a unique candidate',()=>{
 assert.equal(matchLine(fight,[line],fight.startTime).line,line);assert.deepEqual(matchLine(fight,[line],fight.startTime).sides,{'1':'José Aldo Jr.','2':'Merab Dvalishvili'});
 assert.equal(matchLine(fight,[{...line,commence:'2026-11-12T03:00:00Z'}],fight.startTime),null);
 assert.equal(matchLine(fight,[{...line,away:'Someone Else'}],fight.startTime),null);
 assert.equal(matchLine(fight,[line,{...line,id:'x2'}],fight.startTime),null);
 const variant=f=>({...fight,fighters:[{id:'1',name:f},{id:'2',name:'Merab Dvalishvili'}]});
 for(const n of ['Jose Aldo Junior','Josee Aldo'])assert.equal(matchLine(variant(n),[line],fight.startTime)?.sides['1'],'José Aldo Jr.',n);
 assert.equal(matchLine(variant('Mike Tyson'),[line],fight.startTime),null,'one exact name is not enough without a shared name');
 assert.equal(matchLine({...fight,fighters:[{id:'1',name:'Jose Silva'},{id:'2',name:'Mark Dvalis'}]},[line],fight.startTime),null,'both names loose is not enough');
});
test('consensus is the median book price and best price names its book',()=>{
 const c=consensus(line,'José Aldo Jr.');assert.equal(c.ml,210);assert.deepEqual(c.best,{american:240,book:'FanDuel'});assert.equal(c.books,3);
 assert.equal(toAmerican(1.5),-200);assert.equal(toAmerican(2),100);
});
test('market odds replace the moneyline but keep ESPN method and total prices',()=>{
 const event=attachMarketOdds({id:'9',fights:[structuredClone(fight)]},[line],'2026-11-07T00:00:00Z'),q=event.fights[0].quote;
 assert.equal(q.fighters['1'].ml,210);assert.equal(q.fighters['1'].methods['KO / TKO'],450);assert.equal(q.total,2.5);assert.equal(q.source,'The Odds API');assert.equal(q.books,3);
 const done=attachMarketOdds({id:'9',fights:[{...structuredClone(fight),completed:true}]},[line],'t');assert.equal(done.fights[0].quote.fighters['1'].ml,200);
});
const api=[{id:'x1',commence_time:line.commence,home_team:line.home,away_team:line.away,bookmakers:[{key:'dk',title:'DraftKings',markets:[{key:'h2h',outcomes:[{name:'José Aldo Jr.',price:3.1},{name:'Merab Dvalishvili',price:1.4}]}]}]}];
test('odds refreshes are shared across instances through the database and survive outages',async()=>{
 const db=sqliteD1();for(const p of ['0000_clammy_mandrill.sql','0001_onlyfights_beta.sql','0002_prediction_record.sql'])for(const q of readFileSync(new URL('../drizzle/'+p,import.meta.url),'utf8').split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(q).run();
 let calls=0,now=Date.parse('2026-11-07T00:00:00Z'),down=false,url='';const fetcher=async u=>{calls++;url=u;if(down)return new Response('',{status:429});return Response.json(api,{headers:{'x-requests-remaining':'480'}})};
 const make=()=>createOddsService({getKey:()=>'test-key',database:()=>db,fetcher,clock:()=>now});
 const a=make();await Promise.all([a.lines(),a.lines()]);assert.equal(calls,1);assert.match(url,/markets=h2h/);assert.match(url,/regions=us/);
 assert.equal((await make().lines()).lines[0].books[0].title,'DraftKings');assert.equal(calls,1);assert.equal(a.status().remaining,480);
 now+=130*60000;down=true;const stale=await make().lines();assert.equal(calls,2);assert.equal(stale.lines.length,1);
 now+=25*3600000;assert.equal(await make().lines(),null);
 assert.equal(await createOddsService({getKey:()=>undefined,fetcher}).lines(),null);assert.equal(calls,3);db.close();
});
test('event detail uses market consensus when configured and ESPN otherwise',async()=>{
 const clock=()=>Date.parse('2026-11-07T00:00:00Z');
 const espn=async u=>u.includes('/odds')?Response.json({items:[{provider:{name:'ESPN BET'},homeAthleteOdds:{athlete:{$ref:'athletes/1'},moneyLine:200},awayAthleteOdds:{athlete:{$ref:'athletes/2'},moneyLine:-250}}]}):Response.json({events:[{id:'9',name:'UFC Test',date:'2026-11-08T00:00:00Z',competitions:[{id:'200',date:'2026-11-08T02:00:00Z',competitors:[{order:1,athlete:{id:'1',fullName:'Jose Aldo'}},{order:2,athlete:{id:'2',fullName:'Merab Dvalishvili'}}]}]}]});
 const plain=await createEventService({fetcher:espn,clock}).get('9');assert.equal(plain.fights[0].quote.fighters['1'].ml,200);assert.equal(plain.fights[0].startTime,'2026-11-08T02:00:00Z');
 const odds={lines:async()=>({lines:[line],fetchedAt:'2026-11-07T00:00:00Z'})};
 const market=await createEventService({fetcher:espn,clock,odds}).get('9');assert.equal(market.fights[0].quote.fighters['1'].ml,210);assert.equal(market.fights[0].quote.fighters['2'].best.book,'BetMGM');
});
