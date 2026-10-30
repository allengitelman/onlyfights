"""Fetch public ESPN bout statistics to update the historical UFCStats snapshot."""
import json,time,urllib.request,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'research-input';CACHE=DATA/'espn-bout-stats';CACHE.mkdir(parents=True,exist_ok=True)
jobs=[]
for suffix in ['2026','latest']:
 data=json.loads((DATA/('espn-history-'+suffix+'.json')).read_text())
 for event in data.get('events',[]):
  if 'Contender' in event['name'] or 'Road to' in event['name']:continue
  for bout in event.get('competitions',[]):
   if not bout.get('status',{}).get('type',{}).get('completed') or len(bout.get('competitors',[]))!=2:continue
   for fighter in bout['competitors']:jobs.append((event['id'],bout['id'],fighter['id']))
def fetch(job):
 event,bout,athlete=job;path=CACHE/('_'.join(job)+'.json')
 if path.exists():
  try:
   if 'splits' in json.loads(path.read_text()):return True
  except:pass
 url=f'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{event}/competitions/{bout}/competitors/{athlete}/statistics?lang=en&region=us'
 for attempt in range(2):
  try:
   with urllib.request.urlopen(url,timeout=18) as response:data=json.load(response)
   if 'splits' not in data:return False
   path.write_text(json.dumps(data,separators=(',',':')));return True
  except Exception:
   if not attempt:time.sleep(.5)
 return False
success=0
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,ok in enumerate(pool.map(fetch,jobs),1):
  success+=ok
  if i%50==0 or i==len(jobs):print(json.dumps({'completed':i,'requested':len(jobs),'usable':success}),flush=True)
print('DONE',success,len(jobs),flush=True)
