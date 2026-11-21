'use strict';
const fs=require('node:fs');
const {prepareDodgeEncounter,playDodgeEncounter,trainDodge}=require('./dodge-encounter');
let html=fs.readFileSync('index.html','utf8');
const setup='  world.history.lite=liteMode;lastDraw=-Infinity;';
const focus='  paused=false;humanAuto=false;optStats=false;';
if(!html.includes(setup)||!html.includes(focus))throw Error('Pontos de preparação da arena não encontrados.');
html=html.replace(setup,`
  const params=new URLSearchParams(location.search);
  const map=params.get("mapa")==="maze"?"maze":"open";
  const experienced=params.get("bot")==="experiente";
  ${prepareDodgeEncounter.toString()}
  ${playDodgeEncounter.toString()}
  ${trainDodge.toString()}
  const api={Arena,C,changeClass,chooseDodgeTiming};
  const results=experienced?trainDodge(api).early.results:undefined;
  const scene=prepareDodgeEncounter(api,map,results);
  world=scene.world;
  const advance=world.step;
  const label=el("dodgeFixtureStatus");
  const name=experienced?"Experiente":"Novato";
  let first=null,finished=false;
  label.textContent=name+" · pressione P para rodar ou avance com +1";
  world.step=function(){
    if(finished)return;
    advance.call(this,scene.command);
    if(scene.bot.dodgeAttempt?.p===scene.shot&&scene.bot.dodgeAttempt.executed)first??=this.tick;
    const hit=scene.shot.contacts?.has(scene.bot.id);
    label.textContent=name+" · tick "+this.tick+" · primeiro desvio "+(first??"—")+" · "+(hit?"atingido":scene.shot.alive?"tiro em voo":"sem acerto");
    finished=Boolean(hit)||!scene.shot.alive;
    if(finished){paused=true;updateInterface(false);}
  };
  `+setup).replace(focus,`  paused=true;humanAuto=false;optStats=false;
  focusId=world.tanks[0].id;follow="chosen";camera.x=world.tanks[0].x;camera.y=world.tanks[0].y;`);
html=html.replace('<div class="view-tag" id="viewTag">','<div class="view-tag" id="dodgeFixtureStatus"></div><div class="view-tag" id="viewTag">');
fs.writeFileSync('esquiva-fixture.html',html);
console.log('Abra /esquiva-fixture.html?bot=novato ou ?bot=experiente. Acrescente &mapa=maze para Maze.');
