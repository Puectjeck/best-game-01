// The creatures of the deep: five kinds that hunt in their own way, and
// the Maw that ends the dive. This file owns their bodies — how each one
// moves, bites, splits and dies — and how each is drawn. What they drop
// lives in pickups.js; the orbs they spit live in bullets.js.

import { FIELD, PALETTE, SCORE } from './config.js';
import { spawnOrb } from './bullets.js';
import { dropFor } from './pickups.js';
import { hurtKeeper } from './player.js';

/** The bestiary: hull, pace, size and bite for every kind. */
export const CREATURES = {
  drifter: { hp: 22, speed: 63, radius: 15, damage: 10, mass: 1 },
  stinger: { hp: 16, speed: 76, radius: 11, damage: 12, mass: 0.7 },
  spitter: { hp: 32, speed: 56, radius: 15, damage: 10, mass: 1 },
  splitter: { hp: 40, speed: 51, radius: 19, damage: 12, mass: 1.4 },
  mini: { hp: 8, speed: 108, radius: 8, damage: 6, mass: 0.4 },
  brute: { hp: 175, speed: 35, radius: 30, damage: 22, mass: 4 },
  maw: { hp: 1500, speed: 47, radius: 52, damage: 26, mass: 12 },
};

const BITE_SECONDS = 0.85;

/** Bring a creature of the given kind into the world at a point. */
export function spawnCreature(state, kind, x, y) {
  const base = CREATURES[kind];
  const growth = 1 + (state.wave - 1) * 0.16;
  const hp = Math.round(base.hp * (kind === 'maw' ? 1 + (state.wave - 6) * 0.22 : growth));
  const enemy = {
    kind,
    x, y, vx: 0, vy: 0,
    hp, maxHp: hp,
    radius: base.radius,
    speed: base.speed,
    damage: base.damage,
    mass: base.mass,
    flash: 0,
    biteTimer: 0,
    mode: 'hunt',
    modeTimer: 1 + state.random() * 1.5,
    phaseSeed: state.random() * Math.PI * 2,
    burstTimer: 3.2,
    summonTimer: 5,
    chargeTimer: 4,
  };
  state.enemies.push(enemy);
  return enemy;
}

/**
 * Wound a creature: flash it, knock it back by its mass, float the
 * number, and kill it when its hull is spent. Returns true on a kill.
 */
export function hurtCreature(state, enemy, amount, angle = 0, critical = false) {
  if ( enemy.hp <= 0 ) return false;
  enemy.hp -= amount;
  enemy.flash = 0.09;
  const knock = 130 / enemy.mass;
  enemy.x += Math.cos(angle) * knock * 0.12;
  enemy.y += Math.sin(angle) * knock * 0.12;
  state.floaters.damage(enemy.x + (state.random() - 0.5) * 14, enemy.y - enemy.radius, amount, critical);
  state.events.push('hit');
  if ( enemy.hp > 0 ) return false;
  killCreature(state, enemy);
  return true;
}

/** Settle a death: score, combo, drops, offspring and spectacle. */
function killCreature(state, enemy) {
  state.kills += 1;
  state.combo += 1;
  state.comboTimer = 3;
  state.score += Math.round((SCORE[enemy.kind] ?? 10) * (1 + Math.min(0.5, state.combo * 0.01)));
  const color = PALETTE[enemy.kind] ?? '#ffffff';
  state.particles.burst(enemy.x, enemy.y, color, enemy.kind === 'maw' ? 60 : enemy.kind === 'brute' ? 26 : 12, 240);
  if ( enemy.kind === 'brute' || enemy.kind === 'maw' ) {
    state.particles.ring(enemy.x, enemy.y, color, enemy.radius * 3.2, 0.55);
    state.shake = Math.min(16, state.shake + (enemy.kind === 'maw' ? 14 : 6));
    state.hitStop = Math.max(state.hitStop, enemy.kind === 'maw' ? 0.22 : 0.07);
  }
  state.events.push('kill');
  dropFor(state, enemy);
  if ( enemy.kind === 'splitter' ) {
    for ( let i = 0; i < 2; i += 1 ) {
      const mini = spawnCreature(state, 'mini', enemy.x + (i === 0 ? -12 : 12), enemy.y + (i === 0 ? 6 : -6));
      mini.vx = (i === 0 ? -1 : 1) * 120;
      mini.vy = (i === 0 ? 1 : -1) * 60;
    }
  }
  if ( enemy.kind === 'maw' ) {
    state.bossDown = true;
    state.events.push('mawDown');
  }
}

