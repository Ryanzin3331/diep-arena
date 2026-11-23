'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const core=readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];
const {Arena,C,botThink}=vm.runInNewContext(core+';({Arena,C,botThink})',{TextEncoder});

function scene({learning='both',map='open',cls='Tank',rival='Overseer',level=30}={}){
  const w=new Arena(7101,0,null,learning,true,map,'off');
  w.shapes=[];
  const a=w.spawnTank('Defensor',false,0,level,cls,w.mid,w.mid,true,0);
  const b=w.spawnTank(rival,false,1,level,rival,w.mid+285,w.mid,true,1);
  a.stats.fill(0);
  a.cool.fill(0);
  return {w,a,b};
}
function addDrone({w,a,b},dx,dy,vx=0,vy=0,owner=b){
  w.spawnShot(owner,C.Overseer.guns[0]);
  const drone=w.shots.at(-1);
  Object.assign(drone,{x:a.x+dx,y:a.y+dy,px:a.x+dx,py:a.y+dy,vx,vy});
  return drone;
}
function decide({w,a}){
  w.indexSense();
  botThink(w,a);
}
function pointsUp(a){
  return a.intent.fire&&a.intent.aimY<a.y-15&&Math.abs(a.intent.aimX-a.x)<24;
}

test('atira em drones prestes a encostar sem perder o tanque rival e retoma a pressão depois',()=>{
  for(const learning of ['both','off']){
    const g=scene({learning});
    addDrone(g,0,-57,0,180);
    addDrone(g,18,-68,0,175);
    addDrone(g,-19,-70,0,170);
    decide(g);
    assert.equal(g.a.enemy,g.b);
    assert.ok(pointsUp(g.a),'a arma deve mirar no drone acima, em vez do tanque à direita');
    g.w.shots.forEach(p=>p.alive=false);
    decide(g);
    assert.ok(g.a.intent.fire);
    assert.ok(g.a.intent.aimX>g.a.x+200);
  }
});

test('drones distantes, afastando e aliados não desviam o canhão',()=>{
  const g=scene({map:'teams'});
  const ally=g.w.spawnTank('Aliado',false,2,30,'Overseer',g.a.x-300,g.a.y,true,0);
  addDrone(g,0,-180,0,180);
  addDrone(g,5,-70,0,-210);
  addDrone(g,-10,-42,0,210,ally);
  decide(g);
  assert.equal(g.a.enemy,g.b);
  assert.ok(g.a.intent.fire&&g.a.intent.aimX>g.a.x+200);
});

test('uma parede entre o drone e o canhão evita a troca de mira',()=>{
  const g=scene({map:'maze'});
  g.w.shapes=[];
  g.w.maze.hit=(_x,_y,_xx,yy)=>yy<g.a.y-15?.5:null;
  addDrone(g,0,-57,0,180);
  decide(g);
  assert.ok(g.a.intent.fire&&g.a.intent.aimX>g.a.x+200);
});

test('o disparo defensivo realmente intercepta um drone na simulação',()=>{
  const g=scene();
  const drone=addDrone(g,0,-66,0,175);
  const durability=drone.dur;
  decide(g);
  for(let i=0;i<10&&drone.alive&&drone.dur===durability;i++)g.w.step(null);
  assert.ok(drone.dur<durability,'o projétil do bot deve atingir o drone');
});

test('tanque radial usa a mira defensiva também contra quadrados do Necromancer',()=>{
  const g=scene({cls:'Octo Tank',rival:'Necromancer',level:45});
  g.w.addShape('square',g.a.x,g.a.y-65,false);
  const square=g.w.shapes.at(-1);
  assert.ok(g.w.convertNecroSquare(square,g.b));
  const drone=g.w.shots.at(-1);
  drone.vx=0;drone.vy=185;
  decide(g);
  assert.ok(pointsUp(g.a));
  assert.equal(g.a.intent.radialTarget,null);
  assert.equal(g.a.intent.radialSpin,0);
});
