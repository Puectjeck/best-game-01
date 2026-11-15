// What the dead leave behind: ember shards that feed the keeper's
// levels, and hearts that mend his hull. Shards drift to him when he
// comes near — farther with a magnet — and gathering enough of them is
// what opens the upgrade draft.

import { KEEPER, PALETTE, SCORE } from './config.js';

export const PICKUP_SHARD = 'shard';
export const PICKUP_HEART = 'heart';

const SHARD_VALUES = { drifter: 1, stinger: 1, spitter: 2, splitter: 2, mini: 1, brute: 5, maw: 30 };
const HEART_CHANCE = { brute: 0.35, maw: 1 };
const HEART_HEAL = 26;
const SHARD_PULL = 340;

/** Scatter a slain creature's shards (and maybe a heart) over its place. */
export function dropFor(state, enemy) {
  const count = SHARD_VALUES[enemy.kind] ?? 1;
  for ( let i = 0; i < count; i += 1 ) {
    const angle = state.random() * Math.PI * 2;
    const distance = 6 + state.random() * 22;
    state.pickups.push({
      kind: PICKUP_SHARD,
      x: enemy.x + Math.cos(angle) * distance,
      y: enemy.y + Math.sin(angle) * distance,
      vx: Math.cos(angle) * 60,
      vy: Math.sin(angle) * 60,
      value: 1,
      age: 0,
    });
  }
  if ( state.random() < (HEART_CHANCE[enemy.kind] ?? 0) ) {
    state.pickups.push({
      kind: PICKUP_HEART,
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      value: HEART_HEAL,
      age: 0,
    });
  }
}

/**
 * Drift pickups toward the keeper inside his reach and collect the ones
 * that touch him: shards feed the level and the score, hearts mend.
 */
export function stepPickups(state, step) {
  const keeper = state.keeper;
  const reach = KEEPER.pickupRadius * state.mods.pickupRadius;
  const kept = [];
  for ( const pickup of state.pickups ) {
    pickup.age += step;
    const dx = keeper.x - pickup.x;
    const dy = keeper.y - pickup.y;
    const distance = Math.hypot(dx, dy) || 1;
    if ( keeper.alive && distance < reach ) {
      pickup.vx = (dx / distance) * SHARD_PULL;
      pickup.vy = (dy / distance) * SHARD_PULL;
    } else {
      pickup.vx *= 0.9;
      pickup.vy *= 0.9;
    }
    pickup.x += pickup.vx * step;
    pickup.y += pickup.vy * step;

    if ( keeper.alive && distance < keeper.radius + 13 ) {
      if ( pickup.kind === PICKUP_SHARD ) {
        state.xp += pickup.value;
        state.score += SCORE.ember;
        state.events.push('pickup');
        state.particles.glow(pickup.x, pickup.y, PALETTE.shard, 14, 0.2);
        if ( state.xp >= state.xpNext ) {
          state.xp -= state.xpNext;
          state.level += 1;
          state.xpNext = xpForLevel(state.level);
          state.pendingLevels += 1;
          state.events.push('levelup');
        }
      } else {
        keeper.hull = Math.min(keeper.maxHull, keeper.hull + pickup.value);
        state.floaters.add(keeper.x, keeper.y - 22, `+${pickup.value}`, PALETTE.heart, 17);
        state.events.push('heart');
      }
      continue;
    }
    kept.push(pickup);
  }
  state.pickups = kept;
}

/** The shards a level costs: gentle at first, steeper as the dive deepens. */
export function xpForLevel(level) {
  return 4 + level * 3;
}

/** Draw shards as warm diamonds and hearts as soft pink crosses of light. */
export function drawPickups(ctx, state, time) {
  for ( const pickup of state.pickups ) {
    const bob = Math.sin(time * 3 + pickup.x * 0.05) * 2;
    if ( pickup.kind === PICKUP_SHARD ) {
      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(-4.4, -4.4, 8.8, 8.8);
      ctx.fillStyle = '#fff0cd';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.arc(-4, -2, 4.6, 0, Math.PI * 2);
      ctx.arc(4, -2, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8.2, -0.5);
      ctx.lineTo(8.2, -0.5);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
