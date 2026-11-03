import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {buildRecord} from '../lib/prediction-record.js';import {predictionJSON} from '../lib/predictions.js';import {escapeHTML} from '../lib/social-core.js';
const ctx=vm.createContext({betaHTML:escapeHTML});vm.runInContext(readFileSync(new URL('../public/record.js',import.meta.url),'utf8'),ctx);
const row={user_id:'u',event_id:'1',fight_id:'2',event_name:'UFC <Test>',event_date:'2026-11-08',athlete_id:'3',opponent_id:'4',fighter:'<img src=x onerror=alert(1)>',opponent:'Beta',method:'KO / TKO',round:1,lock:1,segment:'Main Card',weightclass:'LW',rounds:5,pick_odds:150,pick_opp_odds:-170,method_odds:400,odds_source:'The Odds API · 4 books',close_odds:120,close_opp_odds:-140,close_at:'2026-11-08T01:59:00Z',cutoff:'2026-11-08T02:00:00Z',published:1,picked_at:'2026-11-07T00:00:00Z',updated_at:'x',winner_grade:'won',method_grade:'won',round_grade:'won',result_method:'KO / TKO',result_round:1,void_reason:null,graded_at:'2026-11-08T03:00:00Z'};
test('record page renders server numbers and escapes fighter names',()=>{
 const html=ctx.betaRecordMarkup({summary:buildRecord([row]),records:[predictionJSON(row)],scope:'Scope'});
 assert.match(html,/1–0/);assert.match(html,/\+1\.50u/);assert.match(html,/1 of 1/);assert.match(html,/closed \+120/);assert.match(html,/Public record 1–0/);
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
});
test('an empty record explains how to start instead of showing zeros',()=>{const html=ctx.betaRecordMarkup({summary:buildRecord([]),records:[],scope:''});assert.match(html,/starts with your next pick/);assert.doesNotMatch(html,/rec-tile/)});
