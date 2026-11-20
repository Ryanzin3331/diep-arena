'use strict';
// Reconstruct 20b9d94 with only the measurement callback renamed; game code stays unchanged.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');
const mode=process.argv[2]||'pairs';if(!['pairs','ffa'].includes(mode))throw Error('Use pairs or ffa');
const show=name=>execFileSync('git',['show',`20b9d94:${name}`],{encoding:'utf8',maxBuffer:20*1024*1024});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'diep-3a-'));
try{
 const core=path.join(dir,'core.html'),meter=path.join(dir,'meter.js');fs.writeFileSync(core,show('index.html'));
 let source=show(mode==='pairs'?'tests/measure-3a-duel.js':'tests/measure-3a-autonomous.js');
 source=source.replace(".split('</script>')[0];", ".split('</script>')[0].replace(/\\r\\n/g,'\\n');").replaceAll('globalThis.impact(p,e,this)','globalThis.measureImpact(p,e,this)').replace('c.impact=(p,e,w)=>','c.measureImpact=(p,e,w)=>');
 if(mode==='ffa'){
  source=source.replace('C,range,bulletSpeed}', 'C,range,bulletSpeed,chooseHeavyResponse}').replace('const defensiveBots=new Set();','const decisions=[];const defensiveBots=new Set();');
  source=source.replace('c.opened=(t,a,tick)=>{attempts.set(a,{slot:t.slot,tick,choice:a.choice});bots.add(t.slot);};',`c.opened=(t,a,tick)=>{const m=t.learning,rows=m.heavyResults?.map(r=>({...r}));const baseline=c.api.chooseHeavyResponse({...m,heavyAttempt:null,heavyResults:undefined,heavyTrials:m.heavyTrials-1});decisions.push({slot:t.slot,tick,rivalId:a.rivalId,choice:a.choice,baseline,results:rows||null,both:!!rows&&rows.every(r=>r.count>0),historyChanged:!!rows&&a.choice!==baseline});attempts.set(a,{slot:t.slot,tick,choice:a.choice});bots.add(t.slot);};`);
  source=source.replace('attemptRecords:[...attempts.values()]','decisions,attemptRecords:[...attempts.values()]');
 }
 fs.writeFileSync(meter,source);
 function run(env){const result=spawnSync(process.execPath,[meter],{encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,...env,CORE:core}});if(result.status!==0)throw Error(result.stderr);return JSON.parse(result.stdout);}
 if(mode==='ffa')console.log(JSON.stringify(run({SEED:process.argv[3]||'7102',TICKS:'2400'})));
 else{const rows=[];for(const seed of [7102,7103,7104,7105])for(const distance of [200,300,380])for(const control of [1,0])rows.push(run({SEED:String(seed),DISTANCE:String(distance),CONTROL:String(control),TICKS:'900'}));console.log(JSON.stringify(rows,null,2));}
}finally{fs.rmSync(dir,{recursive:true,force:true});}
