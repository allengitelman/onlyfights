/* Cross-language checks against independently exported Python probabilities. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),model=JSON.parse(fs.readFileSync(root+'/public/fighter-model.json'));
const ctx=vm.createContext({console,structuredClone});
vm.runInContext(fs.readFileSync(root+'/public/fighter-ai.js','utf8'),ctx);
vm.runInContext('fighterAI='+JSON.stringify(model),ctx);
let checks=0,maxError=0;
function near(a,b,note,tol=1e-9){const e=Math.abs(a-b);maxError=Math.max(maxError,e);assert.ok(e<tol,note+': '+e);checks++}
for(const f of JSON.parse(fs.readFileSync(root+'/research-artifacts/inference-fixtures.json'))){ctx.fx=f.x;const p=vm.runInContext('trainedWinner(fx)',ctx);near(p,f.winner,'Python/browser winner');near(p+vm.runInContext('trainedWinner(reverseMatchVector(fx))',ctx),1,'Fighter swap symmetry');assert.ok(p>0&&p<1)}
const heads=JSON.parse(fs.readFileSync(root+'/research-artifacts/head-fixtures.json'));
for(const [name,fixtures] of Object.entries(heads))for(const f of fixtures){ctx.fx=f.x;const p=vm.runInContext(`trainedDistribution(fighterAI.${name},fx)`,ctx);p.forEach((v,i)=>near(v,f.p[i],name+' Python/browser'));near(p.reduce((a,b)=>a+b,0),1,name+' normalized')}
for(const f of JSON.parse(fs.readFileSync(root+'/research-artifacts/feature-fixtures.json'))){ctx.state=f.state;const p=vm.runInContext('performanceFeatures(state,"2026-10-31")',ctx);assert.equal(p.length,model.ownFeatureCount);p.forEach((v,i)=>near(v,f.features[i],'Historical feature parity '+i));assert.ok(p.every(Number.isFinite))}
assert.equal(model.training.testStart,'2024-01-01');assert.equal(model.training.calibrationYear,2023);assert.equal(model.features.some(f=>/odds|moneyline|bookmaker/i.test(f.key)),false);
console.log(JSON.stringify({checks,maxError,winner:model.winner.test,headTests:Object.fromEntries(['method','round','totals'].map(k=>[k,model[k].test]))},null,2));
// New-result ingestion and honest missing-data behavior.
vm.runInContext(`
const researchKey=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
let roster=[[['Test','Alpha',-150,'',1],['Test','Beta',130,'',2],'Lightweight',3]],currentCard={id:'test',date:'2026-10-31'},picks={0:{side:0}};
const fullname=f=>f[0]+' '+f[1];const modelFighter=()=>null;
fighterAI.performance={testalpha:newPerformanceState('Test Alpha'),testbeta:newPerformanceState('Test Beta')};
`,ctx);
ctx.mockStat={splits:{categories:[{stats:Object.entries({sigStrikesLanded:30,sigStrikesAttempted:60,takedownsLanded:1,takedownsAttempted:3,submissions:1,knockDowns:1,timeInControl:60,totalStrikesLanded:40,totalStrikesAttempted:80}).map(([name,value])=>({name,value}))}]}};
const counters=vm.runInContext('boutPerformance(mockStat)',ctx);assert.equal(counters.length,16);assert.equal(counters[0],30);assert.equal(vm.runInContext('boutPerformance({})',ctx),null);
ctx.fakeStats=[counters,counters];
vm.runInContext(`const event={date:'2026-10-01'};const bout={competitors:[{id:'1',order:1,winner:true,athlete:{fullName:'Test Alpha'}},{id:'2',order:2,athlete:{fullName:'Test Beta'}}],status:{period:3,clock:300},details:[{type:{text:'Decision'}}]};applyPerformanceBout(event,bout,fakeStats);`,ctx);
assert.equal(vm.runInContext('fighterAI.performance.testalpha.statsMinutes',ctx),15);
assert.equal(vm.runInContext('fighterAI.performance.testalpha.wins',ctx),1);
vm.runInContext(`applyPerformanceBout({date:'2026-10-08'},bout,[null,null]);aiMatchCache.clear();`,ctx);
assert.equal(vm.runInContext('fighterAI.performance.testalpha.statsGap',ctx),true);
assert.equal(vm.runInContext('winForecast(0,0).p',ctx),null);
console.log('New-result ingestion, missing-data guards and minimum-history behavior passed.');

assert.equal(vm.runInContext(`measuredStats({...newPerformanceState("Age test"),physical:{dob:"2000-03-08"}},"2026-10-31").age`,ctx),26);
assert.equal(vm.runInContext(`measuredStats({...newPerformanceState("Age test"),physical:{dob:"2000-03-08"}},"2026-03-07").age`,ctx),25);
console.log("Fight-day age uses completed birthdays.");
