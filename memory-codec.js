/* Incremento 1A: codec independente; nenhuma leitura ou gravação automática. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createMemoryCodec = factory;
})(typeof globalThis === 'object' ? globalThis : this, function createMemoryCodec(options) {
  'use strict';
  const {classes, newMemory, ttl} = options;
  if (!classes || typeof classes !== 'object' || typeof newMemory !== 'function' || !Number.isFinite(ttl) || ttl <= 0)
    throw new TypeError('Dependências inválidas');
  const MAX_BYTES = 32768, MAX_RECORDS = 40, MAX_COUNTER = 1000000, MAX_WEIGHT = 4;
  const counters = ['samples', 'escapes', 'changes', 'buildChanges', 'exchanges'];
  const fail = () => { throw new Error('Memória inválida ou incompatível'); };
  const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
    Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
  const number = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
  const validKey = key => {
    if (typeof key !== 'string' || key.length > 160) return false;
    const parts = key.split('|');
    return parts.length === 2 && parts.every(k => Object.hasOwn(classes, k));
  };
  const validTime = time => number(time, 0, Number.MAX_SAFE_INTEGER);
  function validate(snapshot) {
    if (!exact(snapshot, ['schemaVersion', 'experience', 'matchups']) || snapshot.schemaVersion !== 1 ||
        !exact(snapshot.experience, counters) || !counters.every(k => integer(snapshot.experience[k], 0, MAX_COUNTER)) ||
        !Array.isArray(snapshot.matchups) || snapshot.matchups.length > MAX_RECORDS) fail();
    const keys = new Set();
    for (const record of snapshot.matchups) {
      if (!exact(record, ['key', 'entries', 'choice']) || !validKey(record.key) || keys.has(record.key) ||
          !integer(record.choice, 0, 2) || !Array.isArray(record.entries) || record.entries.length !== 3) fail();
      keys.add(record.key);
      for (const e of record.entries) {
        if (!exact(e, ['sum', 'weight', 'hits']) || !number(e.sum, -1.8, 1.8) ||
            !number(e.weight, 0, MAX_WEIGHT) || !integer(e.hits, 0, MAX_COUNTER)) fail();
      }
    }
    return snapshot;
  }
  function serialize(memory, time) {
    if (!validTime(time) || !memory || !(memory.classes instanceof Map) || memory.classes.size > MAX_RECORDS) fail();
    const experience = {};
    for (const k of counters) {
      const value = memory[k] ?? 0;
      if (!integer(value, 0, Number.MAX_SAFE_INTEGER)) fail();
      experience[k] = Math.min(value, MAX_COUNTER);
    }
    const matchups = [];
    for (const [key, m] of memory.classes) {
      if (!validKey(key) || !m || !validTime(m.time) || m.time > time || !integer(m.choice, 0, 2) ||
          !Array.isArray(m.entries) || m.entries.length !== 3) fail();
      const age = time - m.time;
      if (age > ttl) continue;
      const decay = Math.exp(-age / 45);
      const entries = m.entries.map(e => {
        if (!e || !number(e.sum, -1.8, 1.8) || !number(e.weight, 0, Number.MAX_VALUE) ||
            !integer(e.hits, 0, Number.MAX_SAFE_INTEGER)) fail();
        const weight = e.weight * decay;
        const scale = weight > MAX_WEIGHT ? MAX_WEIGHT / weight : 1;
        return {sum: e.sum * decay * scale, weight: Math.min(weight, MAX_WEIGHT), hits: Math.min(e.hits, MAX_COUNTER)};
      });
      matchups.push({key, entries, choice: m.choice});
    }
    const snapshot = validate({schemaVersion: 1, experience, matchups});
    const json = JSON.stringify(snapshot);
    if (new TextEncoder().encode(json).length > MAX_BYTES) fail();
    return json;
  }
  function deserialize(json, adaptiveBuilds, time = 0) {
    if (typeof json !== 'string' || json.length > MAX_BYTES || new TextEncoder().encode(json).length > MAX_BYTES ||
        typeof adaptiveBuilds !== 'boolean' || !validTime(time)) fail();
    let parsed;
    try { parsed = JSON.parse(json); } catch (_) { fail(); }
    validate(parsed);
    const memory = newMemory(adaptiveBuilds);
    for (const k of counters) memory[k] = parsed.experience[k];
    for (const record of parsed.matchups) {
      memory.classes.set(record.key, {time, choice: record.choice, entries: record.entries.map(e => ({...e}))});
    }
    return memory;
  }
  return Object.freeze({serialize, deserialize, validate});
});

