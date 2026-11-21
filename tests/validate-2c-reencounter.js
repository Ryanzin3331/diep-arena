'use strict';
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
function run(suppress){
 const result=spawnSync(process.execPath,['tests/measure-2c-reencounter.js'],{encoding:'utf8',env:{...process.env,MAP:'open',SEED:'7101',TICKS:'1473',TICK:'1473',OBSERVER:'7',ENEMY:'3',SUPPRESS:String(suppress),SEARCH_ALL:'0'}});
 if(result.error)throw result.error;assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
const on=run(0),off=run(1);
assert.equal(on.tick,1473);assert.equal(off.tick,1473);assert.equal(on.snapshotHash,off.snapshotHash);
for(const key of ['observer','enemy','heavy','swarm','x','y','ex','ey','hp','evx','evy','nx','ny','enemyClass'])assert.deepEqual(on[key],off[key],key);
assert.deepEqual(on.learning,off.learning);assert.equal(on.heavy,true);assert.equal(on.swarm,false);
assert.equal(on.attacks,0);assert.deepEqual(on.ownerProjectiles,[]);assert.deepEqual(off.ownerProjectiles,[]);
assert.ok(on.move.radial<off.move.radial);assert.ok(on.move.lateral>off.move.lateral);
const pair=on.pairs.find(p=>p.observer===7&&p.enemy===3&&p.kind==='heavy');assert.deepEqual(pair,{observer:7,enemy:3,kind:'heavy',threshold:168,lastSelected:1063,reencounter:1473});
console.log(JSON.stringify({snapshotHash:on.snapshotHash,radial:{on:on.move.radial,off:off.move.radial},lateral:{on:on.move.lateral,off:off.move.lateral},pair}));
