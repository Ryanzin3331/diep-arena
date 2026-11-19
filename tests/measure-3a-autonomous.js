'use strict';
const fs=require('node:fs'),vm=require('node:vm');
let code=fs.readFileSync(process.env.CORE||'index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
function replaceOnce(from,to){if(!code.includes(from))throw Error('instrumentação não encontrada: '+from);code=code.replace(from,to);}
replaceOnce('combatHit(a,b,aClass,bClass,aDamage,bDamage=0,shotTactic,shotAttempt){','combatHit(a,b,aClass,bClass,aDamage,bDamage=0,shotTactic,shotAttempt){globalThis.hitEvent(this,a,b,aDamage,bDamage,shotAttempt);');
replaceOnce('function finishHeavyAttempt(m){','function finishHeavyAttempt(m,reason){');
replaceOnce('  m.heavyAttempt=null;\n  if(!(a.dealt>0||a.taken>0))return;','  globalThis.ended(a,reason);m.heavyAttempt=null;\n  if(!(a.dealt>0||a.taken>0))return;');
replaceOnce('if(t.learning?.heavyAttempt&&(!enemy||t.learning.heavyAttempt.rivalId!==enemy.id||!perceived(w,t,enemy)))finishHeavyAttempt(t.learning);',"if(t.learning?.heavyAttempt&&(!enemy||t.learning.heavyAttempt.rivalId!==enemy.id||!perceived(w,t,enemy)))finishHeavyAttempt(t.learning,'alvo');");
replaceOnce('if(t.learning.heavyAttempt&&w.time>=t.learning.heavyAttempt.until)finishHeavyAttempt(t.learning);',"if(t.learning.heavyAttempt&&w.time>=t.learning.heavyAttempt.until)finishHeavyAttempt(t.learning,'prazo');");
replaceOnce('    if(!valid)finishHeavyAttempt(m);',"    if(!valid)finishHeavyAttempt(m,!heavyCandidate?'sem_plano_ou_classe':targetEntity!==enemy?'outro_alvo':Math.abs(targetX-heavyCandidate.x)>=1e-6||Math.abs(targetY-heavyCandidate.y)>=1e-6?'rota_ou_destino':Math.abs(bestOffset)>=1e-9?'desvio':'sem_movimento');");
replaceOnce('m.heavyAttempt={id:m.heavyTrials,rivalId:enemy.id,choice:heavyCandidate.choice,dealt:0,taken:0,until:w.time+2};','m.heavyAttempt={id:m.heavyTrials,rivalId:enemy.id,choice:heavyCandidate.choice,dealt:0,taken:0,until:w.time+2};globalThis.opened(t,m.heavyAttempt,w.tick);');
replaceOnce('      this.shots.push(projectile);','      this.shots.push(projectile);if(projectile.heavyAttempt)globalThis.spawned(projectile,this.tick);');
replaceOnce('        e.hp-=p.damage*load;e.damaged=e.hit=this.time;','        if(p.heavyAttempt)globalThis.impact(p,e,this);\n        e.hp-=p.damage*load;e.damaged=e.hit=this.time;');
replaceOnce('    p.alive=false;\n    const approach=', '    if(p.heavyAttempt)globalThis.removed(p,this.tick,by);\n    p.alive=false;\n    const approach=');
replaceOnce('    e.alive=false;\n    e.hp=0;',"    if(e.learning?.heavyAttempt)globalThis.ended(e.learning.heavyAttempt,'morte');\n    e.alive=false;\n    e.hp=0;");
const c=vm.createContext({console,TextEncoder});vm.runInContext(code+';globalThis.api={Arena,changeClass,hull,XP,perceived,spendBot}',c);
const attempts=new Map(),shots=new Map(),bots=new Set(),scored=new Set(),byChoice=new Map(),reasons={},events={},incoming={};let clock=0;
c.hitEvent=(w,a,b,dealt,taken)=>{
 for(const [victim,source,damage] of [[b,a,dealt],[a,b,taken]]){
  const attempt=victim.learning?.heavyAttempt;if(!attempt||damage<=0)continue;
  const type=source.id===attempt.rivalId?'rival':'outro';incoming[type]=(incoming[type]||0)+1;
 }
};
c.opened=(t,a,tick)=>{attempts.set(a,{slot:t.slot,tick,choice:a.choice});bots.add(t.slot);};
c.ended=(a,reason)=>{const rec=attempts.get(a);if(!rec||rec.ended)return;rec.ended=true;rec.end=clock;rec.reason=reason;rec.dealt=a.dealt;rec.taken=a.taken;reasons[reason]=(reasons[reason]||0)+1;if(a.dealt>0||a.taken>0){scored.add(rec.slot);const flags=byChoice.get(rec.slot)||new Set();flags.add(a.choice);byChoice.set(rec.slot,flags);}};
c.spawned=(p,tick)=>{if(tick<=2400)shots.set(p,{tick,category:null});};
c.impact=(p,e,w)=>{const record=shots.get(p);if(!record||record.category)return;let type=e.id!==p.heavyAttempt.rivalId?'outro_alvo':p.owner.alive&&p.owner.learning?.heavyAttempt===p.heavyAttempt&&w.time<=p.heavyAttempt.until?(c.api.perceived(w,p.owner,e)?'rival_ativa_perceptivel':'rival_ativa_oculto'):'rival_encerrada';record.category=type;record.endTick=w.tick;events[type]=(events[type]||0)+1;};
c.removed=(p,tick,by)=>{const record=shots.get(p);if(record&&!record.category){record.category=by?'interceptado':'expirou_parede_ou_removido';record.endTick=tick;events[record.category]=(events[record.category]||0)+1;}};
const w=new c.api.Arena(7101,36,null,'both',true,'open','off');for(let i=0;i<36;i++){const t=w.tanks[i];t.level=30;t.score=c.api.XP[29];c.api.changeClass(t,i<6?'Destroyer':i<12?'Overseer':t.cls,true);c.api.spendBot(t,w.time);t.hp=c.api.hull(t);}const ticks=Number(process.env.TICKS||2400);for(let i=0;i<ticks;i++){clock=w.tick+1;w.step(null);}
for(const [p,r] of shots)if(!r.category)events.em_voo=(events.em_voo||0)+1;
console.log(JSON.stringify({seed:7101,ticks:w.tick,prepared:'36 tanques nível 30; slots 0–5 Destroyer, 6–11 Overseer; score XP[29], raio e atributos iniciais de nível 30',attempts:attempts.size,bots:bots.size,ended:reasons,shots:shots.size,destinations:events,incoming,scoredBots:scored.size,bothResponses:[...byChoice.values()].filter(v=>v.size===2).length,attemptRecords:[...attempts.values()],shotRecords:[...shots].map(([p,r])=>({id:p.id,kind:p.kind,owner:p.owner.slot,rival:p.heavyAttempt.rivalId,attemptTick:attempts.get(p.heavyAttempt)?.tick,attemptEnd:attempts.get(p.heavyAttempt)?.end,...r,alive:p.alive,age:p.age}))}));
