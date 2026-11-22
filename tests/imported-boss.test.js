'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const html=readFileSync('index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const {Arena,BossProject,DT,snapshotArena,shuffleBosses,BOSS_SPECS}=vm.runInNewContext(
  readFileSync('boss-project.js','utf8')+core+
  ';({Arena,BossProject,DT,snapshotArena,shuffleBosses,BOSS_SPECS})',{TextEncoder});

const mount={id:'canhao',kind:'barrel',x:60,y:0,w:80,h:30,angle:0,origin:{x:45,y:8}};
const model=[{shape:'path',points:[{x:-8,y:-4},{x:12,y:0},{x:-8,y:4}],scale:110,scaleY:155,fill:'#ab351b'}];
function blueprint(){
  return {version:8,template:'blank',name:'Vigia Teste',combat:{hp:900,bodyDamage:26,hitRadius:48},stages:[
    {title:'Vigia',body:'hex',fill:'#619bb2',parts:[mount,{...mount,id:'outro',y:-36}],
      behaviors:[
        {type:'fire',trigger:'near',range:300,mode:'alternate',aim:'track',turnSpeed:90,damage:19,interval:.25,speed:600},
        {type:'drones',source:'canhao',mode:'chase',count:2,limit:3,life:1.25,model,damage:12,interval:.3},
      ]},
    {title:'Anel',hp:65,body:'oct',radius:82,fill:'#bc7445',parts:[],orbitEnabled:true,orbitShape:'custom',
      orbitPoints:[{x:.94,y:0},{x:0,y:-.84},{x:-.94,y:0},{x:0,y:.84}],
      radiusOrbit:130,speedOrbit:100,capacity:6,warning:.25,cooldown:.45,
      orbits:{triangle:{qty:4,limit:4,damage:57,speed:520,fill:'#936217'},pentagon:{qty:2,limit:2,fill:'#0ba789'}},
      behaviors:[{type:'launch',trigger:'interval',interval:.2,aim:'target'},
        {type:'move',trigger:'near',range:300,mode:'distance',distance:230,speed:100,duration:2}]},
    {title:'Última fase',hp:29,body:'circle',radius:93,parts:[],
      behaviors:[{type:'move',trigger:'enter',mode:'dash',duration:.7,speed:160}]}
  ]};
}
function parse(raw=blueprint()){return BossProject.read(JSON.stringify(raw));}
function arena(raw){
  return new Arena(997,2,['Tank','Tank',45,'imported',null,parse(raw)],'off',false);
}
function still(t,x,y){
  Object.assign(t,{x,y,px:x,py:y,aim:0,human:true,protect:0,vx:0,vy:0,kx:0,ky:0});
}
function near(a,b,epsilon=1e-6){assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);}
function stepUntil(w,condition,ticks=240){
  for(let i=0;i<ticks&&!condition();i++)w.step(null);
  assert.ok(condition(),'o evento ocorreu antes do limite de ticks');
}

