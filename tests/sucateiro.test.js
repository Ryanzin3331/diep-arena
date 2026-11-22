'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const html=readFileSync('index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const {Arena,DT,C,SUCATEIRO,SUCATEIRO_VISUAL,SCRAP_TYPES,snapshotArena,shotColor,scrapperRamRoute,angleDelta,scrapArcTravel}=vm.runInNewContext(
  core+';({Arena,DT,C,SUCATEIRO,SUCATEIRO_VISUAL,SCRAP_TYPES,snapshotArena,shotColor,scrapperRamRoute,angleDelta,scrapArcTravel})',{TextEncoder});

const lab=()=>new Arena(7103,2,['Destroyer','Tank',45,'sucateiro']);
function idle(t,x,y){
  Object.assign(t,{x,y,px:x,py:y,aim:0,human:true,vx:0,vy:0,kx:0,ky:0,protect:0});
}
function stepUntil(w,predicate,max=600){
  for(let i=0;i<max&&!predicate();i++)w.step(null);
  assert.ok(predicate(),'evento esperado dentro de '+max+' ticks');
}
function weight(b){return b.scrapStock.reduce((sum,piece)=>sum+SCRAP_TYPES[piece.name].weight,0);}

test('Laboratório coleta as formas reais conforme a fase, respeita peso e deixa brilho de fora',()=>{
  const w=lab(),b=w.boss;
  assert.equal(b.spec,SUCATEIRO);
  for(const t of w.tanks)idle(t,200,200);
  w.addShape('square',b.x+56,b.y,true);
  const shiny=w.shapes.at(-1);
  const original=new Set(w.shapes);
  stepUntil(w,()=>weight(b)===6);
  assert.equal(b.stage,1);
  assert.ok(b.scrapStock.every(piece=>original.has(piece)&&['square','triangle'].includes(piece.name)));
  assert.equal(shiny.scrap,undefined);
  b.hp=b.spec.hp*.70;
  stepUntil(w,()=>b.scrapStock.some(piece=>piece.name==='pentagon'));
  assert.equal(b.stage,2);
  assert.ok(weight(b)<=9);
  b.hp=b.spec.hp*.35;
  stepUntil(w,()=>b.scrapStock.some(piece=>piece.name==='alpha'));
  assert.equal(b.stage,3);
  assert.equal(b.r,SUCATEIRO_VISUAL.stages[2].radius);
  const alpha=b.scrapStock.find(piece=>piece.name==='alpha');
  assert.equal(alpha.hp,240);
  assert.ok(weight(b)<=12);
  const snapshot=snapshotArena(w);
  assert.equal(snapshot.boss.stage,3);
  assert.equal(snapshot.boss.scrapStock.length,b.scrapStock.length);
  assert.equal(snapshot.forms.length/8+snapshot.boss.scrapStock.length,w.shapes.length);
  alpha.hp-=40;
  w.kill(b,w.tanks[0],'teste');
  assert.equal(alpha.scrap,undefined);
  assert.equal(alpha.hp,2960);
  assert.equal(alpha.r,75);
  assert.equal(b.scrapStock.length,0);
});

test('arremesso nasce na peça marcada, mantém a direção avisada e dá dano real',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  w.shapes=[];
  w.formTarget=0;
  w.addShape('triangle',b.x+15,b.y-205,false);
  const triangle=w.shapes[0];
  idle(player,b.x+440,b.y);
  idle(other,200,200);
  stepUntil(w,()=>b.scrapWarning);
  const warning=b.scrapWarning;
  assert.equal(warning.piece,triangle);
  assert.equal(snapshotArena(w).boss.scrapWarning.id,triangle.id);
  assert.equal(w.shots.length,0);
  assert.equal(Math.round((warning.until-w.time)*100),75);
  const score=player.score;
  const {x,y,heading}=warning;
  const before=player.hp;
  idle(player,x+250*Math.cos(heading),y+250*Math.sin(heading));
  stepUntil(w,()=>w.shots.some(p=>p.owner===b));
  const shot=w.shots.find(p=>p.owner===b);
  assert.deepEqual([shot.x,shot.y,shot.angle],[x,y,heading]);
  assert.equal(shot.kind,'scrapTriangle');
  assert.equal(shot.damage,11);
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-420)<1e-9);
  assert.equal(shotColor(shot,w.time),SUCATEIRO_VISUAL.stages[0].orbits.triangle.fill);
  assert.equal(triangle.alive,false);
  assert.equal(b.nextScrapGrab,w.time+1.2);
  assert.equal(player.score,score);
  stepUntil(w,()=>player.hp<before);
});

