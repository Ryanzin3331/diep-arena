'use strict';
(async()=>{
  const lines=[],output=document.getElementById('result');
  const assert=(condition,message)=>{if(!condition)throw Error(message||'assertion failed');};
  const rejects=async(fn)=>{let failed=false;try{await fn();}catch(_){failed=true;}assert(failed,'expected rejection');};
  const name='diep-test-'+Date.now()+'-'+Math.random();
  const newMemory=()=>({classes:new Map(),foes:new Map(),samples:0,escapes:0,changes:0,buildChanges:0});
  const codec=createMemoryCodec({classes:{Tank:{},Twin:{}},newMemory,ttl:115});
  const mem=n=>({schemaVersion:1,experience:{samples:n,escapes:0,changes:0,buildChanges:0,exchanges:0},matchups:[]});
  const row=(i,n)=>({profileId:'open:bot:'+i,memory:mem(n)});
  const factory=createTransactionalMemoryStore({indexedDB,codec,name});
  let a,b;
  async function run(label,fn){try{await fn();lines.push('PASS '+label);}catch(e){lines.push('FAIL '+label+': '+(e.stack||e));}}
  const snapshot=async()=>JSON.stringify(await a.export());
  await run('criação e duas conexões',async()=>{a=await factory.open();b=await factory.open();assert((await a.export()).generation===0);});
  if(!a||!b){output.textContent=lines.join('\n');return;}
  await run('perfil e compatibilidade com codec',async()=>{
    const s=await a.session();await s.save([row(0,2)]);const t=await b.session();
    assert(t.profiles[0].memory.experience.samples===2);
    assert(codec.deserialize(JSON.stringify(t.profiles[0].memory),false,0).samples===2);
  });
  await run('revisões impedem sobrescrita do mesmo perfil',async()=>{
    const x=await a.session(),y=await b.session();await x.save([row(0,3)]);
    await rejects(()=>y.save([row(0,4)]));assert((await a.export()).profiles[0].memory.experience.samples===3);
  });
  await run('duas conexões disputam perfil inicialmente ausente',async()=>{
    const x=await a.session(),y=await b.session();
    const result=await Promise.allSettled([x.save([row(5,5)]),y.save([row(5,6)])]);
    assert(result.filter(v=>v.status==='fulfilled').length===1);
    assert(result.filter(v=>v.status==='rejected').length===1);
    assert((await a.export()).profiles.filter(v=>v.profileId==='open:bot:5').length===1);
  });
  await run('perfis distintos em duas conexões',async()=>{
    const x=await a.session(),y=await b.session();await Promise.all([x.save([row(1,11)]),y.save([row(2,12)])]);
    const p=(await a.export()).profiles;assert(p.some(v=>v.profileId==='open:bot:1'));assert(p.some(v=>v.profileId==='open:bot:2'));
  });
  await run('exclusão invalida sessões com perfil presente e ausente permanentemente',async()=>{
    const x=await a.session(),y=await b.session();await b.clear();
    await rejects(()=>x.save([row(0,5)]));await rejects(()=>y.save([row(3,5)]));
    await rejects(()=>x.save([row(3,5)]));assert((await a.export()).profiles.length===0);
  });
  await run('importação invalida sessões anteriores',async()=>{
    const x=await a.session();await b.replace([row(0,8),row(1,9)]);
    await rejects(()=>x.save([row(2,7)]));assert((await a.export()).profiles.length===2);
  });
  await run('aborto real durante importação reverte todos os registros e geração',async()=>{
    const before=await snapshot(),original=IDBObjectStore.prototype.put;let armed=true;
    IDBObjectStore.prototype.put=function(...args){const result=original.apply(this,args);if(armed&&this.name==='profiles'){armed=false;this.transaction.abort();}return result;};
    try{await rejects(()=>a.replace([row(2,20),row(3,30)]));}finally{IDBObjectStore.prototype.put=original;}
    assert(await snapshot()===before,'importação parcialmente publicada');
  });
  await run('aborto real durante exclusão reverte perfis e geração',async()=>{
    const before=await snapshot(),original=IDBObjectStore.prototype.clear;
    IDBObjectStore.prototype.clear=function(...args){const result=original.apply(this,args);if(this.name==='profiles')this.transaction.abort();return result;};
    try{await rejects(()=>b.clear());}finally{IDBObjectStore.prototype.clear=original;}
    assert(await snapshot()===before,'exclusão parcialmente publicada');
  });
  await run('exportação é consistente e não altera banco',async()=>{
    const first=await a.export(),second=await b.export();assert(JSON.stringify(first)===JSON.stringify(second));
  });
  await run('dados inválidos rejeitados antes de publicar',async()=>{
    const before=await snapshot();await rejects(()=>a.replace([row(0,1),{profileId:'open:bot:99',memory:mem(1)}]));
    await rejects(()=>a.replace([row(0,1),row(0,2)]));await rejects(()=>a.replace([{profileId:'open:bot:0',memory:{schemaVersion:2}}]));
    assert(await snapshot()===before);
  });
  await run('falha de revisão não publica outros perfis do mesmo lote',async()=>{
    const x=await a.session(),y=await b.session();await x.save([row(0,40)]);
    const before=await snapshot();await rejects(()=>y.save([row(0,50),row(3,30)]));
    assert(await snapshot()===before);
  });
  await run('ordens concorrentes de salvar e excluir',async()=>{
    const s=await a.session();const outcomes=await Promise.allSettled([b.clear(),s.save([row(4,4)])]);
    assert(outcomes[0].status==='fulfilled');assert((await a.export()).profiles.length===0);
    const t=await a.session();await Promise.all([t.save([row(4,4)]),b.clear()]);assert((await b.export()).profiles.length===0);
  });
  await run('abertura bloqueada e banco indisponível',async()=>{
    let threw=false;try{createTransactionalMemoryStore({indexedDB:null,codec});}catch(_){threw=true;}assert(threw);
    const n=name+'-blocked';const req=indexedDB.open(n,1);const old=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const higher={open:(db)=>indexedDB.open(db,2)};
    try{await rejects(()=>createTransactionalMemoryStore({indexedDB:higher,codec,name:n}).open());}finally{old.close();}
    a.close();await rejects(()=>a.export());
  });
  b.close();
  output.textContent=lines.join('\n')+'\n'+(lines.some(x=>x.startsWith('FAIL'))?'FAILED':'ALL PASSED');
})();

