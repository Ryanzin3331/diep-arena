'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const ctx=vm.createContext({console,TextEncoder});
vm.runInContext(core+'\nglobalThis.api={Arena,recordOutcome,C,newMemory,MEMORY_TTL}',ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','memory-codec.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','memory-store.js'),'utf8'),ctx);
const {Arena,recordOutcome,C,newMemory,MEMORY_TTL}=ctx.api;
const codec=ctx.createMemoryCodec({classes:C,newMemory,ttl:MEMORY_TTL});
function storage(){const data=new Map();return {data,writes:0,getItem(k){return data.has(k)?data.get(k):null;},setItem(k,v){this.writes++;data.set(k,v);}};}
function manager(s){return ctx.createBotMemoryStore({storage:s,codec});}
function arena(store,scope='open',count=3,learning='both'){
  return new Arena(1234,count,null,learning,true,scope,'off',1,false,null,null,store);
}
function learn(w,slot=0,amount=.4){const a=w.tanks[slot],b=w.tanks[(slot+1)%w.tanks.length];recordOutcome(a,b,b.cls,1,amount,.5,w.time);a.learning.samples++;}
function save(w){w.botMemorySession?.save(w);}
const key=id=>'diep-arena:bot-memory:v1:'+id;
test('arena A aprende e arena B recupera somente o próprio perfil',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a,0,.4);learn(a,1,-.2);
  a.tanks[0].learning.foeId=a.tanks[1].id;a.tanks[0].learning.retreat={enemy:a.tanks[1]};
  a.tick=3000;a.time=50;save(a);
  const b=arena(m),x=b.tanks[0],y=b.tanks[1];
  assert.equal(x.profileId,a.tanks[0].profileId);assert.equal(x.learning.samples,1);
  assert.ok(Math.abs(x.learning.classes.get('Tank|Tank').entries[1].sum-.4*Math.exp(-50/45))<1e-12);
  assert.ok(y.learning.classes.get('Tank|Tank').entries[1].sum<0);
  assert.equal(x.learning.classes.get('Tank|Tank').time,0);
  assert.equal(x.learning.foes.size,0);assert.equal(x.learning.foeId,null);assert.equal(x.learning.retreat,null);
  assert.equal(x.memory,null);assert.notEqual(x.learning,y.learning);
  learn(b,0,.1);assert.equal(x.learning.samples,2);
});
test('isolamento entre modalidades, equipe e multiplayer',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a);save(a);
  const maze=arena(m,'maze');assert.equal(maze.tanks[0].learning.samples,0);learn(maze);save(maze);
  assert.ok(s.data.has(key('open:bot:0'))&&s.data.has(key('maze:bot:0')));
  const lab=new Arena(1,2,['Tank','Twin',1,false],'a',true,'open','off',1,false,null,null,m);
  assert.equal(lab.tanks[0].learning.samples,0);assert.equal(lab.tanks[1].learning,undefined);
  const before=s.writes;
  const team=arena(m,'teams');assert.equal(team.botMemorySession,null);save(team);
  const room=new Arena(1,4,null,'both',true,'open','off',1,false,null,'multiplayer',m);
  assert.equal(room.botMemorySession,null);save(room);assert.equal(s.writes,before);
});
test('desligado mantém aprendizado local sem ler ou sobrescrever dados anteriores',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a);save(a);
  const old=new Map(s.data),writes=s.writes,off=arena(null);learn(off);save(off);
  assert.equal(off.tanks[0].learning.samples,1);assert.deepEqual(s.data,old);assert.equal(s.writes,writes);
  assert.equal(arena(m).tanks[0].learning.samples,1);
  const noLearning=arena(m,'open',3,'off');save(noLearning);assert.equal(s.writes,writes);
});
test('TTL, decaimento e reinício do relógio não duplicam decaimento',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a);a.tick=2700;a.time=45;save(a);
  const b=arena(m),e=b.tanks[0].learning.classes.get('Tank|Tank');
  assert.equal(e.time,0);assert.ok(Math.abs(e.entries[1].weight-.5/Math.E)<1e-12);
  b.tick=1;b.time=1/60;learn(b);assert.ok(Math.abs(e.entries[1].weight-(.5/Math.E*Math.exp(-b.time/45)+.5))<1e-12);
  const s2=storage(),m2=manager(s2),c=arena(m2);learn(c);c.tick=6960;c.time=116;save(c);
  assert.equal(arena(m2).tanks[0].learning.classes.size,0);
});
test('dados inválidos, excesso, indisponibilidade e quota não apagam registros',()=>{
  const bad=['{',JSON.stringify({schemaVersion:2,profileId:'open:bot:0',memory:{}}),'x'.repeat(40001),
    JSON.stringify({schemaVersion:1,profileId:'open:bot:1',memory:{}})];
  for(const value of bad){const s=storage();s.data.set(key('open:bot:0'),value);const m=manager(s),a=arena(m);learn(a);save(a);assert.equal(s.data.get(key('open:bot:0')),value);}
  const s=storage(),m=manager(s),a=arena(m);learn(a);save(a);const original=s.data.get(key('open:bot:0'));
  const quota={getItem:k=>s.getItem(k),setItem(){throw Error('quota');}};
  const b=arena(manager(quota));learn(b);b.tick++;b.time=1/60;assert.doesNotThrow(()=>save(b));assert.equal(s.data.get(key('open:bot:0')),original);
  const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.doesNotThrow(()=>{const w=arena(manager(blocked));learn(w);save(w);});
});
test('uma falha de gravação pode ser repetida no mesmo tick sem perder o valor anterior',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a);save(a);
  const previous=s.data.get(key('open:bot:0'));let fail=true;
  const temporary={getItem:k=>s.getItem(k),setItem(k,v){if(fail)throw Error('quota');s.setItem(k,v);}};
  const b=arena(manager(temporary));learn(b);b.tick=1;b.time=1/60;
  save(b);assert.equal(s.data.get(key('open:bot:0')),previous);
  fail=false;save(b);assert.notEqual(s.data.get(key('open:bot:0')),previous);
});
test('restauração ocorre antes das decisões de build no nascimento',()=>{
  const instrumented=core.replace('if(!human) spendBot(t,this.time);',
    'if(!human){globalThis.observeBuild(t);spendBot(t,this.time);}');
  assert.notEqual(instrumented,core);
  const c=vm.createContext({console,TextEncoder,observeBuild:()=>{}});
  vm.runInContext(instrumented+'\nglobalThis.api={Arena,recordOutcome,C,newMemory,MEMORY_TTL}',c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','memory-codec.js'),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','memory-store.js'),'utf8'),c);
  const api=c.api,s=storage(),m=c.createBotMemoryStore({storage:s,codec:c.createMemoryCodec({classes:api.C,newMemory:api.newMemory,ttl:api.MEMORY_TTL})});
  const first=new api.Arena(2,2,null,'both',true,'open','off',1,false,null,null,m);
  api.recordOutcome(first.tanks[0],first.tanks[1],'Tank',1,.4,.5,0);first.tanks[0].learning.samples=7;
  first.botMemorySession.save(first);
  let observed;c.observeBuild=t=>{if(t.slot===0)observed=t.learning.samples;};
  new api.Arena(2,2,null,'both',true,'open','off',1,false,null,null,m);
  assert.equal(observed,7);
});
test('reduzir e aumentar elenco mantém perfis ausentes; mortos também são salvos',()=>{
  const s=storage(),m=manager(s),a=arena(m,'open',4);learn(a,3);a.kill(a.tanks[3],null,'teste');save(a);
  const small=arena(m,'open',2);learn(small);small.tick=1;small.time=1/60;save(small);
  const large=arena(m,'open',4);assert.equal(large.tanks[3].learning.samples,1);
});
test('snapshots repetidos e arenas antigas não sobrescrevem registros recentes',()=>{
  const s=storage(),m=manager(s),a=arena(m);learn(a);save(a);const count=s.writes;save(a);assert.equal(s.writes,count);
  const old=arena(m),newer=arena(m);learn(newer);newer.tick=1;newer.time=1/60;save(newer);
  const value=s.data.get(key('open:bot:0'));learn(old);old.tick=2;old.time=2/60;save(old);
  assert.equal(s.data.get(key('open:bot:0')),value);
});
test('restart e setMode reais salvam antes de trocar arenas sem duplicar snapshots',()=>{
  const app=html.split('<script id="app">')[1].split('</script>')[0];
  const lifecycle=app.slice(app.indexOf('function restart('),app.indexOf('function join()'));
  assert.ok(lifecycle.includes('function setMode('));
  const s=storage();ctx.testStorage=s;
  vm.runInContext(`
    let room=null,world,mode='watch',pending=false,paused=false,follow='leader',highlightView=null;
    let focusId=null,freeSelection=null,lastWatchChoice=0,acc=0,renderedTarget=null,humanAuto=false,optStats=false;
    let lastDraw=0,towerUiSignature='',tagChartSignature='',historyRevision=0,historySelection='',historyRows=0;
    let playerName='Teste';const HISTORY_PAGE=10,liteMode=false,camera={x:0,y:0},pointer={};
    const ui={seed:{value:1234},labLevel:{value:1},classA:{value:'Tank'},classB:{value:'Twin'},
      botCount:{value:3},learningMode:{value:'both',options:[{value:'both'},{value:'a'},{value:'b'}]},
      buildMode:{value:'adaptive'},arenaMap:{value:'open'},bossSchedule:{value:'off'},shipStart:{value:1},eventBosses:{value:'off'},
      historyActor:{},historyTeam:{},historyKind:{}};
    const el=id=>ui[id];const seedValue=()=>1234;
    const closeReplay=()=>{},cleanseInputs=()=>{},updateInterface=()=>{},setSidePanel=()=>{},closeRoom=()=>{},join=()=>{};
    const botMemoryStore=createBotMemoryStore({storage:testStorage,codec:createMemoryCodec({classes:C,newMemory,ttl:MEMORY_TTL})});
    function saveBotMemory(arena){arena?.botMemorySession?.save(arena);}
    ${lifecycle}
    globalThis.testLife={restart,setMode,get world(){return world}};
  `,ctx);
  const life=ctx.testLife;life.restart();const first=life.world;
  learn(first);life.restart();assert.equal(life.world.tanks[0].learning.samples,1);
  const count=s.writes;life.setMode('lab');
  assert.equal(s.writes,count); // same source snapshot already saved at this tick
  const lab=life.world;learn(lab);life.setMode('watch');
  assert.ok(s.data.has(key('lab:bot:0')));assert.equal(life.world.tanks[0].learning.samples,1);
});