test('um tiro de Destroyer destrói a peça marcada e cancela o arremesso',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  w.shapes=[];
  w.formTarget=0;
  w.addShape('square',b.x+15,b.y-205,false);
  idle(player,b.x+440,b.y);
  idle(other,200,200);
  stepUntil(w,()=>b.scrapWarning);
  const {piece,until,x,y}=b.scrapWarning;
  idle(player,x+125,y);
  player.aim=Math.PI;
  assert.ok(w.spawnShot(player,C.Destroyer.guns[0]));
  stepUntil(w,()=>!piece.alive);
  const score=player.score;
  stepUntil(w,()=>w.time>until+.2);
  assert.equal(b.scrapWarning,null);
  assert.equal(w.shots.filter(p=>p.owner===b).length,0);
  assert.equal(player.score,score);
});

test('sorteio normal inclui o Sucateiro só em modos compatíveis com chefes de evento',()=>{
  for(const map of ['open','teams','four-teams']){
    const w=new Arena(7103,8,null,'both',true,map,'arena',1,true);
    assert.ok(w.bossQueue.includes('sucateiro'));
    w.bossQueue=['sucateiro',...w.bossQueue.filter(name=>name!=='sucateiro')];
    w.tick=Math.round(w.nextBossAt/DT)-1;
    w.step(null);
    assert.equal(w.boss.spec,SUCATEIRO);
  }
  for(const [map,schedule,events] of [['open','arena',false],['open','off',true],['maze','arena',true],['survival','arena',true]]){
    const w=new Arena(7103,8,null,'both',true,map,schedule,1,events);
    assert.ok(!w.bossQueue.includes('sucateiro'));
    assert.equal(w.spawnBoss('sucateiro'),null);
  }
});

test('o alfa da fase final sai sem aviso, 12% mais rápido e faz uma curva sem perder velocidade',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  w.shapes=[];
  w.formTarget=0;
  b.hp=b.spec.hp*.34;
  w.addShape('alpha',b.x+15,b.y-265,false);
  idle(player,b.x+490,b.y);
  idle(other,200,200);
  stepUntil(w,()=>w.shots.some(p=>p.kind==='scrapAlpha'));
  const shot=w.shots.find(p=>p.kind==='scrapAlpha');
  const speed=205*1.12,first=Math.atan2(shot.vy,shot.vx);
  assert.equal(b.scrapWarning,null);
  assert.equal(shot.scrapTarget,player.id);
  assert.equal(shot.damage,28);
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-speed)<1e-9);
  assert.ok(Math.hypot(b.vx,b.vy)>40);
  const predicted=scrapArcTravel(shot.vx,shot.vy,shot.scrapTurnRate,.62,30*DT);
  const start=[shot.x,shot.y];
  for(let i=0;i<30;i++)w.step(null);
  assert.ok(Math.abs(angleDelta(Math.atan2(shot.vy,shot.vx),first))>.20);
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-speed)<1e-9);
  assert.ok(Math.hypot(shot.x-start[0]-predicted[0],shot.y-start[1]-predicted[1])<1e-6);
});

test('a fase 2 lança duas peças distintas contra dois atacantes, sem parar nem repetir o alvo',()=>{
  const w=lab(),b=w.boss;
  w.shapes=[];
  w.formTarget=0;
  b.hp=b.spec.hp*.69;
  b.nextScrapShot=Infinity;
  for(const [i,t] of w.tanks.entries()){
    const side=i===0?1:-1;
    w.addShape(i===0?'triangle':'square',b.x+side*225,b.y,false);
    idle(t,b.x+side*440,b.y);
  }
  stepUntil(w,()=>b.scrapStock.length===2&&b.scrapStock.every(piece=>w.time-piece.scrap.at>=piece.scrap.pullTime));
  for(const [i,t] of w.tanks.entries()){
    const piece=b.scrapStock[i],heading=Math.atan2(piece.y-b.y,piece.x-b.x);
    idle(t,b.x+440*Math.cos(heading),b.y+440*Math.sin(heading));
    w.bossDamage(b,t);
  }
  b.nextScrapShot=w.time;
  stepUntil(w,()=>w.shots.filter(p=>p.scrapColor).length>0);
  const throws=w.shots.filter(p=>p.scrapColor);
  assert.equal(throws.length,2);
  assert.deepEqual(new Set(Array.from(throws,p=>p.scrapTarget)),new Set(w.tanks.map(t=>t.id)));
  assert.ok(throws.every(p=>p.bornTick===w.tick&&p.scrapTurnRate===0));
  assert.equal(b.scrapWarning,null);
  assert.equal(b.scrapStock.length,0);
  assert.ok(Math.hypot(b.vx,b.vy)>40);
});

