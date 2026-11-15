// The heads-up display: the keeper's hull, his growing level, the
// score, the wave, and the Maw's own bar when it comes. Everything here
// is drawn over the world and under the menus, in the trench's palette.

import { FIELD, PALETTE } from './config.js';
import { bossOnField } from './world.js';

const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

/** A labelled bar with a bright fill and a dark track. */
function bar(ctx, x, y, width, height, fraction, color, label) {
  ctx.fillStyle = 'rgba(3,16,22,0.72)';
  ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
  ctx.fillStyle = 'rgba(140,190,210,0.18)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, fraction)), height);
  if ( label ) {
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, x, y - 8);
  }
}

/** Seconds as m:ss, for the dive clock. */
export function formatClock(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Draw the whole HUD for the play, draft and pause phases. */
export function drawHud(ctx, state) {
  const keeper = state.keeper;

  // Hull, top-left, with the dash pip beneath it.
  const hullFraction = keeper.hull / keeper.maxHull;
  const hullColor = hullFraction > 0.45 ? PALETTE.hull : hullFraction > 0.22 ? PALETTE.ember : PALETTE.hurt;
  bar(ctx, 26, 30, 230, 14, hullFraction, hullColor, 'HULL');
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`${Math.ceil(keeper.hull)} / ${keeper.maxHull}`, 266, 42);
  const dashReady = keeper.dashCooldownTimer <= 0;
  ctx.font = `700 11px ${FONT}`;
  ctx.fillStyle = dashReady ? PALETTE.lantern : 'rgba(143,184,201,0.5)';
  ctx.fillText(dashReady ? '◆ DASH READY (SHIFT)' : '◇ dash returning…', 26, 66);

  // Wave and what is left of it, top-centre.
  ctx.textAlign = 'center';
  ctx.font = `700 17px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} OF 12`, FIELD.width / 2, 40);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = PALETTE.dim;
  const remaining = state.director.remaining(state);
  ctx.fillText(state.resting > 0 ? `the deep gathers itself… ${Math.ceil(state.resting)}` : `${remaining} in the dark`, FIELD.width / 2, 59);

  // Score and best, top-right.
  ctx.textAlign = 'right';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(state.score.toLocaleString('en-US'), FIELD.width - 26, 42);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${Math.max(state.best?.score ?? 0, state.score).toLocaleString('en-US')} · ${formatClock(state.diveSeconds)}`, FIELD.width - 26, 61);
  if ( state.muted ) ctx.fillText('SOUND OFF (M)', FIELD.width - 26, 79);

  // Combo, right side, while it burns.
  if ( state.combo >= 3 ) {
    ctx.font = `800 20px ${FONT}`;
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText(`COMBO ×${state.combo}`, FIELD.width - 26, 108);
    bar(ctx, FIELD.width - 146, 116, 120, 5, state.comboTimer / 3, PALETTE.ember, null);
  }

  // Level and ember progress, along the bottom.
  bar(ctx, 26, FIELD.height - 30, FIELD.width - 52, 9, state.xp / state.xpNext, PALETTE.shard, null);
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.lantern;
  ctx.fillText(`LEVEL ${state.level}`, 26, FIELD.height - 38);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`${state.xp} / ${state.xpNext} EMBERS TO LEVEL ${state.level + 1}`, FIELD.width - 26, FIELD.height - 38);

  // The Maw's bar, when it is on the field.
  const boss = bossOnField(state);
  if ( boss ) {
    const width = 520;
    const x = (FIELD.width - width) / 2;
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.maw;
    ctx.fillText('— THE MAW —', FIELD.width / 2, FIELD.height - 66);
    bar(ctx, x, FIELD.height - 58, width, 10, boss.hp / boss.maxHp, PALETTE.maw, null);
  }

  // First-wave teaching line.
  if ( state.wave === 1 && state.diveSeconds < 11 && state.phase === 'play' ) {
    ctx.textAlign = 'center';
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = 'rgba(234,247,255,0.85)';
    ctx.fillText('WASD to swim · mouse to aim · hold click or SPACE to fire · SHIFT to dash · P pauses · M mutes', FIELD.width / 2, FIELD.height - 52);
  }

  // The wave banner, big in the middle while it lasts.
  if ( state.banner ) {
    const { title, sub, age, life } = state.banner;
    const fade = age < 0.3 ? age / 0.3 : age > life - 0.5 ? Math.max(0, (life - age) / 0.5) : 1;
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.font = '700 44px Georgia, "Times New Roman", serif';
    ctx.fillStyle = PALETTE.emberHot;
    ctx.shadowColor = 'rgba(255,160,60,0.55)';
    ctx.shadowBlur = 24;
    ctx.fillText(title, FIELD.width / 2, 150);
    ctx.shadowBlur = 0;
    if ( sub ) {
      ctx.font = `italic 600 16px ${FONT}`;
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(sub, FIELD.width / 2, 178);
    }
    ctx.globalAlpha = 1;
  }
}
