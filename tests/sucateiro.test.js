'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const html=readFileSync('index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const {Arena,DT,C,SUCATEIRO,SUCATEIRO_VISUAL,SCRAP_TYPES,snapshotArena,shotColor}=vm.runInNewContext(
  core+';({Arena,DT,C,SUCATEIRO,SUCATEIRO_VISUAL,SCRAP_TYPES,snapshotArena,shotColor})',{TextEncoder});

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

test('no alfa, o dano e o aviso do arremesso usam a configuração da fase final',()=>{
  const w=lab(),b=w.boss,[player,other]=w.tanks;
  w.shapes=[];
  w.formTarget=0;
  b.hp=b.spec.hp*.34;
  w.addShape('alpha',b.x+15,b.y-265,false);
  idle(player,b.x+490,b.y);
  idle(other,200,200);
  stepUntil(w,()=>b.scrapWarning);
  assert.ok(Math.abs(b.scrapWarning.until-w.time-1.2)<1e-9);
  stepUntil(w,()=>w.shots.some(p=>p.owner===b));
  const shot=w.shots.find(p=>p.owner===b);
  assert.equal(shot.kind,'scrapAlpha');
  assert.equal(shot.damage,28);
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-205)<1e-9);
});
