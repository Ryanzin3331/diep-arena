'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
function replace(marker, replacement) {
  if (!html.includes(marker)) throw Error(`Ponto de preparação ausente: ${marker}`);
  html = html.replace(marker, replacement);
}

replace('const initialArena=restart();', `
mode="play";
el("arenaMap").value="open";
el("seed").value=5;
el("botCount").value=8;
el("bossSchedule").value="off";
reuseBotMemory=false;
el("reuseBotMemory").value="off";
const initialArena=restart();`);

const spawn = '    world.spawnTank(playerName,true,0,level,null,null,null,false,old?.nextTeam??old?.team??null);';
replace(spawn, `    const prepared=!old&&world.mapKind==="open"&&!world.duel;
    const player=world.spawnTank(playerName,true,0,prepared?30:level,null,null,null,false,old?.nextTeam??old?.team??null);
    if(prepared){
      world.playerClass(player,"Sniper");
      if(new URLSearchParams(location.search).get("classe")!=="sniper")world.playerClass(player,"Hunter");
    }`);

fs.writeFileSync(path.join(root, 'hunter-fixture.html'), html);
console.log('http://127.0.0.1:8766/hunter-fixture.html');
