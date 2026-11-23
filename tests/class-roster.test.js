'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const html=readFileSync('index.html','utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const {Arena,C,DT,XP,changeClass,picks,rotateFfaClassVariants,route,spendBot}=vm.runInNewContext(
  core+';({Arena,C,DT,XP,changeClass,picks,rotateFfaClassVariants,route,spendBot})',{TextEncoder});
const routes={
  'Triple Twin':['Twin Flank'],
  'Spread Shot':['Triple Shot'],
  'Tri-Trapper':['Trapper'],
  Sprayer:['Machine Gun'],
  Streamliner:['Hunter','Gunner'],
  'Pellet Shot':['Shotgun'],
  'Auto Gunner':['Auto 3','Gunner'],
  'Auto Tank':['Tank']
};

function lab(name,fire=true){
  const w=new Arena(703,2,[name,'Tank',45],'off',false);
  const [t,e]=w.tanks;
  t.intent={x:0,y:0,aim:0,fire,alt:false};
  t.protect=0;t.stats.fill(0);t.cool.fill(0);t.x=w.mid;t.y=w.mid;
  e.protect=0;e.x=w.mid+235;e.y=w.mid;
  w.shapes=[];w.indexSense();
  return {w,t,e};
}
function position(t,opponent,angle=0){
  t.intent={x:0,y:0,aim:angle,fire:true,alt:false};
  t.x=opponent.x-245;t.y=opponent.y;
}

test('as novas evoluções são diretas a partir das classes certas e só liberam a partir do nível 45',()=>{
  for(const [dest,origins] of Object.entries(routes)){
    const {t}=lab(dest);
    assert.ok(route('Tank',dest).includes(dest));
    for(const origin of origins){
      t.level=44;changeClass(t,origin,true);
      assert.ok(!picks(t).includes(dest));
      assert.equal(changeClass(t,dest),false);
      t.level=45;
      assert.ok(picks(t).includes(dest));
      assert.ok(changeClass(t,dest));
    }
  }
});

test('Spread Shot abre 11 direções na mesma salva e Pellet Shot solta 30 projéteis menores',()=>{
  const {w,t}=lab('Spread Shot');
  w.advanceTank(t);
  assert.equal(w.shots.length,11);
  assert.equal(new Set(w.shots.map(p=>Math.abs(p.angle)<.1?0:Math.sign(p.angle))).size,3);
  const center=w.shots.find(p=>Math.abs(p.angle)<.1);
  assert.ok(center.damage>w.shots.at(-1).damage);
  const {w:pellet,t:shooter}=lab('Pellet Shot');
  pellet.advanceTank(shooter);
  assert.equal(pellet.shots.length,30);
  assert.ok(pellet.shots.every(p=>p.kind==='bullet'&&p.owner===shooter&&p.r<shooter.r/2));
});

test('Triple Twin alterna os lados e Tri-Trapper cobre três direções com armadilhas mais curtas',()=>{
  const {w,t}=lab('Triple Twin');
  w.advanceTank(t);
  assert.equal(w.shots.length,3);
  assert.equal(t.volleyWave,1);
  assert.equal(new Set(w.shots.map(p=>p.angle)).size,3);
  t.cool.fill(0);w.advanceTank(t);
  assert.equal(w.shots.length,6);
  assert.equal(t.volleyWave,0);
  const {w:trap,t:trapper}=lab('Tri-Trapper');
  trap.advanceTank(trapper);
  assert.equal(trap.shots.length,3);
  assert.ok(trap.shots.every(p=>p.kind==='trap'&&p.life<1.35*C.Trapper.guns[0].life));
  assert.equal(new Set(trap.shots.map(p=>p.angle)).size,3);
});

