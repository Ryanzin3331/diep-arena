const fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks');let src=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
src=src.replace('function observeHeavyShot(w,t,p,nearby=w.sense.nearby(t.x,t.y,range(t))){','function observeHeavyShot(w,t,p,nearby=w.sense.nearby(t.x,t.y,range(t))){if(!globalThis.enabled)return;').replace('function observeDroneSwarm(w,t,risks,nearby){','function observeDroneSwarm(w,t,risks,nearby){if(!globalThis.enabled)return;');
src=src.replace('memory.threats.set(key,Math.min(3,(memory.threats.get(key)||0)+1));','memory.threats.set(key,Math.min(3,(memory.threats.get(key)||0)+1));globalThis.heavy.add(t.slot);if(memory.threats.get(key)>=2)globalThis.heavyLearn.add(t.slot);');
src=src.replace('m.swarmThreats.set(key,Math.min(3,(m.swarmThreats.get(key)||0)+1));','{m.swarmThreats.set(key,Math.min(3,(m.swarmThreats.get(key)||0)+1));globalThis.swarm.add(t.slot);if(m.swarmThreats.get(key)>=2)globalThis.swarmLearn.add(t.slot);}');
src=src.replace('const preferred=threatDistance(heavyExperience,swarmExperience)+','if(heavyExperience)globalThis.heavyUse.add(t.slot);if(swarmExperience)globalThis.swarmUse.add(t.slot);\n    const preferred=threatDistance(heavyExperience,swarmExperience)+');
src=src.replace('t.enemy=enemy;t.food=food;','globalThis.trackPair(w,t,enemy);t.enemy=enemy;t.food=food;');
src=src.replace('this.shots.push(projectile);','this.shots.push(projectile);if(t.type==="tank")globalThis.shotCount++;');
const ctx=vm.createContext({console,TextEncoder});vm.runInContext(src+';globalThis.api={Arena,changeClass,hull,perceived}',ctx);
for(const map of ['open','maze'])for(const enabled of [false,true]){
 ctx.enabled=enabled;ctx.shotCount=0;let pairs=new Map(),encounters=0,visibleTicks=0;
 ctx.trackPair=(w,t,e)=>{if(!e?.profileId)return;const key=t.slot+'|'+e.profileId,old=pairs.get(key);if(old===undefined||w.tick-old>=60)encounters++;pairs.set(key,w.tick);};
 for(const k of ['heavy','heavyLearn','heavyUse','swarm','swarmLearn','swarmUse'])ctx[k]=new Set();
 const seed=Number(process.env.SEED||7101),ticks=Number(process.env.TICKS||1200),w=new ctx.api.Arena(seed,36,null,'both',true,map,'off');
 if(process.env.PREPARED==='1')for(let i=0;i<12;i++){let t=w.tanks[i];t.level=30;ctx.api.changeClass(t,i<6?'Destroyer':'Overseer',true);t.hp=ctx.api.hull(t);}
 const classes=new Set(),start=performance.now();
 for(let i=0;i<ticks;i++){w.step(null);for(const t of w.tanks){if(['Destroyer','Annihilator','Hybrid','Overseer','Overlord','Necromancer'].includes(t.cls))classes.add(t.cls);if(t.alive&&!t.human&&t.enemy&&ctx.api.perceived(w,t,t.enemy))visibleTicks++;}}
 const result={map,enabled,seed,ticks,prepared:process.env.PREPARED==='1',msPerTick:(performance.now()-start)/ticks,classes:[...classes],encounters,visibleFraction:visibleTicks/(ticks*36),shotsPerBotMinute:ctx.shotCount/(36*(w.time/60))};
 for(const k of ['heavy','heavyLearn','heavyUse','swarm','swarmLearn','swarmUse'])result[k]=ctx[k].size;console.log(JSON.stringify(result));
}
