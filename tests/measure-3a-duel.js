'use strict';
const fs=require('node:fs'),vm=require('node:vm');
let code=fs.readFileSync(process.env.CORE||'index.html','utf8').split('<script id="core">')[1].split('</script>')[0].replace(/\r\n/g,'\n');
function replaceOnce(from,to){if(!code.includes(from))throw Error('instrumentação não encontrada: '+from);code=code.replace(from,to);}
replaceOnce('combatHit(a,b,aClass,bClass,aDamage,bDamage=0,shotTactic,shotAttempt,shot){','combatHit(a,b,aClass,bClass,aDamage,bDamage=0,shotTactic,shotAttempt,shot){globalThis.hitEvent(this,a,b,aDamage,bDamage,shotAttempt);');
replaceOnce('function finishHeavyAttempt(m,now=0){','function finishHeavyAttempt(m,now=0,reason){');
replaceOnce('  m.heavyAttempt=null;a.closedAt=now;', '  globalThis.ended(a,reason);m.heavyAttempt=null;a.closedAt=now;');
replaceOnce('if(t.learning?.heavyAttempt&&(!enemy||t.learning.heavyAttempt.rivalId!==enemy.id||!perceived(w,t,enemy)))finishHeavyAttempt(t.learning,w.time);',"if(t.learning?.heavyAttempt&&(!enemy||t.learning.heavyAttempt.rivalId!==enemy.id||!perceived(w,t,enemy)))finishHeavyAttempt(t.learning,w.time,'alvo');");
replaceOnce('if(t.learning.heavyAttempt&&w.time>=t.learning.heavyAttempt.until)finishHeavyAttempt(t.learning,w.time);',"if(t.learning.heavyAttempt&&w.time>=t.learning.heavyAttempt.until)finishHeavyAttempt(t.learning,w.time,'prazo');");
replaceOnce('    if(!valid)finishHeavyAttempt(m,w.time);',"    if(!valid)finishHeavyAttempt(m,w.time,!heavyCandidate?'sem_plano_ou_classe':targetEntity!==enemy?'outro_alvo':Math.abs(targetX-heavyCandidate.x)>=1e-6||Math.abs(targetY-heavyCandidate.y)>=1e-6?'rota_ou_destino':Math.abs(bestOffset)>=1e-9?'desvio':'sem_movimento');");
replaceOnce('m.heavyAttempt={id:m.heavyTrials,rivalId:enemy.id,choice:heavyCandidate.choice,dealt:0,taken:0,until:w.time+2};','m.heavyAttempt={id:m.heavyTrials,rivalId:enemy.id,choice:heavyCandidate.choice,dealt:0,taken:0,until:w.time+2};globalThis.opened(t,m.heavyAttempt,w.tick);');
replaceOnce('      this.shots.push(projectile);','      this.shots.push(projectile);if(projectile.heavyAttempt)globalThis.spawned(projectile,this.tick);');
replaceOnce('        e.hp-=p.damage*load;e.damaged=e.hit=this.time;','        if(p.heavyAttempt)globalThis.measureImpact(p,e,this);\n        e.hp-=p.damage*load;e.damaged=e.hit=this.time;');
replaceOnce('    p.alive=false;\n    const approach=', '    if(p.heavyAttempt)globalThis.removed(p,this.tick,by);\n    p.alive=false;\n    const approach=');
replaceOnce('    e.alive=false;\n    e.hp=0;',"    if(e.learning?.heavyAttempt)globalThis.ended(e.learning.heavyAttempt,'morte');\n    e.alive=false;\n    e.hp=0;");
if(process.env.CONTROL==='1')replaceOnce('if(heavyExperience&&tankCombat&&t.learning&&opening==null){','if(false&&heavyExperience&&tankCombat&&t.learning&&opening==null){');
replaceOnce('      this.shots.push(projectile);if(projectile.heavyAttempt)globalThis.spawned(projectile,this.tick);','      this.shots.push(projectile);globalThis.allSpawned(projectile,this.tick);if(projectile.heavyAttempt)globalThis.spawned(projectile,this.tick);');
replaceOnce('        if(p.owner.type==="boss")this.provokeBossProjectile(p,q.owner);','        globalThis.shotCollision(p,q,this.tick);if(p.owner.type==="boss")this.provokeBossProjectile(p,q.owner);');
const c=vm.createContext({console,TextEncoder});vm.runInContext(code+';globalThis.api={Arena,changeClass,hull,XP,perceived,spendBot,C,range,bulletSpeed,chooseHeavyResponse}',c);
const decisions=[];const defensiveBots=new Set();
const attempts=new Map(),shots=new Map(),bots=new Set(),scored=new Set(),byChoice=new Map(),reasons={},events={},incoming={};let clock=0;
c.hitEvent=(w,a,b,dealt,taken)=>{
 for(const [victim,source,damage] of [[b,a,dealt],[a,b,taken]]){
  const attempt=victim.learning?.heavyAttempt;if(!attempt||damage<=0)continue;
  const type=source.id===attempt.rivalId?'rival':'outro';incoming[type]=(incoming[type]||0)+1;
 }
};
c.opened=(t,a,tick)=>{const m=t.learning,rows=m.heavyResults?.map(r=>({...r}));const baseline=c.api.chooseHeavyResponse({...m,heavyAttempt:null,heavyResults:undefined,heavyTrials:m.heavyTrials-1});decisions.push({slot:t.slot,tick,choice:a.choice,rivalId:a.rivalId,baseline,results:rows||null,both:!!rows&&rows.every(r=>r.count>0),historyChanged:!!rows&&a.choice!==baseline});attempts.set(a,{slot:t.slot,tick,choice:a.choice,id:a.id});bots.add(t.slot);};
c.ended=(a,reason)=>{const rec=attempts.get(a);if(!rec||rec.ended)return;rec.ended=true;rec.end=clock;rec.reason=reason;rec.dealt=a.dealt;rec.taken=a.taken;rec.defensive=a.defensive||0;if(a.defensive>0)defensiveBots.add(rec.slot);reasons[reason]=(reasons[reason]||0)+1;if(a.dealt>0||a.taken>0){scored.add(rec.slot);const flags=byChoice.get(rec.slot)||new Set();flags.add(a.choice);byChoice.set(rec.slot,flags);}};
c.spawned=(p,tick)=>{if(tick<=2400)shots.set(p,{tick,category:null});};
c.measureImpact=(p,e,w)=>{const record=shots.get(p);if(!record||record.category)return;let type=e.id!==p.heavyAttempt.rivalId?'outro_alvo':p.owner.alive&&p.owner.learning?.heavyAttempt===p.heavyAttempt&&w.time<=p.heavyAttempt.until?(c.api.perceived(w,p.owner,e)?'rival_ativa_perceptivel':'rival_ativa_oculto'):'rival_encerrada';record.category=type;record.endTick=w.tick;events[type]=(events[type]||0)+1;};
c.removed=(p,tick,by)=>{const record=shots.get(p);if(record&&!record.category){record.category=by?'interceptado':'expirou_parede_ou_removido';record.endTick=tick;events[record.category]=(events[record.category]||0)+1;}};

