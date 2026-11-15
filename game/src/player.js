// The lantern keeper: the one creature the player steers. This file
// owns his body — movement, the dash, his aim, his lantern light — and
// the volley he fires; what his bolts hit lives in bullets.js.

import { FIELD, KEEPER } from './config.js';
import { spawnBolt } from './bullets.js';

/** A fresh keeper at the centre of the trench, lantern lit. */
export function createKeeper() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: KEEPER.radius,
    hull: KEEPER.hull,
    maxHull: KEEPER.hull,
    aim: -Math.PI / 2,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldownTimer: 0,
    invulnerableTimer: 0,
    wispAngle: 0,
    alive: true,
    moving: false,
  };
}

/** Keep a body inside the trench walls, with a soft stop at the rock. */
export function clampToField(body) {
  body.x = Math.min(FIELD.width - FIELD.wall - body.radius, Math.max(FIELD.wall + body.radius, body.x));
  body.y = Math.min(FIELD.height - FIELD.wall - body.radius, Math.max(FIELD.wall + body.radius, body.y));
}

/**
 * Move the keeper for one step: swim toward the key axis, dash on Shift
 * with its cooldown, and face the pointer. Returns true when he dashed.
 */
export function stepKeeper(state, input, step) {
  const keeper = state.keeper;
  const mods = state.mods;
  if ( !keeper.alive ) return false;

  keeper.aim = Math.atan2(input.pointer.y - keeper.y, input.pointer.x - keeper.x);
  keeper.fireTimer = Math.max(0, keeper.fireTimer - step);
  keeper.dashCooldownTimer = Math.max(0, keeper.dashCooldownTimer - step);
  keeper.invulnerableTimer = Math.max(0, keeper.invulnerableTimer - step);
  keeper.wispAngle += step * 2.4;

  const axis = input.axis();
  const length = Math.hypot(axis.x, axis.y) || 1;
  const speed = KEEPER.speed * mods.speed;
  let dashed = false;

  if ( keeper.dashTimer > 0 ) {
    keeper.dashTimer -= step;
    keeper.x += keeper.vx * step;
    keeper.y += keeper.vy * step;
  } else if ( input.tapped('ShiftLeft', 'ShiftRight') && keeper.dashCooldownTimer <= 0 && (axis.x !== 0 || axis.y !== 0) ) {
    keeper.dashTimer = KEEPER.dashSeconds;
    keeper.dashCooldownTimer = KEEPER.dashCooldown * mods.dashCooldown;
    keeper.vx = (axis.x / length) * KEEPER.dashSpeed;
    keeper.vy = (axis.y / length) * KEEPER.dashSpeed;
    keeper.invulnerableTimer = Math.max(keeper.invulnerableTimer, KEEPER.dashSeconds + 0.05);
    dashed = true;
    state.events.push('dash');
    for ( let i = 0; i < 5; i += 1 ) state.particles.bubble(keeper.x, keeper.y);
  } else {
    keeper.vx = (axis.x / length) * speed * (axis.x === 0 && axis.y === 0 ? 0 : 1);
    keeper.vy = (axis.y / length) * speed * (axis.x === 0 && axis.y === 0 ? 0 : 1);
    keeper.x += keeper.vx * step;
    keeper.y += keeper.vy * step;
  }
  keeper.moving = axis.x !== 0 || axis.y !== 0 || keeper.dashTimer > 0;
  clampToField(keeper);

  if ( mods.regen > 0 ) keeper.hull = Math.min(keeper.maxHull, keeper.hull + mods.regen * step);
  return dashed;
}

/**
 * Fire the keeper's volley when the trigger is held and the lantern is
 * ready: a fan of bolts around the aim, one per projectile the mods
 * grant, each jittered by the run's random stream.
 */
export function keeperFire(state, input) {
  const keeper = state.keeper;
  if ( !keeper.alive || !input.firing() || keeper.fireTimer > 0 ) return;
  const mods = state.mods;
  keeper.fireTimer = KEEPER.fireSeconds * mods.fireSeconds;
  const count = mods.projectiles;
  const spread = 0.09;
  for ( let i = 0; i < count; i += 1 ) {
    const offset = (i - (count - 1) / 2) * spread;
    const jitter = (state.random() - 0.5) * 0.02;
    spawnBolt(state, keeper.x, keeper.y, keeper.aim + offset + jitter);
  }
  state.particles.glow(keeper.x + Math.cos(keeper.aim) * 18, keeper.y + Math.sin(keeper.aim) * 18, '#ffd98a', 20, 0.18);
  state.events.push('shoot');
}

/**
 * Wound the keeper. The dash and a recent wound both grant brief
 * invulnerability; thorns answer the bite. Returns true when he dies.
 */
export function hurtKeeper(state, amount, sourceX, sourceY) {
  const keeper = state.keeper;
  if ( !keeper.alive || keeper.invulnerableTimer > 0 ) return false;
  keeper.hull -= amount;
  keeper.invulnerableTimer = KEEPER.invulnerableSeconds;
  state.shake = Math.min(14, state.shake + 6);
  state.events.push('hurt');
  state.particles.burst(keeper.x, keeper.y, '#ff5d6e', 12, 220);
  if ( sourceX !== undefined ) {
    const push = 190;
    const angle = Math.atan2(keeper.y - sourceY, keeper.x - sourceX);
    keeper.x += Math.cos(angle) * push * 0.09;
    keeper.y += Math.sin(angle) * push * 0.09;
    clampToField(keeper);
  }
  if ( keeper.hull <= 0 ) {
    keeper.hull = 0;
    keeper.alive = false;
    state.events.push('keeperDown');
    return true;
  }
  return false;
}
