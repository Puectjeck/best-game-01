// The upgrade catalogue: what a level-up draft can offer, how each
// upgrade bends the keeper's numbers, and how a draft of three is rolled.
// computeMods folds every taken level into one modifiers object the rest
// of the game reads, so balance lives in this file alone.

import { randomPick } from './random.js';

/** Every upgrade the deep can teach, with its level cap and its promise. */
export const UPGRADES = [
  { id: 'twin', name: 'Twin Bolts', max: 4, promise: '+1 bolt in every volley' },
  { id: 'rapid', name: 'Rapid Lantern', max: 5, promise: 'Fire 12% faster' },
  { id: 'heavy', name: 'Heavy Embers', max: 5, promise: 'Bolts hit 25% harder' },
  { id: 'pierce', name: 'Piercing Light', max: 3, promise: 'Bolts pass through +1 creature' },
  { id: 'swift', name: 'Swift Fins', max: 4, promise: 'Swim 10% faster' },
  { id: 'hide', name: 'Thick Hide', max: 4, promise: '+25 maximum hull, and mend 25' },
  { id: 'magnet', name: 'Ember Magnet', max: 3, promise: 'Shards drift to you from 60% farther' },
  { id: 'glow', name: 'Wide Glow', max: 3, promise: 'Your light and reach grow 12%' },
  { id: 'crit', name: 'Kindled Spark', max: 4, promise: '+9% chance a bolt strikes double' },
  { id: 'dash', name: 'Slipstream Dash', max: 3, promise: 'Dash returns 25% sooner' },
  { id: 'regen', name: 'Slow Mend', max: 3, promise: 'Regrow 0.7 hull every second' },
  { id: 'wisp', name: 'Orbit Wisp', max: 3, promise: '+1 ember wisp circles you, burning what it touches' },
  { id: 'chain', name: 'Storm Lantern', max: 3, promise: 'Bolts arc lightning to 1 more nearby creature' },
  { id: 'thorns', name: 'Barnacle Hide', max: 3, promise: 'Creatures that bite you take 14 damage' },
];

/** The upgrade with this id, or null. */
export function upgradeById(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? null;
}

/** How many levels of an upgrade a levels map holds. */
export function levelOf(levels, id) {
  return levels.get(id) ?? 0;
}

/** The line a draft card shows for taking the next level of an upgrade. */
export function describeNext(upgrade, levels) {
  const next = levelOf(levels, upgrade.id) + 1;
  return `${upgrade.promise}  ·  level ${next} of ${upgrade.max}`;
}

/**
 * Fold a levels map into the modifiers the simulation reads. Every field
 * starts at its base value; each upgrade bends the fields it owns.
 */
export function computeMods(levels) {
  const mods = {
    projectiles: 1,
    fireSeconds: 1,
    damage: 1,
    pierce: 0,
    speed: 1,
    maxHullBonus: 0,
    pickupRadius: 1,
    lightRadius: 1,
    critChance: 0.03,
    dashCooldown: 1,
    regen: 0,
    wisps: 0,
    chain: 0,
    thorns: 0,
  };
  mods.projectiles += levelOf(levels, 'twin');
  mods.fireSeconds *= Math.pow(0.88, levelOf(levels, 'rapid'));
  mods.damage *= Math.pow(1.25, levelOf(levels, 'heavy'));
  mods.pierce += levelOf(levels, 'pierce');
  mods.speed *= Math.pow(1.10, levelOf(levels, 'swift'));
  mods.maxHullBonus += 25 * levelOf(levels, 'hide');
  mods.pickupRadius *= Math.pow(1.6, levelOf(levels, 'magnet'));
  mods.lightRadius *= Math.pow(1.12, levelOf(levels, 'glow'));
  mods.pickupRadius *= Math.pow(1.12, levelOf(levels, 'glow'));
  mods.critChance += 0.09 * levelOf(levels, 'crit');
  mods.dashCooldown *= Math.pow(0.75, levelOf(levels, 'dash'));
  mods.regen += 0.7 * levelOf(levels, 'regen');
  mods.wisps += levelOf(levels, 'wisp');
  mods.chain += levelOf(levels, 'chain');
  mods.thorns += 14 * levelOf(levels, 'thorns');
  return mods;
}

/**
 * Roll a draft: up to `count` distinct upgrades that are not yet maxed.
 * Returns fewer when the catalogue is nearly exhausted, never a dupe.
 */
export function rollDraft(random, levels, count) {
  const open = UPGRADES.filter((upgrade) => levelOf(levels, upgrade.id) < upgrade.max);
  const draft = [];
  const pool = [...open];
  while ( draft.length < count && pool.length > 0 ) {
    const picked = randomPick(random, pool);
    draft.push(picked.id);
    pool.splice(pool.indexOf(picked), 1);
  }
  return draft;
}
