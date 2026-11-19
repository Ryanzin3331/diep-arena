/* Independent IndexedDB backend. The game does not load this module yet. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.createTransactionalMemoryStore=factory;
})(typeof globalThis==='object'?globalThis:this,function createTransactionalMemoryStore(options){
  'use strict';
  const {indexedDB,codec,name='diep-arena-bot-memory'}=options;
  if(!indexedDB||typeof indexedDB.open!=='function'||!codec||typeof codec.deserialize!=='function'||typeof codec.validate!=='function')
    throw new Error('IndexedDB ou codec indisponível');
  const validId=id=>typeof id==='string'&&(/^(?:open|maze|maze-seed):bot:(?:[0-9]|[12][0-9]|3[0-5])$/.test(id)||
    /^lab:bot:[01]$/.test(id));
  const validNumber=n=>Number.isSafeInteger(n)&&n>=0;
  const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
  const invalid=message=>new Error(message||'Dados inválidos');
  function checkState(state){
    if(!exact(state,['schemaVersion','generation'])||state.schemaVersion!==1||!validNumber(state.generation))throw invalid('Metadados inválidos');
    return state;
  }
  function checkMemory(memory){
    codec.validate(memory);
    const json=JSON.stringify(memory);
    if(typeof json!=='string'||json.length>32768||new TextEncoder().encode(json).length>32768)throw invalid();
    codec.deserialize(json,false,0);
    return JSON.parse(json);
  }
  function checkRecords(records){
    if(!Array.isArray(records)||records.length>110)throw invalid();
    const seen=new Set();
    return records.map(record=>{
      if(!exact(record,['profileId','memory'])||!validId(record.profileId)||seen.has(record.profileId))throw invalid();
      seen.add(record.profileId);
      return {profileId:record.profileId,memory:checkMemory(record.memory)};
    });
  }
  function checkStored(record){
    if(!exact(record,['profileId','revision','memory'])||!validId(record.profileId)||!validNumber(record.revision)||record.revision<1)throw invalid('Perfil armazenado inválido');
    return {profileId:record.profileId,revision:record.revision,memory:checkMemory(record.memory)};
  }
  function open(){
    return new Promise((resolve,reject)=>{
      let request,settled=false;
      try{request=indexedDB.open(name,1);}catch(error){reject(error);return;}
      request.onupgradeneeded=()=>{
        const db=request.result;
        db.createObjectStore('profiles',{keyPath:'profileId'});
        db.createObjectStore('metadata').put({schemaVersion:1,generation:0},'state');
      };
      request.onerror=()=>{if(!settled){settled=true;reject(request.error||invalid('Falha ao abrir banco'));}};
      request.onblocked=()=>{if(!settled){settled=true;reject(invalid('Abertura bloqueada'));}};
      request.onsuccess=()=>{
        const db=request.result;
        if(settled){db.close();return;}
        settled=true;db.onversionchange=()=>db.close();resolve(connection(db));
      };
    });
  }
  function connection(db){
    function transaction(mode,work){
      return new Promise((resolve,reject)=>{
        let tx,result,reason;
        try{tx=db.transaction(['profiles','metadata'],mode);}catch(error){reject(error);return;}
        tx.oncomplete=()=>resolve(result);
        tx.onabort=()=>reject(reason||tx.error||invalid('Transação abortada'));
        tx.onerror=()=>{};
        const abort=error=>{reason=error;try{tx.abort();}catch(_){};};
        try{work(tx,abort,value=>{result=value;});}catch(error){abort(error);}
      });
    }
    function read(){
      return transaction('readonly',(tx,abort,done)=>{
        let state,records;const metadata=tx.objectStore('metadata').get('state'),all=tx.objectStore('profiles').getAll();
        function finish(){if(state===undefined||records===undefined)return;try{
          checkState(state);if(!Array.isArray(records)||records.length>110)throw invalid();
          done({generation:state.generation,profiles:records.map(checkStored)});
        }catch(error){abort(error);}}
        metadata.onsuccess=()=>{state=metadata.result??null;finish();};
        all.onsuccess=()=>{records=all.result;finish();};
      });
    }
    async function session(){
      const data=await read(),revisions=new Map(data.profiles.map(p=>[p.profileId,p.revision]));
      let stale=false,busy=false;
      const profiles=data.profiles.map(({profileId,memory})=>({profileId,memory}));
      async function save(input){
        if(stale)throw invalid('Sessão invalidada');
        if(busy)throw invalid('Sessão ocupada');
        const records=checkRecords(input);busy=true;
        try{
          const updates=await transaction('readwrite',(tx,abort,done)=>{
            const ps=tx.objectStore('profiles'),meta=tx.objectStore('metadata'),request=meta.get('state');
            request.onsuccess=()=>{try{
              const state=checkState(request.result);
              if(state.generation!==data.generation){stale=true;throw invalid('Sessão invalidada');}
              if(!records.length){done([]);return;}
              let pending=records.length;const next=[];
              for(const record of records){
                const get=ps.get(record.profileId);
                get.onsuccess=()=>{try{
                  const existing=get.result===undefined?null:checkStored(get.result);
                  const revision=existing?.revision??0;
                  if(revision!==(revisions.get(record.profileId)??0))throw invalid('Conflito de revisão');
                  if(revision===Number.MAX_SAFE_INTEGER)throw invalid();
                  next.push({profileId:record.profileId,memory:record.memory,revision:revision+1});
                  if(!--pending){for(const row of next)ps.put(row);done(next);}
                }catch(error){abort(error);}};
              }
            }catch(error){abort(error);}};
          });
          for(const row of updates)revisions.set(row.profileId,row.revision);
        }finally{busy=false;}
      }
      return Object.freeze({generation:data.generation,profiles,save});
    }
    function replace(input){
      let records;try{records=checkRecords(input);}catch(error){return Promise.reject(error);}
      return transaction('readwrite',(tx,abort,done)=>{
        const ps=tx.objectStore('profiles'),ms=tx.objectStore('metadata'),request=ms.get('state');
        request.onsuccess=()=>{try{
          const state=checkState(request.result);if(state.generation===Number.MAX_SAFE_INTEGER)throw invalid();
          ps.clear();for(const row of records)ps.put({...row,revision:1});
          ms.put({schemaVersion:1,generation:state.generation+1},'state');done();
        }catch(error){abort(error);}};
      });
    }
    return Object.freeze({session,export:read,replace,clear:()=>replace([]),close:()=>db.close()});
  }
  return Object.freeze({open});
});

