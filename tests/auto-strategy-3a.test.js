'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({console,TextEncoder});vm.runInContext(fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0]+';globalThis.api={Arena,C,botThink}',ctx);const {Arena,C,botThink}=ctx.api;
function setup(){const w=new Arena(12345,2,null,'both',true,'open','off'),[a,b]=w.tanks;Object.assign(a,{x:1000,y:1000,px:1000,py:1000,aim:0,protect:0,level:30,hp:100});Object.assign(b,{x:1300,y:1000,px:1300,py:1000,aim:Math.PI,protect:0,level:30,hp:100});w.shapes=[];w.shots=[];a.learning.threats=new Map([[b.profileId,2]]);w.sense.nearby=()=>[a,b];return {w,a,b};}
function strike(w,from,to){w.spawnShot(from,C.Tank.guns[0]);const p=w.shots.at(-1);Object.assign(p,{px:to.x-80,py:to.y,x:to.x,y:to.y,bornTick:-1});w.solid.clear();w.ballistic.clear();w.solid.add(to);w.ballistic.add(p);w.collidingShots();}
test('botThink abre tentativa, dano real registra troca e janela produz resultado',()=>{const {w,a,b}=setup();botThink(w,a);assert.ok(a.learning.heavyAttempt,'tentativa não aberta');strike(w,a,b);strike(w,b,a);const attempt=a.learning.heavyAttempt;assert.ok(attempt.dealt>0&&attempt.taken>0);w.time=2.1;botThink(w,a);assert.ok(a.learning.heavyResults[attempt.choice].count>0);});
test('perda de alvo ou substituição por classe encerra tentativa',()=>{const {w,a,b}=setup();botThink(w,a);assert.ok(a.learning.heavyAttempt);w.sense.nearby=()=>[a];botThink(w,a);assert.equal(a.learning.heavyAttempt,null);assert.equal(a.learning.heavyResults,undefined);w.sense.nearby=()=>[a,b];botThink(w,a);assert.ok(a.learning.heavyAttempt);a.cls='Trapper';botThink(w,a);assert.equal(a.learning.heavyAttempt,null);});
test('dois Tanks aprendem escolhas diferentes por colisões da Arena',()=>{
 function train(preferFlank){const {w,a,b}=setup();for(let round=0;round<2;round++){
   botThink(w,a);const attempt=a.learning.heavyAttempt;assert.ok(attempt,'tentativa '+round);assert.equal(attempt.choice,round);
   const good=(round===0)===preferFlank;
   function impact(from,to,damage){w.spawnShot(from,C.Tank.guns[0]);const p=w.shots.at(-1);p.damage=damage;Object.assign(p,{px:to.x-80,py:to.y,x:to.x,y:to.y,bornTick:-1});w.solid.clear();w.ballistic.clear();w.solid.add(to);w.ballistic.add(p);w.collidingShots();}
   impact(a,b,good?20:3);impact(b,a,good?3:20);assert.ok(attempt.dealt>0&&attempt.taken>0);
   w.time+=2.1;a.hp=b.hp=100;botThink(w,a);
 }
 return {a,b,w};}
 const trainedFlank=train(true),trainedDistance=train(false),flank=setup(),distance=setup();
 for(const [source,dest] of [[trainedFlank,flank],[trainedDistance,distance]]){
   dest.a.learning.heavyResults=source.a.learning.heavyResults.map(row=>({...row}));dest.a.learning.heavyTrials=source.a.learning.heavyTrials;
   botThink(dest.w,dest.a);
 }
 assert.equal(flank.a.learning.heavyAttempt.choice,0);assert.equal(distance.a.learning.heavyAttempt.choice,1);
 console.log('flanco',JSON.stringify(flank.a.learning.heavyResults),'distância',JSON.stringify(distance.a.learning.heavyResults));
});
test('sem interação não há pontuação positiva; renascimento copia só agregado',()=>{const {w,a,b}=setup();botThink(w,a);assert.ok(a.learning.heavyAttempt);w.time=2.1;botThink(w,a);assert.equal(a.learning.heavyResults,undefined);strike(w,a,b);w.time=4.2;botThink(w,a);const aggregate=a.learning.heavyResults;assert.ok(aggregate);w.kill(a,null,'teste');a.respawnAt=w.time;w.step(null);const next=w.tanks.find(t=>t.slot===a.slot);assert.deepEqual(JSON.stringify(next.learning.heavyResults),JSON.stringify(aggregate));assert.ok(next.learning.heavyAttempt==null);});
test('multiplayer e backup não incorporam tentativa ou agregado',()=>{const {w,a,b}=setup();w.profileRoster='multiplayer';botThink(w,a);assert.equal(a.learning.heavyAttempt,undefined);vm.runInContext(fs.readFileSync('memory-codec.js','utf8'),ctx);const codec=ctx.createMemoryCodec({classes:C,newMemory:vm.runInContext('newMemory',ctx),ttl:115});a.learning.heavyResults=[{sum:1,count:1},{sum:0,count:0}];assert.ok(!codec.serialize(a.learning,w.time).includes('heavyResults'));});
test('troca automática de rival não credita tiro antigo à nova tentativa',()=>{const {w,a,b}=setup();botThink(w,a);const first=a.learning.heavyAttempt;assert.ok(first);w.spawnShot(a,C.Tank.guns[0]);const old=w.shots.at(-1);const rival=w.spawnTank('Outro',false,7,30,'Tank',1300,1000,true);rival.protect=0;a.learning.threats.set(rival.profileId,2);w.sense.nearby=()=>[a,rival];botThink(w,a);const second=a.learning.heavyAttempt;assert.ok(second&&second!==first);assert.equal(second.rivalId,rival.id);Object.assign(old,{px:b.x-80,py:b.y,x:b.x,y:b.y,bornTick:-1});w.solid.clear();w.ballistic.clear();w.solid.add(b);w.ballistic.add(old);const hp=b.hp;w.collidingShots();assert.ok(b.hp<hp);assert.equal(second.dealt,0);});
test('dano depois do prazo não é atribuído antes do próximo pensamento',()=>{const {w,a,b}=setup();botThink(w,a);const attempt=a.learning.heavyAttempt;w.time=attempt.until+.01;strike(w,a,b);strike(w,b,a);assert.equal(attempt.dealt,0);assert.equal(attempt.taken,0);});
test('janelas vazias não impedem exploração periódica de flanco e distância',()=>{
 const choose=vm.runInContext('chooseHeavyResponse',ctx),finish=vm.runInContext('finishHeavyAttempt',ctx),m={heavyTrials:0};const sequence=[];
 for(let i=0;i<13;i++){const choice=choose(m);sequence.push(choice);m.heavyAttempt={choice,dealt:0,taken:0};m.heavyTrials++;finish(m);}
 assert.equal(m.heavyResults,undefined);assert.deepEqual(sequence.slice(0,2),[0,1]);assert.equal(sequence[5],0);assert.equal(sequence[11],1);
});
test('resultados próprios continuam escolhendo a melhor resposta fora da exploração',()=>{
 const choose=vm.runInContext('chooseHeavyResponse',ctx),m={heavyTrials:3,heavyResults:[{sum:.7,count:1},{sum:-.4,count:1}]};assert.equal(choose(m),0);m.heavyResults=[{sum:-.4,count:1},{sum:.7,count:1}];assert.equal(choose(m),1);m.heavyTrials=5;assert.equal(choose(m),0);
});
test('resposta de distância aproxima, estabiliza e afasta conforme alcance real',()=>{
 for(const [distance,expected] of [[200,'afasta'],[380,'faixa'],[520,'aproxima']]){
  const {w,a,b}=setup();b.x=b.px=a.x+distance;b.cls='Destroyer';a.learning.heavyTrials=2;botThink(w,a);
  console.log('distância:',distance,'radial:',a.intent.x,'tiro:',a.intent.fire);
  if(expected==='afasta')assert.ok(a.intent.x<-.1,'perto deve afastar');
  if(expected==='faixa'){assert.ok(Math.abs(a.intent.x)<.2,'na faixa deve manter distância');assert.ok(a.intent.fire,'deve poder atirar na faixa');}
  if(expected==='aproxima')assert.ok(a.intent.x>.1,'longe deve aproximar');
 }
});

