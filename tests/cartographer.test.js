'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const api=vm.runInNewContext(core+';({Arena,C,CARTOGRAPHER,CartographerBarrier,shuffleBosses,rngFrom})',{TextEncoder});

function lab(){return new api.Arena(7103,2,['Destroyer','Tank',45,'cartographer']);}
function idle(t,x,y){Object.assign(t,{x,y,px:x,py:y,human:true,vx:0,vy:0,kx:0,ky:0});}
function stepUntil(arena,predicate,ticks=900){
  for(let i=0;i<ticks&&!predicate();i++)arena.step(null);
  assert.ok(predicate());
}

test('Cartógrafo é exclusivo do Laboratório e o aviso precede a colisão',()=>{
  const open=new api.Arena(7103,0);
  assert.equal(open.spawnBoss('cartographer'),null);
  assert.ok(!api.shuffleBosses(api.rngFrom(7103),undefined,true).includes('cartographer'));
  const w=lab(),b=w.boss,y=b.y-190;
  idle(w.tanks[0],b.x+105,y);
  idle(w.tanks[1],b.x+600,y);
  stepUntil(w,()=>b.barrier);
  const warning=b.barrier;
  assert.equal(w.maze,null);
  while(w.time<warning.starts+.2)w.step(null);
  assert.equal(w.maze,null);
  idle(w.tanks[0],b.x+105,y-145);
  stepUntil(w,()=>w.maze);
  const barrier=w.maze,r=w.tanks[0].r;
  assert.equal(barrier,warning);
  assert.equal(barrier.hit(barrier.gapX,y-80,barrier.gapX,y+80,r),null);
  const tank=w.tanks[0];tank.vx=0;tank.vy=120;
  barrier.move(tank,tank.x,y+80);
  assert.ok(tank.y<y);
  idle(tank,barrier.gapX,y-100);
  barrier.move(tank,tank.x,y+60);
  assert.equal(tank.y,y+60);
  assert.notEqual(barrier.hit(b.x+235,y-140,b.x+235,y+100,4),null);
});

test('projéteis reais derrubam só o trecho do pilar e a próxima fase espelha a passagem',()=>{
  const w=lab(),b=w.boss,y=b.y-190,[player,other]=w.tanks;
  const x=b.x+155;
  idle(player,x,y-140);player.aim=Math.PI/2;player.protect=0;
  idle(other,b.x+680,y-150);
  stepUntil(w,()=>w.maze);
  const barrier=w.maze, segment=barrier.segments[1], intact=barrier.segments[0];
  const wallX=b.x+245;
  idle(player,wallX,y-140);player.aim=Math.PI/2;
  assert.ok(w.spawnShot(player,api.C.Destroyer.guns[0]));
  const blocked=w.shots.at(-1);
  stepUntil(w,()=>!blocked.alive,40);
  assert.equal(segment.hp,135);
  idle(player,x,y-140);player.aim=Math.PI/2;
  for(let i=0;i<6&&segment.hp>0;i++){
    player.aim=Math.PI/2;
    assert.ok(w.spawnShot(player,api.C.Destroyer.guns[0]));
    const shot=w.shots.at(-1);
    stepUntil(w,()=>!shot.alive,40);
  }
  assert.equal(segment.hp,0);
  assert.equal(intact.hp,135);
  assert.equal(barrier.hit(wallX,y-80,wallX,y+80,player.r),null);
  assert.equal(barrier.revision,1);
  assert.ok(b.hp>0);
  b.hp=b.spec.hp*.49;
  stepUntil(w,()=>!b.barrier);
  assert.equal(w.maze,null);
  stepUntil(w,()=>w.maze);
  assert.equal(w.maze.gapX,b.x+105);
  assert.notEqual(w.maze.hit(b.x-105,y-80,b.x-105,y+80,player.r),null);
  assert.equal(w.maze.hit(b.x+105,y-80,b.x+105,y+80,player.r),null);
  w.kill(b,player,'teste');
  assert.equal(w.maze,null);assert.equal(b.barrier,null);
});

test('rota em cache se mantém e bots da Arena atravessam para atacar o chefe',()=>{
  const w=lab(),b=w.boss,y=b.y-190;
  const [bot,other]=w.tanks;
  idle(bot,b.x+220,y-175);idle(other,b.x+560,y-190);
  stepUntil(w,()=>w.maze);
  const barrier=w.maze, target=[b.x,b.y];
  barrier.waypoint(bot,...target,w.time);
  const cached=bot.cartographerRoute;
  assert.ok(cached?.gate);
  barrier.waypoint(bot,...target,w.time+.02);
  assert.equal(bot.cartographerRoute,cached);
  bot.human=false;bot.protect=0;
  stepUntil(w,()=>bot.y>y+bot.r&&b.hp<b.spec.hp,580);
  assert.ok(bot.alive);
  assert.equal(w.maze,barrier);
});

test('a barreira é removida se os dois desafiantes caírem',()=>{
  const w=lab(),b=w.boss;
  for(const [i,t] of w.tanks.entries())idle(t,b.x+440+i*100,b.y-300);
  stepUntil(w,()=>w.maze);
  for(const t of w.tanks)w.kill(t,b,'teste');
  w.step(null);
  assert.equal(w.duelEnded,true);
  assert.equal(w.maze,null);
  assert.equal(b.barrier,null);
});
