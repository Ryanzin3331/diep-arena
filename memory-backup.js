/* Versioned backup format for committed IndexedDB bot profiles. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.createMemoryBackup=factory;
})(typeof globalThis==='object'?globalThis:this,function createMemoryBackup(codec){
  'use strict';
  const maxBytes=3700000;
  const idValid=id=>typeof id==='string'&&(/^(?:open|maze|maze-seed):bot:(?:[0-9]|[12][0-9]|3[0-5])$/.test(id)||/^lab:bot:[01]$/.test(id));
  const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
  function parse(text){
    if(typeof text!=='string'||text.length>maxBytes||new TextEncoder().encode(text).length>maxBytes)throw Error('Arquivo muito grande ou inválido.');
    let data;try{data=JSON.parse(text);}catch(_){throw Error('JSON inválido.');}
    if(!exact(data,['schemaVersion','profiles'])||data.schemaVersion!==1||!Array.isArray(data.profiles)||data.profiles.length>110)throw Error('Formato de backup incompatível.');
    const seen=new Set();
    return data.profiles.map(p=>{
      if(!exact(p,['profileId','memory'])||!idValid(p.profileId)||seen.has(p.profileId))throw Error('Perfil inválido ou duplicado.');
      seen.add(p.profileId);codec.validate(p.memory);
      const json=JSON.stringify(p.memory);
      if(new TextEncoder().encode(json).length>32768)throw Error('Perfil muito grande.');
      codec.deserialize(json,false,0);
      return {profileId:p.profileId,memory:JSON.parse(json)};
    });
  }
  function stringify(snapshot){
    const profiles=snapshot.profiles.map(({profileId,memory})=>({profileId,memory}));
    const text=JSON.stringify({schemaVersion:1,profiles});parse(text);return text;
  }
  return Object.freeze({parse,stringify,maxBytes});
});

