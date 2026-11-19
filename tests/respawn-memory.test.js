'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.split('<script id="core">')[1].split('</script>')[0];
const context = vm.createContext({console,TextEncoder});
vm.runInContext(core + '\nglobalThis.api={Arena,recordOutcome,newMemory,C,MEMORY_TTL};', context);
const {Arena, recordOutcome, newMemory, C, MEMORY_TTL} = context.api;
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','memory-codec.js'),'utf8'),context);
const codec = context.createMemoryCodec({classes:C, newMemory, ttl:MEMORY_TTL});
function arena(mode='open', learning='both', count=4) {
  return new Arena(12345,count,null,learning,true,mode,'off');
}
function respawn(w, tank) {
  const slot=tank.slot;
  w.kill(tank,null,'teste');
  tank.respawnAt=w.time;
  w.step(null);
  return w.tanks.find(t=>!t.human&&t.slot===slot);
}
test('aprende, morre e renasce com identidade e evidência intactas', () => {
  const w=arena(), a=w.tanks[0], enemy=w.tanks[1];
  w.tick=4800;w.time=80;
  recordOutcome(a,enemy,enemy.cls,1,.4,.5,70);
  a.learning.samples=3;a.learning.escapes=2;a.learning.exchanges=1;
  const old=a.learning, record=old.classes.get('Tank|Tank');
  const b=respawn(w,a), saved=b.learning.classes.get('Tank|Tank');
  assert.notEqual(b.id,a.id);
  assert.equal(b.profileId,a.profileId);
  assert.notEqual(b.learning,old);
  assert.notEqual(saved,record);
  assert.equal(saved.time,70);
  assert.equal(saved.entries[1].sum,.4);
  assert.equal(saved.entries[1].weight,.5);
  assert.equal(b.learning.samples,3);
  assert.equal(b.learning.escapes,2);
  assert.equal(b.learning.exchanges,1);
  recordOutcome(b,enemy,enemy.cls,1,.1,.25,w.time);
  assert.ok(Math.abs(saved.entries[1].weight-(.5*Math.exp(-(w.time-70)/45)+.25))<1e-12);
  saved.entries[1].weight=3;
  assert.equal(record.entries[1].weight,.5);
  const c=respawn(w,b);
  assert.equal(c.profileId,b.profileId);
  assert.equal(c.learning.classes.get('Tank|Tank').entries[1].weight,3);
});
test('não compartilha memórias ou referências transitórias entre bots e vidas', () => {
  const w=arena(), a=w.tanks[0], enemy=w.tanks[1];
  assert.notEqual(a.profileId,enemy.profileId);
  recordOutcome(a,enemy,enemy.cls,0,.3,.4,w.time);
  Object.assign(a.learning,{foeId:enemy.id,until:123,retreat:{enemy},approach:{enemy},note:'velha'});
  a.learning.build.pressure[0]=3;
  a.memory={target:enemy};
  const b=respawn(w,a);
  assert.equal(b.learning.foes.size,0);
  assert.equal(b.learning.foeId,null);
  assert.equal(b.learning.until,0);
  assert.equal(b.learning.retreat,null);
  assert.equal(b.learning.approach,undefined);
  assert.equal(b.learning.note,'');
  assert.equal(b.learning.build.pressure[0],0);
  assert.equal(b.memory,null);
  assert.equal(enemy.learning.classes.size,0);
  assert.notEqual(b.learning,enemy.learning);
});
test('desligado continua sem aprendizado após renascer', () => {
  const w=arena('open','off'), a=w.tanks[0], b=respawn(w,a);
  assert.equal(a.learning,undefined);
  assert.equal(b.learning,undefined);
  assert.equal(b.profileId,a.profileId);
});
test('FFA, Maze e equipes executam a arena e preservam o perfil do bot', () => {
  const ids=[];
  for(const mode of ['open','maze','maze-seed','teams','four-teams','domination','mothership','tag']) {
    const w=arena(mode), a=w.tanks[0];
    recordOutcome(a,w.tanks[1],w.tanks[1].cls,0,.2,.3,w.time);
    const b=respawn(w,a);
    assert.ok(b && b!==a,mode);
    assert.equal(b.profileId,a.profileId,mode);
    assert.equal(b.learning.classes.size,1,mode);
    for(let i=0;i<10;i++)w.step(null);
    ids.push(a.profileId);
  }
  assert.equal(new Set(ids).size,ids.length);
});
test('laboratório respeita ambos, A, B e desligado', () => {
  for(const [mode,expected] of [['both',[true,true]],['a',[true,false]],['b',[false,true]],['off',[false,false]]]) {
    const w=new Arena(123,2,['Tank','Twin',1,false],mode,true,'open','off');
    assert.deepEqual(Array.from(w.tanks,t=>Boolean(t.learning)),expected);
    assert.equal(w.tanks[0].profileId,'lab:bot:0');
    assert.equal(w.tanks[1].profileId,'lab:bot:1');
    for(let i=0;i<10;i++)w.step(null);
  }
});
test('identidade separa multiplayer e mantém física do renascimento com seed igual', () => {
  const solo=arena('open','off'), room=new Arena(12345,4,null,'off',true,'open','off',1,false,null,'multiplayer');
  assert.notEqual(solo.tanks[0].profileId,room.tanks[0].profileId);
  const a=arena('open','both'), b=arena('open','off');
  const left=respawn(a,a.tanks[0]), right=respawn(b,b.tanks[0]);
  for(const key of ['level','goal','trait','boldness','x','y','r','hp','cls'])assert.equal(left[key],right[key],key);
  assert.deepEqual(Array.from(left.stats),Array.from(right.stats));
});
test('bot que retorna ao controle no Comboio recebe identidade do elenco', () => {
  const w=arena('convoy'), t=w.tanks[0], identity=t.profileId;
  w.setConvoyControl(t,true,'Jogador');
  w.setConvoyControl(t,false,'Bot');
  assert.equal(t.profileId,identity);
  delete t.profileId;
  w.setConvoyControl(t,true,'Jogador');
  w.setConvoyControl(t,false,'Bot');
  assert.equal(t.profileId,'convoy:bot:'+t.slot);
});
test('memória renascida continua compatível com codec 1A', () => {
  const w=arena(), a=w.tanks[0], enemy=w.tanks[1];
  recordOutcome(a,enemy,enemy.cls,1,.2,.3,w.time);
  const b=respawn(w,a);
  const restored=codec.deserialize(codec.serialize(b.learning,w.time),true,0);
  assert.equal(restored.classes.get('Tank|Tank').entries[1].hits,1);
});
test('arena com 36 bots avança e mantém perfis distintos', () => {
  const w=arena('open','both',36);
  for(let i=0;i<120;i++)w.step(null);
  assert.equal(new Set(w.tanks.map(t=>t.profileId)).size,36);
  const before=w.tanks[0], after=respawn(w,before);
  assert.equal(after.profileId,before.profileId);
});

