// The wave director: what each of the twelve waves sends, and when.
// Early waves teach one creature at a time; later waves mix the whole
// bestiary, and the sixth and twelfth are the Maw with a slow trickle
// of attendants. Composition is shuffled by the run's random stream, so
// a seed always sends the same dive.

import { FIELD } from './config.js';
import { spawnCreature } from './enemies.js';

const EDGE_MARGIN = 60;
const MIN_KEEPER_DISTANCE = 300;

/** The shuffled list of kinds a wave will send, Maw first on its waves. */
export function compositionFor(wave, random) {
  if ( wave === 6 || wave === 12 ) {
    const trickle = wave === 6
      ? ['drifter', 'drifter', 'stinger', 'drifter', 'splitter', 'drifter', 'stinger', 'mini', 'mini']
      : ['drifter', 'stinger', 'spitter', 'drifter', 'splitter', 'stinger', 'drifter', 'brute', 'mini', 'mini', 'spitter', 'drifter'];
    return ['maw', ...trickle];
  }
  const list = [];
  const count = 6 + wave * 3;
  for ( let i = 0; i < count; i += 1 ) {
    const roll = random();
    if ( wave >= 5 && roll < 0.07 + wave * 0.004 ) list.push('brute');
    else if ( wave >= 4 && roll < 0.24 ) list.push('spitter');
    else if ( wave >= 3 && roll < 0.42 ) list.push('splitter');
    else if ( wave >= 2 && roll < 0.62 ) list.push('stinger');
    else list.push('drifter');
  }
  // Shuffle so kinds arrive mixed, never in a single-kind block.
  for ( let i = list.length - 1; i > 0; i -= 1 ) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** A point on the trench rim, never close to the keeper. */
function spawnPoint(state) {
  const keeper = state.keeper;
  for ( let attempt = 0; attempt < 12; attempt += 1 ) {
    const side = Math.floor(state.random() * 4);
    let x;
    let y;
    if ( side === 0 ) { x = EDGE_MARGIN + state.random() * (FIELD.width - EDGE_MARGIN * 2); y = EDGE_MARGIN; }
    else if ( side === 1 ) { x = EDGE_MARGIN + state.random() * (FIELD.width - EDGE_MARGIN * 2); y = FIELD.height - EDGE_MARGIN; }
    else if ( side === 2 ) { x = EDGE_MARGIN; y = EDGE_MARGIN + state.random() * (FIELD.height - EDGE_MARGIN * 2); }
    else { x = FIELD.width - EDGE_MARGIN; y = EDGE_MARGIN + state.random() * (FIELD.height - EDGE_MARGIN * 2); }
    if ( Math.hypot(keeper.x - x, keeper.y - y) >= MIN_KEEPER_DISTANCE || attempt === 11 ) return { x, y };
  }
  return { x: EDGE_MARGIN, y: EDGE_MARGIN };
}

/** Sends a wave's creatures over time; the world asks it each step. */
export class WaveDirector {
  constructor() {
    this.queue = [];
    this.timer = 0;
    this.sent = 0;
    this.total = 0;
  }

  /** Load a wave's composition; the Maw, when there is one, comes first. */
  begin(state, wave) {
    this.queue = compositionFor(wave, state.random);
    this.total = this.queue.length;
    this.sent = 0;
    this.timer = 0.4;
  }

  /** How long between sends: quicker as the dive deepens. */
  interval(wave) {
    return Math.max(0.5, 1.45 - wave * 0.075);
  }

  /** Send what is due this step. Boss waves trickle their attendants. */
  update(state, step) {
    if ( this.queue.length === 0 ) return;
    this.timer -= step;
    if ( this.timer > 0 ) return;
    const bossWave = this.queue.includes('maw') || state.enemies.some((enemy) => enemy.kind === 'maw');
    this.timer = bossWave ? 2.4 : this.interval(state.wave);
    const kind = this.queue.shift();
    const point = kind === 'maw'
      ? { x: FIELD.width / 2, y: EDGE_MARGIN + 30 }
      : spawnPoint(state);
    spawnCreature(state, kind, point.x, point.y);
    this.sent += 1;
    if ( kind === 'maw' ) state.events.push('mawArrives');
  }

  /** True when every creature of the wave has been sent. */
  drained() {
    return this.queue.length === 0;
  }

  /** Creatures of this wave still alive or unsent. */
  remaining(state) {
    return this.queue.length + state.enemies.length;
  }
}
