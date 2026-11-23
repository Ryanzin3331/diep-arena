'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(process.env.CORE||'index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const {Arena}=vm.runInNewContext(core+';({Arena})',{TextEncoder});
const [map,seed,secondsText]=process.argv.slice(2),seconds=Number(secondsText??120);
if(!['open','maze','maze-seed'].includes(map)||!Number.isInteger(Number(seed))||!Number.isFinite(seconds)||seconds<=0){
  throw new Error('Uso: node tests/audit-class-learning.js open|maze|maze-seed SEED [SEGUNDOS]');
}
const modeDef=[['off',false],['both',false],['both',true]];
for(const [learning,adaptive] of modeDef){
  const world=new Arena(Number(seed),24,null,learning,adaptive,map,'off');
  const slots=new Map(),tactics=new Map();
  const collect=()=>{
    for(const t of world.tanks){
      const m=t.learning;
      if(!m)continue;
      const q=slots.get(t.slot)||{};
      slots.set(t.slot,q);
      for(const k of ['samples','changes','escapes','buildChanges','exchanges'])q[k]=Math.max(q[k]??0,m[k]??0);
      for(const [rows,key] of [[m.heavyResults,'heavy'],[m.swarmResults,'swarm'],[m.dodgeResults,'dodge']])
        q[key]=Math.max(q[key]??0,rows?.reduce((n,e)=>n+(e.count??0),0)??0);
      if(t.enemy?.alive&&m.foeId===t.enemy.id&&m.until>world.time){
        const k=m.tactic;
        tactics.set(k,(tactics.get(k)??0)+1);
        if(k!==0)q.posture=true;
      }
    }
  };
  for(let i=0;i<seconds*60;i++){
    world.step(null);
    if(i%12===0)collect();
  }
  collect();
  const memory=[...slots.values()];
  const total=k=>memory.reduce((sum,x)=>sum+(x[k]??0),0);
  const bots=k=>memory.filter(x=>x[k]).length;
  console.log(JSON.stringify({map,seed:Number(seed),seconds,learning,adaptive,
    samples:total('samples'),botsWithSamples:bots('samples'),changes:total('changes'),botsWithChanges:bots('changes'),
    exchanges:total('exchanges'),buildChanges:total('buildChanges'),botsWithBuildChanges:bots('buildChanges'),
    dodges:total('dodge'),heavy:total('heavy'),swarm:total('swarm'),activeSelections:Object.fromEntries(tactics),
    botsWithPosture:bots('posture'),reached45:world.tanks.filter(t=>t.level===45).length,
    score:world.tanks.map(t=>t.score).sort((a,b)=>b-a).slice(0,3)}));
}