/** Steer one creature toward a point at its own pace. */
function seek(enemy, x, y, step, pace = 1) {
  const angle = Math.atan2(y - enemy.y, x - enemy.x);
  enemy.x += Math.cos(angle) * enemy.speed * pace * step;
  enemy.y += Math.sin(angle) * enemy.speed * pace * step;
  return angle;
}

/** The stinger's rhythm: close in, gather, lunge, drift spent, repeat. */
function stepStinger(state, enemy, step) {
  const keeper = state.keeper;
  enemy.modeTimer -= step;
  const distance = Math.hypot(keeper.x - enemy.x, keeper.y - enemy.y);
  if ( enemy.mode === 'hunt' ) {
    seek(enemy, keeper.x, keeper.y, step);
    if ( distance < 200 && enemy.modeTimer <= 0 ) { enemy.mode = 'gather'; enemy.modeTimer = 0.45; }
  } else if ( enemy.mode === 'gather' ) {
    seek(enemy, keeper.x, keeper.y, step, 0.25);
    if ( enemy.modeTimer <= 0 ) {
      enemy.mode = 'lunge';
      enemy.modeTimer = 0.42;
      const angle = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);
      enemy.vx = Math.cos(angle) * 430;
      enemy.vy = Math.sin(angle) * 430;
      state.events.push('lunge');
    }
  } else if ( enemy.mode === 'lunge' ) {
    enemy.x += enemy.vx * step;
    enemy.y += enemy.vy * step;
    if ( enemy.modeTimer <= 0 ) { enemy.mode = 'drift'; enemy.modeTimer = 0.7; }
  } else {
    seek(enemy, keeper.x, keeper.y, step, 0.4);
    if ( enemy.modeTimer <= 0 ) { enemy.mode = 'hunt'; enemy.modeTimer = 0.8 + state.random() * 0.8; }
  }
}

/** The spitter's rhythm: hold its range, strafe slowly, spit on a timer. */
function stepSpitter(state, enemy, step) {
  const keeper = state.keeper;
  const distance = Math.hypot(keeper.x - enemy.x, keeper.y - enemy.y);
  const toward = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);
  if ( distance > 300 ) seek(enemy, keeper.x, keeper.y, step);
  else if ( distance < 215 ) seek(enemy, enemy.x - Math.cos(toward) * 40, enemy.y - Math.sin(toward) * 40, step);
  else {
    const strafe = toward + Math.PI / 2 * (enemy.phaseSeed > Math.PI ? 1 : -1);
    enemy.x += Math.cos(strafe) * enemy.speed * 0.55 * step;
    enemy.y += Math.sin(strafe) * enemy.speed * 0.55 * step;
  }
  enemy.modeTimer -= step;
  if ( enemy.modeTimer <= 0 && distance < 430 ) {
    enemy.modeTimer = 2.1 + state.random() * 0.5;
    spawnOrb(state, enemy.x, enemy.y, toward);
    state.events.push('spit');
  }
}

