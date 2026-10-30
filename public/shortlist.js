/* Prices define odds-range eligibility and underdog status; fight stats rank tickets. */
let hiddenRecommendations=new Set(),collapsedParlayGroups=new Set();
function toggleParlayGroup(key,button){const collapsed=!collapsedParlayGroups.has(key);if(collapsed)collapsedParlayGroups.add(key);else collapsedParlayGroups.delete(key);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',(collapsed?'Expand ':'Minimize ')+button.dataset.groupTitle);button.closest('section').querySelector('.group-content').hidden=collapsed}
function groupCollapseButton(key,title){return `<button class="group-collapse" data-group-title="${html(title)}" aria-label="${collapsedParlayGroups.has(key)?'Expand':'Minimize'} ${html(title)}" aria-expanded="${!collapsedParlayGroups.has(key)}" onclick="toggleParlayGroup('${key}',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button>`}

function selectRecommendationGroups(ranked,isUnderdog=()=>false){
  const used=new Set(),chosen=[];
  const overlap=(a,b)=>{const ids=new Set(a.legs.map(l=>l.fight));return b.legs.filter(l=>ids.has(l.fight)).length/Math.max(ids.size,b.legs.length)};
  const take=(rows,limit=2)=>{const result=[];while(result.length<limit){const pool=rows.filter(x=>!used.has(x.p.id));if(!pool.length)break;pool.sort((a,b)=>{const score=x=>x.f.p/(1+.45*(chosen.length?Math.max(...chosen.map(p=>overlap(p,x.p))):0));return score(b)-score(a)||b.f.p-a.f.p});const x=pool[0];result.push(x.p);chosen.push(x.p);used.add(x.p.id)}return result};
  const broad=x=>x.p.legs.every(l=>l.market==='Moneyline');
  const definitions=[
    ['range','The +400 to +1200 mix','A handful worth a closer look. Stats-ranked combinations in your target odds range, with different fighters and outcomes where available.',x=>Number.isFinite(x.p.d)&&x.p.d>=5&&x.p.d<=13,5],
    ['likely','Strongest chances','The highest estimated chances among your broad winner picks. Underdogs are welcome here too.',x=>broad(x)&&x.p.legs.length<=3],
    ['underdogs','Underdog angles','Your selected underdogs, paired with other picks. Ranked by fight stats, not the size of the payout.',x=>broad(x)&&x.p.legs.some(isUnderdog)&&x.p.legs.length<=4],
    ['methods','Your method calls','Knockout, submission or decision: a few combinations built around how you see the fights ending.',x=>x.p.legs.some(l=>l.market.startsWith('By '))&&x.p.legs.length<=4],
    ['distance','The distance game','Overs and unders that follow your finish and decision reads.',x=>x.p.legs.some(l=>/^(Over|Under) /.test(l.market))&&x.p.legs.length<=4],
    ['ambitious','Bigger swings','More winners or more precise calls. Interesting routes with more that has to go right.',x=>x.p.legs.length>=4||x.p.legs.some(l=>l.market.includes('Round '))]
  ];
  return definitions.map(([id,title,description,test,limit=2])=>{let pool=ranked.filter(test);if(id==='ambitious'){const manageable=pool.filter(x=>x.p.legs.length<=5);if(manageable.some(x=>!used.has(x.p.id)))pool=manageable}return {id,title,description,tickets:take(pool,limit)}}).filter(g=>g.tickets.length);
}
function skipRecommendationGroup(id){hiddenRecommendations.add(id);renderResults()}
function restoreRecommendationGroups(){hiddenRecommendations.clear();renderResults()}
function recommendationSections(groups){const shown=groups.filter(g=>!hiddenRecommendations.has(g.id)&&(labMood==='all'||g.id===labMood));return `<div class="recommendation-groups">${shown.map(g=>`<section class="recommendation-group"><div class="recommendation-heading"><div><span class="lab-eyebrow">PICKED FOR YOUR CARD · ${g.tickets.length} TO CONSIDER</span><h3>${g.title}</h3><p>${g.description}</p></div><div class="group-actions">${groupCollapseButton('recommended-'+g.id,g.title)}<button class="quiet" onclick="skipRecommendationGroup('${g.id}')">Skip group ×</button></div></div><div class="group-content" ${collapsedParlayGroups.has('recommended-'+g.id)?'hidden':''}><div class="lab-ticket-grid">${g.tickets.map((p,i)=>ticketCard(p,i,g.id==='outside'?'A different read.':g.id==='range'?rangeTicketTitle(p,i):i===0?'First look.':'Another angle.',g.title.toUpperCase(),g.id==='outside'?'Adds '+p.legs.filter(isOutsideLeg).map(l=>l.label).join(' + ')+'. Highlighted legs were not selected by you.':g.id==='underdogs'?'Includes '+p.legs.filter(selectedUnderdog).map(l=>l.label).join(' + ')+'. Underdog status comes from the fighter moneyline.':p.legs.length+' legs built from your picks.')).join('')}</div></div></section>`).join('')}${hiddenRecommendations.size?'<button class="secondary" onclick="restoreRecommendationGroups()">Restore skipped recommendation groups</button>':''}</div>`}
function selectedUnderdog(leg){const side=legSide(leg);return side!=null&&Number(roster[leg.fight]?.[side]?.[2])>100}

function rangeTicketTitle(p,index){if(index===0)return 'The first look.';if(p.legs.some(l=>l.market.includes('Round ')))return 'Round hunter.';if(p.legs.some(l=>/^(Over|Under) /.test(l.market)))return 'Play the clock.';if(p.legs.some(l=>l.market.startsWith('By ')))return 'Call the finish.';if(p.legs.some(selectedUnderdog))return 'Back the underdog.';return 'Winners only.'}

let outsideParlays=[];
function legSide(leg){return leg.side??picks[leg.fight]?.side}
function isOutsideLeg(leg){return picks[leg.fight]?.side!==legSide(leg)}
function buildOutsideParlays(){
  outsideParlays=[];
  if(!fighterAI||!labModel)return outsideParlays;
  const base=Object.entries(picks).map(([i,p])=>markets(Number(i),p,'ml')).filter(l=>l.d!=null&&modelLeg(l).p!=null),candidates=[];let id=-1;
  for(let fight=0;fight<roster.length;fight++)for(let side=0;side<2;side++){
    if(picks[fight]?.side===side)continue;
    const extra=markets(fight,{side},'ml');if(extra.d==null||modelLeg(extra).p==null)continue;
    const partners=base.filter(l=>l.fight!==fight);
    for(let n=1;n<=Math.min(3,partners.length);n++)for(const combo of combinations(partners,n)){
      const legs=[...combo,extra],p={id:id--,category:'Outside your picks',outside:true,legs,d:legs.reduce((v,l)=>v*l.d,1)};
      if(p.d<5||p.d>13)continue;
      outsideParlays.push(p);
      if(legs.some(l=>!isOutsideLeg(l)&&!allowedFights.has(l.fight))||legCounts.size&&!legCounts.has(legs.length)||onlySaved&&!saved.has(p.id)||oddsLow>0&&p.d<oddsAt(oddsLow)||oddsHigh<100&&p.d>oddsAt(oddsHigh))continue;
      candidates.push({p,f:modelParlay(p)});
    }
  }
  candidates.sort((a,b)=>b.f.p-a.f.p);const chosen=[];
  while(chosen.length<3&&candidates.length){candidates.sort((a,b)=>{const score=x=>x.f.p/(1+.7*chosen.filter(p=>p.legs.some(l=>isOutsideLeg(l)&&l.fight===x.p.legs.at(-1).fight&&l.side===x.p.legs.at(-1).side)).length);return score(b)-score(a)});chosen.push(candidates.shift().p)}
  return chosen;
}
