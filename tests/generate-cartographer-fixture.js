'use strict';

const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
function replace(marker,value){
  if(!html.includes(marker))throw Error('Ponto de preparação ausente: '+marker);
  html=html.replace(marker,value);
}
replace('const initialArena=restart();',`mode="lab";
el("classA").value="Destroyer";
el("classB").value="Tank";
el("labLevel").value=45;
el("labBoss").value="cartographer";
el("seed").value=7103;
reuseBotMemory=false;
el("reuseBotMemory").value="off";
const initialArena=restart("cartographer");`);
replace('  if(bossTrial&&world.boss){focusId=world.boss.id;follow="chosen";camera.x=world.boss.x;camera.y=world.boss.y;}',`  if(bossTrial==="cartographer"){
    const player=world.tanks[0],boss=world.boss;
    mode="play";pending=false;
    const x=boss.x+105,y=boss.y-310;
    Object.assign(player,{human:true,name:playerName,x,y,px:x,py:y,protect:0,learning:null});
    world.human=player;world.indexSense();
    camera.x=x;camera.y=y;pointer.lastAim=Math.PI/2;
  }else if(bossTrial&&world.boss){focusId=world.boss.id;follow="chosen";camera.x=world.boss.x;camera.y=world.boss.y;}`);
replace('  if(sidePanel===\'config\')void refreshMemoryStatus();','  if(bossTrial==="cartographer"){paused=true;updateInterface(true);canvas.focus({preventScroll:true});}\n  if(sidePanel===\'config\')void refreshMemoryStatus();');
replace('  const partner=highlightPartner(t);','  if(playing&&world.boss?.spec===CARTOGRAPHER)zoom=Math.min(zoom,.46);\n  const partner=highlightPartner(t);');
fs.writeFileSync(path.join(root,'cartografo-fixture.html'),html);
console.log('http://127.0.0.1:8770/cartografo-fixture.html');
