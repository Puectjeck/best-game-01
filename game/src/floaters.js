// Floating combat text: damage numbers, pickup notices and warnings
// that rise and fade above the action. Small, pooled and drawn last so
// the player always reads the newest news first.

const MAX_FLOATERS = 48;
const RISE_SPEED = 44;

/** A pool of rising, fading text notes. */
export class Floaters {
  constructor() {
    this.items = [];
  }

  /** Add a note at a world position. */
  add(x, y, text, color = '#eaf7ff', size = 15) {
    if ( this.items.length >= MAX_FLOATERS ) this.items.shift();
    this.items.push({ x, y, text, color, size, age: 0, life: 0.9 });
  }

  /** A damage number; critical hits shout in a bigger, hotter font. */
  damage(x, y, amount, critical = false) {
    this.add(x, y - 6, String(Math.round(amount)), critical ? '#ffe3ae' : '#ffd98a', critical ? 21 : 14);
  }

  /** Advance every note one fixed step. */
  update(step) {
    const kept = [];
    for ( const item of this.items ) {
      item.age += step;
      if ( item.age >= item.life ) continue;
      item.y -= RISE_SPEED * step;
      kept.push(item);
    }
    this.items = kept;
  }

  /** Draw every note with a soft shadow so it reads over bright scenes. */
  draw(ctx) {
    ctx.textAlign = 'center';
    for ( const item of this.items ) {
      const fade = 1 - item.age / item.life;
      ctx.globalAlpha = Math.min(1, fade * 1.6);
      ctx.font = `700 ${item.size}px "Avenir Next", "Segoe UI", system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
