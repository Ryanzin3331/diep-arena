'use strict';

const fs=require('node:fs'), vm=require('node:vm');
const {execFileSync}=require('node:child_process');

function measure(html){
  const core=html.split('<script id="core">')[1].split('</script>')[0];
  const {Arena}=vm.runInNewContext(core+';({Arena})',{TextEncoder});
  const w=new Arena(7103,2,['Destroyer','Tank',45,'cartographer']);
  const [player]=w.tanks,b=w.boss,home=b.x;
  const x=home+105,y=b.y-310;
  Object.assign(player,{human:true,x,y,px:x,py:y,protect:0,learning:null});
  w.human=player;w.indexSense();
  const emissions=[],wallPositions=[],spawn=w.spawnShot;
  w.spawnShot=function(owner,gun,mount){
    const fired=spawn.call(this,owner,gun,mount);
    if(fired&&owner===b)emissions.push({tick:w.tick,projectile:w.shots.at(-1)});
    return fired;
  };
  let priorAim=b.turret?.aim??b.aim,trackingTicks=0,opened=null,barrier;
  for(let i=0;i<900&&!w.duelEnded;i++){
    const atPillar=w.time>=3&&w.time<5.8;
    const aimX=atPillar?home+155:b.x,aimY=atPillar?b.y-190:b.y;
    w.step({x:w.time>=9&&w.time<9.55?1:0,y:0,aim:Math.atan2(aimY-player.y,aimX-player.x),
      fire:atPillar||w.time>=6&&w.time<8||w.time>=11,alt:false});
    const aim=b.turret?.aim??b.aim;
    if(aim!==priorAim&&emissions.at(-1)?.tick!==w.tick)trackingTicks++;
    priorAim=aim;
    if(b.barrier&&b.barrier!==barrier){barrier=b.barrier;wallPositions.push(Math.round(b.x-home));}
    if(opened===null&&barrier?.segments.some(s=>s.hp===0))opened=w.tick;
  }
  const maxPerTick=Math.max(0,...emissions.map(s=>emissions.filter(o=>o.tick===s.tick).length));
  return {ticks:w.tick,shots:emissions.length,maxPerTick,trackingTicks,opened,wallPositions,
    hitsOnPlayer:emissions.filter(s=>s.projectile.contacts?.has(player.id)).length,
    playerHP:Number(player.hp.toFixed(1)),bossHP:Number(b.hp.toFixed(1))};
}

const comparison=process.argv[2];
const fromCommit=commit=>execFileSync('git',['show',commit+':index.html'],{encoding:'utf8'});
console.log(JSON.stringify({before:measure(fromCommit('7514562')),
  after:measure(comparison?fromCommit(comparison):fs.readFileSync('index.html','utf8'))},null,2));
