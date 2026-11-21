'use strict';

const fs=require('node:fs'), vm=require('node:vm');
const {prepareCareEncounter}=require('./care-encounter');
const html=fs.readFileSync(process.env.CARE_CORE||'index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const api=vm.runInNewContext(core+';({Arena,changeClass,XP,hull})',{TextEncoder});
const [map='duel',seed='7103',duration='3600']=process.argv.slice(2);
if(map==='duel'){
  const {world,bot,player}=prepareCareEncounter(api);
  let ticksOnTarget=0, damage=0, first;
  const combatHit=world.combatHit;
  world.combatHit=function(attacker,victim,attackerClass,victimClass,dealt,taken=0,...rest){
    if(attacker===bot&&victim===player)damage+=Math.max(0,Math.min(dealt,player.hp));
    if(attacker===player&&victim===bot)damage+=Math.max(0,Math.min(taken,player.hp));
    return combatHit.call(this,attacker,victim,attackerClass,victimClass,dealt,taken,...rest);
  };
  for(let i=0;i<800;i++){
    world.step({x:.95,y:0,aim:0,fire:false});
    if(bot.enemy===player)ticksOnTarget++;
    if(!first&&bot.learning.lastCareChoice)first={tick:world.tick,...bot.learning.lastCareChoice};
  }
  console.log(JSON.stringify({ticks:world.tick,ticksOnTarget,damage,first}));
}else{
  const world=new api.Arena(Number(seed),36,null,'both',true,map,'off');
  const seen=new WeakSet(), slots=new Set(), tracking=new Set(), decisions={};
  let firstHistory=null;
  let longest=0;
  for(let i=0;i<Number(duration);i++){
    world.step(null);
    for(const bot of world.tanks){
      if(bot.careWindow){
        tracking.add(bot.slot);
        longest=Math.max(longest,world.time-bot.careWindow.started);
      }
      const choice=bot.learning?.lastCareChoice;
      if(!choice||seen.has(choice))continue;
      seen.add(choice);slots.add(bot.slot);
      const key=choice.basis+' · '+choice.choice;
      decisions[key]=(decisions[key]??0)+1;
      if(!firstHistory&&choice.basis==='histórico')firstHistory={slot:bot.slot,tick:world.tick,...choice};
    }
  }
  const evaluated=world.tanks.map(t=>t.learning?.careResults?.count??0);
  console.log(JSON.stringify({map,seed:Number(seed),ticks:world.tick,tracking:tracking.size,longest, bots:slots.size,decisions,
    evaluated:evaluated.reduce((sum,n)=>sum+n,0),botsEvaluated:evaluated.filter(Boolean).length,firstHistory}));
}
