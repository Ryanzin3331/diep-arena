'use strict';
const fs=require('fs');let s=fs.readFileSync('index.html','utf8');const marker='  world.history.lite=liteMode;lastDraw=-Infinity;';if(!s.includes(marker))throw Error('início da arena não encontrado');s=s.replace(marker,`  // Cenário físico do ensaio 3B: evolução e colisões são executadas pela Arena.
  world=new Arena(7104,2,null,"both",true,"open","off");
  const [tank,rival]=world.tanks;
  for(const t of [tank,rival]){t.level=30;t.score=XP[29];spendBot(t,world.time);t.protect=0;}
  changeClass(tank,"Tank",true);tank.goal="Tank";tank.autoBranch=null;changeClass(rival,"Overseer",true);rival.goal="Overseer";rival.autoBranch=null;
  for(const t of [tank,rival])t.hp=5000;
  Object.assign(tank,{x:world.mid-150,y:world.mid,px:world.mid-150,py:world.mid,aim:0});
  Object.assign(rival,{x:world.mid+150,y:world.mid,px:world.mid+150,py:world.mid,aim:Math.PI});
  world.shapes=[];world.formTarget=0;world.nextBossAt=Infinity;
  for(let i=0;i<901;i++)world.step(null);
  `+marker);s=s.replace('  paused=false;humanAuto=false;optStats=false;','  paused=true;humanAuto=false;optStats=false;focusId=world.tanks[0].id;follow="chosen";');fs.writeFileSync('3c-fixture.html',s);console.log('3c-fixture.html');
