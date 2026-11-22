'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const {Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp}=
  vm.runInNewContext(core+';({Arena,newApprenticeSession,APPRENTICE_PREP,GUARDIAN,APPRENTICE_GUARDIAN,apprenticeXp})',{TextEncoder});

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
  const trained=newApprenticeSession();
  for(const seed of [9,23,42,169,384,440])prepare(seed,trained);
  assert.ok(trained.brains.every(brain=>[...brain.values()].flat().some(row=>row.hits>0&&row.reward>0)));
  trained.train=false;
  const novice=[],experienced=[];
  for(const seed of [7102,7103,4231,9731,777,1050]){
    const fresh=newApprenticeSession(false);
    const base=prepare(seed,fresh),learned=prepare(seed,trained);
    novice.push(apprenticeXp(base.apprentice.prep));
    experienced.push(apprenticeXp(learned.apprentice.prep));
    assert.ok(fresh.brains.every(brain=>brain.size===0));
  }
  const sum=values=>values.reduce((total,value)=>total+value,0);
  assert.ok(sum(experienced)>sum(novice)*1.25,JSON.stringify({novice,experienced}));
});
