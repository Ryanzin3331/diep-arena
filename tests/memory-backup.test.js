'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const createCodec=require('../memory-codec.js'),createBackup=require('../memory-backup.js');
const fresh=()=>({classes:new Map(),foes:new Map(),samples:0,escapes:0,changes:0,buildChanges:0});
const backup=createBackup(createCodec({classes:{Tank:{},Twin:{}},newMemory:fresh,ttl:115}));
const memory={schemaVersion:1,experience:{samples:3,escapes:0,changes:0,buildChanges:0,exchanges:0},matchups:[]};
const row={profileId:'open:bot:0',memory};
test('backup versionado conserva perfis e exclui revisões e preferências',()=>{
  const text=backup.stringify({generation:8,profiles:[{...row,revision:2}],secret:'não exportar'});
  assert.deepEqual(backup.parse(text),[row]);assert.ok(!text.includes('secret')&&!text.includes('revision'));
});
test('backup rejeita JSON, esquema, perfil, duplicatas, tamanho e dados inválidos',()=>{
  assert.throws(()=>backup.parse('{'));assert.throws(()=>backup.parse(' '.repeat(backup.maxBytes+1)));
  for(const data of [{schemaVersion:2,profiles:[row]},{schemaVersion:1,profiles:[row,row]},
    {schemaVersion:1,profiles:[{...row,profileId:'open:bot:99'}]},
    {schemaVersion:1,profiles:[{...row,memory:{...memory,experience:{...memory.experience,samples:-1}}}]},
    {schemaVersion:1,profiles:[row],extra:true}])assert.throws(()=>backup.parse(JSON.stringify(data)));
});