test('importa versões 1–9 e dá atributos padrão aos projetos antigos',()=>{
  for(const version of [1,2,3,4,5,6,7,8,9]){
    const project=parse({version,name:'Legado',template:'blank',stages:[{radius:67}]});
    assert.equal(project.name,'Legado');
    assert.equal(project.combat.hp,1400);
    assert.equal(project.combat.bodyDamage,22);
    assert.equal(project.combat.hitRadius,0);
    assert.equal(project.stages[0].radius,67);
    assert.equal(project.stages[0].bodySpin,0);
    assert.equal(BossProject.spec(project).r,67);
  }
});
test('rejeita JSON ilegível ou de outra origem e limita atributos fora da faixa',()=>{
  assert.throws(()=>BossProject.read('{quebrado'),/JSON inválido/);
  assert.throws(()=>BossProject.read('{}'),/fases exportadas/);
  assert.throws(()=>parse({version:8,stages:[null]}),/fases exportadas/);
  assert.throws(()=>parse({version:99,stages:[{}]}),/1 a 8 fases/);
  assert.throws(()=>BossProject.read(' '.repeat(BossProject.FILE_LIMIT+1)),/5 MB/);
  const raw=blueprint();
  raw.combat={hp:1e100,bodyDamage:-20,hitRadius:900};
  raw.stages[0].behaviors.push({type:'codigo',script:'globalThis.executado=true'});
  raw.stages[0].fill='url(https://example.com)';
  const project=parse(raw);
  assert.equal(project.combat.hp,20000);
  assert.equal(project.combat.bodyDamage,0);
  assert.equal(project.combat.hitRadius,180);
  assert.equal(project.stages[0].behaviors.length,2);
  assert.match(project.stages[0].fill,/^#[\da-f]{6}$/i);
});
test('o importado só nasce no desafio do Laboratório e fica fora do sorteio oficial',()=>{
  const w=arena();
  assert.equal(w.tanks.length,2);
  assert.equal(w.boss.name,'Vigia Teste');
  assert.equal(w.boss.hp,900);
  assert.equal(w.boss.spec.body,26);
  assert.equal(w.boss.r,48);
  assert.equal(new Arena(997,2).spawnBoss('imported'),null);
  assert.ok(!('imported' in BOSS_SPECS));
  for(const scope of ['open','teams','four-teams','maze'])assert.ok(!shuffleBosses(()=>.4,null,true,scope).includes('imported'));
});
test('disparo respeita alcance, mira contínua, alternância, origem e dano',()=>{
  const raw=blueprint();raw.stages[0].behaviors.pop();
  const w=arena(raw),b=w.boss,[a,z]=w.tanks;
  still(a,b.x+340,b.y+40);still(z,270,270);
  for(let i=0;i<8;i++)w.step(null);
  assert.equal(w.shots.filter(p=>p.owner===b).length,0);
  assert.ok(b.authored.aims.canhao>0,'acompanha antes de disparar');
  still(a,b.x+240,b.y+30);
  w.step(null);
  const first=w.shots.find(p=>p.owner===b);
  assert.equal(first.damage,19);
  const expected=BossProject.barrelPose(b.authored.phase.parts[0],first.angle);
  near(first.x,b.x+expected.muzzleX);near(first.y,b.y+expected.muzzleY);
  near(Math.hypot(first.vx,first.vy),600);
  const life=a.hp,turn=b.authored.aims.canhao;still(a,b.x+240,b.y+55);
  w.step(null);assert.notEqual(b.authored.aims.canhao,turn);
  stepUntil(w,()=>a.hp<life);
  stepUntil(w,()=>w.shots.some(p=>p.owner===b&&p.id>first.id));
  const second=w.shots.find(p=>p.owner===b&&p.id>first.id);
  const other=BossProject.barrelPose(b.authored.phase.parts[1],second.angle);
  near(second.x,b.x+other.muzzleX);near(second.y,b.y+other.muzzleY);
});
test('drones usam origem, modelo, perseguição, limite e duração',()=>{
  const raw=blueprint();raw.stages[0].behaviors.shift();
  const w=arena(raw),b=w.boss,[a,z]=w.tanks;
  still(a,b.x+220,b.y+8);still(z,260,260);
  w.step(null);
  const drones=()=>w.shots.filter(p=>p.alive&&p.owner===b&&p.authoredDrone);
  assert.equal(drones().length,2);
  const p=drones()[0],position=p.x;
  near(position,b.x+105);near(p.y,b.y+8);
  assert.equal(p.authoredVisual.model[0].fill,'#ab351b');
  assert.equal(p.authoredVisual.model[0].scaleY,155);
  const before=a.hp;
  for(let i=0;i<55;i++){w.step(null);assert.ok(b.drones<=3);}
  assert.ok(p.x>position);assert.ok(a.hp<before);
  assert.ok(snapshotArena(w).authoredShots.every(s=>s.authoredVisual.model));
  stepUntil(w,()=>!p.alive);assert.ok(p.age>=p.life||p.dur<=0);
});
test('órbita personalizada respeita peso, é atacável e lança com aviso, dano e recarga',()=>{
  const w=arena(),b=w.boss,[a,z]=w.tanks;
  still(a,b.x+250,b.y-70);still(z,220,200);
  b.hp=585;
  w.step(null);
  const state=b.authored;
  assert.equal(state.index,1);
  assert.equal(state.stock.length,4);
  assert.equal(state.stock.filter(f=>f.name==='pentagon').length,2);
  assert.equal(state.track.points.length,4);
  assert.equal(state.stock[0].f.color,'#0ba789');
  for(const f of state.stock)assert.ok(Math.hypot(f.x-b.x,f.y-b.y)<=130);
  assert.ok(state.warning);
  const old=state.warning.form,oldX=old.x;
  const recorded=snapshotArena(w).boss.authored;
  assert.equal(recorded.stock.length,4);assert.equal(recorded.warning.id,old.id);
  for(let i=0;i<7;i++)w.step(null);
  assert.equal(old.alive,true);
  assert.notEqual(old.x,oldX,'continua em movimento durante o aviso');
  stepUntil(w,()=>!old.alive);
  const projectile=w.shots.find(p=>p.authoredVisual?.sides);
  near(projectile.x,old.x);near(projectile.y,old.y);
  assert.equal(projectile.authoredVisual.sides,5);
  assert.equal(projectile.authoredFill,'#0ba789');
  assert.ok(state.coolUntil>w.time+.4);
  assert.equal(state.warning,null);
  const fixed=b.r;
  b.hp=261;w.step(null);
  assert.equal(b.authored.index,2);assert.equal(b.r,fixed);
  assert.ok(state.stock.every(f=>!f.alive));
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  for(let i=0;i<12;i++)w.step(null);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<distance,'executou a investida');
});
test('destruir uma peça antes do disparo cancela o aviso e o fim do duelo limpa as entidades',()=>{
  const w=arena(),b=w.boss,[a,z]=w.tanks;
  still(a,b.x+260,b.y);still(z,220,260);
  b.hp=580;w.step(null);
  const doomed=b.authored.warning.form;
  w.kill(doomed,a,'canhão');
  w.step(null);
  assert.notEqual(b.authored.warning?.form,doomed);
  for(let i=0;i<Math.ceil(.25/DT);i++)w.step(null);
  assert.ok(!w.shots.some(p=>p.authoredVisual?.sides));
  w.kill(a,b,b.name);w.kill(z,b,b.name);w.step(null);
  assert.ok(w.duelEnded);
  assert.ok(b.authored.stock.every(f=>!f.alive));
  assert.ok(!w.shots.some(p=>p.alive&&p.owner===b));
});

