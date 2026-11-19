'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const ctx=vm.createContext({console,TextEncoder});vm.runInContext(core+';globalThis.api={Arena,botThink,observeHeavyShot,C,respawnLearning}',ctx);
const {Arena,botThink,observeHeavyShot,C,respawnLearning}=ctx.api;
function setup(map='open'){
 const w=new Arena(12345,2,null,'both',true,map,'off'),a=w.tanks[0],b=w.tanks[1];
 a.x=1000;a.y=1000;b.x=1300;b.y=1000;a.protect=b.protect=0;a.level=b.level=30;a.hp=b.hp=1000;
 w.sense.nearby=()=>[a,b];return {w,a,b};
}
function shot(b,id){return {type:'shot',kind:'bullet',owner:b,id,alive:true,x:b.x-30,y:b.y,r:b.r*.79,age:.1,vx:-100,vy:0,damage:27};}
test('Maze oculto não seleciona nem atualiza posição; dano oculto não identifica fonte',()=>{
 const {w,a,b}=setup('maze');w.maze.hit=()=>.5;a.memory={x:777,y:888,time:0};
 botThink(w,a);assert.equal(a.enemy,null);assert.equal(a.memory.x,777);
 w.combatHit(b,a,b.cls,a.cls,10);assert.equal(a.learning.samples,0);assert.equal(a.rivalHitId,undefined);assert.equal(a.learning.threats,undefined);
});
test('tiros distintos visíveis geram evidência individual e repetição não conta',()=>{
 const {w,a,b}=setup();b.cls='Destroyer';const p=shot(b,1);
 observeHeavyShot(w,a,p);observeHeavyShot(w,a,p);assert.equal(a.learning.threats.get(b.profileId),1);
 observeHeavyShot(w,a,shot(b,2));assert.equal(a.learning.threats.get(b.profileId),2);
 assert.equal(b.learning.threats,undefined);
 const carried=respawnLearning(a.learning,true);assert.equal(carried.threats.get(b.profileId),2);observeHeavyShot(w,{...a,learning:carried},p);assert.equal(carried.threats.get(b.profileId),2);
 assert.equal(setup().a.learning.threats,undefined);
});
test('projétil visível de autor oculto não atribui evidência',()=>{
 const {w,a,b}=setup('maze');const p=shot(b,1);p.x=1100;w.maze.hit=(x,y,xx)=>xx>1200?.5:null;
 observeHeavyShot(w,a,p);assert.equal(a.learning.threats,undefined);
});
test('experiência muda movimento no mesmo confronto antes do próximo tiro',()=>{
 const cold=setup(),trained=setup();trained.a.learning.threats=new Map([[trained.b.profileId,2]]);
 botThink(cold.w,cold.a);botThink(trained.w,trained.a);
 console.log('intent cold',cold.a.intent.x,cold.a.intent.y,'trained',trained.a.intent.x,trained.a.intent.y);
 assert.ok(trained.a.intent.x<cold.a.intent.x,'bot experiente deve preservar mais distância');
});
test('desvia de tiro visível mesmo com autor oculto',()=>{
 const {w,a,b}=setup('maze');b.x=1300;const p=shot(b,1);p.x=1070;p.y=1000;p.vx=-250;p.vy=0;p.r=16;
 w.maze.hit=(x,y,xx)=>xx===1300?.5:null;w.sense.nearby=()=>[a,b,p];botThink(w,a);
 const control=setup('maze');control.w.maze.hit=(x,y,xx)=>xx===1300?.5:null;botThink(control.w,control.a);
 assert.equal(a.enemy,null);assert.equal(a.learning.threats,undefined);
 assert.notDeepEqual([a.intent.x,a.intent.y],[control.a.intent.x,control.a.intent.y],'tiro visível deve alterar a esquiva');
});
test('renascimento real conserva evidência e outra arena começa vazia',()=>{
 const {w,a,b}=setup();observeHeavyShot(w,a,shot(b,1));observeHeavyShot(w,a,shot(b,2));
 w.kill(a,null,'teste');a.respawnAt=w.time;w.step(null);const reborn=w.tanks.find(t=>t.slot===a.slot);
 assert.equal(reborn.learning.threats.get(b.profileId),2);assert.equal(setup().a.learning.threats,undefined);
});
test('disparo real de Destroyer é reconhecido sem depender da classe',()=>{
 const {w,a,b}=setup();b.cls='Destroyer';b.aim=Math.PI;b.protect=0;w.spawnShot(b,C.Destroyer.guns[0]);const p=w.shots.at(-1);assert.ok(p);
 w.sense.nearby=()=>[a,b,p];botThink(w,a);assert.equal(a.learning.threats.get(b.profileId),1);
 botThink(w,a);assert.equal(a.learning.threats.get(b.profileId),1);
});
test('mesmo sinal visual serve a outra classe e não atribui tiro ambíguo',()=>{
 const {w,a,b}=setup();b.cls='Tank';const p=shot(b,11);observeHeavyShot(w,a,p);assert.equal(a.learning.threats.get(b.profileId),1);
 const other={...b,id:999,profileId:'open:bot:99',x:b.x-5};const p2=shot(b,12);observeHeavyShot(w,a,p2,[a,b,other,p2]);assert.equal(a.learning.threats.get(b.profileId),1);
});
test('descoberta fica fora do backup e não se aplica ao multiplayer',()=>{
 vm.runInContext(fs.readFileSync('memory-codec.js','utf8'),ctx);const codec=ctx.createMemoryCodec({classes:C,newMemory:vm.runInContext('newMemory',ctx),ttl:115});
 const {w,a,b}=setup();observeHeavyShot(w,a,shot(b,1));const data=codec.serialize(a.learning,w.time);assert.ok(!data.includes('threats')&&!data.includes('seenThreatShots'));
 const multi=new Arena(12345,2,null,'both',true,'open','off',1,false,null,'multiplayer');const x=multi.tanks[0],y=multi.tanks[1];x.x=1000;x.y=1000;y.x=1100;y.y=1000;
 observeHeavyShot(multi,x,shot(y,2));assert.equal(x.learning.threats,undefined);
});
test('deduplicação expira pelo relógio e preserva tiro elegível após renascimento',()=>{
 const {w,a,b}=setup();const first=shot(b,100);first.age=0;observeHeavyShot(w,a,first);
 w.time=.1;observeHeavyShot(w,a,first);assert.equal(a.learning.threats.get(b.profileId),1);
 // Losing sight does not discard the record, including through respawn.
 const old=a.learning;w.maze={hit:()=>.5};observeHeavyShot(w,a,first);a.learning=respawnLearning(old,true);
 w.maze=null;first.age=.2;w.time=.2;observeHeavyShot(w,a,first);assert.equal(a.learning.threats.get(b.profileId),1);
 w.time=.6;const second=shot(b,101);second.age=0;observeHeavyShot(w,a,second);assert.equal(a.learning.threats.get(b.profileId),2);assert.equal(a.learning.seenThreatShots.size,1);
 for(let i=1;i<=300;i++){
   w.time=i;const p=shot(b,2000+i);p.age=0;observeHeavyShot(w,a,p);
   assert.ok(a.learning.seenThreatShots.size<=2,'histórico cresce com total de tiros');
 }
 assert.equal(a.learning.threats.get(b.profileId),3);
 w.time=301;const p=shot(b,999);p.age=0;observeHeavyShot(w,a,p);assert.equal(a.learning.seenThreatShots.size,1);
 w.time=302;botThink(w,a);assert.equal(a.learning.seenThreatShots.size,0);
});

test('renascimento real não duplica tiro ainda elegível',()=>{
 const {w,a,b}=setup(),p=shot(b,17);p.age=0;observeHeavyShot(w,a,p);
 w.kill(a,null,'teste');a.respawnAt=w.time;w.step(null);const next=w.tanks.find(t=>t.slot===a.slot);
 next.x=1000;next.y=1000;p.age=.05;observeHeavyShot(w,next,p,[next,b,p]);
 assert.equal(next.learning.threats.get(b.profileId),1);
});
