// The screens around the dive: the title, the upgrade draft, the pause,
// the loss and the victory. Each draw registers its buttons in a shared
// list the main loop hit-tests, so what is drawn is exactly what can be
// clicked. Georgia carries the titles; the trench's palette carries all.

import { FIELD, PALETTE } from './config.js';
import { upgradeById, describeNext, levelOf } from './upgrades.js';
import { formatClock } from './hud.js';

const TITLE_FONT = 'Georgia, "Palatino Linotype", "Times New Roman", serif';
const BODY_FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

/** Buttons drawn by the most recent screen, newest last. */
export const buttons = [];

/** Forget last frame's buttons; every screen draw starts from empty. */
export function resetButtons() {
  buttons.length = 0;
}

/** Register a clickable rectangle under an id and draw it as a button. */
function drawButton(ctx, state, id, x, y, width, height, label, sub = '') {
  buttons.push({ id, x, y, width, height });
  const hover = state.pointer && state.pointer.x >= x && state.pointer.x <= x + width &&
    state.pointer.y >= y && state.pointer.y <= y + height;
  ctx.fillStyle = hover ? 'rgba(255,180,84,0.92)' : 'rgba(10,44,58,0.92)';
  ctx.strokeStyle = PALETTE.ember;
  ctx.lineWidth = hover ? 2.4 : 1.4;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = hover ? '#231303' : PALETTE.emberHot;
  ctx.font = `800 ${sub ? 19 : 17}px ${BODY_FONT}`;
  ctx.fillText(label, x + width / 2, y + height / 2 + (sub ? -2 : 6));
  if ( sub ) {
    ctx.font = `600 12px ${BODY_FONT}`;
    ctx.fillStyle = hover ? '#4a2c05' : PALETTE.dim;
    ctx.fillText(sub, x + width / 2, y + height / 2 + 17);
  }
  return hover;
}

/** The button a point falls in, or null. */
export function buttonAt(x, y) {
  for ( let i = buttons.length - 1; i >= 0; i -= 1 ) {
    const b = buttons[i];
    if ( x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height ) return b.id;
  }
  return null;
}

/** Dim the world behind a screen with a soft vertical wash. */
function wash(ctx, alpha = 0.55) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, `rgba(2,10,15,${alpha})`);
  gradient.addColorStop(1, `rgba(2,10,15,${Math.min(0.92, alpha + 0.25)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** Wrap a line of text to a width, drawing each piece centred. */
function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for ( const word of words ) {
    const trial = line ? `${line} ${word}` : word;
    if ( ctx.measureText(trial).width > maxWidth && line ) {
      ctx.fillText(line, cx, yy);
      yy += lineHeight;
      line = word;
    } else {
      line = trial;
    }
  }
  if ( line ) ctx.fillText(line, cx, yy);
  return yy;
}

/** The title screen: the name, the promise, the controls, the way in. */
export function drawTitle(ctx, state, time) {
  wash(ctx, 0.42);
  const cx = FIELD.width / 2;
  const glowPulse = 0.75 + Math.sin(time * 1.6) * 0.25;

  ctx.textAlign = 'center';
  ctx.font = `600 15px ${BODY_FONT}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('T W E L V E   W A V E S   ·   O N E   L A N T E R N', cx, 108);

  ctx.font = `700 92px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.shadowColor = `rgba(255,160,60,${0.65 * glowPulse})`;
  ctx.shadowBlur = 42;
  ctx.fillText('EMBERDEEP', cx, 205);
  ctx.shadowBlur = 0;

  ctx.font = `italic 400 21px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('a lantern lit against the abyss', cx, 246);

  ctx.font = `400 16px ${BODY_FONT}`;
  ctx.fillStyle = PALETTE.dim;
  wrapText(ctx, 'You keep the last light in a drowned trench. The deep sends its creatures in twelve waves — jellies, darts, spitters, splitters and brutes, and twice the Maw itself. Gather the embers of the fallen, take the deep’s gifts, and still be burning at the end.', cx, 292, 700, 23);

  // The controls, in two quiet columns.
  ctx.font = `600 14.5px ${BODY_FONT}`;
  ctx.fillStyle = PALETTE.text;
  const controls = [
    ['WASD / arrows', 'swim'],
    ['mouse', 'aim the lantern'],
    ['hold click / SPACE', 'fire light bolts'],
    ['SHIFT', 'dash through danger'],
    ['P', 'pause'],
    ['M', 'mute'],
  ];
  controls.forEach(([keys, what], index) => {
    const colX = cx + (index % 2 === 0 ? -190 : 130);
    const rowY = 386 + Math.floor(index / 2) * 26;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillText(keys, colX + 60, rowY);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(what, colX + 70, rowY);
  });
  ctx.textAlign = 'center';

  drawButton(ctx, state, 'start', cx - 130, 486, 260, 56, 'BEGIN THE DIVE', 'click or press Enter');

  if ( state.best ) {
    ctx.font = `600 14px ${BODY_FONT}`;
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText(`best dive so far — ${state.best.score.toLocaleString('en-US')} points, wave ${state.best.wave}, ${state.best.kills} felled`, cx, 584);
  }
  ctx.font = `400 12.5px ${BODY_FONT}`;
  ctx.fillStyle = 'rgba(143,184,201,0.75)';
  ctx.fillText('an original game in plain JavaScript — no engine, no network, nothing to install', cx, FIELD.height - 26);
}

