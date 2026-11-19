'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const createCodec = require('../memory-codec.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const part = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Trecho não encontrado: ${start}`);
  return source.slice(a, b);
};
// As funções são extraídas do jogo para detectar incompatibilidades com o modelo real.
const newMemory = Function(part('function newMemory(', 'function buildPressure(') + ';return newMemory;')();
const outcome = Function('MEMORY_TTL', 'clamp',
  part('function matchup(', 'function observeHit(') + ';return recordOutcome;')(115, (v, lo, hi) => Math.max(lo, Math.min(hi, v)));
const codec = createCodec({classes: {Tank: {}, Twin: {}, Sniper: {}}, newMemory, ttl: 115});
function learned(time = 140) {
  const memory = newMemory(true);
  const tank = {cls: 'Tank', learning: memory}, enemy = {id: 99};
  outcome(tank, enemy, 'Twin', 1, .4, .5, time);
  memory.samples = 1;
  return memory;
}
test('serializa e recupera conhecimento registrado pela IA', () => {
  const original = learned();
  const restored = codec.deserialize(codec.serialize(original, 140), true, 0);
  assert.ok(restored.classes instanceof Map);
  assert.equal(restored.samples, 1);
  assert.deepEqual(restored.classes.get('Tank|Twin').entries[1], {sum: .4, weight: .5, hits: 1});
  assert.ok(restored.build.pressure instanceof Float64Array);
});
test('as memórias de dois bots são independentes', () => {
  const a = codec.deserialize(codec.serialize(learned(), 140), false);
  const b = codec.deserialize(codec.serialize(newMemory(false), 0), false);
  a.classes.get('Tank|Twin').entries[1].sum = 1;
  assert.equal(b.classes.size, 0);
  const c = codec.deserialize(codec.serialize(learned(), 140), false);
  assert.equal(c.classes.get('Tank|Twin').entries[1].sum, .4);
});
test('descarta inimigos, alvos, estados transitórios e pressão de build', () => {
  const m = learned();
  Object.assign(m, {foeId: 99, until: 900, retreat: {foeId: 99}, approach: {enemy: 99}, note: 'antiga'});
  m.build.pressure[0] = 4;
  const json = codec.serialize(m, 140), restored = codec.deserialize(json, true);
  assert.equal(restored.foes.size, 0);
  assert.equal(restored.foeId, null);
  assert.equal(restored.until, 0);
  assert.equal(restored.retreat, null);
  assert.equal(restored.approach, undefined);
  assert.equal(restored.note, '');
  assert.equal(restored.build.pressure[0], 0);
  assert.ok(!json.includes('foeId') && !json.includes('retreat'));
});
test('aplica decaimento antes de reiniciar relógio e rebaseia timestamp', () => {
  const restored = codec.deserialize(codec.serialize(learned(140), 185), false, 0);
  const entry = restored.classes.get('Tank|Twin');
  assert.equal(entry.time, 0);
  assert.ok(Math.abs(entry.entries[1].weight - .5 / Math.E) < 1e-12);
  assert.equal(codec.deserialize(codec.serialize(learned(140), 256), false).classes.size, 0);
  assert.throws(() => codec.serialize(learned(140), 0));
});
test('rejeita JSON corrompido, esquemas e registros incompatíveis', () => {
  const valid = JSON.parse(codec.serialize(learned(), 140));
  const invalid = [null, {...valid, schemaVersion: 2}, {...valid, extra: 1},
    {...valid, matchups: [{...valid.matchups[0], key: 'Tank|Desconhecida'}]},
    {...valid, matchups: [valid.matchups[0], valid.matchups[0]]},
    {...valid, matchups: Array(41).fill(valid.matchups[0])},
    {...valid, experience: {...valid.experience, samples: -1}},
    {...valid, matchups: [{...valid.matchups[0], entries: [{sum: 0, weight: 5, hits: 0}, ...valid.matchups[0].entries.slice(1)]}]}];
  assert.throws(() => codec.deserialize('{', false));
  assert.throws(() => codec.deserialize(' '.repeat(32769), false));
  for (const value of invalid) assert.throws(() => codec.deserialize(JSON.stringify(value), false));
  assert.throws(() => codec.validate({...valid, experience: {...valid.experience, samples: NaN}}));
});
test('serialização e recuperação não alteram as fontes', () => {
  const m = learned(), before = structuredClone(m);
  const json = codec.serialize(m, 185);
  assert.deepEqual(m, before);
  const snapshot = JSON.parse(json), copy = structuredClone(snapshot);
  codec.validate(snapshot);
  assert.deepEqual(snapshot, copy);
  const a = codec.deserialize(json, false), b = codec.deserialize(json, false);
  a.classes.get('Tank|Twin').entries[1].sum = 0;
  assert.notEqual(b.classes.get('Tank|Twin').entries[1].sum, 0);
});
test('limita confiança e contadores sem alterar a memória viva', () => {
  const m = learned();
  m.classes.get('Tank|Twin').entries[1].weight = 100;
  m.samples = 2000000;
  const restored = codec.deserialize(codec.serialize(m, 140), false);
  assert.equal(restored.samples, 1000000);
  assert.equal(restored.classes.get('Tank|Twin').entries[1].weight, 4);
  assert.equal(m.samples, 2000000);
});

