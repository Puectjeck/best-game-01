// The trench as the player sees it: a dark floor of rock and silt, the
// keeper's lantern light pushing the black back, and everything that
// swims in between. The darkness is a radial wash centred on the keeper
// — outside his light the deep is only shapes and glowing eyes.

import { FIELD, KEEPER, PALETTE } from './config.js';
import { makeRandom } from './random.js';
import { drawCreature } from './enemies.js';
import { drawBolts } from './bullets.js';
import { drawPickups } from './pickups.js';

/** Fixed scenery, generated once from its own seed: rocks and silt. */
const SCENERY = (() => {
  const random = makeRandom(20261115);
  const rocks = [];
  for ( let i = 0; i < 46; i += 1 ) {
    rocks.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 8 + random() * 30,
      shade: random(),
    });
  }
  const pebbles = [];
  for ( let i = 0; i < 260; i += 1 ) {
    pebbles.push({ x: random() * FIELD.width, y: random() * FIELD.height, r: 1 + random() * 2.2 });
  }
  const spires = [];
  for ( let i = 0; i < 9; i += 1 ) {
    spires.push({ x: random() * FIELD.width, w: 30 + random() * 70, h: 90 + random() * 190, top: random() > 0.5 });
  }
  return { rocks, pebbles, spires };
})();

/** The floor: gradient silt, rock silhouettes and hanging spires. */
function drawFloor(ctx, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.deep);
  gradient.addColorStop(0.55, PALETTE.deepFloor);
  gradient.addColorStop(1, '#051a24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.fillStyle = 'rgba(10,42,56,0.8)';
  for ( const spire of SCENERY.spires ) {
    ctx.beginPath();
    if ( spire.top ) {
      ctx.moveTo(spire.x, 0);
      ctx.lineTo(spire.x + spire.w, 0);
      ctx.lineTo(spire.x + spire.w / 2, spire.h);
    } else {
      ctx.moveTo(spire.x, FIELD.height);
      ctx.lineTo(spire.x + spire.w, FIELD.height);
      ctx.lineTo(spire.x + spire.w / 2, FIELD.height - spire.h);
    }
    ctx.closePath();
    ctx.fill();
  }

  for ( const rock of SCENERY.rocks ) {
    ctx.fillStyle = rock.shade > 0.5 ? 'rgba(13,52,68,0.55)' : 'rgba(8,34,46,0.55)';
    ctx.beginPath();
    ctx.ellipse(rock.x, rock.y, rock.r, rock.r * 0.62, rock.shade * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,200,220,0.13)';
  for ( const pebble of SCENERY.pebbles ) {
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, pebble.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // The trench rim: the rock the keeper cannot pass.
  ctx.strokeStyle = PALETTE.rock;
  ctx.lineWidth = FIELD.wall;
  ctx.strokeRect(FIELD.wall / 2, FIELD.wall / 2, FIELD.width - FIELD.wall, FIELD.height - FIELD.wall);
  ctx.strokeStyle = 'rgba(120,200,230,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD.wall, FIELD.wall, FIELD.width - FIELD.wall * 2, FIELD.height - FIELD.wall * 2);

  // Slow god-rays from a surface no one alive has seen.
  ctx.save();
  ctx.globalAlpha = 0.05 + Math.sin(time * 0.3) * 0.012;
  ctx.fillStyle = '#bfeaff';
  for ( let i = 0; i < 3; i += 1 ) {
    const x = 240 + i * 360 + Math.sin(time * 0.11 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 210, FIELD.height);
    ctx.lineTo(x + 60, FIELD.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The keeper himself: cloak, hood, and the lantern he holds to his aim. */
function drawKeeper(ctx, state, time) {
  const keeper = state.keeper;
  if ( !keeper.alive ) return;
  const flicker = keeper.invulnerableTimer > 0 && Math.floor(time * 18) % 2 === 0;
  const lanternX = keeper.x + Math.cos(keeper.aim) * 21;
  const lanternY = keeper.y + Math.sin(keeper.aim) * 21;

  const glow = ctx.createRadialGradient(keeper.x, keeper.y, 4, keeper.x, keeper.y, 74);
  glow.addColorStop(0, 'rgba(255,190,90,0.30)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(keeper.x, keeper.y, 74, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = flicker ? 0.35 : 1;
  // Cloak: a teardrop swept opposite the swim direction.
  const back = Math.atan2(keeper.vy, keeper.vx);
  const sway = keeper.moving ? Math.sin(time * 10) * 3 : Math.sin(time * 2) * 1.4;
  ctx.fillStyle = '#0e4d5c';
  ctx.beginPath();
  ctx.moveTo(keeper.x + Math.cos(keeper.aim) * 10, keeper.y + Math.sin(keeper.aim) * 10);
  ctx.quadraticCurveTo(
    keeper.x + Math.cos(back) * 16 + sway, keeper.y + Math.sin(back) * 16,
    keeper.x - Math.cos(keeper.aim) * 15, keeper.y - Math.sin(keeper.aim) * 15,
  );
  ctx.quadraticCurveTo(
    keeper.x - Math.cos(back) * 10 - sway, keeper.y - Math.sin(back) * 10,
    keeper.x + Math.cos(keeper.aim) * 10, keeper.y + Math.sin(keeper.aim) * 10,
  );
  ctx.fill();
  // Hood and face.
  ctx.fillStyle = '#083642';
  ctx.beginPath();
  ctx.arc(keeper.x, keeper.y, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.arc(keeper.x + Math.cos(keeper.aim) * 3.4, keeper.y + Math.sin(keeper.aim) * 3.4, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The lantern: brass ring, bright heart, on a short arm toward the aim.
  ctx.strokeStyle = '#8a6a34';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(keeper.x, keeper.y);
  ctx.lineTo(lanternX, lanternY);
  ctx.stroke();
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(lanternX, lanternY, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(lanternX, lanternY, 3.1, 0, Math.PI * 2);
  ctx.fill();

  // Orbit wisps, when the deep has granted them.
  const wisps = state.mods.wisps;
  for ( let i = 0; i < wisps; i += 1 ) {
    const angle = keeper.wispAngle + (i * Math.PI * 2) / Math.max(1, wisps);
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(keeper.x + Math.cos(angle) * 46, keeper.y + Math.sin(angle) * 46, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The dark itself, held back only by the lantern's radius. */
function drawDarkness(ctx, state) {
  const keeper = state.keeper;
  const radius = KEEPER.lightRadius * state.mods.lightRadius * (keeper.alive ? 1 : 0.4);
  const gradient = ctx.createRadialGradient(keeper.x, keeper.y, radius * 0.42, keeper.x, keeper.y, radius * 1.65);
  gradient.addColorStop(0, 'rgba(2,8,12,0)');
  gradient.addColorStop(0.72, 'rgba(2,8,12,0.34)');
  gradient.addColorStop(1, 'rgba(1,5,8,0.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/**
 * Draw the whole world in order: floor, under-glow, pickups, creatures,
 * bolts, the keeper, over-sparks, combat text, then the darkness that
 * makes the light mean something.
 */
export function drawWorld(ctx, state, time) {
  drawFloor(ctx, time);
  state.particles.draw(ctx, 'under');
  drawPickups(ctx, state, time);
  for ( const enemy of state.enemies ) drawCreature(ctx, enemy, time);
  drawBolts(ctx, state);
  drawKeeper(ctx, state, time);
  state.particles.draw(ctx, 'over');
  drawDarkness(ctx, state);
  // Combat text goes over the dark so the news is always readable.
  state.floaters.draw(ctx);
}
