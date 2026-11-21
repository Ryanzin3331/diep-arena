'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];const ctx=vm.createContext({console,TextEncoder});
vm.runInContext(core+';globalThis.api={Arena,botThink,C,respawnLearning,threatDistance}',ctx);const {Arena,botThink,C,respawnLearning,threatDistance}=ctx.api;
function setup(map='open',cls='Overseer'){
 const w=new Arena(12345,2,null,'both',true,map,'off'),a=w.tanks[0],b=w.tanks[1];a.x=1000;a.y=1000;b.x=1300;b.y=1000;a.protect=b.protect=0;a.level=b.level=30;a.hp=b.hp=1000;b.cls=cls;
 if(map==='maze')w.maze.hit=()=>null;
 const drones=[];for(let i=0;i<3;i++){
  if(cls==='Necromancer'){w.addShape('square',1190,980+i*20,false);const q=w.shapes.at(-1);assert.ok(w.convertNecroSquare(q,b));}
  else w.spawnShot(b,C.Overseer.guns[0]);
  const p=w.shots.at(-1);Object.assign(p,{x:1190,y:980+i*20,vx:-120,vy:0});drones.push(p);
 }
 w.sense.nearby=()=>[a,b,...drones.filter(p=>p.alive)];return {w,a,b,drones};
}
function observe(g,time){g.w.time=time;botThink(g.w,g.a);}
for(const cls of ['Necromancer','Overseer'])test(cls+' cria drones reais e episódios distintos',()=>{
 const g=setup('open',cls);observe(g,0);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);
 for(let i=1;i<=20;i++)observe(g,i/10);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);
 g.drones.forEach(p=>p.alive=false);observe(g,2.8);g.drones.forEach(p=>p.alive=true);observe(g,3.5);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);
 g.drones.forEach(p=>p.alive=false);observe(g,4);g.drones.forEach(p=>p.alive=true);observe(g,5.6);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),2);
 assert.equal(g.a.learning.threats,undefined);
});
test('controlador oculto e atribuição ambígua não produzem evidência',()=>{
 const g=setup('maze');g.w.maze.hit=(x,y,xx)=>xx===1300?.5:null;observe(g,0);assert.equal(g.a.learning.swarmThreats,undefined);
 g.w.maze.hit=()=>null;const other={...g.b,id:999,profileId:'open:bot:99',x:1280};g.w.sense.nearby=()=>[g.a,g.b,other,...g.drones];observe(g,1);assert.equal(g.a.learning.swarmThreats,undefined);
});
test('aprendizado observado muda decisão antes de próxima investida',()=>{
 const observation=setup();observe(observation,0);observation.drones.forEach(p=>p.alive=false);observe(observation,1);observation.drones.forEach(p=>p.alive=true);observe(observation,3);
 assert.equal(observation.a.learning.swarmThreats.get(observation.b.profileId),2);
 const trained=setup(),cold=setup();trained.a.learning.swarmThreats=new Map(observation.a.learning.swarmThreats);
 for(const g of [trained,cold]){g.drones.forEach(p=>p.alive=false);g.w.time=4;botThink(g.w,g.a);}
 console.log('sem',cold.a.intent.x,cold.a.intent.y,'com',trained.a.intent.x,trained.a.intent.y);
 assert.notDeepEqual([trained.a.intent.x,trained.a.intent.y],[cold.a.intent.x,cold.a.intent.y]);
 const carried=respawnLearning(observation.a.learning,true);assert.equal(carried.swarmThreats.get(observation.b.profileId),2);assert.equal(setup().a.learning.swarmThreats,undefined);
});
test('passos reais da simulação registram dois episódios e sobrevivem ao renascimento',()=>{
 const g=setup();g.w.tick=(4-g.a.id%5+5)%5;g.w.step(null);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);
 g.w.tick+=125;while((g.w.tick+1+g.a.id)%5!==0)g.w.tick++;g.a.x=1000;g.a.y=1000;g.b.x=1300;g.b.y=1000;g.drones.forEach((p,i)=>Object.assign(p,{alive:true,x:1190,y:980+i*20,vx:-120,vy:0}));g.w.step(null);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),2);
 g.w.kill(g.a,null,'teste');g.a.respawnAt=g.w.time;g.w.step(null);const reborn=g.w.tanks.find(t=>t.slot===g.a.slot);assert.equal(reborn.learning.swarmThreats.get(g.b.profileId),2);
});
test('detecção independe da classe e não altera backup ou multiplayer',()=>{
 const g=setup();g.b.cls='Tank';observe(g,0);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);
 vm.runInContext(fs.readFileSync('memory-codec.js','utf8'),ctx);const codec=ctx.createMemoryCodec({classes:C,newMemory:vm.runInContext('newMemory',ctx),ttl:115});
 assert.ok(!codec.serialize(g.a.learning,g.w.time).includes('swarm'));
 const m=setup();m.w.profileRoster='multiplayer';observe(m,0);assert.equal(m.a.learning.swarmThreats,undefined);
});

test('distância combinada é limitada',()=>{assert.equal(threatDistance(true,false),110);assert.equal(threatDistance(false,true),80);assert.equal(threatDistance(true,true),140);});
test('parede encobre drones e evidências de tiro e enxame são independentes',()=>{
 const g=setup('maze');g.w.maze.hit=(x,y,xx)=>xx===1190?.5:null;observe(g,0);assert.equal(g.a.learning.swarmThreats,undefined);
 g.w.maze.hit=()=>null;g.a.learning.threats=new Map([[g.b.profileId,2]]);observe(g,1);assert.equal(g.a.learning.swarmThreats.get(g.b.profileId),1);assert.equal(g.a.learning.threats.get(g.b.profileId),2);
});
