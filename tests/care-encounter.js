'use strict';

function prepareCareEncounter(api, world, gap=440) {
  const {Arena, changeClass, XP, hull} = api;
  world ??= new Arena(7103, 1, null, 'both', true, 'open', 'off');
  const bot = world.tanks[0];
  const x = 950, y = 1050;
  const player = world.spawnTank('Visitante', true, 0, 15, null, x+gap, y, true);
  Object.assign(bot, {x,y,px:x,py:y,level:15,score:XP[14],protect:0,goal:'Tank',progress:{x,y,t:0}});
  bot.stats.fill(0);
  bot.hp = hull(bot);
  changeClass(player, 'Sniper', true);
  world.shapes = [];
  world.formTarget = 0;
  world.indexSense();
  return {world, bot, player};
}

module.exports = {prepareCareEncounter};
