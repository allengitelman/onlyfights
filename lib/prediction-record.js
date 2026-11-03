// Pure record math over graded prediction rows. Prices are the moneyline captured when the pick was made.
const implied=a=>Number.isFinite(a)&&Math.abs(a)>=100?(a>0?100/(a+100):-a/(-a+100)):null;
const decimal=a=>Number.isFinite(a)&&Math.abs(a)>=100?(a>0?1+a/100:1+100/-a):null;
// Removes the bookmaker margin when both sides are known, so 50 favorites at -110/-110 count as 0.5 expected wins each.
export function fairProbability(odds,oppOdds){const p=implied(odds),q=implied(oppOdds);return p==null?null:q==null?p:p/(p+q)}
const rate=(won,lost)=>won+lost?won/(won+lost):null;
const tally=()=>({won:0,lost:0,void:0,pending:0});
const round2=n=>n==null?null:Math.round(n*100)/100;
function group(rows,key){const m=new Map();for(const r of rows){const k=key(r);if(k==null)continue;if(!m.has(k))m.set(k,{key:k,...tally(),units:0});const g=m.get(k);g[r.winner_grade]++;const d=decimal(r.pick_odds);if(d&&(r.winner_grade==='won'||r.winner_grade==='lost'))g.units+=r.winner_grade==='won'?d-1:-1;}return [...m.values()].map(g=>({...g,units:round2(g.units),winRate:rate(g.won,g.lost)}))}
export function buildRecord(rows){
 const sorted=[...rows].sort((a,b)=>Date.parse(a.cutoff)-Date.parse(b.cutoff)||String(a.event_id).localeCompare(b.event_id)||String(a.fight_id).localeCompare(b.fight_id));
 const decided=sorted.filter(r=>r.winner_grade==='won'||r.winner_grade==='lost'),totals={picks:sorted.length,graded:decided.length,...tally()};
 for(const r of sorted)totals[r.winner_grade]++;totals.winRate=rate(totals.won,totals.lost);
 const locks=tally();for(const r of decided.filter(r=>r.lock))locks[r.winner_grade]++;
 // Method/round props only resolve once the winner is known; a lost winner pick sinks every prop on it.
 const methodCalls=decided.filter(r=>r.method&&(r.method_grade==='won'||r.method_grade==='lost')),roundCalls=decided.filter(r=>r.round&&(r.round_grade==='won'||r.round_grade==='lost'));
 const methodWon=methodCalls.filter(r=>r.method_grade==='won').length,methodWinnerRight=methodCalls.filter(r=>r.winner_grade==='won').length;
 const method={called:methodCalls.length,won:methodWon,rate:methodCalls.length?methodWon/methodCalls.length:null,winnerRight:methodWinnerRight,readRate:methodWinnerRight?methodWon/methodWinnerRight:null};
 const roundWon=roundCalls.filter(r=>r.round_grade==='won').length,round={called:roundCalls.length,won:roundWon,rate:roundCalls.length?roundWon/roundCalls.length:null};
 const priced=decided.map(r=>({r,p:fairProbability(r.pick_odds,r.pick_opp_odds),d:decimal(r.pick_odds)})).filter(x=>x.p!=null&&x.d!=null);
 const favorites=tally(),underdogs=tally();let expected=0,profit=0;
 for(const {r,p,d} of priced){(p>=0.5?favorites:underdogs)[r.winner_grade]++;expected+=p;profit+=r.winner_grade==='won'?d-1:-1;}
 const actual=priced.filter(x=>x.r.winner_grade==='won').length;
 const market={priced:priced.length,favorites:{won:favorites.won,lost:favorites.lost,winRate:rate(favorites.won,favorites.lost)},underdogs:{won:underdogs.won,lost:underdogs.lost,winRate:rate(underdogs.won,underdogs.lost)},upsets:underdogs.won,expectedWins:round2(expected),actualWins:actual,edge:priced.length?round2(actual-expected):null};
 const units={bets:priced.length,profit:round2(profit),roi:priced.length?profit/priced.length:null};
 // Closing line value: did the market move toward your fighter after you picked? Beating the close is the strongest skill signal.
 const clvRows=sorted.filter(r=>r.close_odds!=null&&r.pick_odds!=null&&r.close_at&&r.close_at>=r.picked_at).map(r=>fairProbability(r.close_odds,r.close_opp_odds)-fairProbability(r.pick_odds,r.pick_opp_odds));
 const clv={tracked:clvRows.length,beat:clvRows.filter(e=>e>0.0001).length,avgEdge:clvRows.length?clvRows.reduce((a,b)=>a+b,0)/clvRows.length:null};
 let current=null,bestWin=0,run=0;for(const r of decided){const k=r.winner_grade==='won'?'W':'L';current=current?.kind===k?{kind:k,length:current.length+1}:{kind:k,length:1};run=k==='W'?run+1:0;bestWin=Math.max(bestWin,run);}
 const perfect=decided.filter(r=>r.method&&r.round&&r.winner_grade==='won'&&r.method_grade==='won'&&r.round_grade==='won').length;
 const events=group(sorted,r=>r.event_id).map(g=>{const r=sorted.find(r=>r.event_id===g.key);return {...g,eventName:r.event_name,date:r.event_date}}).reverse();
 return {totals,locks:{won:locks.won,lost:locks.lost,winRate:rate(locks.won,locks.lost)},method,round,perfect,market,units,clv,
  streak:{current,bestWin},form:decided.slice(-10).map(r=>r.winner_grade==='won'?'W':'L'),
  breakdowns:{events,segments:group(sorted,r=>r.segment||'Fight card'),weightclasses:group(sorted,r=>r.weightclass||null),formats:group(sorted,r=>r.rounds===5?'5 rounds':r.rounds===3?'3 rounds':null)}};
}
