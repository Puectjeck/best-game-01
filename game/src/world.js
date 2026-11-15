// The world: one dive's whole state, and the fixed step that advances
// it. Everything the player sees is a function of this state; the main
// loop steps it, the renderer draws it, and the event list it collects
// is drained each frame into sounds and announcements.

import { DIVE, KEEPER, SCORE } from './config.js';
import { makeRandom } from './random.js';
import { Particles } from './particles.js';
import { Floaters } from './floaters.js';
import { createKeeper, stepKeeper, keeperFire } from './player.js';
import { stepEnemies } from './enemies.js';
import { stepBolts } from './bullets.js';
import { stepPickups, xpForLevel } from './pickups.js';
import { computeMods, rollDraft, levelOf } from './upgrades.js';
import { WaveDirector } from './waves.js';
import { saveBest } from './storage.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_DRAFT = 'draft';
export const PHASE_PAUSE = 'pause';
export const PHASE_OVER = 'over';
export const PHASE_WIN = 'win';

/** A whole dive's state, fresh at the title screen. */
export function createWorld(seed, best) {
  const random = makeRandom(seed);
  const state = {
    random,
    time: 0,
    phase: PHASE_TITLE,
    keeper: createKeeper(),
    levels: new Map(),
    mods: computeMods(new Map()),
    bolts: [],
    orbs: [],
    enemies: [],
    pickups: [],
    sparks: [],
    particles: new Particles(random),
    floaters: new Floaters(),
    director: new WaveDirector(),
    wave: 0,
    resting: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    xp: 0,
    level: 1,
    xpNext: xpForLevel(1),
    pendingLevels: 0,
    draft: [],
    shake: 0,
    hitStop: 0,
    wispTimer: 0,
    bossDown: false,
    banner: null,
    events: [],
    best,
    newBest: false,
    diveSeconds: 0,
  };
  return state;
}

/** Start the dive over: clear the trench, relight the lantern, wave one. */
export function resetDive(state) {
  state.keeper = createKeeper();
  state.levels = new Map();
  state.mods = computeMods(state.levels);
  state.bolts = [];
  state.orbs = [];
  state.enemies = [];
  state.pickups = [];
  state.sparks = [];
  state.particles = new Particles(state.random);
  state.floaters = new Floaters();
  state.score = 0;
  state.kills = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.xp = 0;
  state.level = 1;
  state.xpNext = xpForLevel(1);
  state.pendingLevels = 0;
  state.draft = [];
  state.shake = 0;
  state.hitStop = 0;
  state.bossDown = false;
  state.newBest = false;
  state.diveSeconds = 0;
  state.phase = PHASE_PLAY;
  startWave(state, 1);
}

/** Begin a wave and raise its banner. */
export function startWave(state, wave) {
  state.wave = wave;
  state.resting = 0;
  state.director.begin(state, wave);
  const bossWave = wave === 6 || wave === 12;
  state.banner = {
    title: bossWave ? (wave === 12 ? 'THE MAW RETURNS' : 'THE MAW') : `WAVE ${wave}`,
    sub: bossWave ? 'end it, and the deep lets go' : wave === 1 ? 'the deep wakes — hold your light' : '',
    age: 0,
    life: 2.4,
  };
  state.events.push('wave');
}

/** Recompute the keeper's modifiers after an upgrade is taken. */
export function applyMods(state) {
  state.mods = computeMods(state.levels);
  state.keeper.maxHull = KEEPER.hull + state.mods.maxHullBonus;
  state.keeper.hull = Math.min(state.keeper.hull, state.keeper.maxHull);
}