test('os canhões ficam inativos na coleta e disparam alternando pelas bocas reais na fase 2',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  w.shapes=[];
  w.formTarget=0;
  idle(player,b.x+420,b.y);
  idle(other,200,200);
  for(let i=0;i<150;i++)w.step(null);
  assert.equal(w.shots.filter(p=>p.owner===b).length,0);
  b.hp=b.spec.hp*.69;
  const fired=[];
  for(let i=0;i<600&&fired.length<2;i++){
    w.step(null);
    for(const p of w.shots.filter(p=>p.bornTick===w.tick&&p.scrapBarrel!=null)){
      const part=SUCATEIRO_VISUAL.stages[1].parts.filter(part=>part.kind==='barrel')[p.scrapBarrel];
      const angle=b.aim+part.angle*Math.PI/180;
      const x=b.x+Math.cos(b.aim)*part.x-Math.sin(b.aim)*part.y+Math.cos(angle)*part.w/2;
      const y=b.y+Math.sin(b.aim)*part.x+Math.cos(b.aim)*part.y+Math.sin(angle)*part.w/2;
      assert.ok(Math.hypot(p.x-x,p.y-y)<1e-8);
      fired.push(p);
    }
  }
  assert.equal(fired.length,2);
  assert.equal(fired[0].scrapBarrel,0);
  assert.equal(fired[1].scrapBarrel,1);
});

test('a captura ganha velocidade no meio do puxão e se encaixa na órbita sem salto',()=>{
  const w=lab(),b=w.boss;
  w.shapes=[];
  w.formTarget=0;
  for(const t of w.tanks)idle(t,200,200);
  w.addShape('square',b.x+270,b.y,false);
  const piece=w.shapes[0];
  stepUntil(w,()=>piece.scrap);
  const speeds=[];
  for(let i=0;i<35;i++){
    w.step(null);
    speeds.push(Math.hypot(piece.vx,piece.vy));
  }
  assert.ok(speeds[0]<speeds[12]/4);
  assert.ok(speeds[30]<speeds[12]/2);
  assert.ok(Math.abs(Math.hypot(piece.x-b.x,piece.y-b.y)-b.scrapRadius)<1e-6);
});

test('Spike mantém uma abertura na órbita e volta ao avanço direto quando a rota libera',()=>{
  const w=new Arena(7103,2,['Spike','Auto Trapper',45,'sucateiro']);
  const b=w.boss,[spike]=w.tanks;
  const orbit=b.scrapRadius;
  idle(spike,b.x+orbit+spike.r+50,b.y);
  w.addShape('triangle',b.x+orbit,b.y,false);
  const blocker=w.shapes.at(-1);
  b.scrapStock=[blocker];
  b.scrapWarning={piece:blocker};

  const detour=scrapperRamRoute(w,spike,b);
  assert.ok(detour);
  const opening=spike.scrapApproach;
  w.time+=5*DT;
  assert.ok(scrapperRamRoute(w,spike,b));
  assert.equal(spike.scrapApproach,opening);

  blocker.x=b.x-orbit;
  w.time=opening.until;
  assert.equal(scrapperRamRoute(w,spike,b),null);
  assert.equal(spike.scrapApproach,null);
});

test('Spike atravessa o escudo e recua com pouca vida nas duas lutas que causavam inversões',()=>{
  for(const seed of [7107,7111]){
    const w=new Arena(seed,2,['Spike','Auto Trapper',45,'sucateiro']);
    const b=w.boss,[spike]=w.tanks;
    const bossDamage=w.bossDamage;
    let contacts=0, reversals=0, previous=null, retreated=false;
    w.bossDamage=function(target,by){
      if(target===b&&by===spike)contacts++;
      return bossDamage.call(this,target,by);
    };
    for(let tick=0;tick<3600&&!w.duelEnded;tick++){
      w.step(null);
      if(!spike.alive||(w.tick+spike.id)%5!==0)continue;
      const distance=Math.hypot(spike.x-b.x,spike.y-b.y);
      const advancing=Math.hypot(spike.intent.x,spike.intent.y)>.58;
      if(distance<510&&advancing){
        const heading=Math.atan2(spike.intent.y,spike.intent.x);
        if(previous!==null&&Math.abs(angleDelta(heading,previous))>2.65)reversals++;
        previous=heading;
      }else previous=null;
      if(spike.scrapRecovery&&distance>535)retreated=true;
    }
    assert.ok(contacts>0,'o Spike atingiu o casco na seed '+seed);
    assert.ok(reversals<=5,'sem inversões repetidas na seed '+seed);
    assert.ok(retreated,'o Spike se afastou do chefe para se recuperar na seed '+seed);
    assert.ok(spike.alive&&!b.alive,'vitória com o Spike vivo na seed '+seed);
  }
});