test('na mesma situação flanco e distância mantêm movimentos distintos',()=>{
 const flank=setup(),distance=setup();for(const g of [flank,distance]){g.b.x=g.b.px=g.a.x+380;g.b.cls='Destroyer';}
 flank.a.learning.heavyTrials=0;distance.a.learning.heavyTrials=2;botThink(flank.w,flank.a);botThink(distance.w,distance.a);
 assert.notDeepEqual([flank.a.intent.x,flank.a.intent.y],[distance.a.intent.x,distance.a.intent.y]);
});
test('interceptação real credita apenas tiro pesado do rival em risco e tentativa ativa',()=>{
 function run(kind){
  const {w,a,b}=setup();b.cls='Destroyer';botThink(w,a);const attempt=a.learning.heavyAttempt;assert.ok(attempt);
  if(kind==='antiga'){w.spawnShot(a,C.Tank.guns[0]);const old=w.shots.at(-1);w.time=2.1;botThink(w,a);assert.notEqual(a.learning.heavyAttempt,attempt);var own=old;}
  else{w.spawnShot(a,C.Tank.guns[0]);var own=w.shots.at(-1);}
  let rival=b;if(kind==='terceiro'){rival=w.spawnTank('Outro',false,7,30,'Destroyer',1300,1000,true);rival.protect=0;}
  w.spawnShot(rival,C.Destroyer.guns[0]);const hostile=w.shots.at(-1);
  Object.assign(own,{px:1120,py:1000,x:1140,y:1000,bornTick:-1,damage:1000,dur:1000});
  Object.assign(hostile,{px:1160,py:1000,x:1140,y:1000,bornTick:-1,r:30,dur:1,vx:kind==='fora'?0:-400,vy:kind==='fora'?400:0});
  w.ballistic.clear();w.solid.clear();w.ballistic.add(own);w.ballistic.add(hostile);w.collidingShots();assert.equal(hostile.alive,false);
  return a.learning.heavyAttempt?.defensive||0;
 }
 assert.equal(run('positivo'),1);for(const kind of ['terceiro','fora','antiga'])assert.equal(run(kind),0,kind);
});
test('crédito defensivo é único por tiro hostil e limitado por tentativa',()=>{
 const {w,a,b}=setup();b.cls='Destroyer';botThink(w,a);const attempt=a.learning.heavyAttempt;
 w.spawnShot(a,C.Tank.guns[0]);const own=w.shots.at(-1);
 w.spawnShot(b,C.Destroyer.guns[0]);const shot=w.shots.at(-1);Object.assign(shot,{x:1140,y:1000,r:30,vx:-400,vy:0});
 w.creditHeavyInterception(own,shot);w.creditHeavyInterception(own,shot);assert.equal(attempt.defensive,1);
 for(let i=0;i<8;i++)w.creditHeavyInterception(own,{...shot,id:shot.id+i+100});assert.equal(attempt.defensive,3);
 w.time=2.1;botThink(w,a);assert.equal(a.learning.heavyResults[attempt.choice].sum,.06);
});
test('duelo FFA reproduzível mantém descoberta no controle e tenta 3A somente no tratamento',()=>{
 const {spawnSync}=require('node:child_process');
 function run(control){const r=spawnSync(process.execPath,['tests/measure-3a-duel.js'],{encoding:'utf8',env:{...process.env,SEED:'7102',DISTANCE:'300',TICKS:'900',CONTROL:String(control)}});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
 const control=run(1),active=run(0);assert.deepEqual(active,run(0));
 for(const r of [control,active]){assert.deepEqual(r.finalClasses,['Tank','Destroyer']);assert.ok(r.threat>=2);assert.ok(r.fired.tank>0&&r.fired.destroyer>0);}
 assert.equal(control.attempts.length,0);assert.ok(active.attempts.length>0);assert.equal(active.results,null);assert.equal(active.hits.length,0);
});
