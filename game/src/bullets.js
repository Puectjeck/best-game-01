// Bolts and orbs: the keeper's light bolts fly straight and pierce what
// his upgrades allow; the deep answers with slow goo orbs. This file
// moves both and settles every hit — bolt against creature, orb and
// wisp against their targets.

import { FIELD, KEEPER, PALETTE } from './config.js';
import { hurtCreature } from './enemies.js';
import { hurtKeeper } from './player.js';

const BOLT_LIFE = 1.1;
const ORB_LIFE = 4.5;
const CHAIN_RANGE = 150;
const CHAIN_SHARE = 0.55;

/** Loose one of the keeper's bolts from a point along an angle. */
export function spawnBolt(state, x, y, angle) {
  const mods = state.mods;
  const critical = state.random() < mods.critChance;
  state.bolts.push({
    x: x + Math.cos(angle) * 16,
    y: y + Math.sin(angle) * 16,
    vx: Math.cos(angle) * KEEPER.boltSpeed,
    vy: Math.sin(angle) * KEEPER.boltSpeed,
    damage: KEEPER.boltDamage * mods.damage * (critical ? 2 : 1),
    critical,
    pierce: mods.pierce,
    radius: KEEPER.boltRadius,
    life: BOLT_LIFE,
    hitSet: new Set(),
  });
}

/** Spit one of the deep's orbs from a creature toward an angle. */
export function spawnOrb(state, x, y, angle, speed = 175, damage = 12) {
  state.orbs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    radius: 7,
    life: ORB_LIFE,
  });
}

/** The nearest living creature to a point, within a range, skipping one. */
function nearestCreature(state, x, y, range, skip) {
  let best = null;
  let bestDistance = range;
  for ( const enemy of state.enemies ) {
    if ( enemy === skip || enemy.hp <= 0 ) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if ( distance < bestDistance ) {
      bestDistance = distance;
      best = enemy;
    }
  }
  return best;
}

/** Arc a hit's lightning to the nearest other creature, when storm-lit. */
function arcLightning(state, from, amount) {
  const target = nearestCreature(state, from.x, from.y, CHAIN_RANGE, from);
  if ( !target ) return;
  state.sparks.push({ x1: from.x, y1: from.y, x2: target.x, y2: target.y, age: 0, life: 0.14 });
  hurtCreature(state, target, amount * CHAIN_SHARE, Math.atan2(target.y - from.y, target.x - from.x));
}

/** Move the keeper's wisps: each circles him and burns what it touches. */
function stepWisps(state, step) {
  const keeper = state.keeper;
  const count = state.mods.wisps;
  state.wispTimer -= step;
  for ( let i = 0; i < count; i += 1 ) {
    const angle = keeper.wispAngle + (i * Math.PI * 2) / Math.max(1, count);
    const wx = keeper.x + Math.cos(angle) * 46;
    const wy = keeper.y + Math.sin(angle) * 46;
    if ( state.wispTimer <= 0 ) {
      for ( const enemy of state.enemies ) {
        if ( enemy.hp > 0 && Math.hypot(enemy.x - wx, enemy.y - wy) < enemy.radius + 12 ) {
          hurtCreature(state, enemy, 22, angle + Math.PI / 2);
          state.particles.burst(wx, wy, PALETTE.ember, 4, 120);
        }
      }
    }
    state.particles.glow(wx, wy, PALETTE.ember, 13, 0.12);
  }
  if ( state.wispTimer <= 0 ) state.wispTimer = 0.38;
}

/**
 * Advance every bolt and orb one step and settle their hits. Bolts die
 * on the rock or when their pierce is spent; orbs die on the keeper.
 */
export function stepBolts(state, step) {
  const keeper = state.keeper;

  const bolts = [];
  for ( const bolt of state.bolts ) {
    bolt.life -= step;
    bolt.x += bolt.vx * step;
    bolt.y += bolt.vy * step;
    if ( bolt.life <= 0 || bolt.x < FIELD.wall || bolt.x > FIELD.width - FIELD.wall || bolt.y < FIELD.wall || bolt.y > FIELD.height - FIELD.wall ) {
      state.particles.burst(bolt.x, bolt.y, PALETTE.lantern, 3, 90);
      continue;
    }
    let spent = false;
    for ( const enemy of state.enemies ) {
      if ( enemy.hp <= 0 || bolt.hitSet.has(enemy) ) continue;
      if ( Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) > enemy.radius + bolt.radius ) continue;
      bolt.hitSet.add(enemy);
      hurtCreature(state, enemy, bolt.damage, Math.atan2(bolt.vy, bolt.vx), bolt.critical);
      if ( state.mods.chain > 0 ) arcLightning(state, enemy, bolt.damage);
      if ( bolt.hitSet.size > bolt.pierce ) { spent = true; break; }
    }
    if ( !spent ) bolts.push(bolt);
  }
  state.bolts = bolts;

  const orbs = [];
  for ( const orb of state.orbs ) {
    orb.life -= step;
    orb.x += orb.vx * step;
    orb.y += orb.vy * step;
    if ( orb.life <= 0 || orb.x < FIELD.wall || orb.x > FIELD.width - FIELD.wall || orb.y < FIELD.wall || orb.y > FIELD.height - FIELD.wall ) continue;
    if ( keeper.alive && Math.hypot(keeper.x - orb.x, keeper.y - orb.y) < keeper.radius + orb.radius ) {
      hurtKeeper(state, orb.damage, orb.x, orb.y);
      continue;
    }
    orbs.push(orb);
  }
  state.orbs = orbs;

  for ( const spark of state.sparks ) spark.age += step;
  state.sparks = state.sparks.filter((spark) => spark.age < spark.life);

  if ( state.mods.wisps > 0 && keeper.alive ) stepWisps(state, step);
}

/** Draw bolts as bright darts with a short trail, orbs as sickly globs. */
export function drawBolts(ctx, state) {
  for ( const bolt of state.bolts ) {
    const angle = Math.atan2(bolt.vy, bolt.vx);
    ctx.strokeStyle = bolt.critical ? PALETTE.emberHot : PALETTE.lantern;
    ctx.lineWidth = bolt.critical ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bolt.x - Math.cos(angle) * 13, bolt.y - Math.sin(angle) * 13);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for ( const orb of state.orbs ) {
    ctx.fillStyle = PALETTE.spitter;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e9dcff';
    ctx.beginPath();
    ctx.arc(orb.x - 2, orb.y - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#cfe9ff';
  for ( const spark of state.sparks ) {
    ctx.globalAlpha = 1 - spark.age / spark.life;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spark.x1, spark.y1);
    const midX = (spark.x1 + spark.x2) / 2 + (spark.y2 - spark.y1) * 0.18;
    const midY = (spark.y1 + spark.y2) / 2 - (spark.x2 - spark.x1) * 0.18;
    ctx.lineTo(midX, midY);
    ctx.lineTo(spark.x2, spark.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
