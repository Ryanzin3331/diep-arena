'use strict';

const fs=require('node:fs'), path=require('node:path');
const {prepareCareEncounter}=require('./care-encounter');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
function replace(marker,value){
  if(!html.includes(marker))throw Error('Ponto de preparação ausente: '+marker);
  html=html.replace(marker,value);
}

replace('mode==="watch"&&!room;', 'mode!=="lab"&&!room;');
replace('  updateLearningPanel(inspected);', '  updateLearningPanel(mode==="play"?world.tanks.find(t=>!t.human):inspected);');
const spawn='    world.spawnTank(playerName,true,0,level,null,null,null,false,old?.nextTeam??old?.team??null);';
replace(spawn,`    if(!old&&world.mapKind==="open"&&world.bots===1){
      ${prepareCareEncounter.toString()}
      const scene=prepareCareEncounter({Arena,changeClass,XP,hull},world,390);
      scene.player.name=playerName;
    }else{
  ${spawn}
    }`);
replace('<option>8</option><option>12</option>', '<option>1</option><option>8</option><option>12</option>');
replace('const initialArena=restart();',`mode="play";
el("seed").value=7103;
el("botCount").value=1;
el("arenaMap").value="open";
el("bossSchedule").value="off";
reuseBotMemory=false;
el("reuseBotMemory").value="off";
const initialArena=restart();
paused=true;setSidePanel("learning");updateInterface(true);`);
fs.writeFileSync(path.join(root,'cuidado-fixture.html'),html);
console.log('http://127.0.0.1:8769/cuidado-fixture.html');
