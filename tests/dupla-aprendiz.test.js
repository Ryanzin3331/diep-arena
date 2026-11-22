'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const {Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp,createApprenticeStorage}=
  vm.runInNewContext(core+';({Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp,createApprenticeStorage})',{TextEncoder});

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
  const trained=newApprenticeSession(),farmOnly=newApprenticeSession(true,0);
  for(const seed of [9,23,42,169,384,440]){
    prepare(seed,trained);
    prepare(seed,farmOnly);
  }
  assert.ok(trained.brains.every(brain=>[...brain.values()].flat().some(row=>row.hits>0&&row.reward>0)));
  trained.train=farmOnly.train=false;
  const novice=[],experienced=[],farmXp=[],contacts=[],beforeContact=[];
  let choicesChanged=0;
  for(const seed of [7102,7103,4231,9731,777,1050]){
    const fresh=newApprenticeSession(false);
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
  const first=createApprenticeStorage(storage),session=first.load(),arena=prepare(9,session);
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
