/* Transactional IndexedDB backend for individual bot memories. */
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
  const legacyPrefix='diep-arena:bot-memory:v1:',migrationKey='legacy-v1';
  function checkMarker(marker){
    if(!exact(marker,['schemaVersion','status'])||marker.schemaVersion!==1||!['complete','blocked'].includes(marker.status))throw invalid('Marcador de migração inválido');
    return marker;
  }
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
          ms.put({schemaVersion:1,generation:state.generation+1},'state');
          ms.put({schemaVersion:1,status:'blocked'},migrationKey);done();
        }catch(error){abort(error);}};
      });
    }
    function marker(){
      return transaction('readonly',(tx,abort,done)=>{
        const request=tx.objectStore('metadata').get(migrationKey);
        request.onsuccess=()=>{try{done(request.result===undefined?null:checkMarker(request.result));}catch(error){abort(error);}};
      });
    }
    async function migrateLegacy(getStorage){
      const existing=await marker();
      if(existing)return {status:existing.status,copied:0,invalid:0,preserved:0};
      // Storage access failures are not malformed records: propagate and retry later.
      const storage=getStorage();
      const length=storage.length;
      if(!Number.isSafeInteger(length)||length<0)throw invalid('Falha ao ler armazenamento legado');
      const records=[],seen=new Set();let invalidCount=0;
      for(let i=0;i<length;i++){
        const key=storage.key(i);
        if(typeof key!=='string'||seen.has(key))throw invalid('Leitura legada inconsistente');
        seen.add(key);if(!key.startsWith(legacyPrefix))continue;
        const id=key.slice(legacyPrefix.length),raw=storage.getItem(key);
        if(raw===null)throw invalid('Leitura legada inconsistente');
        try{
          if(!validId(id)||typeof raw!=='string'||raw.length>40000||new TextEncoder().encode(raw).length>40000)throw invalid();
          const row=JSON.parse(raw);
          if(!exact(row,['schemaVersion','profileId','memory'])||row.schemaVersion!==1||row.profileId!==id)throw invalid();
          records.push({profileId:id,memory:checkMemory(row.memory)});
        }catch(_){invalidCount++;}
      }
      const validated=checkRecords(records);
      return transaction('readwrite',(tx,abort,done)=>{
        const ps=tx.objectStore('profiles'),ms=tx.objectStore('metadata'),request=ms.get(migrationKey),stateRequest=ms.get('state');
        let gotMarker=false,gotState=false;
        function begin(){if(!gotMarker||!gotState)return;try{
          checkState(stateRequest.result);
          if(request.result!==undefined){const status=checkMarker(request.result).status;done({status,copied:0,invalid:0,preserved:0});return;}
          let pending=validated.length,copied=0,preserved=0;
          function finish(){ms.put({schemaVersion:1,status:'complete'},migrationKey);done({status:'complete',copied,invalid:invalidCount,preserved});}
          if(!pending){finish();return;}
          for(const record of validated){
            const get=ps.get(record.profileId);
            get.onsuccess=()=>{try{
              if(get.result===undefined){ps.put({...record,revision:1});copied++;}else preserved++;
              if(!--pending)finish();
            }catch(error){abort(error);}};
          }
        }catch(error){abort(error);}}
        request.onsuccess=()=>{gotMarker=true;begin();};
        stateRequest.onsuccess=()=>{gotState=true;begin();};
      });
    }
    return Object.freeze({session,export:read,replace,clear:()=>replace([]),migrateLegacy,close:()=>db.close()});
  }
  return Object.freeze({open});
});


