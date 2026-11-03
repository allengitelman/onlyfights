/* Prediction record: everything here is derived from GET /api/v1/me/record; the server owns every number. */
const recPct=v=>v==null?'—':Math.round(v*100)+'%',recWL=o=>(o.won||0)+'–'+(o.lost||0),recSigned=(v,d=1)=>v==null?'—':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const recOdds=a=>a==null?'—':a>0?'+'+a:String(a);
const recGrade={won:'WON',lost:'LOST',void:'NO CONTEST',pending:'PENDING'},recVoid={draw:'Draw',no_contest:'No contest',cancelled:'Fight cancelled',card_changed:'Opponent changed'};
function recTile(label,value,note){return '<div class="rec-tile"><span>'+betaHTML(label)+'</span><b>'+betaHTML(value)+'</b>'+(note?'<small>'+betaHTML(note)+'</small>':'')+'</div>'}
function recTable(title,rows){rows=rows.filter(r=>r.won+r.lost>0);if(!rows.length)return '';return '<div class="rec-break"><h4>'+betaHTML(title)+'</h4>'+rows.map(r=>'<div class="rec-row"><span>'+betaHTML(r.eventName||r.key)+'</span><b>'+recWL(r)+'</b><small>'+recPct(r.winRate)+'</small></div>').join('')+'</div>'}
function recPick(r){const p=r.pick,call=(p.method||'To win')+(p.round?' · R'+p.round:''),res=r.result?(r.result.voidReason?recVoid[r.result.voidReason]||'Void':[r.result.method,r.result.round?'R'+r.result.round:null].filter(Boolean).join(' · ')):'';
 const odds=r.odds.pick!=null?recOdds(r.odds.pick)+(r.odds.close!=null?' → closed '+recOdds(r.odds.close):''):'No price captured';
 return '<li class="rec-pick is-'+r.grade.winner+'"><span><b>'+(p.lock?'🔒 ':'')+betaHTML(p.fighter)+'</b> <small>over '+betaHTML(p.opponent)+'</small><small>'+betaHTML(r.eventName)+' · '+betaHTML(call)+(r.published?' · Public':'')+'</small><small>'+betaHTML(odds)+(res?' · Result: '+betaHTML(res):'')+'</small></span><em>'+recGrade[r.grade.winner]+'</em></li>'}
function betaRecordMarkup(r){const s=r.summary,t=s.totals;
 if(!t.picks)return '<div class="rec-empty"><h3>Your record starts with your next pick.</h3><p>Save picks to your account before a fight starts. Each one is locked when that fight begins and graded automatically when the result is confirmed.</p></div>';
 const m=s.market,edge=m.edge==null?'Records are compared with the betting market once picks have prices.':'The odds expected '+m.expectedWins+' wins from your '+m.priced+' priced picks. You got '+m.actualWins+'.';
 const cur=s.streak.current,pub=r.records.filter(x=>x.published&&(x.grade.winner==='won'||x.grade.winner==='lost')),pubW=pub.filter(x=>x.grade.winner==='won').length;
 return '<section class="rec-hero"><div><span class="rec-big">'+recWL(t)+'</span><span class="rec-rate">'+recPct(t.winRate)+' winners</span></div><p>'+betaHTML(edge)+'</p><p class="rec-sub">'+t.pending+' pending · '+t.void+' no contest/void · Public record '+pubW+'–'+(pub.length-pubW)+'</p>'
  +(s.form.length?'<div class="rec-form" aria-label="Last '+s.form.length+' results">'+s.form.map(k=>'<i class="is-'+(k==='W'?'won':'lost')+'">'+k+'</i>').join('')+'</div>':'')+'</section>'
  +'<div class="rec-tiles">'
  +recTile('Vs. the market',recSigned(m.edge)+' wins',m.priced?'Actual wins minus what the odds expected':'Needs priced picks')
  +recTile('Hypothetical units',recSigned(s.units.profit,2)+'u',s.units.bets?recSigned(s.units.roi==null?null:s.units.roi*100)+'% ROI · 1u per pick · not a wager':'Needs priced picks')
  +recTile('Underdogs',recWL(m.underdogs),m.upsets+' upset'+(m.upsets===1?'':'s')+' called')
  +recTile('Favorites',recWL(m.favorites),recPct(m.favorites.winRate))
  +recTile('Method reads',s.method.called?s.method.won+' of '+s.method.called:'—',s.method.winnerRight?'Right finish on '+recPct(s.method.readRate)+' of correct winners':'Pick KO, sub or decision to track')
  +recTile('Round calls',s.round.called?s.round.won+' of '+s.round.called:'—',s.perfect?s.perfect+' perfect (winner, method and round)':'')
  +recTile('Locks',recWL(s.locks),recPct(s.locks.winRate))
  +recTile('Beat the closing line',s.clv.tracked?s.clv.beat+' of '+s.clv.tracked:'—',s.clv.tracked?'Odds moved your way after you picked':'Shows once lines close on your picks')
  +recTile('Streak',cur?cur.length+cur.kind:'—','Best win streak '+s.streak.bestWin)
  +'</div><div class="rec-breaks">'+recTable('By card',s.breakdowns.events.slice(0,8))+recTable('By card section',s.breakdowns.segments)+recTable('Scheduled length',s.breakdowns.formats)+recTable('By weight class',s.breakdowns.weightclasses)+'</div>'
  +'<h3>Every pick</h3><ul class="rec-picks">'+r.records.map(recPick).join('')+'</ul><p class="beta-help">'+betaHTML(r.scope)+'</p>';
}