test('Streamliner alimenta cinco canhões em sequência e Sprayer distingue a cadência das duas balas',()=>{
  const {w,t}=lab('Streamliner');
  const waves=[];
  for(let i=0;i<50;i++){
    w.tick++;w.time+=DT;
    const last=w.shots.length;
    w.advanceTank(t);
    if(w.shots.length>last){
      assert.equal(w.shots.length-last,1);
      waves.push({tick:i,x:w.shots.at(-1).x});
    }
  }
  assert.ok(waves.length>=6);
  assert.ok(waves.slice(1,5).every((wave,i)=>wave.x>waves[i].x));
  assert.ok(waves[5].x<waves[4].x);
  assert.ok(waves.slice(1,5).every((wave,i)=>wave.tick-waves[i].tick>=6));
  const {w:sprayer,t:spray}=lab('Sprayer');
  for(let i=0;i<100;i++)sprayer.advanceTank(spray);
  const count=new Map();
  for(const p of sprayer.shots)count.set(p.r,(count.get(p.r)??0)+1);
  const [small,big]=[...count.keys()].sort((a,b)=>a-b);
  assert.equal(count.size,2);
  assert.ok(count.get(small)>count.get(big));
});

test('as duas torretas centrais adquirem alvo e disparam sem apertar o gatilho',()=>{
  for(const name of ['Auto Gunner','Auto Tank']){
    const {w,t,e}=lab(name,false);
    for(let i=0;i<80;i++){
      w.tick++;w.time+=DT;
      w.advanceTank(t);
    }
    assert.ok(w.shots.length>0,name);
    assert.equal(t.autoTurrets[0].target,e);
    const shot=w.shots[0];
    assert.equal(shot.owner,t);
    const previous=w.shots.length;
    t.cool.fill(0);position(t,e);
    w.advanceTank(t);
    assert.ok(w.shots.length>=previous+C[name].guns.length);
  }
});

test('o sorteio por seed pode oferecer cada classe sem remover a última rota anterior',()=>{
  const old=['Triplet','Penta Shot','Mega Trapper','Gunner','Ranger','Dual-Barrel','Booster','Fighter'];
  const found=new Set();
  for(let seed=1;seed<=36;seed++){
    const w=new Arena(seed,2,null,'off',false);
    const tanks=Array.from({length:24},(_,i)=>({...w.tanks[i%2],goal:old[i%old.length]}));
    rotateFfaClassVariants(tanks,seed);
    assert.ok(old.every(goal=>tanks.some(t=>t.goal===goal)));
    const added=tanks.filter(t=>!old.includes(t.goal));
    assert.ok(added.length<=3);
    for(const t of added){
      found.add(t.goal);
      t.level=45;
      for(let level=0;level<3;level++)spendBot(t,0);
      assert.equal(t.cls,t.goal);
    }
  }
  assert.deepEqual([...found].sort(),Object.keys(routes).sort());
});

test('a progressão no FFA preserva as novas rotas sorteadas até o nível 45',()=>{
  const found=new Set();
  for(const seed of [1,2,3,5,6]){
    const w=new Arena(seed,24,null,'off',false);
    for(const t of w.tanks){
      const goal=t.goal;
      if(!Object.hasOwn(routes,goal))continue;
      found.add(goal);
      for(let level=2;level<=45;level++)w.award(t,XP[level-1]-t.score);
      assert.equal(t.goal,goal,`seed ${seed}`);
      assert.equal(t.cls,goal,`seed ${seed}`);
    }
  }
  assert.ok(found.has('Triple Twin'));
  assert.ok(found.has('Spread Shot'));
});

test('o Tri-Trapper lança armadilhas defensivas contra inimigos fora do alcance de contato',()=>{
  const w=new Arena(7101,2,['Tri-Trapper','Triplet',45],'both',true);
  const [trapper]=w.tanks;
  for(let tick=0;tick<60*4;tick++){
    w.step(null);
    const traps=w.shots.filter(p=>p.owner===trapper&&p.kind==='trap');
    if(traps.length>0)return;
  }
  assert.fail('O Tri-Trapper ficou quatro segundos exposto sem lançar armadilhas.');
});
