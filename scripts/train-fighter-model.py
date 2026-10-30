"""Train pre-fight, odds-free models using chronological UFC performance histories.
Run from any directory: PYTHONPATH=... python3 scripts/train-fighter-model.py
All performance features are constructed before a date's bouts update fighter state.
"""
import os
os.environ.setdefault('OMP_NUM_THREADS','2');os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
import csv,json,math,re,unicodedata,collections,datetime,hashlib,itertools,sys,concurrent.futures
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score,brier_score_loss,log_loss
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'research-input';OUT=ROOT/'public';ART=ROOT/'research-artifacts';ART.mkdir(exist_ok=True)
def norm(s):
 s=re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
 for a,b in [('josephkropschot','joekropschot'),('zacharyreese','zachreese'),('renatocarneiro','renatomoicano'),('yanakunitskaya','yanasantos'),('kimjiyeon','jiyeonkim')]:s=s.replace(a,b)
 return s
def pair(s):
 m=re.match(r'(\d+)\s+of\s+(\d+)',s or '');return [int(m[1]),int(m[2])] if m else None
def seconds(s):
 try:
  a,b=s.strip().split(':');return int(a)*60+float(b)
 except:return None
# Own-bout counters; opponent counterparts are stored alongside each observed bout.
KEYS=['sigL','sigAtt','tdL','tdAtt','sub','kd','control','totalL','totalAtt','headL','bodyL','legL','distanceL','groundL','reversals','ctrlKnown']
def raw_stat(r):
 sig=pair(r['SIG.STR.']);td=pair(r['TD']);total=pair(r['TOTAL STR.'])
 if not sig or not td or not total:return None
 ctrl=seconds(r['CTRL']);return [*sig,*td,float(r['SUB.ATT'] or 0),float(r['KD'] or 0),ctrl or 0,*total,*(float((pair(r[k])or[0,0])[0]) for k in ['HEAD','BODY','LEG','DISTANCE','GROUND']),float(r['REV.']or 0),float(ctrl is not None)]
agg={}
for r in csv.DictReader(open(DATA/'ufc_fight_stats.csv')):
 if not r['ROUND'].startswith('Round'):continue
 names=re.split(r'\s+vs\.\s+',r['BOUT'].strip());stat=raw_stat(r)
 if len(names)!=2 or stat is None:continue
 key=(r['EVENT'].strip(),tuple(sorted(map(norm,names))),norm(r['FIGHTER']))
 if key not in agg:agg[key]=np.zeros(len(KEYS))
 agg[key]+=stat
physical={}
for r in csv.DictReader(open(DATA/'ufc_fighter_tott.csv')):
 def number(s):
  m=re.search(r'[\d.]+',s or '');return float(m[0]) if m else None
 h=re.match(r'(\d+)\D+(\d+)',r['HEIGHT']);height=int(h[1])*12+int(h[2]) if h else None
 try:dob=datetime.datetime.strptime(r['DOB'],'%b %d, %Y').date().isoformat()
 except:dob=None
 physical[norm(r['FIGHTER'])]={'height':height,'reach':number(r['REACH']),'dob':dob,'stance':r['STANCE'],'url':r['URL'].replace('http:','https:')}