test('o giro leva a origem dos tiros fixos e dos drones junto do casco nos dois sentidos',()=>{
  for(const bodySpin of [360,-360]){
    const raw=blueprint(),phase=raw.stages[0];
    phase.bodySpin=bodySpin;
    phase.behaviors[0].aim='fixed';
    phase.behaviors[0].trigger='enter';
    phase.behaviors[1].trigger='enter';
    const w=arena(raw),b=w.boss,[a,z]=w.tanks;
    still(a,b.x+250,b.y);still(z,260,260);
    w.step(null);
    const [round,...drones]=w.shots.filter(p=>p.owner===b);
    const heading=bodySpin*Math.PI/180*DT;
    near(b.aim,heading);
    near(round.angle,heading);
    near(round.x,b.x+105*Math.cos(heading)-8*Math.sin(heading));
    near(round.y,b.y+105*Math.sin(heading)+8*Math.cos(heading));
    assert.equal(drones.length,2);
    assert.ok(drones.every(p=>p.x===round.x&&p.y===round.y));
    const snapshot=snapshotArena(w);
    near(snapshot.boss.aim,heading);
    for(let i=0;i<14;i++)w.step(null);
    near(b.aim,Math.sign(bodySpin)*Math.PI/2);
    near(round.angle,heading);
  }
});

test('torreta independente mantém a mira enquanto o casco gira e o giro para na fase seguinte',()=>{
  const raw=blueprint(),phase=raw.stages[0];
  phase.bodySpin=240;
  phase.parts=[{...mount,kind:'plate',x:0,y:0,origin:{x:35,y:0}}];
  phase.behaviors=[{type:'fire',aim:'track',trigger:'near',range:60,turnSpeed:90}];
  raw.stages[1].behaviors=[];
  const w=arena(raw),b=w.boss,[a,z]=w.tanks;
  still(a,b.x+250,b.y);still(z,260,260);
  for(let i=0;i<24;i++)w.step(null);
  near(b.aim,Math.PI*1.6/3);
  near(b.aim+b.authored.aims.canhao,Math.atan2(a.y-b.y,a.x-b.x),.018);
  assert.equal(w.shots.filter(p=>p.owner===b).length,0);
  const before=b.aim;
  b.hp=500;w.step(null);
  assert.equal(b.authored.index,1);
  near(b.aim,before);
  w.step(null);near(b.aim,before);
});

test('o giro do casco mantém independente o caminho da órbita personalizada',()=>{
  const projects=[0,-100,150].map(bodySpin=>{
    const raw=blueprint();
    raw.stages[1].bodySpin=bodySpin;
    raw.stages[1].behaviors=[];
    const w=arena(raw),b=w.boss;
    for(const t of w.tanks)still(t,200,200);
    b.hp=500;
    for(let i=0;i<36;i++)w.step(null);
    return b;
  });
  const points=b=>Array.from(b.authored.stock,p=>[p.x,p.y,p.angle]);
  for(const b of projects.slice(1)){
    assert.notEqual(b.aim,projects[0].aim);
    assert.deepEqual(points(b),points(projects[0]));
  }
});

test('giro local do canhão é somado ao giro do chefe',()=>{
  const raw=blueprint(),phase=raw.stages[0];
  phase.bodySpin=-30;
  phase.behaviors=[{type:'fire',trigger:'interval',interval:.2,aim:'spin',turnSpeed:120,barrels:['canhao']}];
  const w=arena(raw),b=w.boss;
  for(const t of w.tanks)still(t,210,210);
  for(let i=0;i<13;i++)w.step(null);
  const rounds=w.shots.filter(p=>p.owner===b);
  assert.equal(rounds.length,2);
  near(rounds[1].angle,w.time*Math.PI/2);
  near(b.aim, -w.time*Math.PI/6);
});
