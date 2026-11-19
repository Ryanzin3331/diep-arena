'use strict';
(async()=>{
  const output=document.getElementById('result'),lines=[];
  const assert=(v,m)=>{if(!v)throw Error(m||'assertion failed');};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(predicate){for(let i=0;i<300;i++){if(predicate())return;await sleep(20);}throw Error('tempo esgotado');}
  async function run(name,fn){try{await fn();lines.push('PASS '+name);}catch(e){lines.push('FAIL '+name+': '+(e.stack||e));}}
  async function game(enabled){
    const frame=document.createElement('iframe');frame.style.cssText='position:absolute;left:-2000px;width:1024px;height:768px';
    frame.src='/game?enabled='+(enabled?'1':'0');document.body.append(frame);
    await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject;});
    const win=frame.contentWindow;await until(()=>win.__arenaTest?.world&&!win.__arenaTest.pendingTransition);
    win.__arenaTest.pause();return {frame,win,api:win.__arenaTest,doc:win.document};
  }
  const dom=(g,id,value)=>{g.doc.getElementById(id).value=value;};
  function learn(g,slot,n){const w=g.api.world,a=w.tanks[slot],b=w.tanks[(slot+1)%w.tanks.length];
    g.api.recordOutcome(a,b,b.cls,1,.4,.5,w.time);a.learning.samples=n;}
  let g;
  await run('inicialização IndexedDB habilitada',async()=>{g=await game(true);assert(g.api.world.botMemorySession);});
  if(!g){output.textContent=lines.join('\n')+'\nFAILED';return;}
  await run('duas arenas preservam perfil e carregam antes da build',async()=>{
    const old=g.api.world;learn(g,0,9);let beforeBuild;
    g.win.__beforeBotBuild=t=>{if(t.slot===0)beforeBuild=t.learning?.samples;};
    await g.api.restart();g.api.pause();assert(g.api.world!==old);assert(g.api.world.tanks[0].profileId===old.tanks[0].profileId);
    assert(g.api.world.tanks[0].learning.samples===9);assert(beforeBuild===9);g.win.__beforeBotBuild=null;
  });
  await run('legado localStorage permanece intocado',async()=>{
    const key='diep-arena:bot-memory:v1:open:bot:0';g.win.localStorage.setItem(key,'backup legado');
    await g.api.restart();g.api.pause();assert(g.win.localStorage.getItem(key)==='backup legado');
  });
  await run('salvamento atrasado é aguardado antes de substituir arena',async()=>{
    const old=g.api.world,original=old.botMemorySession;let release;const gate=new Promise(r=>release=r);
    old.botMemorySession={load:original.load,save(arena){const pending=original.save(arena);return gate.then(()=>pending);}};
    dom(g,'seed','4001');const pending=g.api.restart();await sleep(50);assert(g.api.world===old);
    release();await pending;assert(g.api.world!==old&&g.api.world.seed===4001);g.api.pause();
  });
  await run('reinício atrasado mantém arena até a carga terminar',async()=>{
    const original=g.api.bridge;let release;const gate=new Promise(r=>release=r);let entered=false;
    g.api.bridge={prepare:async scope=>{entered=true;await gate;return original.prepare(scope);}};
    const old=g.api.world,p=g.api.restart();await until(()=>entered);assert(g.api.world===old);release();await p;assert(g.api.world!==old);g.api.pause();g.api.bridge=original;
  });
  await run('dois reinícios rápidos só instalam o pedido mais recente',async()=>{
    const original=g.api.bridge;let release;const gate=new Promise(r=>release=r);let entered=false;
    g.api.bridge={prepare:async scope=>{entered=true;await gate;return original.prepare(scope);}};
    dom(g,'seed','1001');const a=g.api.restart();await until(()=>entered);
    dom(g,'seed','1002');const b=g.api.restart();release();await Promise.all([a,b]);
    assert(g.api.world.seed===1002);g.api.pause();g.api.bridge=original;
  });
  await run('troca de modo durante carga não instala arena antiga',async()=>{
    const original=g.api.bridge;let release;const gate=new Promise(r=>release=r);let entered=false;
    g.api.bridge={prepare:async scope=>{entered=true;await gate;return original.prepare(scope);}};
    const pending=g.api.restart();await until(()=>entered);g.api.setMode('lab');release();await pending;
    await until(()=>!g.api.pendingTransition&&g.api.world.duel);assert(g.api.mode==='lab');g.api.pause();g.api.bridge=original;
  });
  await run('laboratório respeita aprendizado seletivo A/B',async()=>{
    dom(g,'learningMode','a');await g.api.restart();g.api.pause();assert(!!g.api.world.tanks[0].learning&&!g.api.world.tanks[1].learning);
    dom(g,'learningMode','b');await g.api.restart();g.api.pause();assert(!g.api.world.tanks[0].learning&&!!g.api.world.tanks[1].learning);
  });
  await run('falha na abertura não impede reinício',async()=>{
    const original=g.api.bridge;g.api.bridge=g.api.failingBridge();await g.api.restart();
    assert(g.api.world&&!g.api.world.botMemorySession);g.api.pause();g.api.bridge=original;
  });
  await run('sessão invalidada por exclusão não restaura dados',async()=>{
    await g.api.restart();g.api.pause();const db=await g.api.database();await db.clear();
    await g.api.restart();g.api.pause();assert(g.api.world.tanks[1].learning.samples===0);db.close();
  });
  await run('falha de salvamento não impede próxima arena',async()=>{
    const original=g.api.bridge;g.api.bridge={prepare:async scope=>{const prepared=await original.prepare(scope);if(!prepared)return null;
      return {open:s=>{const view=prepared.open(s);return {load:view.load,save:()=>Promise.reject(Error('falha de teste'))};}};}};
    await g.api.restart();g.api.pause();await g.api.restart();assert(g.api.world);g.api.pause();g.api.bridge=original;
  });
  await run('FFA e ambos os Maze funcionam com 36 bots',async()=>{
    g.api.setMode('watch');await until(()=>!g.api.pendingTransition&&!g.api.world.duel);
    dom(g,'learningMode','both');dom(g,'botCount','36');
    for(const map of ['open','maze','maze-seed']){dom(g,'arenaMap',map);await g.api.restart();g.api.pause();assert(g.api.world.tanks.length===36);for(let i=0;i<8;i++)g.api.world.step(null);}
  });
  await run('renascimento mantém memória sem referências antigas',async()=>{
    const w=g.api.world,a=w.tanks[0];learn(g,0,4);a.learning.foeId=999;w.kill(a,null,'teste');a.respawnAt=w.time;w.step(null);
    const b=w.tanks.find(t=>t.slot===a.slot);assert(b!==a&&b.profileId===a.profileId&&b.learning.samples===4&&b.learning.foeId===null);
  });
  await run('entrada multiplayer é imediata e retorno aguarda snapshot local',async()=>{
    const local=g.api.world,original=local.botMemorySession;let release;const gate=new Promise(r=>release=r);
    local.botMemorySession={load:original.load,save(arena){const pending=original.save(arena);return gate.then(()=>pending);}};
    g.api.enterRoomWorld({round:2,restartOnDeath:false},42,4);
    const room=g.api.world;assert(room!==local&&room.profileRoster==='multiplayer');
    const back=g.api.restart();await sleep(50);assert(g.api.world===room,'não aguardou snapshot pendente');
    release();await back;assert(g.api.world!==room);g.api.pause();
  });
  await run('multiplayer cria arena sem consultar armazenamento',async()=>{
    let calls=0;const original=g.api.bridge;g.api.bridge={prepare:async()=>{calls++;throw Error('multiplayer consultou banco');}};
    g.api.enterRoomWorld({round:2,restartOnDeath:false},17,4);assert(g.api.world.profileRoster==='multiplayer'&&!g.api.world.botMemorySession&&calls===0);g.api.pause();g.api.bridge=original;
  });
  await run('desligado não abre ou grava IndexedDB',async()=>{
    const off=await game(false);assert(!off.api.world.botMemorySession);const result=off.api.restart();assert(!result?.then);assert(!off.api.world.botMemorySession&&off.win.__idbCalls===0);off.frame.remove();
  });
  await run('comparação de desempenho com 36 bots',async()=>{
    const off=await game(false),on=await game(true);dom(off,'botCount','36');dom(on,'botCount','36');
    async function sample(x,seed){dom(x,'arenaMap','open');dom(x,'seed',String(seed));const start=performance.now();await x.api.restart();x.api.pause();const loaded=performance.now();for(let i=0;i<120;i++)x.api.world.step(null);const simulated=performance.now();await x.api.restart();x.api.pause();const done=performance.now();return {total:done-start,simulation:simulated-loaded,transitions:loaded-start+done-simulated};}
    await sample(off,71);await sample(on,71);const a=[],b=[];
    for(let i=0;i<3;i++){if(i%2){b.push(await sample(on,72+i));a.push(await sample(off,72+i));}else{a.push(await sample(off,72+i));b.push(await sample(on,72+i));}}
    const median=(x,k)=>x.map(v=>v[k]).sort((u,v)=>u-v)[1];lines.push('METRIC 36 bots total desligado='+median(a,'total').toFixed(1)+'ms ligado='+median(b,'total').toFixed(1)+'ms; simulação desligado='+median(a,'simulation').toFixed(1)+'ms ligado='+median(b,'simulation').toFixed(1)+'ms; transições desligado='+median(a,'transitions').toFixed(1)+'ms ligado='+median(b,'transitions').toFixed(1)+'ms');
    off.frame.remove();on.frame.remove();
  });
  g.frame.remove();output.textContent=lines.join('\n')+'\n'+(lines.some(x=>x.startsWith('FAIL'))?'FAILED':'ALL PASSED');
})();

