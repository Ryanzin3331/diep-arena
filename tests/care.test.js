'use strict';

const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const {prepareCareEncounter}=require('./care-encounter');
const core=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const api=vm.runInNewContext(core+';({Arena,C,XP,hull,changeClass,botThink})',{TextEncoder});

function run(gap,speed,{history,until=610}={}){
  const scene=prepareCareEncounter(api,undefined,gap);
  const {world,bot}=scene;
  if(history)bot.learning.careResults={...history};
  while(world.tick<until)world.step({x:speed,y:0,aim:0,fire:false});
  return scene;
}

test('Cuidado solta a perseguição improdutiva e respeita o intervalo de seleção',()=>{
  const {world,bot,player}=run(440,.95,{until:365});
  assert.equal(bot.learning.lastCareChoice.choice,'Abandonar');
  assert.equal(bot.learning.lastCareChoice.basis,'regra inicial');
  assert.equal(bot.learning.lastCareChoice.dealt,0);
  assert.equal(bot.learning.careResults,undefined);
  while(world.tick<500){
    world.step({x:.95,y:0,aim:0,fire:false});
    assert.notEqual(bot.enemy,player);
  }
});

test('pressão real abre extensão e experiências próprias mudam a escolha no mesmo estado',()=>{
  const pressure=run(390,.87,{until:365});
  assert.equal(pressure.bot.learning.lastCareChoice.choice,'Insistir');
  assert.ok(pressure.bot.learning.lastCareChoice.dealt>6);
  while(!pressure.bot.learning.lastCareResult&&pressure.world.tick<505)
    pressure.world.step({x:.87,y:0,aim:0,fire:false});
  assert.ok(pressure.bot.learning.lastCareResult.dealt>0);

  const first=run(365,.92,{until:505}).bot.learning.careResults;
  const history=run(365,.92,{history:first,until:505}).bot.learning.careResults;
  assert.equal(history.count,2);
  assert.ok(history.score<0);
  const learned=run(365,.92,{history,until:364});
  const control=run(365,.92,{history,until:364});
  assert.deepEqual([learned.bot.x,learned.bot.y,learned.player.hp],[control.bot.x,control.bot.y,control.player.hp]);
  delete control.bot.learning.careResults;
  for(const {world} of [learned,control])world.step({x:.92,y:0,aim:0,fire:false});
  assert.equal(learned.bot.learning.lastCareChoice.basis,'histórico');
  assert.equal(learned.bot.learning.lastCareChoice.choice,'Abandonar');
  assert.equal(control.bot.learning.lastCareChoice.choice,'Insistir');
  assert.equal(control.bot.enemy,control.player);
  assert.notEqual(learned.bot.enemy,learned.player);
});

test('Cuidado atribui dano ao rival e mantém o identificador da janela do disparo',()=>{
  const {world,bot,player}=run(390,.87,{until:365});
  const a=bot.careWindow;
  assert.ok(a?.extension);
  const other=world.spawnTank('Terceiro',true,1,15,null,bot.x+10,bot.y,true,null,null,false);
  const shot=world.shots.find(p=>p.owner===bot&&p.careWindow!==a);
  assert.ok(shot);
  world.combatHit(bot,player,bot.cls,player.cls,10,0,undefined,undefined,shot);
  world.spawnShot(bot,api.C.Tank.guns[0]);
  const current=world.shots.at(-1);
  assert.equal(current.careWindow,a);
  world.combatHit(bot,other,bot.cls,other.cls,10,0,undefined,undefined,current);
  world.combatHit(other,bot,other.cls,bot.cls,9);
  assert.deepEqual([a.dealt,a.taken],[0,0]);
  world.combatHit(bot,player,bot.cls,player.cls,10,0,undefined,undefined,current);
  world.combatHit(player,bot,player.cls,bot.cls,5);
  assert.deepEqual([a.dealt,a.taken],[10,5]);
});

test('emergência prevalece sobre Cuidado e o resultado agregado sobrevive ao renascimento',()=>{
  const history={count:2,score:-.4,seconds:4,dealt:0,taken:3};
  const {world,bot,player}=run(440,.95,{history,until:364});
  bot.hp=api.hull(bot)*.15;
  world.step({x:.95,y:0,aim:0,fire:false});
  assert.equal(bot.learning.lastCareChoice.basis,'emergência');
  assert.equal(bot.enemy,player);
  assert.ok(!bot.careCooldown);
  world.kill(bot,null,'teste');
  bot.respawnAt=world.time;
  world.step(null);
  const reborn=world.tanks.find(t=>!t.human);
  assert.notEqual(bot,reborn);
  assert.notEqual(bot.learning.careResults,reborn.learning.careResults);
  assert.equal(reborn.learning.careResults.score,history.score);
  assert.equal(reborn.careWindow,undefined);
  assert.equal(prepareCareEncounter(api).bot.learning.careResults,undefined);
});

test('Cuidado usa a percepção do Maze e não interfere no multiplayer',()=>{
  for(const scope of ['maze','multiplayer']){
    const arena=new api.Arena(7103,1,null,'both',true,scope==='maze'?'maze':'open','off',1,false,null,scope);
    const {bot,player}=prepareCareEncounter(api,arena);
    let pair;
    for(let y=300;y<arena.size-300&&!pair;y+=80){
      for(let x=300;x<arena.size-650&&!pair;x+=80){
        if(arena.maze?.hit(x,y,x+380,y,bot.r)==null)pair=[x,y];
      }
    }
    assert.ok(pair);
    for(const [tank,x] of [[bot,pair[0]],[player,pair[0]+380]]){
      Object.assign(tank,{x,px:x,y:pair[1],py:pair[1]});
    }
    arena.time=7;arena.indexSense();
    bot.careWindow={rival:player,started:1,until:7,gap:380,dealt:0,taken:0};
    api.botThink(arena,bot);
    if(scope==='maze')assert.equal(bot.learning.lastCareChoice.choice,'Abandonar');
    else{assert.equal(bot.enemy,player);assert.equal(bot.learning.lastCareChoice,undefined);}
  }
});
