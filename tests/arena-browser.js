'use strict';
(async()=>{
  const output=document.getElementById('result'),lines=[];
  const assert=(v,m)=>{if(!v)throw Error(m||'assertion failed');};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(predicate){for(let i=0;i<300;i++){if(predicate())return;await sleep(20);}throw Error('tempo esgotado');}
  async function run(name,fn){try{await fn();lines.push('PASS '+name);output.textContent=lines.join('\n');}catch(e){lines.push('FAIL '+name+': '+(e.stack||e));output.textContent=lines.join('\n');}}
  async function game(enabled,bench=false,map="open"){
    const frame=document.createElement('iframe');frame.style.cssText='position:absolute;left:-2000px;width:1024px;height:768px';
    frame.src='/game?enabled='+(enabled==='ui'?'ui':enabled?'1':'0')+(bench?'&bench=1&map='+map:'');document.body.append(frame);
    await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject;});
    const win=frame.contentWindow;await until(()=>win.__arenaTest?.world&&!win.__arenaTest.pendingTransition);
    win.__arenaTest.pause();return {frame,win,api:win.__arenaTest,doc:win.document};
  }
  async function tabGame(){
    const win=window.open('/game?enabled=ui','_blank');assert(win,'não foi possível abrir aba de teste');
    await until(()=>win.__arenaTest?.world&&!win.__arenaTest.pendingTransition);
    win.__arenaTest.pause();return {frame:{remove:()=>win.close()},win,api:win.__arenaTest,doc:win.document};
  }
  const dom=(g,id,value)=>{g.doc.getElementById(id).value=value;};
  function learn(g,slot,n){const w=g.api.world,a=w.tanks[slot],b=w.tanks[(slot+1)%w.tanks.length];
    g.api.recordOutcome(a,b,b.cls,1,.4,.5,w.time);a.learning.samples=n;}
  const firstLegacy='diep-arena:bot-memory:v1:open:bot:0';
  localStorage.setItem(firstLegacy,JSON.stringify({schemaVersion:1,profileId:'open:bot:0',memory:{schemaVersion:1,experience:{samples:42,escapes:0,changes:0,buildChanges:0,exchanges:0},matchups:[]}}));
  let g;
  await run('primeira arena migra e restaura antes da build',async()=>{g=await game(true);assert(g.api.world.botMemorySession);assert(g.api.world.tanks[0].learning.samples===42);assert(g.win.__initialBuild===42);assert(localStorage.getItem(firstLegacy)!==null);});
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
  await run('falha de leitura legada permite jogar e repetir a migração',async()=>{
    const original=g.api.bridge,name='read-failure-'+Math.random();
    g.api.bridge=g.api.legacyBridge(name,()=>{throw Error('leitura negada');});await g.api.restart();g.api.pause();
    assert(g.api.world&&!g.api.world.botMemorySession);
    g.api.bridge=g.api.legacyBridge(name,()=>g.win.localStorage);await g.api.restart();g.api.pause();
    assert(!!g.api.world.botMemorySession);g.api.bridge=original;
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
    const off=await game(false);assert(!off.api.world.botMemorySession);const result=off.api.restart();assert(!result?.then);assert(!off.api.world.botMemorySession&&off.win.__idbCalls===0&&off.win.__legacyReads===0);off.frame.remove();
  });
  await run('comparação de desempenho com 36 bots',async()=>{
    const off=await game(false),on=await game(true);dom(off,'botCount','36');dom(on,'botCount','36');
    async function sample(x,seed){dom(x,'arenaMap','open');dom(x,'seed',String(seed));const start=performance.now();await x.api.restart();x.api.pause();const loaded=performance.now();for(let i=0;i<120;i++)x.api.world.step(null);const simulated=performance.now();await x.api.restart();x.api.pause();const done=performance.now();return {total:done-start,simulation:simulated-loaded,transitions:loaded-start+done-simulated};}
    await sample(off,71);await sample(on,71);const a=[],b=[];
    for(let i=0;i<3;i++){if(i%2){b.push(await sample(on,72+i));a.push(await sample(off,72+i));}else{a.push(await sample(off,72+i));b.push(await sample(on,72+i));}}
    const median=(x,k)=>x.map(v=>v[k]).sort((u,v)=>u-v)[1];lines.push('METRIC 36 bots total desligado='+median(a,'total').toFixed(1)+'ms ligado='+median(b,'total').toFixed(1)+'ms; simulação desligado='+median(a,'simulation').toFixed(1)+'ms ligado='+median(b,'simulation').toFixed(1)+'ms; transições desligado='+median(a,'transitions').toFixed(1)+'ms ligado='+median(b,'transitions').toFixed(1)+'ms');
    off.frame.remove();on.frame.remove();
  });
  await run('mede primeira migração e reinícios por componente',async()=>{
    for(let i=0;i<36;i++)localStorage.setItem('diep-arena:bot-memory:v1:open:bot:'+i,JSON.stringify({schemaVersion:1,profileId:'open:bot:'+i,memory:{schemaVersion:1,experience:{samples:i+1,escapes:0,changes:0,buildChanges:0,exchanges:0},matchups:[]}}));
    const start=performance.now(),bench=await game(true,true),firstTotal=performance.now()-start,first=bench.win.__metrics;
    assert(bench.api.world.tanks.length===36&&bench.api.world.tanks[0].learning.samples===1,'tanks='+bench.api.world.tanks.length+' amostras='+bench.api.world.tanks[0].learning?.samples+' métricas='+JSON.stringify(first));
    assert(first.scan.length===1&&first.migrationWrite.length===1&&first.read.length===1&&first.build.length===1,'instrumentação incompleta');
    const sum=a=>a.reduce((n,v)=>n+v,0),fmt=n=>n.toFixed(1);
    lines.push('METRIC primeira 36 bots total='+fmt(firstTotal)+'ms migração='+fmt(sum(first.migration))+'ms leitura/validação legado='+fmt(sum(first.scan))+'ms gravação migração='+fmt(sum(first.migrationWrite))+'ms leitura/validação IDB='+fmt(sum(first.read))+'ms construção='+fmt(sum(first.build))+'ms serialização snapshot='+fmt(sum(first.serialize))+'ms');
    const samples=[];
    for(let i=0;i<3;i++){
      for(let j=0;j<120;j++)bench.api.world.step(null);
      for(const key of Object.keys(first))first[key].length=0;
      const t=performance.now();await bench.api.restart();bench.api.pause();
      samples.push({total:performance.now()-t,serialize:sum(first.serialize),write:sum(first.write),read:sum(first.read),build:sum(first.build),marker:sum(first.migration)});
      assert(first.serialize.length===36&&first.write.length===1&&first.read.length===1&&first.build.length===1,'instrumentação de reinício incompleta');
    }
    const median=key=>samples.map(v=>v[key]).sort((a,b)=>a-b)[1];
    lines.push('METRIC reinícios 36 bots mediana total='+fmt(median('total'))+'ms serialização='+fmt(median('serialize'))+'ms gravação='+fmt(median('write'))+'ms leitura/validação='+fmt(median('read'))+'ms construção='+fmt(median('build'))+'ms verificação marcador='+fmt(median('marker'))+'ms');
    bench.frame.remove();
  });
  await run('mede carregamento inicial e reinícios FFA e Maze com 36 bots',async()=>{
    const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)].toFixed(1);
    for(const map of ['open','maze'])for(const enabled of [false,true]){
      const initial=[],restarts=[];
      for(let i=0;i<3;i++){
        const start=performance.now(),sample=await game(enabled,true,map);initial.push(performance.now()-start);
        assert(sample.api.world.mapKind===map&&sample.api.world.tanks.length===36);
        for(let j=0;j<5;j++){const t=performance.now();await sample.api.restart();restarts.push(performance.now()-t);sample.api.pause();}
        sample.frame.remove();
      }
      lines.push('METRIC 1E mapa='+map+' memória='+(enabled?'ligada':'desligada')+' inicial n=3 mediana='+median(initial)+'ms reinícios n=15 mediana='+median(restarts)+'ms');
    }
  });
  let ui,other,db,backupText;
  await run('controle ligado → desligado → ligado preserva backup e preferência',async()=>{
    db=await g.api.database();await db.clear();localStorage.setItem('diep-arena:bot-memory:reuse','off');
    ui=await tabGame();const select=ui.doc.getElementById('reuseBotMemory');
    assert(select.value==='off'&&!ui.api.world.botMemorySession);
    const old=ui.api.world;select.value='on';select.dispatchEvent(new ui.win.Event('change'));
    assert(ui.api.world===old&&!old.botMemorySession);await ui.api.restart();ui.api.pause();assert(ui.api.world.botMemorySession);
    learn(ui,0,14);select.value='off';select.dispatchEvent(new ui.win.Event('change'));await ui.api.restart();ui.api.pause();
    assert(!ui.api.world.botMemorySession&&ui.api.world.tanks[0].learning.samples===0);
    learn(ui,0,99);await ui.api.restart();ui.api.pause();assert(ui.api.world.tanks[0].learning.samples===0);
    select.value='on';select.dispatchEvent(new ui.win.Event('change'));await ui.api.restart();ui.api.pause();
    assert(ui.api.world.tanks[0].learning.samples===14&&localStorage.getItem('diep-arena:bot-memory:reuse')==='on');
    other=await tabGame();assert(other.doc.getElementById('reuseBotMemory').value==='on'&&other.api.world.tanks[0].learning.samples===14);
  });
  await run('exportação e importação rejeitada ou cancelada preservam dados',async()=>{
    let downloaded;ui.win.HTMLAnchorElement.prototype.click=function(){if(this.download)downloaded=ui.win.fetch(this.href).then(r=>r.text());};
    ui.doc.getElementById('exportMemory').click();await until(()=>!!downloaded);backupText=await downloaded;
    assert(JSON.parse(backupText).profiles.some(p=>p.memory.experience.samples===14));
    const before=JSON.stringify(await db.export());
    async function upload(text){const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();dt.items.add(new ui.win.File([text],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));}
    await upload('{');await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('recusada'));
    assert(JSON.stringify(await db.export())===before);
    ui.win.confirm=()=>false;await upload(backupText);await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('cancelada'));
    assert(JSON.stringify(await db.export())===before);
  });
  await run('reimportação do arquivo exportado confirma e substitui atomicamente',async()=>{
    ui.doc.getElementById('panelConfig').click();
    const parsed=JSON.parse(backupText),changed=JSON.parse(backupText);changed.profiles[0].memory.experience.samples=77;
    await db.replace(changed.profiles);const active=ui.api.world;active.tanks[0].learning.samples=88;let prompt='';ui.win.confirm=message=>{prompt=message;return true;};
    const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();dt.items.add(new ui.win.File([backupText],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));
    await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('Importação concluída'));
    const message='Importação concluída: '+parsed.profiles.length+' perfil(is). Vale para próximas arenas.';
    const visible=[...ui.doc.querySelectorAll('#memoryStatus, #memoryResult')].filter(e=>e.textContent===message&&e.getClientRects().length);
    assert(visible.length===1,'resultado de importação deve aparecer uma única vez');
    const restored=await db.export();assert(prompt.includes(String(parsed.profiles.length)));
    assert(restored.profiles.find(p=>p.profileId==='open:bot:0').memory.experience.samples===14);
    assert(ui.api.world===active&&active.tanks[0].learning.samples===88);
    await ui.api.restart();ui.api.pause();assert(ui.api.world.tanks[0].learning.samples===14);
  });
  await run('importação cancela carga antiga e prepara a arena com dados importados',async()=>{
    const original=ui.api.bridge;let release,entered=false;const gate=new Promise(r=>release=r);
    ui.api.bridge={prepare:async scope=>{const prepared=await original.prepare(scope);entered=true;await gate;return prepared;}};
    const old=ui.api.world,pending=ui.api.restart();await until(()=>entered);
    ui.doc.getElementById('memoryResult').textContent='';ui.win.confirm=()=>true;const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();
    dt.items.add(new ui.win.File([backupText],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));
    await until(()=>ui.doc.getElementById('memoryResult').textContent.includes('Importação concluída'));release();await pending;
    await until(()=>!ui.api.pendingTransition&&ui.api.world!==old);ui.api.pause();assert(ui.api.world.tanks[0].learning.samples===14);ui.api.bridge=original;
  });
  await run('importação durante entrada Survival preserva mapa e jogador',async()=>{
    dom(ui,'arenaMap','survival');await ui.api.restart();ui.api.setMode('play');
    dom(ui,'arenaMap','open');const old=ui.api.world;let release,entered=false;
    const gate=new Promise(r=>release=r),original=old.botMemorySession;
    // Force the asynchronous window even though Survival itself has no persistent session.
    old.botMemorySession={save(){entered=true;return gate;}};
    ui.api.join();await until(()=>entered&&ui.api.pendingTransition);
    ui.doc.getElementById('memoryResult').textContent='';ui.win.confirm=()=>true;const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();
    dt.items.add(new ui.win.File([backupText],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));
    await until(()=>ui.doc.getElementById('memoryResult').textContent.includes('Importação concluída'));
    release();await until(()=>!ui.api.pendingTransition&&ui.api.world!==old);
    assert(ui.api.world.survival&&ui.api.world.human?.alive,'entrada perdeu Survival ou jogador');ui.api.pause();
  });
  await run('exclusão em outra aba preserva ensaio de chefe pendente',async()=>{
    ui.api.setMode('lab');await until(()=>!ui.api.pendingTransition&&ui.api.world.duel);
    const old=ui.api.world,original=ui.api.bridge;let release,entered=false;const gate=new Promise(r=>release=r);
    old.botMemorySession={save(){entered=true;return gate;}};
    const pending=ui.api.restart('guardian');await until(()=>entered&&ui.api.pendingTransition);
    other.doc.getElementById('memoryResult').textContent='';const answers=[false,true];other.win.confirm=()=>answers.shift();other.doc.getElementById('deleteMemory').click();
    await until(()=>other.doc.getElementById('memoryResult').textContent.includes('Memórias apagadas'));
    await sleep(100);release();await pending;await until(()=>!ui.api.pendingTransition&&ui.api.world!==old);
    assert(ui.api.world.bossTrial&&ui.api.world.boss,'ensaio de chefe perdido');ui.api.pause();ui.api.bridge=original;await db.replace(JSON.parse(backupText).profiles);
  });
  await run('pedido mais recente prevalece durante operação de memória',async()=>{
    const original=ui.api.bridge;let release,entered=false;const gate=new Promise(r=>release=r);
    ui.api.bridge={prepare:async scope=>{entered=true;await gate;return original.prepare(scope);}};
    dom(ui,'seed','7311');const first=ui.api.restart();await until(()=>entered);
    ui.doc.getElementById('memoryResult').textContent='';ui.win.confirm=()=>true;
    const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();
    dt.items.add(new ui.win.File([backupText],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));
    await until(()=>ui.doc.getElementById('memoryResult').textContent.includes('Importação concluída'));
    dom(ui,'seed','7312');const latest=ui.api.restart();release();
    assert(await first===false);await latest;assert(ui.api.world.seed===7312,'pedido antigo prevaleceu');ui.api.pause();ui.api.bridge=original;
  });
  await run('falha transacional na importação preserva os dados e informa erro',async()=>{
    const before=JSON.stringify(await db.export()),original=ui.win.IDBObjectStore.prototype.put;let armed=true;
    ui.win.IDBObjectStore.prototype.put=function(...args){const result=original.apply(this,args);if(armed&&this.name==='profiles'){armed=false;this.transaction.abort();}return result;};
    try{
      ui.win.confirm=()=>true;const input=ui.doc.getElementById('memoryFile'),dt=new ui.win.DataTransfer();
      dt.items.add(new ui.win.File([backupText],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new ui.win.Event('change',{bubbles:true}));
      await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('Falha no armazenamento'));
      assert(JSON.stringify(await db.export())===before);
    }finally{ui.win.IDBObjectStore.prototype.put=original;}
  });
  await run('exclusão cancelada preserva as memórias',async()=>{
    const before=JSON.stringify(await db.export()),answers=[false,false];ui.win.confirm=()=>answers.shift();
    ui.doc.getElementById('deleteMemory').click();await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('Exclusão cancelada'));
    assert(JSON.stringify(await db.export())===before);
  });
  await run('exclusão oferece exportar backup antes da confirmação final',async()=>{
    const before=JSON.stringify(await db.export());let downloaded;
    ui.win.HTMLAnchorElement.prototype.click=function(){if(this.download)downloaded=ui.win.fetch(this.href).then(r=>r.text());};
    const answers=[true,false];ui.win.confirm=()=>answers.shift();ui.doc.getElementById('memoryResult').textContent='';
    ui.doc.getElementById('deleteMemory').click();await until(()=>ui.doc.getElementById('memoryResult').textContent.includes('Exclusão cancelada'));
    assert(downloaded&&JSON.parse(await downloaded).profiles.length>0&&JSON.stringify(await db.export())===before);
  });
  await run('configurações mostram quantidade de perfis armazenados',async()=>{
    ui.doc.getElementById('panelConfig').click();await until(()=>/perfil\(is\) de memória salvo/.test(ui.doc.getElementById('memoryStatus').textContent));
  });
  await run('controles cabem em viewport estreito simulado',async()=>{
    const mobile=await game('ui');mobile.frame.style.width='390px';mobile.doc.getElementById('panelConfig').click();
    await sleep(50);const container=mobile.doc.querySelector('.memory-actions').getBoundingClientRect();
    for(const id of ['exportMemory','importMemory','deleteMemory']){const el=mobile.doc.getElementById(id),r=el.getBoundingClientRect();
      assert(r.width>0&&r.height>=44&&r.left>=container.left-1&&r.right<=container.right+1&&el.scrollHeight<=el.clientHeight,'controle cortado: '+id);}
    mobile.frame.remove();
  });
  await run('exclusão em uma aba invalida arena e carga antiga de outra',async()=>{
    other.frame.remove();other=await tabGame();const old=other.api.world;learn(other,0,61);
    let release,entered=false;const gate=new Promise(r=>release=r),original=other.api.bridge;
    other.api.bridge={prepare:async scope=>{const prepared=await original.prepare(scope);entered=true;await gate;return prepared;}};
    const pending=other.api.restart();await until(()=>entered);
    localStorage.setItem('diep-arena:bot-memory:v1:open:bot:7','legado');localStorage.setItem('dado-externo-teste','preservar');
    const answers=[false,true];ui.win.confirm=()=>answers.shift();ui.doc.getElementById('deleteMemory').click();
    await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('Memórias apagadas'));
    assert(localStorage.getItem('diep-arena:bot-memory:v1:open:bot:7')===null&&localStorage.getItem('dado-externo-teste')==='preservar');
    release();await pending;await until(()=>!other.api.pendingTransition&&other.api.world!==old);
    assert(other.api.world.tanks[0].learning.samples===0);other.api.pause();await other.api.restart();other.api.pause();
    assert(other.api.world.tanks[0].learning.samples===0&&(await db.export()).profiles.every(p=>p.memory.experience.samples!==61));
  });
  await run('falha na limpeza legada informa sucesso parcial sem reimportar',async()=>{
    const key='diep-arena:bot-memory:v1:open:bot:7';localStorage.setItem(key,'legado preservado');
    const original=ui.win.Storage.prototype.removeItem;
    ui.win.Storage.prototype.removeItem=function(k){if(String(k).startsWith('diep-arena:bot-memory:v1:'))throw Error('negado');return original.call(this,k);};
    try{
      const answers=[false,true];ui.win.confirm=()=>answers.shift();ui.doc.getElementById('deleteMemory').click();
      await until(()=>ui.doc.getElementById('memoryStatus').textContent.includes('restaram dados legados'));
      assert(localStorage.getItem(key)==='legado preservado'&&(await db.export()).profiles.length===0);
      assert((await db.migrateLegacy(()=>localStorage)).status==='blocked');
    }finally{ui.win.Storage.prototype.removeItem=original;}
  });
  await run('ausência de coordenação entre abas impede exclusão e mantém o jogo utilizável',async()=>{
    const before=JSON.stringify(await db.export()),original=Object.getOwnPropertyDescriptor(ui.win.navigator,'locks');
    Object.defineProperty(ui.win.navigator,'locks',{configurable:true,value:undefined});
    try{
      const answers=[false,true];ui.win.confirm=()=>answers.shift();ui.doc.getElementById('deleteMemory').click();
      await until(()=>ui.doc.getElementById('memoryResult').textContent.includes('Falha no armazenamento'));
      assert(JSON.stringify(await db.export())===before&&!!ui.api.world);
    }finally{if(original)Object.defineProperty(ui.win.navigator,'locks',original);else delete ui.win.navigator.locks;}
  });
  if(ui)ui.frame.remove();if(other)other.frame.remove();if(db)db.close();
  g.frame.remove();output.textContent=lines.join('\n')+'\n'+(lines.some(x=>x.startsWith('FAIL'))?'FAILED':'ALL PASSED');
})();



