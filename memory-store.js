/* Per-profile persistence; never deletes or replaces unreadable/conflicting data. */
(function(root,factory){
  if(typeof module==='object' && module.exports)module.exports=factory;
  else root.createBotMemoryStore=factory;
})(typeof globalThis==='object'?globalThis:this,function createBotMemoryStore(options){
  'use strict';
  const {storage,codec}=options;
  const prefix='diep-arena:bot-memory:v1:', maxBytes=40000;
  const scopes=new Set(['open','maze','maze-seed','lab']);
  const validId=(id,scope)=>typeof id==='string' &&
    new RegExp('^'+scope+':bot:(?:[0-9]|[12][0-9]|3[0-5])$').test(id) &&
    (scope!=='lab'||id==='lab:bot:0'||id==='lab:bot:1');
  const exact=(o,keys)=>o && typeof o==='object' && !Array.isArray(o) &&
    Object.keys(o).length===keys.length && keys.every(k=>Object.hasOwn(o,k));
  function open(scope){
    if(!scopes.has(scope))return null;
    const profiles=new Map();
    let lastTick=null;
    function load(id,adaptiveBuilds,time){
      if(!validId(id,scope)||profiles.has(id))return null;
      let raw;
      try{raw=storage.getItem(prefix+id);}catch(_){profiles.set(id,{blocked:true});return null;}
      const state={raw,blocked:false};profiles.set(id,state);
      if(raw===null)return null;
      try{
        if(typeof raw!=='string'||raw.length>maxBytes||new TextEncoder().encode(raw).length>maxBytes)throw Error();
        const data=JSON.parse(raw);
        if(!exact(data,['schemaVersion','profileId','memory'])||data.schemaVersion!==1||data.profileId!==id)throw Error();
        return codec.deserialize(JSON.stringify(data.memory),adaptiveBuilds,time);
      }catch(_){state.blocked=true;return null;}
    }
    function save(arena){
      if(!arena||!Number.isSafeInteger(arena.tick)||arena.tick<0||lastTick===arena.tick)return;
      let failed=false;
      for(const tank of arena.tanks){
        if(tank.human||!tank.learning||!validId(tank.profileId,scope))continue;
        const id=tank.profileId,state=profiles.get(id);
        if(!state||state.blocked)continue;
        try{
          const current=storage.getItem(prefix+id);
          if(current!==state.raw){state.blocked=true;continue;}
          const memory=JSON.parse(codec.serialize(tank.learning,arena.time));
          const raw=JSON.stringify({schemaVersion:1,profileId:id,memory});
          if(new TextEncoder().encode(raw).length>maxBytes){failed=true;continue;}
          if(raw!==current)storage.setItem(prefix+id,raw);
          state.raw=raw;
        }catch(_){failed=true;/* Continue playing; retain the last successfully stored value. */}
      }
      if(!failed)lastTick=arena.tick;
    }
    return Object.freeze({load,save});
  }
  return Object.freeze({open});
});

