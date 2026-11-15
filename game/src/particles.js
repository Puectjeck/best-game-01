// The particle pool: sparks from hits, bubbles rising past the keeper,
// shockwave rings from big deaths, ember motes drifting in the light.
// One pooled array, updated and drawn by kind, so a busy wave never
// allocates mid-frame.

import { randomRange } from './random.js';

export const PARTICLE_SPARK = 'spark';
export const PARTICLE_BUBBLE = 'bubble';
export const PARTICLE_RING = 'ring';
export const PARTICLE_MOTE = 'mote';
export const PARTICLE_GLOW = 'glow';

const MAX_PARTICLES = 900;

/** A pool of short-lived visual effects with a fixed-step update. */
export class Particles {
  constructor(random) {
    this.random = random;
    this.items = [];
  }

  /** Add one particle; fields not a kind needs are simply ignored. */
  spawn(kind, x, y, options = {}) {
    if ( this.items.length >= MAX_PARTICLES ) this.items.shift();
    this.items.push({
      kind,
      x, y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      life: options.life ?? 0.5,
      age: 0,
      size: options.size ?? 3,
      color: options.color ?? '#ffffff',
      drag: options.drag ?? 1,
      gravity: options.gravity ?? 0,
    });
  }

  /** A fan of sparks in a creature's colour, for hits and deaths. */
  burst(x, y, color, count = 10, speed = 190) {
    for ( let i = 0; i < count; i += 1 ) {
      const angle = this.random() * Math.PI * 2;
      const pace = randomRange(this.random, speed * 0.25, speed);
      this.spawn(PARTICLE_SPARK, x, y, {
        vx: Math.cos(angle) * pace,
        vy: Math.sin(angle) * pace,
        life: randomRange(this.random, 0.25, 0.6),
        size: randomRange(this.random, 1.5, 3.6),
        color,
        drag: 2.6,
      });
    }
  }

  /** An expanding ring, for brutes, bosses and level-ups. */
  ring(x, y, color, size = 90, life = 0.45) {
    this.spawn(PARTICLE_RING, x, y, { life, size, color });
  }

  /** A bubble that wobbles upward, for ambience and dashing. */
  bubble(x, y) {
    this.spawn(PARTICLE_BUBBLE, x, y, {
      vx: randomRange(this.random, -8, 8),
      vy: randomRange(this.random, -46, -22),
      life: randomRange(this.random, 1.2, 2.6),
      size: randomRange(this.random, 1.2, 3.2),
      color: '#bfeaff',
    });
  }

  /** A soft glow puff that fades where it was lit. */
  glow(x, y, color, size = 26, life = 0.3) {
    this.spawn(PARTICLE_GLOW, x, y, { life, size, color });
  }

  /** Advance every particle one fixed step and drop the spent ones. */
  update(step) {
    const kept = [];
    for ( const p of this.items ) {
      p.age += step;
      if ( p.age >= p.life ) continue;
      const dragFactor = Math.max(0, 1 - p.drag * step);
      p.vx *= dragFactor;
      p.vy = p.vy * dragFactor + p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      kept.push(p);
    }
    this.items = kept;
  }

  /** Draw every particle; glow and rings go under the creatures. */
  draw(ctx, layer) {
    for ( const p of this.items ) {
      const fade = 1 - p.age / p.life;
      if ( p.kind === PARTICLE_GLOW && layer === 'under' ) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.35 * fade;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if ( p.kind === PARTICLE_RING && layer === 'under' ) {
        ctx.globalAlpha = 0.7 * fade;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - fade) + 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if ( p.kind === PARTICLE_SPARK && layer === 'over' ) {
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if ( (p.kind === PARTICLE_BUBBLE || p.kind === PARTICLE_MOTE) && layer === 'over' ) {
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}
