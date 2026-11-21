'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const drawing=html.slice(html.indexOf('function circle('),html.indexOf('function paintDefender('));
const marks=[], rotations=[];
const ctx={angle:0,save(){rotations.push(this.angle);},restore(){this.angle=rotations.pop();},rotate(a){this.angle+=a;},
  beginPath(){},fill(){},stroke(){},arc(){},
  rect(x,y,w,h){
    const c=Math.cos(this.angle),s=Math.sin(this.angle),tip=x+w,mid=y+h/2;
    marks.push({x:c*tip-s*mid,y:s*tip+c*mid,angle:this.angle,length:w,baseX:c*x-s*mid,baseY:s*x+c*mid});
  }};
const api=vm.runInNewContext(core+drawing+';({Arena,C,CARTOGRAPHER,CARTOGRAPHER_PILLAR_TURRET,shuffleBosses,rngFrom,paintCartographerTurret})',{TextEncoder,ctx});

function lab(){return new api.Arena(7103,2,['Destroyer','Tank',45,'cartographer']);}
function idle(t,x,y){Object.assign(t,{x,y,px:x,py:y,human:true,vx:0,vy:0,kx:0,ky:0});}
function stepUntil(arena,predicate,ticks=900){
  for(let i=0;i<ticks&&!predicate();i++)arena.step(null);
  assert.ok(predicate());
}

test('o aviso precede a colisão no Laboratório',()=>{
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

test('Cartógrafo entra no sorteio de chefes de evento do FFA e limpa a barreira no encerramento',()=>{
  const create=(seed,map,events,catalog='arena',scope=null)=>new api.Arena(seed,8,null,'both',true,map,catalog,1,events,null,scope);
  for(const w of [create(7103,'open',false),create(7103,'teams',true),
    create(7103,'maze',true),create(7103,'open',true,'off'),create(7103,'open',true,'off','multiplayer')]){
    assert.ok(!w.bossQueue.includes('cartographer'));
    assert.equal(w.spawnBoss('cartographer'),null);
  }
  let seed=1;
  while(seed<100&&api.shuffleBosses(api.rngFrom(seed^0x5f90b345),undefined,true,'open')[0]!=='cartographer')seed++;
  const w=create(seed,'open',true);
  assert.equal(w.bossQueue.length,8);
  assert.equal(w.bossQueue[0],'cartographer');
  assert.ok(!api.shuffleBosses(api.rngFrom(7103),'cartographer',true,'open').slice(0,1).includes('cartographer'));
  w.tick=Math.round(w.nextBossAt*60)-1;
  w.step(null);
  assert.equal(w.boss.spec,api.CARTOGRAPHER);
  assert.equal(w.mapKind,'open');
  assert.equal(w.nextBossAt,480);
  for(const [i,t] of w.tanks.entries())idle(t,w.boss.x+700+i*95,w.boss.y+300);
  stepUntil(w,()=>w.maze);
  assert.equal(w.maze,w.boss.barrier);
  w.beginClosing();
  assert.equal(w.maze,null);
  assert.equal(w.boss.barrier,null);
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
  const nextY=w.maze.y;
  assert.notEqual(w.maze.hit(b.x-105,nextY-80,b.x-105,nextY+80,player.r),null);
  assert.equal(w.maze.hit(b.x+105,nextY-80,b.x+105,nextY+80,player.r),null);
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

test('entre dois ciclos afasta-se da ameaça e congela o traçado no aviso e na barreira',()=>{
  const w=lab(),b=w.boss,home=b.x,y=b.y;
  for(const [i,t] of w.tanks.entries())idle(t,home-650-i*100,y-300);
  stepUntil(w,()=>w.maze);
  const first=w.maze;
  assert.equal(b.x,home);
  stepUntil(w,()=>!b.barrier);
  const started=w.time;
  stepUntil(w,()=>w.time>=started+1);
  assert.ok(Math.abs(b.x-home)>0&&Math.abs(b.x-home)<2*b.r);
  assert.equal(b.barrier,null);
  stepUntil(w,()=>!b.barrierSlide);
  const stop=b.x,stopY=b.y;
  assert.ok(stop>home&&stop-home<=2*b.r);
  assert.ok(stopY>y&&Math.hypot(stop-home,stopY-y)<=2*b.r+1e-8);
  assert.equal(b.barrier,null);
  stepUntil(w,()=>b.barrier);
  const second=b.barrier, shape=()=>JSON.stringify(second.segments.map(({pillar,walls})=>[pillar,walls]));
  const pattern=shape();
  assert.notEqual(second,first);
  assert.equal(second.gapX,stop-105);
  assert.equal(second.y,stopY-190);
  assert.equal(b.x,stop);
  assert.equal(b.vx,0);
  stepUntil(w,()=>w.maze);
  assert.equal(w.maze,second);
  assert.equal(shape(),pattern);
  assert.equal(b.x,stop);
  assert.equal(b.y,stopY);
  assert.equal(b.vy,0);
  for(const gate of second.gates){
    const radius=w.tanks[0].r;
    assert.ok(gate>=radius&&gate<=w.size-radius);
    assert.equal(second.hit(gate,second.y-100,gate,second.y+100,radius),null);
  }
});

test('uma construção cancelada por ocupação inicia o mesmo deslizamento sem bloquear o tanque',()=>{
  const w=lab(),b=w.boss,home=b.x,y=b.y-190,[occupant,other]=w.tanks;
  idle(occupant,home+105,y);
  idle(other,home-650,y);
  occupant.protect=10;
  stepUntil(w,()=>b.barrier);
  const first=b.barrier;
  for(let i=0;i<240&&!b.barrierSlide;i++){
    w.step(null);
    assert.equal(w.maze,null);
  }
  assert.ok(b.barrierSlide);
  assert.equal(first.ends,null);
  assert.ok(w.time>=first.starts+1);
  assert.equal(occupant.y,y);
  idle(occupant,home-550,y);
  stepUntil(w,()=>w.maze);
  assert.ok(b.x>home&&b.x-home<=2*b.r);
  assert.equal(w.maze.gapX,b.x-105);
});

test('a torreta gira durante a recarga e dispara barris alternados no ângulo desenhado',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  idle(player,b.x+350,b.y+130);player.protect=0;
  other.protect=10;
  const shots=[],spawn=w.spawnShot;
  w.spawnShot=function(owner,gun,mount){
    const fired=spawn.call(this,owner,gun,mount);
    if(fired&&owner===b&&!mount.pillar)shots.push({time:this.time,gun,mount:{...mount},p:this.shots.at(-1)});
    return fired;
  };
  const aim=b.turret.aim;
  for(let i=0;i<15;i++)w.step(null);
  assert.notEqual(b.turret.aim,aim);
  assert.ok(Math.abs(b.turret.aim-aim)<.75);
  assert.equal(shots.length,0);
  marks.length=0;
  api.paintCartographerTurret(b.turret,b.spec.guns,b.r,0,b.r*.62,w.time,.5);
  assert.ok(marks[0].angle>b.turret.previousAim&&marks[0].angle<b.turret.aim);
  for(let i=0;i<3;i++){
    stepUntil(w,()=>shots.length>i,220);
    const shot=shots[i],barrel=b.spec.guns.indexOf(shot.gun);
    marks.length=0;
    api.paintCartographerTurret(b.turret,b.spec.guns,b.r,0,b.r*.62,w.time,1);
    const tip=marks[barrel];
    assert.ok(Math.hypot(tip.x+b.x-shot.p.x,tip.y+b.y-shot.p.y)<1e-8);
    assert.equal(tip.angle,shot.p.angle);
    assert.equal(shot.p.px,shot.p.x);
    assert.equal(shot.p.age,0);
    assert.equal(shot.mount.aim,shot.p.angle);
    const resting=marks.slice();
    marks.length=0;
    api.paintCartographerTurret(b.turret,b.spec.guns,b.r,0,b.r*.62,w.time+.035,1);
    const moved=marks[barrel],start=resting[barrel];
    assert.equal(moved.length,start.length);
    assert.ok((moved.x-start.x)*Math.cos(start.angle)+(moved.y-start.y)*Math.sin(start.angle)<0);
    assert.ok(Math.abs((moved.x-start.x)-(moved.baseX-start.baseX))<1e-8);
    assert.ok(Math.abs((moved.y-start.y)-(moved.baseY-start.baseY))<1e-8);
    assert.deepEqual(marks[1-barrel],resting[1-barrel]);
    w.step(null);
    assert.ok(Math.hypot(shot.p.x-shot.p.px,shot.p.y-shot.p.py)>0);
  }
  assert.deepEqual(shots.map(s=>b.spec.guns.indexOf(s.gun)),[0,1,0]);
  assert.ok(shots[1].time-shots[0].time>=.53-1e-8&&shots[1].time-shots[0].time<.55);
});

test('a cobertura bloqueia a mira e derrubar o pilar volta a expor o jogador',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks,y=b.y-190;
  idle(player,b.x+155,y-300);idle(other,b.x+650,y-150);
  player.protect=other.protect=4;
  stepUntil(w,()=>w.maze);
  player.protect=0;other.protect=10;
  const wall=w.maze,hp=player.hp;
  const serial=w.serial;
  for(let i=0;i<45;i++)w.step(null);
  assert.equal(player.hp,hp);
  assert.ok(!w.shots.some(p=>p.id>serial&&p.owner===b));
  for(let i=0;i<2;i++){
    player.aim=Math.PI/2;
    assert.ok(w.spawnShot(player,api.C.Destroyer.guns[0]));
    const p=w.shots.at(-1);
    stepUntil(w,()=>!p.alive,55);
  }
  assert.equal(wall.segments[1].hp,0);
  assert.equal(wall.hit(b.x,b.y,player.x,player.y,2),null);
  stepUntil(w,()=>player.hp<hp,170);
  assert.equal(w.maze,wall);
});

test('a torreta do pilar emite pela boca e deixa de existir com seu trecho',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks,y=b.y-190,x=b.x+155;
  idle(player,x,y-145);idle(other,b.x+650,y-150);
  player.protect=other.protect=10;
  stepUntil(w,()=>w.maze);
  const wall=w.maze,pillar=wall.segments[1];
  player.protect=0;
  idle(player,x+240,y+10); // In range across the wall, but outside its footprint.
  for(let i=0;i<90;i++){
    w.step(null);
    assert.ok(!w.shots.some(p=>p.pillarSource===pillar));
  }
  idle(player,x,y-145);
  stepUntil(w,()=>w.shots.some(p=>p.pillarSource===pillar));
  const shot=w.shots.find(p=>p.pillarSource===pillar),{radius,guns}=api.CARTOGRAPHER_PILLAR_TURRET;
  marks.length=0;
  api.paintCartographerTurret(pillar.turret,guns,radius,0,radius,w.time,1,pillar);
  assert.ok(Math.hypot(x+marks[0].x-shot.x,y+marks[0].y-shot.y)<1e-8);
  assert.equal(shot.age,0);
  assert.equal(shot.angle,marks[0].angle);
  assert.ok(shot.damage<7);
  assert.equal(wall.hit(shot.x,shot.y,shot.x,shot.y,shot.r),null);
  for(let i=0;i<4&&pillar.hp>0;i++){
    player.aim=Math.PI/2;
    assert.ok(w.spawnShot(player,api.C.Destroyer.guns[0]));
    const p=w.shots.at(-1);
    stepUntil(w,()=>!p.alive,35);
  }
  assert.equal(pillar.hp,0);
  assert.equal(wall.segments[0].hp,135);
  assert.equal(wall.hit(x,y-100,x,y+100,player.r),null);
  wall.move(player,x,y+100);
  assert.equal(player.y,y+100);
  for(let i=0;i<95;i++){
    w.step(null);
    assert.ok(!w.shots.some(p=>p.alive&&p.pillarSource===pillar));
  }
  stepUntil(w,()=>w.maze!==wall);
  assert.equal(b.barrier,null);
  assert.ok(!w.shots.some(p=>p.pillarSource));
});

test('canhões rígidos giram em 0°, 45° e 90° e o pilar não dispara através da parede',()=>{
  const w=lab(),b=w.boss;
  for(const [i,t] of w.tanks.entries())idle(t,b.x+500+i*100,b.y-310);
  stepUntil(w,()=>w.maze);
  const barrier=w.maze,pillar=barrier.segments[1];
  const small=api.CARTOGRAPHER_PILLAR_TURRET;
  for(const aim of [0,Math.PI/4,Math.PI/2]){
    const state={aim,previousAim:aim,fired:[]};
    for(const config of [
      {guns:b.spec.guns,radius:b.r,x:b.x,y:b.y},
      {...small,x:pillar.center,y:barrier.y,pillar}
    ]){
      marks.length=0;
      api.paintCartographerTurret(state,config.guns,config.radius,0,config.radius,w.time,1,config.pillar);
      for(const [i,gun] of config.guns.entries()){
        const mark=marks[i],length=gun.length*config.radius,offset=gun.offset*config.radius;
        const {x,y,radius:r}=config;
        const projected=mark.x*Math.cos(aim)+mark.y*Math.sin(aim);
        assert.ok(Math.abs(projected-length)<1e-8);
        assert.ok(Math.abs(mark.baseX+Math.sin(aim)*offset)<1e-8);
        assert.ok(Math.abs(mark.baseY-Math.cos(aim)*offset)<1e-8);
        assert.equal(mark.length,length);
        const fired=w.spawnShot(b,gun,{x,y,r,aim,pillar:config.pillar,cartographerShot:true});
        if(config.pillar&&aim===0){assert.equal(fired,undefined);continue;}
        assert.equal(fired,true);
        const shot=w.shots.at(-1);
        assert.ok(Math.hypot(shot.x-x-mark.x,shot.y-y-mark.y)<1e-8);
        assert.equal(shot.angle,aim);
        assert.equal(barrier.hit(shot.x,shot.y,shot.x,shot.y,shot.r),null);
      }
    }
  }
});

test('a mira do pilar independe da velocidade e a do chefe ainda antecipa',()=>{
  const w=lab(),b=w.boss,[target,other]=w.tanks;
  idle(target,b.x,b.y-150);target.protect=0;other.protect=10;
  const aim=(vx,pillar)=>{
    target.vx=vx;
    const turret={aim:-Math.PI/2,ready:Infinity,barrel:0};
    w.advanceCartographerTurret(b,turret,{x:b.x,y:b.y,r:b.r,pillar},b.spec.guns,b.spec.range,.53);
    return turret.aim;
  };
  assert.equal(aim(-130,{}),aim(130,{}));
  assert.equal(aim(130,{}),-Math.PI/2);
  assert.notEqual(aim(-130),aim(130));
});

test('ameaças nos lados opostos produzem deslocamentos opostos',()=>{
  for(const side of [-1,1]){
    const w=lab(),b=w.boss,[player,other]=w.tanks,home=b.x;
    idle(player,home+side*315,b.y-300);player.protect=0;other.protect=10;
    w.startCartographerPause(b);
    assert.equal(Math.sign(b.barrierSlide.dx),-side);
    assert.ok(b.barrierSlide.dy>0&&Math.hypot(b.barrierSlide.dx,b.barrierSlide.dy)<2*b.r);
    b.barrierSlide=null;player.protect=10;
    w.startCartographerPause(b);
    assert.equal(b.barrierSlide,null);
  }
});

test('a fuga vertical se interrompe quando um tanque entra na rota',()=>{
  const w=lab(),b=w.boss,[threat,blocker]=w.tanks,homeY=b.y;
  idle(threat,b.x,b.y+220);threat.protect=0;
  idle(blocker,b.x+500,b.y);blocker.protect=10;
  w.startCartographerPause(b);
  assert.ok(Math.abs(b.barrierSlide.dx)<1e-8&&b.barrierSlide.dy<0);
  stepUntil(w,()=>b.y<homeY-10);
  idle(blocker,b.x,b.y-b.r-blocker.r-2);
  const blockerY=blocker.y;
  stepUntil(w,()=>!b.barrierSlide,15);
  assert.ok(b.y>blockerY+b.r+blocker.r-1e-8);
  stepUntil(w,()=>b.barrier);
  assert.equal(b.barrier.y,b.y-190);
});
