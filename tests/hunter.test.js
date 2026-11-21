'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const core = html.split('<script id="core">')[1].split('</script>')[0];
const {Arena, C, DT, XP, neck, picks, route} = vm.runInNewContext(
  core + ';({Arena,C,DT,XP,neck,picks,route})', {TextEncoder}
);

function setup(level=30) {
  const arena = new Arena(5, 0, null, 'both', true, 'open', 'off');
  arena.shapes = [];
  arena.formTarget = 0;
  const player = arena.spawnTank('Jogador', true, 0, level, null, 2000, 2000);
  assert.equal(arena.playerClass(player, 'Sniper'), true);
  return {arena, player};
}

test('Hunter está disponível pelo menu do Sniper a partir do nível 30 e no Laboratório', () => {
  const {arena, player} = setup(29);
  assert.equal(picks(player).includes('Hunter'), false);
  assert.equal(arena.playerClass(player, 'Hunter'), false);
  arena.award(player, XP[29] - player.score);
  assert.deepEqual(Array.from(picks(player)), ['Assassin', 'Overseer', 'Trapper', 'Hunter']);
  assert.equal(arena.playerClass(player, 'Hunter'), true);
  const lab = new Arena(5, 2, ['Hunter', 'Sniper', 30]);
  assert.equal(lab.tanks[0].cls, 'Hunter');
  assert.equal(lab.tanks[0].level, 30);
});

test('bots avançam para Hunter sem eliminar rotas do Sniper', () => {
  for (const map of ['open', 'maze']) {
    const arena = new Arena(5, 36, null, 'both', true, map, 'off');
    const hunter = arena.tanks.find(bot => bot.goal === 'Hunter');
    assert.ok(hunter);
    assert.ok(arena.tanks.some(bot => bot.goal === 'Ranger'));
    arena.award(hunter, XP[14]);
    assert.equal(hunter.cls, 'Sniper');
    arena.award(hunter, XP[29] - hunter.score);
    assert.equal(hunter.cls, 'Hunter');
  }
  for (const [goal, upgrade] of [['Ranger','Assassin'], ['Overlord','Overseer'], ['Mega Trapper','Trapper']]) {
    assert.deepEqual(Array.from(route('Tank', goal)), ['Sniper', upgrade, goal]);
  }
});

function firedShots(arena, player, ticks, input) {
  const shots = [];
  for (let i = 0; i < ticks; i++) {
    const serial = arena.serial;
    arena.step({x:0,y:0,aim:0,fire:input(i),alt:false});
    for (const shot of arena.shots) {
      if (shot.owner === player && shot.id > serial) shots.push({radius:shot.r,tick:arena.tick});
    }
  }
  return shots;
}

test('um toque no gatilho completa a rajada pequena → grande e para', () => {
  const {arena, player} = setup();
  assert.equal(arena.playerClass(player, 'Hunter'), true);
  const [small, big] = C.Hunter.guns;
  assert.equal(small.angle, big.angle);
  assert.equal(small.offset, big.offset);
  assert.ok(small.length > big.length && small.width < big.width);
  for (const i of [0, 1]) player.cool[i] = 0;
  const shots = firedShots(arena, player, 120, tick => tick === 0);
  assert.equal(shots.length, 2);
  assert.ok(shots[0].radius < shots[1].radius);
  assert.equal(shots[1].tick - shots[0].tick, Math.ceil(C.Hunter.burstGap / DT));
});

test('tiro contínuo respeita recarga entre rajadas e o atributo Recarga', () => {
  for (const reload of [0, 7]) {
    const {arena, player} = setup();
    assert.equal(arena.playerClass(player, 'Hunter'), true);
    for (let i = 0; i < reload; i++) arena.playerUpgrade(player, 6);
    const shots = firedShots(arena, player, 150, () => true);
    assert.ok(shots.length >= 4);
    const interval = Math.ceil((neck(player, C.Hunter.guns[0]) - 1e-9) / DT);
    for (let i = 0; i + 1 < shots.length; i += 2) {
      assert.ok(shots[i].radius < shots[i+1].radius);
      assert.equal(shots[i+1].tick - shots[i].tick, Math.ceil(C.Hunter.burstGap / DT));
      if (i > 0) assert.equal(shots[i].tick - shots[i-2].tick, interval);
    }
  }
});
