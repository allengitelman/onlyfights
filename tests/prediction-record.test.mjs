import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildRecord,fairProbability} from '../lib/prediction-record.js';
const row=(o)=>({event_id:'E1',event_name:'UFC 1',event_date:'2026-10-01',fight_id:o.cutoff,segment:'Main Card',weightclass:'LW',rounds:3,lock:0,method:null,round:null,method_grade:null,round_grade:null,pick_odds:null,pick_opp_odds:null,close_odds:null,close_opp_odds:null,close_at:null,picked_at:'2026-09-01T00:00:00Z',...o});
const rows=[
 row({cutoff:'2026-10-01T01:00:00Z',winner_grade:'won',lock:1,method:'KO / TKO',round:1,method_grade:'won',round_grade:'won',pick_odds:150,pick_opp_odds:-170,close_odds:120,close_opp_odds:-140,close_at:'2026-10-01T00:59:00Z',rounds:5}),
 row({cutoff:'2026-10-01T02:00:00Z',winner_grade:'lost',method:'Decision',method_grade:'lost',pick_odds:-200,pick_opp_odds:170,close_odds:-180,close_opp_odds:155,close_at:'2026-10-01T01:59:00Z',segment:'Prelims'}),
 row({cutoff:'2026-10-08T01:00:00Z',event_id:'E2',event_name:'UFC 2',event_date:'2026-10-08',winner_grade:'won',pick_odds:-120,pick_opp_odds:100}),
 row({cutoff:'2026-10-08T02:00:00Z',event_id:'E2',event_name:'UFC 2',event_date:'2026-10-08',winner_grade:'void'}),
 row({cutoff:'2026-10-08T04:00:00Z',event_id:'E2',event_name:'UFC 2',event_date:'2026-10-08',winner_grade:'pending',pick_odds:-300,pick_opp_odds:250}),
 row({cutoff:'2026-10-08T03:00:00Z',event_id:'E2',event_name:'UFC 2',event_date:'2026-10-08',winner_grade:'won'}),
];
test('win/loss excludes voids and pending; locks and props are tracked separately',()=>{const r=buildRecord(rows);
 assert.deepEqual(r.totals,{picks:6,graded:4,won:3,lost:1,void:1,pending:1,winRate:0.75});
 assert.deepEqual(r.locks,{won:1,lost:0,winRate:1});
 assert.deepEqual(r.method,{called:2,won:1,rate:0.5,winnerRight:1,readRate:1});
 assert.deepEqual(r.round,{called:1,won:1,rate:1});assert.equal(r.perfect,1);
});
test('market view uses no-vig probabilities at pick time',()=>{const {market,units}=buildRecord(rows);
 assert.ok(Math.abs(fairProbability(-110,-110)-0.5)<1e-9);
 assert.deepEqual(market.favorites,{won:1,lost:1,winRate:0.5});assert.deepEqual(market.underdogs,{won:1,lost:0,winRate:1});
 assert.equal(market.priced,3);assert.equal(market.upsets,1);assert.equal(market.expectedWins,1.55);assert.equal(market.actualWins,2);assert.equal(market.edge,0.45);
 assert.equal(units.bets,3);assert.equal(units.profit,1.33);assert.ok(Math.abs(units.roi-0.4444)<0.001);
});
test('closing line value, streaks, form and breakdowns',()=>{const r=buildRecord(rows);
 assert.equal(r.clv.tracked,2);assert.equal(r.clv.beat,1);
 assert.deepEqual(r.streak,{current:{kind:'W',length:2},bestWin:2});assert.deepEqual(r.form,['W','L','W','W']);
 assert.deepEqual(r.breakdowns.events.map(e=>[e.key,e.won,e.lost,e.void,e.pending]),[['E2',2,0,1,1],['E1',1,1,0,0]]);
 assert.deepEqual(r.breakdowns.segments.find(s=>s.key==='Prelims'),{key:'Prelims',won:0,lost:1,void:0,pending:0,units:-1,winRate:0});
 assert.deepEqual(r.breakdowns.formats.map(f=>[f.key,f.won,f.lost]),[['5 rounds',1,0],['3 rounds',2,1]]);
});
test('an empty account has a calm, null-safe record',()=>{const r=buildRecord([]);assert.equal(r.totals.winRate,null);assert.equal(r.units.roi,null);assert.equal(r.market.edge,null);assert.equal(r.streak.current,null);assert.deepEqual(r.form,[])});
