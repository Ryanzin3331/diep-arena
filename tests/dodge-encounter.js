'use strict';

function prepareDodgeEncounter(api, map, results) {
  const {Arena, C, changeClass} = api;
  const world = new Arena(5, 2, null, 'both', true, map, 'off');
  const [bot, human] = world.tanks;
  const [x, y] = map === 'maze' ? [700, 1100] : [1000, 1000];
  changeClass(bot, 'Sniper', true);
  changeClass(human, 'Destroyer', true);
  bot.goal = 'Sniper';
  human.goal = 'Destroyer';
  bot.stats[7] = 3;
  bot.cool[0] = 2;
  human.stats[3] = 3;
  Object.assign(bot, {x, y, px:x, py:y, vx:0, vy:-110, protect:0, progress:{x,y,t:0}});
  const aim = Math.atan2(60, -340) - .15;
  Object.assign(human, {x:x+340, y:y-60, px:x+340, py:y-60, aim, protect:0, human:true});
  world.human = human;
  world.shapes = [];
  world.formTarget = 0;
  world.shots = [];
  if (results) bot.learning.dodgeResults = results.map(row => ({...row}));
  world.spawnShot(human, C.Destroyer.guns[0]);
  const shot = world.shots[0];
  if (!shot) throw Error('O disparo do cenário foi bloqueado na saída.');
  return {world, bot, human, shot, command:{x:0,y:0,aim,fire:false,alt:false}};
}

function playDodgeEncounter(api, map, results) {
  const {world, bot, shot, command} = prepareDodgeEncounter(api, map, results);
  const timing = api.chooseDodgeTiming(bot.learning);
  let first = null;
  while (shot.alive && bot.alive) {
    world.step(command);
    if (bot.dodgeAttempt?.p === shot && bot.dodgeAttempt.executed) first ??= world.tick;
  }
  return {timing, first, hit:Boolean(shot.contacts?.has(bot.id)), results:bot.learning.dodgeResults};
}

function trainDodge(api) {
  const basic = playDodgeEncounter(api, 'open');
  const early = playDodgeEncounter(api, 'open', basic.results);
  return {basic, early};
}

module.exports = {prepareDodgeEncounter, playDodgeEncounter, trainDodge};
