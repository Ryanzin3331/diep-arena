'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const {Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp,createApprenticeStorage,C,apprenticeCoopOptions,selectApprenticeCoop}=
  vm.runInNewContext(core+';({Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp,createApprenticeStorage,C,apprenticeCoopOptions,selectApprenticeCoop})',{TextEncoder});

function lab(seed,session,memoryStore=null){
  return new Arena(seed,2,['Tank','Tank',1,'guardian',session],'both',true,'open','off',1,false,null,null,memoryStore);
}
function prepare(seed,session){
  const arena=lab(seed,session);
  while(!arena.apprentice.prep)arena.step(null);
  return arena;
}

test('dois Tanks começam no nível 1 com memórias vazias e independentes',()=>{
  const session=newApprenticeSession();
  const arena=lab(9,session,{open(){throw Error('A memória normal não pertence à Dupla Aprendiz');}});
  assert.equal(arena.tanks.length,2);
  for(const tank of arena.tanks){
    assert.equal(tank.level,1);
    assert.equal(tank.cls,'Tank');
    assert.ok(tank.stats.every(level=>level===0));
    assert.equal(tank.learning,undefined);
    assert.equal(tank.apprentice.action,null);
  }
  assert.equal(arena.boss,null);
  assert.equal(arena.allies(...arena.tanks),true);
  assert.notEqual(session.brains[0],session.brains[1]);
  assert.ok(session.brains.every(brain=>brain.size===0));
});

test('o Guardião aparece aos 90 segundos e usa a variante exclusiva do modo',()=>{
  const session=newApprenticeSession();
  const arena=prepare(9,session);
  assert.equal(arena.time,APPRENTICE_PREP);
  assert.equal(arena.boss.spec,APPRENTICE_GUARDIAN);
  assert.ok(arena.apprentice.prep.some(t=>t.xp>0&&t.level>1&&t.stats.some(Boolean)));
  assert.deepEqual(session.rounds.get(9).first,arena.apprentice.prep);
  const normal=new Arena(9,2,['Tank','Tank',15,'guardian']);
  assert.equal(normal.boss.spec,GUARDIAN);
  const memory=JSON.stringify(session.brains.map(brain=>[...brain]));
  for(let tick=0;tick<60&&!arena.duelEnded;tick++)arena.step(null);
  assert.equal(JSON.stringify(session.brains.map(brain=>[...brain])),memory);
});

test('experiência de outras seeds aumenta o XP de preparação nas mesmas seeds de avaliação',()=>{
  const trained=newApprenticeSession(true,.10,false),farmOnly=newApprenticeSession(true,0,false);
  for(const seed of [9,23,42,169,384,440]){
    prepare(seed,trained);
    prepare(seed,farmOnly);
  }
  assert.ok(trained.brains.every(brain=>[...brain.values()].flat().some(row=>row.hits>0&&row.reward>0)));
  trained.train=farmOnly.train=false;
  const novice=[],experienced=[],farmXp=[],contacts=[],beforeContact=[];
  let choicesChanged=0;
  for(const seed of [7102,7103,4231,9731,777,1050]){
    const fresh=newApprenticeSession(false,.10,false);
    const base=prepare(seed,fresh),learned=prepare(seed,trained);
    const prior=prepare(seed,farmOnly);
    novice.push(apprenticeXp(base.apprentice.prep));
    experienced.push(apprenticeXp(learned.apprentice.prep));
    farmXp.push(apprenticeXp(prior.apprentice.prep));
    contacts.push(learned.tanks.reduce((sum,t)=>sum+t.apprentice.prepContactHp,0));
    beforeContact.push(prior.tanks.reduce((sum,t)=>sum+t.apprentice.prepContactHp,0));
    choicesChanged+=learned.tanks.reduce((sum,t)=>sum+t.apprentice.riskChoices,0);
    assert.ok(fresh.brains.every(brain=>brain.size===0));
  }
  const sum=values=>values.reduce((total,value)=>total+value,0);
  assert.ok(sum(experienced)>sum(novice)*1.25,JSON.stringify({novice,experienced}));
  assert.ok(sum(experienced)>sum(farmXp)*.90,JSON.stringify({experienced,farmXp}));
  assert.ok(sum(contacts)<sum(beforeContact)*.5,JSON.stringify({contacts,beforeContact}));
  assert.ok(choicesChanged>0);
});

