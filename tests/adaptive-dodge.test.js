'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const c=vm.createContext({console,TextEncoder});vm.runInContext(fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0]+';globalThis.api={Arena,C,changeClass}',c);const {Arena,C,changeClass}=c.api;
for(const map of ['open','maze'])test('projétil pesado real de jogador pode atingir bot em '+map,()=>{const w=new Arena(88,2,null,'both',true,map,'off'),[bot,human]=w.tanks;human.human=true;w.human=human;if(w.maze)w.maze.hit=()=>null;changeClass(human,'Destroyer',true);Object.assign(bot,{x:1000,y:1000,px:1000,py:1000,protect:0});Object.assign(human,{x:1300,y:1000,px:1300,py:1000,aim:Math.PI,protect:0});w.shapes=[];w.shots=[];w.spawnShot(human,C.Destroyer.guns[0]);const p=w.shots.at(-1);assert.ok(p&&p.owner===human&&p.r>=human.r*.75);Object.assign(p,{px:bot.x+80,py:bot.y,x:bot.x,y:bot.y,bornTick:-1});w.solid.clear();w.ballistic.clear();w.solid.add(bot);w.ballistic.add(p);const hp=bot.hp;w.collidingShots();assert.ok(bot.hp<hp);});
const cp=require('node:child_process');
function firstDodge(reference,map,dist,dy){let html=reference?cp.execFileSync('git',['show','633a120:index.html'],{encoding:'utf8'}):fs.readFileSync('index.html','utf8');let code=html.split('<script id="core">')[1].split('</script>')[0];code=code.replace('  if(!zoneUrgent&&!t.fallingBack&&!support&&!outnumbered&&!dodge){','  globalThis.probe(w,t,bestOffset);\n  if(!zoneUrgent&&!t.fallingBack&&!support&&!outnumbered&&!dodge){');const x=vm.createContext({console,TextEncoder});vm.runInContext(code+';globalThis.api={Arena,C,changeClass}',x);const w=new x.api.Arena(1,2,null,'both',true,map,'off'),[a,b]=w.tanks;b.human=true;w.human=b;if(w.maze)w.maze.hit=()=>null;x.api.changeClass(b,'Destroyer',true);Object.assign(a,{x:1000,y:1000,px:1000,py:1000,protect:0});Object.assign(b,{x:1000+dist,y:1000+dy,px:1000+dist,py:1000+dy,aim:Math.atan2(-dy,-dist),protect:0});w.shapes=[];w.formTarget=0;w.shots=[];w.spawnShot(b,x.api.C.Destroyer.guns[0]);let first=null;x.probe=(world,t,o)=>{if(t===a&&Math.abs(o)>.6&&first===null)first=world.tick;};for(let i=0;i<90&&a.alive;i++)w.step({x:0,y:0,aim:b.aim,fire:false,alt:false});return first;}
test('reação básica do bot inicia mais tarde contra o mesmo tiro humano',()=>{const before=firstDodge(true,'open',260,60),after=firstDodge(false,'open',260,60);console.log('primeiro desvio: base',before,'básica',after);assert.equal(before,6);assert.equal(after,11);});
function emergency(reference,results){let html=reference?cp.execFileSync('git',['show','633a120:index.html'],{encoding:'utf8'}):fs.readFileSync('index.html','utf8');const x=vm.createContext({console,TextEncoder});vm.runInContext(html.split('<script id="core">')[1].split('</script>')[0]+';globalThis.api={Arena,C,changeClass,botThink}',x);const w=new x.api.Arena(1,2,null,'both',true,'open','off'),[a,b]=w.tanks;b.human=true;x.api.changeClass(b,'Destroyer',true);Object.assign(a,{x:1000,y:1000,px:1000,py:1000,protect:0});Object.assign(b,{x:1260,y:1060,px:1260,py:1060,aim:Math.PI,protect:0});w.shapes=[];w.shots=[];w.spawnShot(b,x.api.C.Destroyer.guns[0]);const p=w.shots.at(-1);Object.assign(p,{x:1070,y:1000,px:1074,py:1000,vx:-400,vy:0});w.sense.nearby=()=>[a,b,p];if(results)a.learning.dodgeResults=results;x.api.botThink(w,a);return [a.intent.x,a.intent.y];}
test('risco imediato preserva decisão defensiva da base',()=>{const a=emergency(true),b=emergency(false);console.log('emergência',a,b);assert.deepEqual(b,a);assert.deepEqual(emergency(false,[{count:1,safe:0},{count:1,safe:1}]),a);assert.ok(Math.hypot(...b)>.4);});

const {prepareDodgeEncounter, playDodgeEncounter, trainDodge}=require('./dodge-encounter');
const api=vm.runInContext('({Arena,C,changeClass,chooseDodgeTiming,respawnLearning,newMemory})',c);
const recorded=results=>results?.map(({count,safe})=>[count,safe]);

