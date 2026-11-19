'use strict';
// Instrument the core in memory: product perception and accumulated evidence remain unchanged.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
let source=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
source=source.replace('t.enemy=enemy;t.food=food;','globalThis.track(w,t,enemy);t.enemy=enemy;t.food=food;');
source=source.replace('const heavyExperience=localDiscoveryArena(w)', 'let heavyExperience=localDiscoveryArena(w)').replace('const swarmExperience=localDiscoveryArena(w)','let swarmExperience=localDiscoveryArena(w)');
source=source.replace('    const preferred=threatDistance(heavyExperience,swarmExperience)+','    [heavyExperience,swarmExperience]=globalThis.gate(w,t,enemy,heavyExperience,swarmExperience);\n    const preferred=threatDistance(heavyExperience,swarmExperience)+');
source=source.replace('  t.mood=MOOD[mode];t.detail=detail;','  globalThis.finish(w,t);t.mood=MOOD[mode];t.detail=detail;');
if(!source.includes('globalThis.gate(w,t,enemy'))throw Error('instrumentação não aplicada');
const ctx=vm.createContext({console,TextEncoder});vm.runInContext(source+';globalThis.api={Arena,changeClass,hull}',ctx);
let current=null;const last=new Map(),threshold=new Map(),seen=new Set(),pairEvents=new Map();let found=null,comparison=null;
const targetTick=Number(process.env.TICK||0),targetBot=Number(process.env.OBSERVER||7),targetEnemy=Number(process.env.ENEMY||3),suppress=process.env.SUPPRESS==='1';
ctx.track=(w,t,e)=>{
 for(const [kind,m] of [['heavy',t.learning?.threats],['swarm',t.learning?.swarmThreats]])if(m)for(const [id,n] of m)if(n>=2){const k=t.slot+'|'+id+'|'+kind;if(!threshold.has(k))threshold.set(k,w.tick);}
 current=null;if(!e?.profileId)return;const pair=t.slot+'|'+e.profileId,prior=last.get(pair);last.set(pair,w.tick);
 if(prior!==undefined&&w.tick-prior>=60){
  current={pair,prior};for(const kind of ['heavy','swarm']){const key=pair+'|'+kind;if(threshold.has(key)&&!pairEvents.has(key))pairEvents.set(key,{observer:t.slot,enemy:e.slot,kind,threshold:threshold.get(key),lastSelected:prior,reencounter:w.tick});}
 }
};
ctx.gate=(w,t,e,h,s)=>{
 if(targetTick){
  if(w.tick===targetTick&&t.slot===targetBot&&e?.slot===targetEnemy){
   const dx=e.x-t.x,dy=e.y-t.y,d=Math.hypot(dx,dy);
   const snapshot=JSON.stringify({tick:w.tick,tanks:w.tanks.map(v=>[v.id,v.slot,v.alive,v.x,v.y,v.vx,v.vy,v.hp,v.cls,v.level]),shots:w.shots.map(p=>[p.id,p.owner.id,p.kind,p.alive,p.x,p.y,p.vx,p.vy,p.age])});
   comparison={snapshotHash:crypto.createHash('sha256').update(snapshot).digest('hex'),tick:w.tick,observer:t.slot,enemy:e.slot,heavy:h,swarm:s,x:t.x,y:t.y,ex:e.x,ey:e.y,hp:t.hp,evx:e.vx,evy:e.vy,learning:[...(t.learning?.threats||[])],nx:dx/d,ny:dy/d,attacks:w.shots.filter(p=>p.alive&&p.owner===e&&p.kind==='bullet'&&p.r>=e.r*.75).length,ownerProjectiles:w.shots.filter(p=>p.alive&&p.owner===e).map(p=>({id:p.id,kind:p.kind,r:p.r,age:p.age})),enemyClass:e.cls,suppress};
   return suppress?[false,false]:[h,s];
  }
  return [h,s];
 }
 if(!current||!e)return [h,s];
 for(const [kind,active] of [['heavy',h],['swarm',s]]){
  const k=current.pair+'|'+kind;if(!active||seen.has(k)||!threshold.has(k))continue;seen.add(k);
  const attack=w.shots.some(p=>p.alive&&p.owner===e&&(kind==='heavy'?p.kind==='bullet'&&(p.r>=e.r*.75):['drone','necroDrone'].includes(p.kind)));
  if(!attack&&!found){found={tick:w.tick,observer:t.slot,enemy:e.slot,kind,threshold:threshold.get(k),lastSelected:current.prior,seed:7101,map:'open'};break;}
 }
 return [h,s];
};ctx.finish=(w,t)=>{if(comparison&&w.tick===targetTick&&t.slot===targetBot){
 const {x,y}=t.intent,nx=comparison.nx,ny=comparison.ny;found={...comparison,move:{x,y,radial:x*nx+y*ny,lateral:-x*ny+y*nx}};
}};
const map=process.env.MAP||'open',seed=Number(process.env.SEED||7101),ticks=Number(process.env.TICKS||5000);const w=new ctx.api.Arena(seed,36,null,'both',true,map,'off');
for(let i=0;i<12;i++){const t=w.tanks[i];t.level=30;ctx.api.changeClass(t,i<6?'Destroyer':'Overseer',true);t.hp=ctx.api.hull(t);}
for(let i=0;i<ticks&&(!found||process.env.SEARCH_ALL==='1');i++)w.step(null);
if(found){found.map=map;found.seed=seed;console.log(JSON.stringify({...found,pairs:[...pairEvents.values()]}));}else console.log(JSON.stringify({map,seed,ticks,found:false,thresholdPairs:threshold.size,pairs:[...pairEvents.values()]}));