/** Take one of the draft's upgrades and close or re-roll the draft. */
export function chooseUpgrade(state, id) {
  if ( !state.draft.includes(id) ) return;
  const before = state.keeper.maxHull;
  state.levels.set(id, levelOf(state.levels, id) + 1);
  applyMods(state);
  if ( state.keeper.maxHull > before ) {
    state.keeper.hull = Math.min(state.keeper.maxHull, state.keeper.hull + (state.keeper.maxHull - before));
  }
  state.pendingLevels = Math.max(0, state.pendingLevels - 1);
  state.events.push('draftPick');
  state.particles.ring(state.keeper.x, state.keeper.y, '#ffd98a', 110, 0.6);
  if ( state.pendingLevels > 0 ) {
    state.draft = rollDraft(state.random, state.levels, DIVE.draftChoices);
  } else {
    state.draft = [];
    state.phase = PHASE_PLAY;
  }
}

/** Open the draft when a level is waiting and the keeper still swims. */
function openDraftIfReady(state) {
  if ( state.pendingLevels > 0 && state.phase === PHASE_PLAY && state.keeper.alive ) {
    state.draft = rollDraft(state.random, state.levels, DIVE.draftChoices);
    state.phase = PHASE_DRAFT;
    state.events.push('draftOpen');
  }
}

/** Ambient life: bubbles and motes so the trench never sits still. */
function stepAmbience(state, step) {
  if ( state.random() < step * 2.2 ) {
    state.particles.bubble(40 + state.random() * 1200, 700);
  }
  if ( state.random() < step * 5 ) {
    const angle = state.random() * Math.PI * 2;
    const distance = 60 + state.random() * 200;
    state.particles.spawn('mote',
      state.keeper.x + Math.cos(angle) * distance,
      state.keeper.y + Math.sin(angle) * distance,
      { life: 1.6, size: 1.6, color: '#9fd8e8', vy: -6 });
  }
}

/**
 * Advance the dive one fixed step. Only the play phase simulates; the
 * other phases let their particles and text drift on without the world.
 */
export function stepWorld(state, input, step) {
  state.particles.update(step);
  state.floaters.update(step);
  if ( state.banner ) {
    state.banner.age += step;
    if ( state.banner.age >= state.banner.life ) state.banner = null;
  }
  if ( state.phase !== PHASE_PLAY ) return;

  if ( state.hitStop > 0 ) {
    state.hitStop -= step;
    return;
  }

  state.time += step;
  state.diveSeconds += step;
  stepAmbience(state, step);
  stepKeeper(state, input, step);
  keeperFire(state, input);
  state.director.update(state, step);
  stepEnemies(state, step);
  stepBolts(state, step);
  stepPickups(state, step);

  if ( state.comboTimer > 0 ) {
    state.comboTimer -= step;
    if ( state.comboTimer <= 0 ) state.combo = 0;
  }
  state.shake = Math.max(0, state.shake - step * 26);

  if ( !state.keeper.alive ) {
    state.phase = PHASE_OVER;
    state.best = saveBest(state.score, state.wave, state.kills);
    state.newBest = state.best.score === state.score && state.score > 0;
    state.events.push('gameOver');
    return;
  }

  if ( state.director.drained() && state.enemies.length === 0 ) {
    if ( state.wave >= DIVE.waves ) {
      state.phase = PHASE_WIN;
      state.score += 1000;
      state.best = saveBest(state.score, state.wave, state.kills);
      state.newBest = state.best.score === state.score;
      state.events.push('victory');
      return;
    }
    if ( state.resting <= 0 ) {
      state.score += SCORE.waveClear;
      state.events.push('waveClear');
      state.resting = DIVE.restSeconds;
    }
  }
  if ( state.resting > 0 ) {
    state.resting -= step;
    if ( state.resting <= 0 && state.director.drained() && state.enemies.length === 0 ) {
      startWave(state, state.wave + 1);
    }
  }

  openDraftIfReady(state);
}

/** The Maw on the field right now, or null — the HUD's boss bar reads it. */
export function bossOnField(state) {
  return state.enemies.find((enemy) => enemy.kind === 'maw') ?? null;
}

/** Take the step's events out of the state and hand them to the caller. */
export function drainEvents(state) {
  const events = state.events;
  state.events = [];
  return events;
}