/** The Maw: stalk, burst orbs in rings, call drifters, and charge. */
function stepMaw(state, enemy, step) {
  const keeper = state.keeper;
  const fraction = enemy.hp / enemy.maxHp;
  enemy.burstTimer -= step;
  enemy.summonTimer -= step;
  enemy.chargeTimer -= step;

  if ( enemy.mode === 'telegraph' ) {
    enemy.modeTimer -= step;
    if ( enemy.modeTimer <= 0 ) {
      enemy.mode = 'charge';
      enemy.modeTimer = 0.5;
      const angle = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);
      enemy.vx = Math.cos(angle) * 395;
      enemy.vy = Math.sin(angle) * 395;
      state.events.push('mawCharge');
    }
  } else if ( enemy.mode === 'charge' ) {
    enemy.x += enemy.vx * step;
    enemy.y += enemy.vy * step;
    enemy.modeTimer -= step;
    if ( enemy.modeTimer <= 0 ) { enemy.mode = 'hunt'; enemy.chargeTimer = 3.4; }
  } else {
    seek(enemy, keeper.x, keeper.y, step, fraction < 0.33 ? 1.25 : 1);
    if ( fraction < 0.33 && enemy.chargeTimer <= 0 ) {
      enemy.mode = 'telegraph';
      enemy.modeTimer = 0.6;
      state.events.push('mawTelegraph');
    }
  }

  if ( enemy.burstTimer <= 0 ) {
    enemy.burstTimer = fraction < 0.33 ? 3.4 : 4.6;
    const count = fraction < 0.66 ? 12 : 9;
    const offset = state.random() * Math.PI;
    for ( let i = 0; i < count; i += 1 ) spawnOrb(state, enemy.x, enemy.y, offset + (i * Math.PI * 2) / count, 165, 14);
    state.events.push('mawBurst');
  }
  if ( fraction < 0.66 && enemy.summonTimer <= 0 ) {
    enemy.summonTimer = 7;
    for ( let i = 0; i < 3; i += 1 ) {
      const angle = (i * Math.PI * 2) / 3;
      spawnCreature(state, 'drifter', enemy.x + Math.cos(angle) * 70, enemy.y + Math.sin(angle) * 70);
    }
    state.floaters.add(enemy.x, enemy.y - 70, 'THE MAW CALLS', PALETTE.maw, 17);
  }
}

/**
 * Advance every creature one step: its own hunting pattern, a gentle
 * push away from its neighbours, and a bite when it reaches the keeper.
 */
