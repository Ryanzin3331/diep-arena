'use strict';
const {spawnSync}=require('node:child_process');
const results=[];
for(const seed of [7102,7103,7104,7105])for(const distance of [200,300,380])for(const control of [1,0]){
  const run=spawnSync(process.execPath,['tests/measure-3a-duel.js'],{encoding:'utf8',env:{...process.env,SEED:String(seed),DISTANCE:String(distance),CONTROL:String(control),TICKS:'900'}});
  if(run.status!==0)throw Error(run.stderr);
  results.push(JSON.parse(run.stdout));
}
console.log(JSON.stringify(results,null,2));