/** The draft: three gifts of the deep, one to take, hotkeys 1–3. */
export function drawDraft(ctx, state) {
  wash(ctx, 0.6);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.shadowColor = 'rgba(255,160,60,0.5)';
  ctx.shadowBlur = 22;
  ctx.fillText('THE DEEP OFFERS', cx, 168);
  ctx.shadowBlur = 0;
  ctx.font = `italic 400 17px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`level ${state.level} — the fallen feed your light. Choose one gift.`, cx, 200);

  const cardWidth = 320;
  const cardHeight = 218;
  const gap = 28;
  const total = cardWidth * state.draft.length + gap * (state.draft.length - 1);
  const startX = cx - total / 2;
  const cardY = 248;

  state.draft.forEach((id, index) => {
    const upgrade = upgradeById(id);
    if ( !upgrade ) return;
    const x = startX + index * (cardWidth + gap);
    const hover = state.pointer && state.pointer.x >= x && state.pointer.x <= x + cardWidth &&
      state.pointer.y >= cardY && state.pointer.y <= cardY + cardHeight;
    buttons.push({ id: `draft:${id}`, x, y: cardY, width: cardWidth, height: cardHeight });
    ctx.fillStyle = hover ? 'rgba(16,58,74,0.97)' : 'rgba(7,30,40,0.97)';
    ctx.strokeStyle = hover ? PALETTE.ember : 'rgba(255,180,84,0.45)';
    ctx.lineWidth = hover ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardWidth, cardHeight, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(x + cardWidth / 2, cardY + 44, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberHot;
    ctx.beginPath();
    ctx.arc(x + cardWidth / 2, cardY + 44, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 21px ${BODY_FONT}`;
    ctx.fillText(upgrade.name, x + cardWidth / 2, cardY + 92);

    const level = levelOf(state.levels, id);
    for ( let pip = 0; pip < upgrade.max; pip += 1 ) {
      ctx.beginPath();
      ctx.arc(x + cardWidth / 2 + (pip - (upgrade.max - 1) / 2) * 17, cardY + 116, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = pip < level ? PALETTE.ember : pip === level ? '#fff3d6' : 'rgba(143,184,201,0.35)';
      ctx.fill();
    }

    ctx.font = `400 15px ${BODY_FONT}`;
    ctx.fillStyle = PALETTE.dim;
    wrapText(ctx, describeNext(upgrade, state.levels), x + cardWidth / 2, cardY + 148, cardWidth - 44, 21);

    ctx.font = `700 13px ${BODY_FONT}`;
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillText(`press ${index + 1}`, x + cardWidth / 2, cardY + cardHeight - 16);
  });
}

/** The shared statistics block of the two end screens. */
function drawStats(ctx, state, cx, y) {
  const rows = [
    ['SCORE', state.score.toLocaleString('en-US')],
    ['WAVE REACHED', `${state.wave} of 12`],
    ['CREATURES FELLED', String(state.kills)],
    ['TIME IN THE DEEP', formatClock(state.diveSeconds)],
    ['LEVEL REACHED', String(state.level)],
    ['BEST DIVE', `${(state.best?.score ?? state.score).toLocaleString('en-US')}`],
  ];
  ctx.font = `600 16px ${BODY_FONT}`;
  rows.forEach(([label, value], index) => {
    const rowY = y + index * 30;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, cx - 18, rowY);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, cx + 18, rowY);
  });
  ctx.textAlign = 'center';
}

/** The loss: the light goes out, the record remains. */
export function drawOver(ctx, state) {
  wash(ctx, 0.62);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.font = `700 54px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.hurt;
  ctx.fillText('THE LIGHT GOES OUT', cx, 158);
  ctx.font = `italic 400 18px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(state.wave >= 12 ? 'so close — the Maw keeps its trench, this time' : `the deep takes another keeper, on wave ${state.wave}`, cx, 192);
  if ( state.newBest ) {
    ctx.font = `800 16px ${BODY_FONT}`;
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText('★ A NEW BEST DIVE ★', cx, 226);
  }
  drawStats(ctx, state, cx, 268);
  drawButton(ctx, state, 'again', cx - 130, 486, 260, 56, 'DIVE AGAIN', 'click or press Enter');
}

/** The victory: twelve waves weathered, the lantern still lit. */
export function drawWin(ctx, state) {
  wash(ctx, 0.5);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.font = `700 56px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.shadowColor = 'rgba(255,160,60,0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText('THE DEEP RECEDES', cx, 158);
  ctx.shadowBlur = 0;
  ctx.font = `italic 400 18px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('twelve waves, two Maws, one small light — still burning', cx, 192);
  if ( state.newBest ) {
    ctx.font = `800 16px ${BODY_FONT}`;
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText('★ A NEW BEST DIVE ★', cx, 226);
  }
  drawStats(ctx, state, cx, 268);
  drawButton(ctx, state, 'again', cx - 130, 486, 260, 56, 'DIVE AGAIN', 'click or press Enter');
}

/** The pause: a held breath, with the way back and the way over. */
export function drawPause(ctx, state) {
  wash(ctx, 0.6);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.font = `700 46px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('A HELD BREATH', cx, 220);
  ctx.font = `italic 400 17px ${TITLE_FONT}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('the deep waits with you', cx, 252);
  drawButton(ctx, state, 'resume', cx - 240, 320, 220, 52, 'SWIM ON', 'click or press P');
  drawButton(ctx, state, 'restart', cx + 20, 320, 220, 52, 'START OVER', 'a fresh lantern');
}