const seed=Number(process.env.SEED||7102), distance=Number(process.env.DISTANCE||300), ticks=Number(process.env.TICKS||900);
const w=new c.api.Arena(seed,2,null,'both',true,'open','off'),[a,b]=w.tanks;
for(const t of [a,b]){t.level=30;t.score=c.api.XP[29];c.api.spendBot(t,w.time);t.hp=c.api.hull(t);t.protect=0;}
c.api.changeClass(a,'Tank',true);a.goal='Tank';a.autoBranch=null;c.api.changeClass(b,'Destroyer',true);b.goal='Destroyer';b.autoBranch=null;a.hp=c.api.hull(a);b.hp=c.api.hull(b);
Object.assign(a,{x:w.mid-distance/2,y:w.mid,px:w.mid-distance/2,py:w.mid,aim:0,protect:0});
Object.assign(b,{x:w.mid+distance/2,y:w.mid,px:w.mid+distance/2,py:w.mid,aim:Math.PI,protect:0});
a.learning.threats=new Map([[b.profileId,2]]);w.shapes=[];w.formTarget=0;w.nextBossAt=Infinity;
const fired={tank:0,destroyer:0},hits=[],interceptions=[],shotCollisions=[];
c.shotCollision=(p,q,tick)=>shotCollisions.push({tick,owners:[p.owner.slot,q.owner.slot]});
c.allSpawned=(p,tick)=>{if(p.owner===a)fired.tank++;if(p.owner===b)fired.destroyer++;};
const prevHit=c.hitEvent;c.hitEvent=(world,from,to,damage,back,origin)=>{prevHit(world,from,to,damage,back,origin);if((from===a&&to===b)||(from===b&&to===a))hits.push({tick:world.tick,from:from===a?'tank':'destroyer',damage,origin:origin?.id||null,active:a.learning.heavyAttempt?.id||null,originActive:!!origin&&a.learning.heavyAttempt===origin});};
const removals=[];const remove=w.removeShot;w.removeShot=function(p,by){if(by)removals.push({tick:this.tick,owner:p.owner.slot,by:by.slot});return remove.call(this,p,by);};
const credit=w.creditHeavyInterception;w.creditHeavyInterception=function(own,hostile){const before=a.learning.heavyAttempt?.defensive||0;credit.call(this,own,hostile);if(own.owner===a&&hostile.owner===b)interceptions.push({tick:this.tick,attempt:own.heavyAttempt?.id||null,active:a.learning.heavyAttempt?.id||null,credited:(a.learning.heavyAttempt?.defensive||0)>before});};
let stop='limite';for(let i=0;i<ticks;i++){clock=w.tick+1;w.step(null);if(!a.alive||!b.alive){stop=!a.alive?'tank_morreu':'destroyer_morreu';break;}}
for(const [obj,rec] of attempts)if(!rec.ended){rec.end=w.tick;rec.reason='fim_observacao';rec.dealt=obj.dealt;rec.taken=obj.taken;rec.defensive=obj.defensive||0;}
const rows=[...attempts].map(([a,r])=>({...r,dealt:a.dealt,taken:a.taken,defensive:a.defensive||0,durationTicks:r.end-r.tick}));
console.log(JSON.stringify({seed,distance,control:process.env.CONTROL==='1',ticks:w.tick,stop,finalClasses:[a.cls,b.cls],finalDistance:Math.hypot(a.x-b.x,a.y-b.y),fired,hits,shotCollisions,interceptions,removals,associatedShots:[...shots].map(([p,r])=>({attempt:p.heavyAttempt.id,...r})),attempts:rows,decisions,results:a.learning.heavyResults||null,trials:a.learning.heavyTrials||0,nextChoice:c.api.chooseHeavyResponse(a.learning),threat:a.learning.threats?.get(b.profileId)||0}));