events={r['EVENT'].strip():datetime.datetime.strptime(r['DATE'].strip(),'%B %d, %Y').date().isoformat() for r in csv.DictReader(open(DATA/'ufc_event_details.csv'))}
bouts=[];seen=set()
for r in csv.DictReader(open(DATA/'ufc_fight_results.csv')):
 date=events.get(r['EVENT'].strip());names=re.split(r'\s+vs\.\s+',r['BOUT'].strip());out=r['OUTCOME'].strip();url=r['URL'].strip()
 if not date or len(names)!=2 or out not in ['W/L','L/W'] or url in seen:continue
 seen.add(url);names=[n.strip() for n in names];keys=list(map(norm,names));method=r['METHOD'];method='Submission' if 'Submission' in method else 'KO / TKO' if 'KO' in method else 'Decision' if 'Decision' in method else 'Other';end=seconds(r['TIME']);rnd=int(r['ROUND']);scheduled=5 if r['TIME FORMAT'].startswith('5 Rnd') else 3
 stats=[agg.get((r['EVENT'].strip(),tuple(sorted(keys)),key)) for key in keys]
 for q in stats:
  if q is not None:
   q[15]=float(q[15]==rnd)
   if not q[15]:q[6]=0
 bouts.append({'date':date,'keys':keys,'names':names,'y':int(out=='W/L'),'method':method,'round':rnd,'scheduled':scheduled,'minutes':((rnd-1)*300+(end or 0))/60,'division':r['WEIGHTCLASS'].strip().replace(' Bout',''),'stats':stats,'url':url.replace('http:','https:')})
def espnstat(j):
 vals={s['name']:s['value'] for cat in j.get('splits',{}).get('categories',[]) for s in cat.get('stats',[])}
 required=['sigStrikesLanded','sigStrikesAttempted','takedownsLanded','takedownsAttempted']
 if not all(k in vals for k in required):return None
 v=lambda k:float(vals.get(k,0))
 return np.array([v('sigStrikesLanded'),v('sigStrikesAttempted'),v('takedownsLanded'),v('takedownsAttempted'),v('submissions'),v('knockDowns'),v('timeInControl'),v('totalStrikesLanded'),v('totalStrikesAttempted'),sum(v('sig'+p+'HeadStrikesLanded') for p in ['Distance','Clinch','Ground']),sum(v('sig'+p+'BodyStrikesLanded') for p in ['Distance','Clinch','Ground']),sum(v('sig'+p+'LegStrikesLanded') for p in ['Distance','Clinch','Ground']),sum(v('sigDistance'+p+'StrikesLanded') for p in ['Head','Body','Leg']),sum(v('sigGround'+p+'StrikesLanded') for p in ['Head','Body','Leg']),v('reversals'),float('timeInControl'in vals)])
def cached_stat(path):
 try:return (path.name,espnstat(json.loads(path.read_text())))
 except:return (path.name,None)