test('resultados de dois encontros reais antecipam a reação ao mesmo disparo humano',()=>{
  const {basic,early}=trainDodge(api);
  assert.deepEqual(Array.from(recorded(basic.results)),[[1,0],[0,0]]);
  assert.deepEqual(Array.from(recorded(early.results)),[[1,0],[1,1]]);
  for(const [map,expected] of [['open',[[11,true],[6,false]]],['maze',[[21,false],[16,false]]]]){
    const experienced=prepareDodgeEncounter(api,map,early.results);
    const memory=experienced.bot.learning;
    assert.equal(api.chooseDodgeTiming(memory),1);
    assert.equal(api.chooseDodgeTiming({...memory,dodgeResults:undefined}),0);
    const novice=playDodgeEncounter(api,map), trained=playDodgeEncounter(api,map,early.results);
    assert.deepEqual([[novice.first,novice.hit],[trained.first,trained.hit]],expected);
    assert.equal(trained.results[1].count,2);
    console.log(map, 'novato / experiente:', JSON.stringify(expected));
  }
});

test('colisão com tiro de terceiro cancela a tentativa sem crédito',()=>{
  const {world,bot,shot,command}=prepareDodgeEncounter(api,'open');
  while(world.tick<30&&!bot.dodgeAttempt)world.step(command);
  assert.equal(bot.dodgeAttempt?.p,shot);
  assert.equal(bot.dodgeAttempt.executed,true);
  const third=world.spawnTank('Terceiro',true,2,30,'Destroyer',1600,1600,true,null,null,false);
  third.stats[5]=7;
  world.spawnShot(third, C.Destroyer.guns[0]);
  const intercept=world.shots.at(-1);
  assert.equal(intercept.owner,third);
  Object.assign(intercept,{x:shot.x,y:shot.y,px:shot.x,py:shot.y,bornTick:-1});
  world.solid.clear();
  world.ballistic.clear();
  world.ballistic.add(shot);
  world.ballistic.add(intercept);
  const remove=world.removeShot;
  let interceptedBy;
  world.removeShot=function(p,by){
    if(p===shot)interceptedBy=by;
    return remove.call(this,p,by);
  };
  world.collidingShots();
  assert.equal(interceptedBy,third);
  world.step(command);
  assert.equal(shot.alive,false);
  assert.equal(bot.dodgeAttempt,null);
  assert.equal(bot.learning.dodgeResults,undefined);
});

test('dano de outro projétil não encerra a tentativa em andamento',()=>{
  const {world,bot,human,shot,command}=prepareDodgeEncounter(api,'open');
  while(world.tick<30&&!bot.dodgeAttempt)world.step(command);
  const attempt=bot.dodgeAttempt;
  assert.equal(attempt?.p,shot);
  world.spawnShot(human,C.Destroyer.guns[0]);
  const other=world.shots.at(-1);
  assert.notEqual(other,shot);
  Object.assign(other,{px:bot.x+80,py:bot.y,x:bot.x,y:bot.y,bornTick:-1});
  world.solid.clear();
  world.ballistic.clear();
  world.solid.add(bot);
  world.ballistic.add(other);
  const hp=bot.hp;
  world.collidingShots();
  assert.ok(bot.hp<hp);
  assert.equal(bot.dodgeAttempt,attempt);
  assert.equal(bot.learning.dodgeResults,undefined);
});

test('bala pesada que já passa longe não gera crédito',()=>{
  const {world,bot,shot,command}=prepareDodgeEncounter(api,'open');
  shot.vx=0;
  shot.vy=-Math.abs(shot.vy)-400;
  for(let i=0;i<85&&shot.alive;i++){
    world.step(command);
    assert.ok(!bot.dodgeAttempt);
  }
  assert.equal(bot.learning.dodgeResults,undefined);
});

test('resultados sobrevivem ao renascimento e ficam fora do backup',()=>{
  const {early}=trainDodge(api);
  const {world,bot,command}=prepareDodgeEncounter(api,'open',early.results);
  world.kill(bot,null,'teste');
  bot.respawnAt=world.time;
  world.step(command);
  const reborn=world.tanks.find(t=>t.slot===bot.slot);
  assert.notEqual(reborn,bot);
  assert.equal(api.chooseDodgeTiming(reborn.learning),1);
  assert.notEqual(reborn.learning.dodgeResults,bot.learning.dodgeResults);
  assert.equal(reborn.dodgeAttempt,undefined);
  const codecContext=c;
  vm.runInContext(fs.readFileSync('memory-codec.js','utf8'),codecContext);
  const codec=codecContext.createMemoryCodec({classes:C,newMemory:api.newMemory,ttl:115});
  assert.ok(!codec.serialize(reborn.learning,world.time).includes('dodgeResults'));
  const multiplayer=prepareDodgeEncounter(api,'open',early.results);
  multiplayer.world.profileRoster='multiplayer';
  for(let i=0;i<80&&multiplayer.shot.alive;i++){
    multiplayer.world.step(multiplayer.command);
    assert.ok(!multiplayer.bot.dodgeAttempt);
  }
  assert.deepEqual(Array.from(recorded(multiplayer.bot.learning.dodgeResults)),[[1,0],[1,1]]);
});