test('memória, acertos e relatório voltam após recarregar e o reset é isolado',()=>{
  const data=new Map([['outra-memoria','deve sobreviver']]);
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const first=createApprenticeStorage(storage),session=first.load();
  session.cooperation=false;
  const arena=prepare(9,session);
  while(!arena.duelEnded)arena.step(null);
  assert.ok(arena.tanks.some(t=>t.apprentice.contactHp>0));
  assert.ok(arena.tanks.some(t=>t.apprentice.bossHp>0));
  assert.ok(arena.tanks.some(t=>t.apprentice.droneHp>0));
  assert.equal(session.history.length,1);
  assert.ok(first.save(session));
  const otherTab=createApprenticeStorage(storage),loaded=otherTab.load();
  assert.equal(loaded.count,1);
  assert.equal(JSON.stringify(loaded.brains.map(brain=>[...brain])),JSON.stringify(session.brains.map(brain=>[...brain])));
  assert.deepEqual(loaded.history,session.history);
  assert.deepEqual(loaded.rounds.get(9),session.rounds.get(9));
  const second=lab(9,loaded);
  assert.equal(second.apprentice.round,2);
  assert.ok(second.tanks.every(t=>t.level===1&&t.score===0));
  assert.ok(otherTab.save(newApprenticeSession()));
  assert.equal(first.save(session),false);
  assert.equal(createApprenticeStorage(storage).load().history.length,0);
  assert.equal(data.get('outra-memoria'),'deve sobreviver');
});

test('um navegador que bloqueia salvamento permite continuar treinando na aba',()=>{
  const local=createApprenticeStorage({getItem(){throw Error('bloqueado');}});
  const session=local.load();
  assert.equal(session.count,0);
  assert.equal(local.save(session),false);
  assert.ok(local.status.includes('nesta aba'));
});

function place(t,x,y){
  Object.assign(t,{human:true,x,y,px:x,py:y,vx:0,vy:0,kx:0,ky:0,protect:0});
}
function until(arena,predicate,limit=100){
  for(let i=0;i<limit&&!predicate();i++)arena.step(null);
  assert.ok(predicate());
}
function cooperativeTarget(session,mode){
  const arena=lab(9,session),[actor,ally]=arena.tanks;
  arena.shapes=[];
  place(ally,1000,950);place(actor,1030,1200);
  arena.addShape('pentagon',1260,1075,false);
  const target=arena.shapes[0],fire=bot=>{
    bot.aim=Math.atan2(target.y-bot.y,target.x-bot.x);
    assert.ok(arena.spawnShot(bot,C.Tank.guns[0]));
    return arena.shots.at(-1);
  };
  arena.indexSense();
  const lead=fire(ally);
  until(arena,()=>lead.contacts?.has(target.id));
  const options=apprenticeCoopOptions(arena,actor);
  assert.equal(options.find(option=>option.kind==="focus")?.target,target);
  actor.apprentice.coopRandom=()=>mode==="explore"?0:.5;
  const choice=selectApprenticeCoop(arena,actor,options);
  if(!choice)return null;
  actor.apprentice.coopDecision=choice;
  const first=fire(actor),second=fire(actor);
  until(arena,()=>first.contacts?.has(target.id)&&second.contacts?.has(target.id));
  assert.equal(choice.credited,true);
  assert.equal(actor.apprentice.coopStats.focus.successes,1);
  return choice;
}

test('fogo conjunto aprende com acertos reais e conta uma única vez por tentativa',()=>{
  const session=newApprenticeSession();
  for(let round=0;round<3;round++)assert.equal(cooperativeTarget(session,"explore").kind,"focus");
  const brain=session.coop[0].get('focus:form');
  assert.equal(brain.attempts,3);assert.equal(brain.successes,3);
  session.train=false;
  assert.equal(cooperativeTarget(session,"memory").experienced,true);
  assert.equal(cooperativeTarget(newApprenticeSession(false),"memory"),null);
  assert.equal(brain.attempts,3);
});