export function stepEnemies(state, step) {
  const keeper = state.keeper;
  for ( const enemy of state.enemies ) {
    if ( enemy.hp <= 0 ) continue;
    enemy.flash = Math.max(0, enemy.flash - step);
    enemy.biteTimer = Math.max(0, enemy.biteTimer - step);
    enemy.face = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);

    if ( enemy.kind === 'stinger' ) stepStinger(state, enemy, step);
    else if ( enemy.kind === 'spitter' ) stepSpitter(state, enemy, step);
    else if ( enemy.kind === 'maw' ) stepMaw(state, enemy, step);
    else if ( enemy.kind === 'drifter' || enemy.kind === 'mini' ) {
      const wobble = Math.sin(state.time * 2.2 + enemy.phaseSeed) * 26;
      const angle = Math.atan2(keeper.y - enemy.y, keeper.x - enemy.x);
      enemy.x += (Math.cos(angle) * enemy.speed + Math.cos(angle + Math.PI / 2) * wobble) * step;
      enemy.y += (Math.sin(angle) * enemy.speed + Math.sin(angle + Math.PI / 2) * wobble) * step;
    } else {
      seek(enemy, keeper.x, keeper.y, step);
    }

    enemy.x = Math.min(FIELD.width - FIELD.wall - enemy.radius, Math.max(FIELD.wall + enemy.radius, enemy.x));
    enemy.y = Math.min(FIELD.height - FIELD.wall - enemy.radius, Math.max(FIELD.wall + enemy.radius, enemy.y));

    if ( keeper.alive && enemy.biteTimer <= 0 &&
      Math.hypot(keeper.x - enemy.x, keeper.y - enemy.y) < keeper.radius + enemy.radius - 2 ) {
      enemy.biteTimer = BITE_SECONDS;
      hurtKeeper(state, enemy.damage, enemy.x, enemy.y);
      if ( state.mods.thorns > 0 ) hurtCreature(state, enemy, state.mods.thorns, Math.atan2(enemy.y - keeper.y, enemy.x - keeper.x));
    }
  }

  // A soft separation pass so a swarm reads as bodies, not a stack.
  const alive = state.enemies;
  for ( let i = 0; i < alive.length; i += 1 ) {
    for ( let j = i + 1; j < alive.length; j += 1 ) {
      const a = alive[i];
      const b = alive[j];
      if ( a.hp <= 0 || b.hp <= 0 ) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = (a.radius + b.radius) * 0.82;
      if ( distance > 0.01 && distance < minDistance ) {
        const push = ((minDistance - distance) / 2) * 0.6;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push / a.mass;
        a.y -= ny * push / a.mass;
        b.x += nx * push / b.mass;
        b.y += ny * push / b.mass;
      }
    }
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

/** The colour a creature glows, white-hot while a hit's flash lasts. */
function creatureColor(enemy) {
  return enemy.flash > 0 ? '#ffffff' : (PALETTE[enemy.kind] ?? '#ffffff');
}

/** Draw the jelly drifter: a translucent bell and trailing tentacles. */
function drawDrifter(ctx, enemy, time) {
  const color = creatureColor(enemy);
  const sway = Math.sin(time * 3 + enemy.phaseSeed) * 3;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, Math.PI, 0);
  ctx.quadraticCurveTo(enemy.x + enemy.radius, enemy.y + 8, enemy.x + enemy.radius - 3, enemy.y + 9);
  ctx.lineTo(enemy.x - enemy.radius + 3, enemy.y + 9);
  ctx.quadraticCurveTo(enemy.x - enemy.radius, enemy.y + 8, enemy.x - enemy.radius, enemy.y);
  ctx.fill();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for ( let t = -1; t <= 1; t += 1 ) {
    ctx.beginPath();
    ctx.moveTo(enemy.x + t * 8, enemy.y + 8);
    ctx.quadraticCurveTo(enemy.x + t * 8 + sway, enemy.y + 16, enemy.x + t * 8 - sway, enemy.y + 24);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#062a33';
  ctx.beginPath();
  ctx.arc(enemy.x - 4, enemy.y - 3, 2, 0, Math.PI * 2);
  ctx.arc(enemy.x + 4, enemy.y - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the stinger: a sleek dart aimed along its facing. */
function drawStinger(ctx, enemy) {
  const color = creatureColor(enemy);
  const heading = enemy.mode === 'lunge'
    ? Math.atan2(enemy.vy, enemy.vx)
    : (enemy.face ?? 0);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(heading);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b0a18';
  ctx.beginPath();
  ctx.arc(6, -3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw the spitter: a round angler with a glowing lure. */
function drawSpitter(ctx, enemy, time) {
  const color = creatureColor(enemy);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const lureAngle = -Math.PI / 2 + Math.sin(time * 2 + enemy.phaseSeed) * 0.4;
  const lureX = enemy.x + Math.cos(lureAngle) * 22;
  const lureY = enemy.y + Math.sin(lureAngle) * 22 - 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(enemy.x, enemy.y - enemy.radius + 4);
  ctx.quadraticCurveTo(enemy.x + 6, enemy.y - enemy.radius - 10, lureX, lureY);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(lureX, lureY, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d0f33';
  ctx.beginPath();
  ctx.arc(enemy.x - 5, enemy.y - 2, 2.4, 0, Math.PI * 2);
  ctx.arc(enemy.x + 5, enemy.y - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the splitter and its minis: green blobs with dark nuclei. */
function drawSplitter(ctx, enemy, time) {
  const color = creatureColor(enemy);
  const pulse = 1 + Math.sin(time * 4 + enemy.phaseSeed) * 0.06;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(10,40,8,0.55)';
  const nuclei = enemy.kind === 'splitter' ? 3 : 1;
  for ( let i = 0; i < nuclei; i += 1 ) {
    const angle = enemy.phaseSeed + (i * Math.PI * 2) / nuclei;
    ctx.beginPath();
    ctx.arc(enemy.x + Math.cos(angle) * enemy.radius * 0.4, enemy.y + Math.sin(angle) * enemy.radius * 0.4, enemy.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw the brute: a spiked orange bulk with a cracked shell. */
function drawBrute(ctx, enemy, time) {
  const color = creatureColor(enemy);
  ctx.fillStyle = color;
  ctx.beginPath();
  const spikes = 9;
  for ( let i = 0; i < spikes; i += 1 ) {
    const angle = (i * Math.PI * 2) / spikes + enemy.phaseSeed;
    const outer = enemy.radius + 6 + Math.sin(time * 2 + i) * 1.5;
    const px = enemy.x + Math.cos(angle) * outer;
    const py = enemy.y + Math.sin(angle) * outer;
    if ( i === 0 ) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    const innerAngle = angle + Math.PI / spikes;
    ctx.lineTo(enemy.x + Math.cos(innerAngle) * enemy.radius * 0.86, enemy.y + Math.sin(innerAngle) * enemy.radius * 0.86);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,12,4,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(enemy.x - 12, enemy.y - 8);
  ctx.lineTo(enemy.x - 2, enemy.y + 2);
  ctx.lineTo(enemy.x - 10, enemy.y + 12);
  ctx.moveTo(enemy.x + 4, enemy.y - 14);
  ctx.lineTo(enemy.x + 10, enemy.y - 2);
  ctx.stroke();
  ctx.fillStyle = '#2b0d04';
  ctx.beginPath();
  ctx.arc(enemy.x - 8, enemy.y - 4, 3, 0, Math.PI * 2);
  ctx.arc(enemy.x + 8, enemy.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the Maw: layered jaws around a glowing throat. */
function drawMaw(ctx, enemy, time) {
  const color = creatureColor(enemy);
  const open = 0.55 + Math.sin(time * 1.7 + enemy.phaseSeed) * 0.18 + (enemy.mode === 'telegraph' ? 0.35 : 0);
  ctx.fillStyle = 'rgba(255,77,109,0.16)';
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius + 16 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#30060f';
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 6, enemy.radius * 0.62, enemy.radius * 0.5 * open + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd7de';
  const teeth = 10;
  for ( let i = 0; i < teeth; i += 1 ) {
    const angle = (i * Math.PI) / (teeth - 1);
    const tx = enemy.x + Math.cos(angle) * enemy.radius * 0.58;
    ctx.beginPath();
    ctx.moveTo(tx - 4, enemy.y + 6 - Math.sin(angle) * enemy.radius * 0.42 * open);
    ctx.lineTo(tx + 4, enemy.y + 6 - Math.sin(angle) * enemy.radius * 0.42 * open);
    ctx.lineTo(tx, enemy.y + 6 - Math.sin(angle) * enemy.radius * 0.42 * open + 11);
    ctx.closePath();
    ctx.fill();
  }
  const glowPulse = 0.6 + Math.sin(time * 3.1) * 0.25;
  ctx.fillStyle = `rgba(255,120,80,${glowPulse})`;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y + 8, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(enemy.x - 22, enemy.y - 26, 4.4, 0, Math.PI * 2);
  ctx.arc(enemy.x + 22, enemy.y - 26, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0208';
  ctx.beginPath();
  ctx.arc(enemy.x - 22, enemy.y - 26, 2.1, 0, Math.PI * 2);
  ctx.arc(enemy.x + 22, enemy.y - 26, 2.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw one creature by kind, with a small health slit when wounded. */
export function drawCreature(ctx, enemy, time) {
  if ( enemy.kind === 'drifter' ) drawDrifter(ctx, enemy, time);
  else if ( enemy.kind === 'stinger' ) drawStinger(ctx, enemy);
  else if ( enemy.kind === 'spitter' ) drawSpitter(ctx, enemy, time);
  else if ( enemy.kind === 'splitter' || enemy.kind === 'mini' ) drawSplitter(ctx, enemy, time);
  else if ( enemy.kind === 'brute' ) drawBrute(ctx, enemy, time);
  else if ( enemy.kind === 'maw' ) drawMaw(ctx, enemy, time);

  if ( enemy.hp < enemy.maxHp && enemy.kind !== 'maw' ) {
    const width = enemy.radius * 1.7;
    ctx.fillStyle = 'rgba(3,16,22,0.75)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 4);
    ctx.fillStyle = PALETTE[enemy.kind] ?? '#fff';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
  }
}