print('Loading completed-bout performance cache with 16 readers',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
 performance_cache=dict(pool.map(cached_stat,(DATA/'espn-bout-stats').glob('*.json')))
print('Read',len(performance_cache),'fighter-bout records',flush=True)
for suffix in ['2026','latest']:
 for e in json.loads((DATA/('espn-history-'+suffix+'.json')).read_text()).get('events',[]):
  if 'Contender' in e['name'] or 'Road to' in e['name']:continue
  for c in e.get('competitions',[]):
   if not c.get('status',{}).get('type',{}).get('completed') or len(c.get('competitors',[]))!=2:continue
   fs=sorted(c['competitors'],key=lambda f:f.get('order',0));wins=[f.get('winner',False) for f in fs]
   if sum(wins)!=1:continue
   names=[f['athlete']['fullName'] for f in fs];details=' '.join(d.get('type',{}).get('text','') for d in c.get('details',[])).lower();method='Submission' if 'submission' in details else 'KO / TKO' if 'kotko' in details or 'knockout' in details else 'Decision' if 'decision' in details else 'Other';stats=[]
   for f in fs:
    path=DATA/'espn-bout-stats'/f"{e['id']}_{c['id']}_{f['id']}.json"
    try:stats.append(performance_cache.get(path.name))
    except:stats.append(None)
   bouts.append({'date':e['date'][:10],'keys':list(map(norm,names)),'names':names,'y':int(wins[0]),'method':method,'round':c['status'].get('period',3),'scheduled':c.get('format',{}).get('regulation',{}).get('periods',3),'minutes':((c['status'].get('period',1)-1)*300+(c['status'].get('clock')or 0))/60,'division':c.get('type',{}).get('abbreviation','').replace('W ',"Women's "),'stats':stats,'url':'https://www.espn.com/mma/fightcenter/_/id/'+e['id']})
bouts.sort(key=lambda b:(b['date'],b['url']))
F=[('striking_output','Strikes landed per minute','striking'),('strikes_absorbed','Strikes absorbed per minute','defense'),('striking_accuracy','Striking accuracy','striking'),('striking_defense','Strikes avoided','defense'),('takedown_rate','Takedowns per 15 minutes','grappling'),('takedown_accuracy','Takedown accuracy','grappling'),('takedown_defense','Takedowns defended','defense'),('submission_attempts','Submission attempts per 15 minutes','grappling'),('knockdown_rate','Knockdowns per 15 minutes','power'),('knockdowns_absorbed','Knockdowns absorbed per 15 minutes','durability'),('control_share','Time controlling the fight','grappling'),('opponent_control','Time controlled by the opponent','defense'),('total_output','Total strikes landed per minute','striking'),('total_absorbed','Total strikes absorbed per minute','defense'),('distance_share','Striking at distance','style'),('ground_share','Striking on the ground','style'),('head_share','Strikes aimed at the head','style'),('body_share','Strikes aimed at the body','style'),('leg_share','Strikes aimed at the legs','style'),('recent_strike_margin','Recent striking advantage','form'),('recent_takedown_rate','Recent takedown pace','form'),('recent_control','Recent time controlling the fight','form'),('win_rate','UFC win rate','record'),('recent_win_rate','Recent winning form','form'),('ko_wins','Knockout win history','power'),('sub_wins','Submission win history','grappling'),('decision_wins','Decision win history','record'),('ko_losses','Knockout loss history','durability'),('sub_losses','Submission loss history','durability'),('experience','UFC experience','experience'),('age','Age on fight day','physical'),('reach','Reach','physical'),('height','Height','physical'),('inactivity','Time since last fight','activity'),('opponent_strength','Past results adjusted for opponent quality','opposition'),('observed_minutes','Minutes with performance data','experience'),('stats_coverage','Share of bouts with detailed stats','evidence'),('control_coverage','Control-time data coverage','evidence'),('physical_coverage','Fighter measurements available','evidence')]
F=[f for f in F if f[0]!='physical_coverage']
D=len(F);states={};X=[];Y=[];META=[];methodX=[];methodY=[];methodDates=[];methodEligible=[];roundX=[];roundY=[];roundDates=[];roundEligible=[];totalX=[];totalY=[];totalDates=[];totalWeights=[];totalEligible=[];audits=[]
def state(key,name=None):
 return states.setdefault(key,{'name':name or key,'totals':[0.]*len(KEYS),'opponentTotals':[0.]*len(KEYS),'statsMinutes':0.,'controlMinutes':0.,'statBouts':0,'recentStats':[],'resultCount':0,'wins':0,'losses':0,'methodWins':{},'methodLosses':{},'recentResults':[],'rating':1500.,'lastResult':None,'lastStats':None,'physical':physical.get(key,{})})
def features(s,date):
 t=s['totals'];o=s['opponentTotals'];m=s['statsMinutes'];n=s['resultCount'];p=s['physical'];a=30
 if p.get('dob'):a=(datetime.date.fromisoformat(date)-datetime.date.fromisoformat(p['dob'])).days/365.2425
 rt=np.sum([r[1] for r in s['recentStats']],axis=0) if s['recentStats'] else np.zeros(len(KEYS));ro=np.sum([r[2] for r in s['recentStats']],axis=0) if s['recentStats'] else np.zeros(len(KEYS));rm=sum(r[0] for r in s['recentStats']);rcm=sum(r[0] for r in s['recentStats'] if r[1][15] and r[2][15]);days=(datetime.date.fromisoformat(date)-datetime.date.fromisoformat(s['lastResult'])).days if s['lastResult'] else 365
 return np.array([(t[0]+30*3.5)/(m+30),(o[0]+30*3.5)/(m+30),(t[0]+25)/(t[1]+50),1-(o[0]+25)/(o[1]+50),(t[2]+3)/(m+30)*15,(t[2]+2)/(t[3]+5),1-(o[2]+2)/(o[3]+5),(t[4]+1)/(m+30)*15,(t[5]+1)/(m+30)*15,(o[5]+1)/(m+30)*15,(t[6]+270)/(s['controlMinutes']*60+1800),(o[6]+270)/(s['controlMinutes']*60+1800),(t[7]+30*6)/(m+30),(o[7]+30*6)/(m+30),(t[12]+35)/(t[0]+50),(t[13]+10)/(t[0]+50),(t[9]+35)/(t[0]+50),(t[10]+8)/(t[0]+50),(t[11]+7)/(t[0]+50),(rt[0]-ro[0])/(rm+15),(rt[2]+1.5)/(rm+15)*15,(rt[6]+135)/(rcm*60+900),(s['wins']+2.5)/(n+5),(sum(s['recentResults'])+1)/(len(s['recentResults'])+2),(s['methodWins'].get('KO / TKO',0)+1)/(n+5),(s['methodWins'].get('Submission',0)+1)/(n+5),(s['methodWins'].get('Decision',0)+1)/(n+5),(s['methodLosses'].get('KO / TKO',0)+1)/(n+5),(s['methodLosses'].get('Submission',0)+1)/(n+5),math.log1p(n),max(18,min(55,a)),p.get('reach') or 72,p.get('height') or 70,min(2000,max(0,days))/365.2425,(s['rating']-1500)/400,math.log1p(m),s['statBouts']/max(1,n),t[15]/max(1,s['statBouts'])],dtype=float)
def context(b):
 name=b['division'].lower();weights={'strawweight':115,'flyweight':125,'bantamweight':135,'featherweight':145,'lightweight':155,'welterweight':170,'middleweight':185,'light heavyweight':205,'heavyweight':265};weight=next((v for k,v in sorted(weights.items(),key=lambda t:-len(t[0])) if k in name),170)
 return np.array([b['scheduled'],weight,int('women' in name)])
def vector(a,b,c):return np.concatenate([a-b,(a+b)/2,c])
def flip(x):
 out=np.array(x,copy=True);out[...,:D]*=-1;return out
def update(s,opp,b,i):
 result=b['y'] if i==0 else 1-b['y'];s['resultCount']+=1;s['wins' if result else 'losses']+=1;s['recentResults'].append(result);s['recentResults']=s['recentResults'][-5:];s['lastResult']=b['date'];bucket=s['methodWins' if result else 'methodLosses'];bucket[b['method']]=bucket.get(b['method'],0)+1
 a,o=b['stats'][i],b['stats'][1-i]
 if a is not None and o is not None and b['minutes']>0 and np.isfinite(a).all() and np.isfinite(o).all() and a[0]<=a[1] and o[0]<=o[1]:
  if a[15] and o[15]:s['controlMinutes']+=b['minutes']
  else:a=a.copy();o=o.copy();a[6]=o[6]=0
  s['totals']=(np.array(s['totals'])+a).tolist();s['opponentTotals']=(np.array(s['opponentTotals'])+o).tolist();s['statsMinutes']+=b['minutes'];s['statBouts']+=1;s['lastStats']=b['date'];s['recentStats'].append([round(b['minutes'],5),a.tolist(),o.tolist()]);s['recentStats']=s['recentStats'][-5:]
for date,group in itertools.groupby(bouts,key=lambda b:b['date']):
 group=list(group)
 for b in group:
  a,bb=[state(k,n) for k,n in zip(b['keys'],b['names'])];fa,fb=features(a,date),features(bb,date);x=vector(fa,fb,context(b));eligible=min(a['statBouts'],bb['statBouts'])>=2;baseline=1/(1+10**((bb['rating']-a['rating'])/480))
  if date>='2008-01-01' and b['scheduled'] in [3,5]:
   X.append(x);Y.append(b['y']);META.append({'date':date,'eligible':eligible,'baseline':baseline,'url':b['url'],'keys':b['keys'],'aStats':a['statBouts'],'bStats':bb['statBouts']})
   mi={'KO / TKO':0,'Submission':1,'Decision':2}.get(b['method'])
   if mi is not None:
    wx=x if b['y'] else flip(x);methodX.append(wx);methodY.append(mi);methodDates.append(date);methodEligible.append(eligible)
    if mi in [0,1] and 1<=b['round']<=b['scheduled']:
     roundX.append(np.concatenate([wx,[mi]]));roundY.append(b['round']-1);roundDates.append(date);roundEligible.append(eligible)
   for line in [1.5,2.5,3.5,4.5]:
    if line>=b['scheduled']:continue
    # Duration is orientation invariant, with identical predictions when fighters swap.
    tx=np.concatenate([np.abs(x[:D]),x[D:],[line]]);totalX.append(tx);totalY.append(int(b['minutes']>line*5));totalDates.append(date);totalEligible.append(eligible);totalWeights.append(1/(2 if b['scheduled']==3 else 4))
  if eligible and max(a['lastStats'] or '',bb['lastStats'] or '')>=date:raise AssertionError('Future performance leaked into features')
 for b in group:
  a,bb=[state(k) for k in b['keys']];p=1/(1+10**((bb['rating']-a['rating'])/400));change=64*(b['y']-p);a['rating']+=change;bb['rating']-=change;update(a,bb,b,0);update(bb,a,b,1)
X=np.array(X);Y=np.array(Y);dates=np.array([m['date'] for m in META]);eligible=np.array([m['eligible'] for m in META]);baseline=np.array([m['baseline'] for m in META]);train=dates<'2021-01-01';val=(dates>='2021-01-01')&(dates<'2023-01-01');cal=(dates>='2023-01-01')&(dates<'2024-01-01');test=dates>='2024-01-01'
def metrics(y,p):
 p=np.clip(p,1e-7,1-1e-7);pred=p>.5;acc=float(np.mean(np.where(np.isclose(p,.5),.5,pred==y)));return {'n':len(y),'accuracy':round(acc,4),'brier':round(float(brier_score_loss(y,p)),4),'logLoss':round(float(log_loss(y,p,labels=[0,1])),4)}
def sympred(model,scaler,x):
 x2=flip(x);p=model.predict_proba(scaler.transform(x) if scaler else x)[:,1];q=model.predict_proba(scaler.transform(x2) if scaler else x2)[:,1];return (p+1-q)/2
print('Prepared',len(X),'chronological examples; selecting on 2021–2022',flush=True)
candidates=[];xa=np.concatenate([X[train],flip(X[train])]);ya=np.concatenate([Y[train],1-Y[train]])
for c in [.05,.2,1,5]:
 scaler=StandardScaler().fit(xa);est=LogisticRegression(C=c,max_iter=1500,random_state=17).fit(scaler.transform(xa),ya);p=sympred(est,scaler,X[val&eligible]);score=log_loss(Y[val&eligible],p);candidates.append((score,'logistic',{'C':c},est,scaler));print('winner candidate logistic',c,round(score,4),flush=True)
for trees,depth in [(80,2),(140,2),(100,3)]:
 est=GradientBoostingClassifier(n_estimators=trees,max_depth=depth,learning_rate=.04,min_samples_leaf=45,subsample=.85,random_state=17).fit(xa,ya);p=sympred(est,None,X[val&eligible]);score=log_loss(Y[val&eligible],p);candidates.append((score,'boosted_trees',{'trees':trees,'depth':depth},est,None));print('winner candidate boosted',trees,depth,round(score,4),flush=True)
_,kind,params,_,_=min(candidates,key=lambda q:q[0]);fit=train|val;xa=np.concatenate([X[fit],flip(X[fit])]);ya=np.concatenate([Y[fit],1-Y[fit]])
if kind=='logistic':scaler=StandardScaler().fit(xa);est=LogisticRegression(C=params['C'],max_iter=1500,random_state=17).fit(scaler.transform(xa),ya)
else:scaler=None;est=GradientBoostingClassifier(n_estimators=params['trees'],max_depth=params['depth'],learning_rate=.04,min_samples_leaf=45,subsample=.85,random_state=17).fit(xa,ya)
raw=sympred(est,scaler,X[cal&eligible]);logits=np.log(np.clip(raw,1e-6,1-1e-6)/np.clip(1-raw,1e-6,1));calibrator=LogisticRegression(C=1000,fit_intercept=False,max_iter=1000).fit(logits.reshape(-1,1),Y[cal&eligible]);slope=max(.01,float(calibrator.coef_[0,0]));rawtest=sympred(est,scaler,X[test&eligible]);prob=1/(1+np.exp(-slope*np.log(np.clip(rawtest,1e-6,1-1e-6)/np.clip(1-rawtest,1e-6,1))));testMetric=metrics(Y[test&eligible],prob);testMetric['resultsOnly']=metrics(Y[test&eligible],baseline[test&eligible]);testMetric['coinFlip']=metrics(Y[test&eligible],np.full(int(np.sum(test&eligible)),.5));testMetric['allHistorySample']=int(np.sum(test));testMetric['eligibleSample']=int(np.sum(test&eligible));testMetric['start']='2024-01-01';testMetric['end']=max(dates)
def export_est(model,scaler=None):
 if isinstance(model,LogisticRegression):
  return {'kind':'logistic','coefficients':model.coef_.tolist(),'intercepts':model.intercept_.tolist(),'classes':model.classes_.tolist(),'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist()}
 trees=[]
 for stage in model.estimators_:
  stageOut=[]
  for estimator in stage:
   t=estimator.tree_;stageOut.append({'f':t.feature.tolist(),'t':t.threshold.tolist(),'l':t.children_left.tolist(),'r':t.children_right.tolist(),'v':t.value[:,0,0].tolist()})
  trees.append(stageOut)
 prior=np.array(model.init_.class_prior_);init=[float(np.log(prior[1]/prior[0]))] if len(prior)==2 else np.log(prior).tolist()
 return {'kind':'boosted_trees','trees':trees,'rate':model.learning_rate,'init':init,'classes':model.classes_.tolist()}
testMetric['calibrationBins']=[]
for lo,hi in [(0,.4),(.4,.5),(.5,.6),(.6,.7),(.7,1.00001)]:
 mask=(prob>=lo)&(prob<hi)
 if np.any(mask):testMetric['calibrationBins'].append({'range':[lo,min(1,hi)],'n':int(mask.sum()),'meanPrediction':round(float(prob[mask].mean()),4),'observedWinRate':round(float(Y[test&eligible][mask].mean()),4)})
winner=export_est(est,scaler);winner['slope']=slope;winner['symmetric']=True;winner['selectedOn']='2021-2022';winner['calibratedOn']='2023';winner['test']=testMetric
# Finishing-method, finishing-round and duration heads have separate chronological evaluations.
def train_head(name,x,y,dd,ee,binary=False,weights=None):
 x=np.array(x);y=np.array(y);dd=np.array(dd);ee=np.array(ee);tr=dd<'2021-01-01';va=(dd>='2021-01-01')&(dd<'2023-01-01');ca=(dd>='2023-01-01')&(dd<'2024-01-01');te=(dd>='2024-01-01')&ee;va=va&ee;ca=ca&ee;opts=[];weights=np.ones(len(y)) if weights is None else np.array(weights)
 for trees,depth in [(70,2),(110,2)]:
  m=GradientBoostingClassifier(n_estimators=trees,max_depth=depth,learning_rate=.04,min_samples_leaf=45,subsample=.85,random_state=23).fit(x[tr],y[tr],sample_weight=weights[tr]);loss=log_loss(y[va],m.predict_proba(x[va]),labels=m.classes_,sample_weight=weights[va]);opts.append((loss,trees,depth))
 _,trees,depth=min(opts);m=GradientBoostingClassifier(n_estimators=trees,max_depth=depth,learning_rate=.04,min_samples_leaf=45,subsample=.85,random_state=23).fit(x[tr|va],y[tr|va],sample_weight=weights[tr|va]);pc=np.clip(m.predict_proba(x[ca]),1e-7,1);best=(float('inf'),1.)
 for temp in [.7,1.,1.3,1.6,2.]:
  z=np.log(pc)/temp;pp=np.exp(z-z.max(axis=1,keepdims=True));pp/=pp.sum(axis=1,keepdims=True);loss=log_loss(y[ca],pp,labels=m.classes_,sample_weight=weights[ca])
  if loss<best[0]:best=(loss,temp)
 pt=np.clip(m.predict_proba(x[te]),1e-7,1);z=np.log(pt)/best[1];pt=np.exp(z-z.max(axis=1,keepdims=True));pt/=pt.sum(axis=1,keepdims=True);pred=m.classes_[np.argmax(pt,axis=1)];hist=np.bincount(y[tr|va],minlength=int(max(m.classes_))+1);prior=hist[m.classes_]/hist.sum();baseline=np.tile(prior,(len(pred),1));report={'n':len(pred),'accuracy':round(float(np.mean(pred==y[te])),4),'logLoss':round(float(log_loss(y[te],pt,labels=m.classes_)),4),'frequencyBaselineLogLoss':round(float(log_loss(y[te],baseline,labels=m.classes_)),4),'start':'2024-01-01','end':max(dd),'conditional':name in ['method','round'],'unit':'round-total predictions' if binary else 'bouts'}
 if binary:report['brier']=round(float(brier_score_loss(y[te],pt[:,1])),4)
 out=export_est(m);out['temperature']=best[1];out['test']=report;print(name,report,flush=True);return out
method=train_head('method',methodX,methodY,methodDates,methodEligible);round_model=train_head('round',roundX,roundY,roundDates,roundEligible);totals=train_head('totals',totalX,totalY,totalDates,totalEligible,True,totalWeights)
# Fixed-parameter, date-block bootstrap gives uncertainty on the held-out accuracy.
rng=np.random.default_rng(41);testDates=dates[test&eligible];groups={d:np.flatnonzero(testDates==d) for d in np.unique(testDates)};block=list(groups.values());boots=[]
for _ in range(500):
 ix=np.concatenate([block[i] for i in rng.integers(0,len(block),len(block))]);boots.append(float(np.mean((prob[ix]>.5)==Y[test&eligible][ix])))
winner['test']['accuracyInterval']=[round(float(np.quantile(boots,.025)),4),round(float(np.quantile(boots,.975)),4)]
# Retain Python outputs for browser inference parity and leakage regression tests.
fixtures=[]
for i in np.flatnonzero(test&eligible)[:20]:
 rawp=float(sympred(est,scaler,X[i:i+1])[0]);p=float(1/(1+np.exp(-slope*np.log(rawp/(1-rawp)))));fixtures.append({'x':X[i].tolist(),'winner':p,'method':None})
headFixtures={}
for name,head,xx in [('method',method,methodX),('round',round_model,roundX),('totals',totals,totalX)]:
 def predict_export(model,x):
  scores=np.array(model['init'],dtype=float)
  for stage in model['trees']:
   for c,t in enumerate(stage):
    n=0
    while t['l'][n]!=-1:n=t['l'][n] if np.float32(x[t['f'][n]])<=t['t'][n] else t['r'][n]
    scores[c]+=model['rate']*t['v'][n]
  if len(scores)==1:pp=np.array([1-1/(1+np.exp(-scores[0])),1/(1+np.exp(-scores[0]))])
  else:pp=np.exp(scores-max(scores));pp/=pp.sum()
  z=np.log(np.clip(pp,1e-9,1))/model['temperature'];pp=np.exp(z-max(z));return (pp/pp.sum()).tolist()
 headFixtures[name]=[{'x':np.array(x).tolist(),'p':predict_export(head,x)} for x in xx[-10:]]
(ART/'head-fixtures.json').write_text(json.dumps(headFixtures,separators=(',',':')))
(ART/'feature-fixtures.json').write_text(json.dumps([{'state':s,'date':'2026-10-31','features':features(s,'2026-10-31').tolist()} for s in list(states.values())[-30:]],separators=(',',':')))
stateJSON={k:s for k,s in states.items()};model={'version':'fighter-stats-2.1','evaluationStatus':'development holdout rerun after removal of retrospective profile-completeness feature','trainedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'performanceCutoff':max(b['date'] for b in bouts if all(q is not None for q in b['stats'])),'features':[{'key':k,'label':label,'group':group} for k,label,group in F],'ownFeatureCount':D,'counterKeys':KEYS,'winner':winner,'method':method,'round':round_model,'totals':totals,'performance':stateJSON,'boutCount':len(bouts),'performanceBoutCount':sum(all(s is not None for s in b['stats']) for b in bouts),'dataAudit':{'roundRows':sum(1 for _ in open(DATA/'ufc_fight_stats.csv'))-1,'resultRows':len(bouts),'uniqueFighters':len(states),'performanceBouts':sum(all(q is not None for q in b['stats']) for b in bouts),'missingBothOrOnePerformance':sum(any(q is None for q in b['stats']) for b in bouts),'inputHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DATA.glob('*.csv'))}},'training':{'trainEnd':'2020-12-31','selectionStart':'2021-01-01','selectionEnd':'2022-12-31','calibrationYear':2023,'testStart':'2024-01-01','trainBouts':int(np.sum(fit)),'testBouts':int(np.sum(test&eligible)),'cutoff':max(dates),'winnerArchitecture':kind,'winnerParameters':params,'featureTiming':'all bouts on a date read prior state before any state update','minimumDetailedBoutsPerFighter':2,'testUnit':'bouts with at least two prior detailed UFC bouts per fighter','candidateValidation':[{'kind':t[1],'parameters':t[2],'logLoss':round(t[0],5)} for t in candidates]},'sources':[{'title':'UFCStats round-level data (original maintainer mirror)','url':'https://github.com/Kairo-Angle/ufc'},{'title':'ESPN completed bout performance totals','url':'https://www.espn.com/mma/schedule/_/league/ufc'},{'title':'Published pre-fight MMA forecasting research','url':'https://doi.org/10.1016/j.ijforecast.2022.01.007'},{'title':'Official UFC metric definitions and minimum samples','url':'https://statleaders.ufc.com/'},{'title':'Probability calibration methodology','url':'https://scikit-learn.org/stable/modules/calibration.html'}]}
(OUT/'fighter-model.json').write_text(json.dumps(model,separators=(',',':')))
(ART/'inference-fixtures.json').write_text(json.dumps(fixtures,separators=(',',':')))
report={k:v for k,v in model.items() if k not in ['performance','winner','method','round','totals']};report['evaluation']={name:model[name]['test'] for name in ['winner','method','round','totals']};(ART/'evaluation.json').write_text(json.dumps(report,indent=2))
print('WINNER',json.dumps(winner['test']),flush=True);print('MODEL',kind,'features',D,'bouts',len(bouts),'bytes',(OUT/'fighter-model.json').stat().st_size,flush=True)
