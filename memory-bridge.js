/* Adapts an IndexedDB session to Arena's synchronous spawnTank contract. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.createIndexedMemoryBridge=factory;
})(typeof globalThis==='object'?globalThis:this,function createIndexedMemoryBridge(options){
  'use strict';
  const {indexedDB,codec,createStore,onError=()=>{},onMigration=()=>{},getLegacyStorage=()=>localStorage,name}=options;
  const eligible=new Set(['open','maze','maze-seed','lab']);
  let dbPromise;
  const report=error=>{try{onError(error);}catch(_){};};
  function connect(){
    if(!dbPromise){
      try{dbPromise=Promise.resolve(createStore({indexedDB,codec,name}).open());}
      catch(error){dbPromise=Promise.reject(error);}
      dbPromise=dbPromise.catch(error=>{dbPromise=null;throw error;});
    }
    return dbPromise;
  }
  async function prepare(scope){
    if(!eligible.has(scope))return null;
    try{
      const db=await connect();
      const migration=await db.migrateLegacy(getLegacyStorage);
      try{onMigration(migration);}catch(_){}
      const session=await db.session();
      const profiles=new Map(session.profiles.filter(p=>p.profileId.startsWith(scope+':bot:')).map(p=>[p.profileId,p.memory]));
      let tail=Promise.resolve(true),lastTick=null,lastPromise=null;
      const view={
        load(id,adaptiveBuilds,time){
          const data=profiles.get(id);if(!data)return null;
          try{return codec.deserialize(JSON.stringify(data),adaptiveBuilds,time);}catch(error){report(error);return null;}
        },
        save(arena){
          if(lastTick===arena.tick&&lastPromise)return lastPromise;
          let records;
          try{
            records=arena.tanks.filter(t=>!t.human&&t.learning&&typeof t.profileId==='string'&&t.profileId.startsWith(scope+':bot:'))
              .map(t=>({profileId:t.profileId,memory:JSON.parse(codec.serialize(t.learning,arena.time))}));
          }catch(error){report(error);return Promise.resolve(false);}
          lastTick=arena.tick;
          lastPromise=tail=tail.then(async()=>{try{await session.save(records);return true;}catch(error){report(error);return false;}});
          return lastPromise;
        }
      };
      return Object.freeze({open:requested=>requested===scope?view:null,
        isCurrent:async()=> (await db.export()).generation===session.generation});
    }catch(error){report(error);return null;}
  }
  return Object.freeze({prepare});
});