test('cobertura e abertura reconhecem bala comum e a cobertura exige interceptação real',()=>{
  const session=newApprenticeSession(),arena=lab(9,session),[actor,ally]=arena.tanks;
  arena.shapes=[];
  place(actor,1200,1000);place(ally,1100,1000);
  const owner=arena.spawnBoss('guardian');
  owner.stats=Array(8).fill(0);
  assert.ok(arena.spawnShot(owner,C.Tank.guns[0],{x:868,y:1000,aim:0,r:20}));
  const hostile=arena.shots.at(-1);
  arena.indexSense();
  const options=apprenticeCoopOptions(arena,actor);
  const cover=options.find(option=>option.kind==="cover");
  assert.equal(cover?.target,hostile);
  assert.equal(options.find(option=>option.kind==="opening")?.target,owner);
  actor.apprentice.coopRandom=()=>0;
  actor.apprentice.coopDecision=selectApprenticeCoop(arena,actor,[cover]);
  const hp=ally.hp;
  actor.aim=Math.PI;
  assert.ok(arena.spawnShot(actor,C.Tank.guns[0]));
  until(arena,()=>!hostile.alive,100);
  assert.equal(ally.hp,hp);
  assert.equal(actor.apprentice.coopStats.cover.successes,1);
  assert.equal(session.coop[0].get('cover:shot').successes,1);
});

test('a atualização carrega memórias anteriores e conserva os registros cooperativos novos',()=>{
  let raw=null;
  const local={getItem:()=>raw,setItem:(_,value)=>{raw=value;}};
  const old=createApprenticeStorage(local),session=old.load();
  session.count=2;
  session.brains[0].set('perto',Array.from({length:8},()=>({uses:6,hits:3,reward:5,contacts:2,contactHp:4})));
  old.save(session);
  const serialized=JSON.parse(raw);
  delete serialized.coop;
  raw=JSON.stringify(serialized);
  const newer=createApprenticeStorage(local),upgraded=newer.load();
  assert.equal(upgraded.count,2);
  assert.equal(upgraded.brains[0].get('perto')[0].hits,3);
  assert.ok(upgraded.coop.every(brain=>brain.size===0));
  upgraded.coop[0].set('focus:form',{attempts:3,successes:3,experienced:1});
  newer.save(upgraded);
  assert.equal(createApprenticeStorage(local).load().coop[0].get('focus:form').experienced,1);
});

test('aproveitar uma abertura exige acertar o atacante enquanto o aliado ainda é ameaçado',()=>{
  const session=newApprenticeSession(),arena=lab(9,session),[actor,ally]=arena.tanks;
  arena.shapes=[];
  place(actor,1210,950);place(ally,1100,1000);
  const owner=arena.spawnBoss('guardian');
  Object.assign(owner,{x:1150,y:1150,px:1150,py:1150,orbit:0,nextDrone:Infinity,stats:Array(8).fill(0)});
  assert.ok(arena.spawnShot(owner,C.Tank.guns[0],{x:868,y:1000,aim:0,r:20}));
  const hostile=arena.shots.at(-1);
  arena.indexSense();
  const opening=apprenticeCoopOptions(arena,actor).find(option=>option.kind==="opening");
  assert.equal(opening?.witness,hostile);
  actor.apprentice.coopRandom=()=>0;
  actor.apprentice.coopDecision=selectApprenticeCoop(arena,actor,[opening]);
  actor.aim=Math.atan2(owner.y-actor.y,owner.x-actor.x);
  assert.ok(arena.spawnShot(actor,C.Tank.guns[0]));
  const attack=arena.shots.at(-1);
  until(arena,()=>attack.contacts?.has(owner.id));
  assert.equal(hostile.alive,true);
  assert.equal(ally.alive,true);
  assert.equal(session.coop[0].get('opening:boss').successes,1);
});
