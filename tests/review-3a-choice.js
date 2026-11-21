'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const find='const choice=chooseHeavyResponse(t.learning);';assert.equal(core.split(find).length,2);
core=core.replace(find,find+'globalThis.probe(w,t,choice);');
const ctx=vm.createContext({console,TextEncoder});vm.runInContext(core+';globalThis.api={Arena,changeClass,hull,XP,spendBot,chooseHeavyResponse}',ctx);
const {Arena,changeClass,hull,XP,spendBot,chooseHeavyResponse}=ctx.api;let observed;
ctx.probe=(w,t,choice)=>{if(w.tick!==1029||t.slot!==21)return;const m=t.learning;assert.equal(m.heavyAttempt,null);const noResults=chooseHeavyResponse({...m,heavyResults:undefined});const withResults=chooseHeavyResponse(m);observed={tick:w.tick,slot:t.slot,rivalId:m.foeId,choice,withResults,noResults,trials:m.heavyTrials,results:m.heavyResults.map(r=>({...r}))};};
const w=new Arena(7102,36,null,'both',true,'open','off');for(let i=0;i<36;i++){const t=w.tanks[i];t.level=30;t.score=XP[29];changeClass(t,i<6?'Destroyer':i<12?'Overseer':t.cls,true);spendBot(t,w.time);t.hp=hull(t);}
for(let i=0;i<1029;i++)w.step(null);const t=w.tanks.find(t=>t.slot===21);assert.ok(observed);assert.equal(observed.choice,0);assert.equal(observed.withResults,0);assert.equal(observed.noResults,1);assert.equal(t.learning.heavyAttempt.choice,0);assert.equal(t.learning.heavyTrials,observed.trials+1);console.log(JSON.stringify({...observed,attemptId:t.learning.heavyAttempt.id,rivalAttempt:t.learning.heavyAttempt.rivalId}));
