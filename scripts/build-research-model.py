import csv,json,math,re,unicodedata,collections,datetime
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description="Build the results-only UFC model from downloaded source tables.")
parser.add_argument("--input-dir",type=Path,required=True)
args=parser.parse_args()
input_dir=args.input_dir
norm=lambda s: re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).replace('josephkropschot','joekropschot').replace('zacharyreese','zachreese').replace('renatocarneiro','renatomoicano').replace('yanakunitskaya','yanasantos')
events={r['EVENT'].strip():datetime.datetime.strptime(r['DATE'].strip(),'%B %d, %Y').date().isoformat() for r in csv.DictReader(open(input_dir / 'of-event-details.csv'))}
bouts=[];seen=set()
for r in csv.DictReader(open(input_dir / 'of-ufc-results.csv')):
 date=events.get(r['EVENT'].strip());f=re.split(r'\s+vs\.\s+',r['BOUT'].strip());out=r['OUTCOME'].strip()
 if not date or len(f)!=2 or out not in ['W/L','L/W']:continue
 key=r['URL'].strip()
 if key in seen:continue
 seen.add(key);m=r['METHOD'].strip();method='Submission' if 'Submission' in m else 'KO / TKO' if 'KO' in m else 'Decision' if 'Decision' in m else 'Other'
 bouts.append({'date':date,'a':norm(f[0]),'b':norm(f[1]),'an':f[0],'bn':f[1],'y':1 if out=='W/L' else 0,'method':method,'round':int(r['ROUND']),'scheduled':5 if r['TIME FORMAT'].startswith('5 Rnd') else 3,'division':r['WEIGHTCLASS'].strip().replace(' Bout',''),'time':r['TIME'],'url':key.replace('http:','https:')})
for suffix in ['2026','latest']:
 for e in json.load(open(input_dir / ('of-history-'+suffix+'.json'))).get('events',[]):
  if 'Contender' in e['name'] or 'Road to' in e['name']:continue
  for c in e['competitions']:
   if not c.get('status',{}).get('type',{}).get('completed') or len(c.get('competitors',[]))!=2:continue
   fs=sorted(c['competitors'],key=lambda f:f.get('order',0));w=[f.get('winner',False) for f in fs]
   if sum(w)!=1:continue
   names=[f['athlete']['fullName'] for f in fs];details=' '.join(d.get('type',{}).get('text','') for d in c.get('details',[])).lower();method='Submission' if 'submission' in details else 'KO / TKO' if 'kotko' in details or 'knockout' in details else 'Decision' if 'decision' in details else 'Other'
   bouts.append({'date':e['date'][:10],'a':norm(names[0]),'b':norm(names[1]),'an':names[0],'bn':names[1],'y':int(w[0]),'method':method,'round':c.get('status',{}).get('period',3),'scheduled':c.get('format',{}).get('regulation',{}).get('periods',3),'division':c.get('type',{}).get('abbreviation','').replace('W ',"Women's "),'time':c.get('status',{}).get('displayClock','5:00'),'url':'https://www.espn.com/mma/fightcenter/_/id/'+e['id']})
bouts.sort(key=lambda b:(b['date'],b['url']))
# Apply all results on a date simultaneously: no later card results in a pre-fight rating.
def run(k,temp,until=None):
 ratings=collections.defaultdict(lambda:1500.);pred=[]
 for date,group in __import__('itertools').groupby(bouts,key=lambda b:b['date']):
  group=list(group)
  for b in group:
   p=1/(1+10**((ratings[b['b']]-ratings[b['a']])/(400*temp)));pred.append((date,p,b['y']))
  for b in group:
   a,bn=b['a'],b['b'];p=1/(1+10**((ratings[bn]-ratings[a])/400));delta=k*(b['y']-p);ratings[a]+=delta;ratings[bn]-=delta
 return ratings,pred
best=None
for k in [16,24,32,40,48,64]:
 for temp in [0.6,0.8,1.,1.2,1.5,2.]:
  ratings,pred=run(k,temp);valid=[(p,y) for d,p,y in pred if '2018-01-01'<=d<'2023-01-01'];loss=-sum(y*math.log(p)+(1-y)*math.log(1-p) for p,y in valid)/len(valid)
  if best is None or loss<best[0]:best=(loss,k,temp)
_,k,temp=best;ratings,pred=run(k,temp);test=[(p,y) for d,p,y in pred if '2023-01-01'<=d<'2025-01-01'];acc=sum(.5 if abs(p-.5)<1e-12 else int((p>.5)==bool(y)) for p,y in test)/len(test);brier=sum((p-y)**2 for p,y in test)/len(test);logloss=-sum(y*math.log(p)+(1-y)*math.log(1-p) for p,y in test)/len(test)
fighters={};priors=collections.defaultdict(collections.Counter);durations=collections.defaultdict(list)
for b in bouts:
 for side,other,result,name in [('a','b',b['y'],b['an']),('b','a',1-b['y'],b['bn'])]:
  f=fighters.setdefault(b[side],{'name':name,'wins':0,'losses':0,'methods':{},'lossMethods':{},'methodRounds':{},'lossMethodRounds':{},'recent':[],'durations':[],'ufcBouts':0})
  f['ufcBouts']+=1;f['wins' if result else 'losses']+=1;m=b['method'];mk='methods' if result else 'lossMethods';f[mk][m]=f[mk].get(m,0)+1;rk='methodRounds' if result else 'lossMethodRounds';key=m+':'+str(b['round']);f[rk][key]=f[rk].get(key,0)+1;f['recent'].append({'date':b['date'],'result':'W' if result else 'L','opponent':b['bn'] if side=='a' else b['an'],'method':m,'round':b['round'],'url':b['url']});f['recent']=f['recent'][-5:]
  mins=int(b['time'].split(':')[0])+int(b['time'].split(':')[1])/60 if ':' in b['time'] else 0
  f['durations'].append([b['scheduled'],round((b['round']-1)*5+mins,3)]);f['durations']=f['durations'][-12:]
 priors[b['scheduled']][b['method']]+=1
for name,f in fighters.items():f['elo']=round(ratings[name],3)
model={'version':'elo-1','trainedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cutoff':max(b['date'] for b in bouts),'boutCount':len(bouts),'k':k,'temperature':temp,'validation':{'start':'2018-01-01','end':'2022-12-31','logLoss':round(best[0],4)},'test':{'start':'2023-01-01','end':'2024-12-31','n':len(test),'accuracy':round(acc,4),'brier':round(brier,4),'logLoss':round(logloss,4),'coinFlipBrier':.25},'fighters':fighters,'priors':{str(s):dict(c) for s,c in priors.items()},'roundPriors':{str(s):dict(collections.Counter(b['method']+':'+str(b['round']) for b in bouts if b['scheduled']==s)) for s in [3,5]},'durationPriors':{str(s):[round((b['round']-1)*5+int(b['time'].split(':')[0])+int(b['time'].split(':')[1])/60,3) for b in bouts if b['scheduled']==s and ':' in b['time']] for s in [3,5]},'sources':[{'title':'UFCStats historical results (Kairo-Angle mirror)','url':'https://github.com/Kairo-Angle/ufc','through':'2025-09-06'},{'title':'ESPN UFC results','url':'https://www.espn.com/mma/schedule/_/league/ufc','through':max(b['date'] for b in bouts)}]}
Path('onlyfists/dist/model-data.json').write_text(json.dumps(model,separators=(',',':')))
print(json.dumps({key:model[key] for key in ['cutoff','boutCount','k','temperature','test']}));print('fighters',len(fighters),'bytes',Path('onlyfists/dist/model-data.json').stat().st_size)
