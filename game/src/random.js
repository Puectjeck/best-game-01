// A small seeded random generator (mulberry32) plus the range helpers
// the game uses. Every random choice in a run flows through one of these,
// so a seed always replays the same dive — the screenshot scenes and any
// replay depend on that.

/** Make a generator from a seed; the same seed always gives the same stream. */
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max], both ends included. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of a list, chosen by the stream. */
export function randomPick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** True with the given probability (0 to 1). */
export function randomChance(random, probability) {
  return random() < probability;
}
