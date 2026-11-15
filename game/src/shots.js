// The screenshot scenes behind ?shot=title|battle|upgrade|victory.
// Each scene is built from the real game — a dive is started, sculpted
// to a telling moment, and stepped forward with a scripted input — so a
// screenshot is the game itself at that moment, and the same seed
// always stages the same scene.

import { STEP } from './config.js';
import { resetDive, startWave, applyMods, stepWorld, PHASE_DRAFT, PHASE_WIN } from './world.js';
import { spawnCreature, hurtCreature } from './enemies.js';

/** A stand-in input: a fixed pointer, a held trigger, no keys. */
function scriptedInput(pointer, firing = false) {
  return {
    pointer: { x: pointer.x, y: pointer.y, down: firing, clicked: false },
    axis: () => ({ x: 0, y: 0 }),
    tapped: () => false,
    down: () => false,
    firing: () => firing,
    endStep: () => {},
  };
}

/** Run the world forward a fixed number of steps under an input. */
function runSteps(state, input, seconds) {
  const steps = Math.round(seconds / STEP);
  for ( let i = 0; i < steps; i += 1 ) stepWorld(state, input, STEP);
}

/** The title scene: the keeper low in the frame, the deep astir. */
function stageTitle(state) {
  state.phase = 'title';
  state.keeper.x = 640;
  state.keeper.y = 618;
  spawnCreature(state, 'drifter', 240, 180);
  spawnCreature(state, 'drifter', 1060, 140);
  spawnCreature(state, 'spitter', 1120, 560);
  for ( let i = 0; i < 26; i += 1 ) state.particles.bubble(80 + state.random() * 1120, 120 + state.random() * 560);
  runSteps(state, scriptedInput({ x: 700, y: 560 }), 0.6);
  state.phase = 'title';
}

/** The battle scene: wave five, a brute ahead, a drifter just felled. */
function stageBattle(state) {
  resetDive(state);
  state.levels.set('twin', 2);
  state.levels.set('rapid', 1);
  state.levels.set('wisp', 1);
  applyMods(state);
  startWave(state, 5);
  state.director.queue = [];
  state.enemies = [];
  const keeper = state.keeper;
  keeper.x = 500;
  keeper.y = 400;
  keeper.hull = 68;
  state.score = 4310;
  state.kills = 57;
  state.level = 4;
  state.xp = 5;
  state.xpNext = 16;
  state.combo = 7;
  state.comboTimer = 2.4;
  state.diveSeconds = 196;

  const brute = spawnCreature(state, 'brute', 868, 312);
  spawnCreature(state, 'spitter', 1006, 498);
  spawnCreature(state, 'splitter', 285, 235);
  spawnCreature(state, 'stinger', 824, 528);
  spawnCreature(state, 'drifter', 250, 480);
  spawnCreature(state, 'drifter', 756, 474);
  spawnCreature(state, 'drifter', 990, 150);
  const doomed = spawnCreature(state, 'drifter', 690, 322);

  const input = scriptedInput({ x: brute.x, y: brute.y }, true);
  runSteps(state, input, 0.3);
  hurtCreature(state, doomed, 999, Math.atan2(doomed.y - keeper.y, doomed.x - keeper.x));
  runSteps(state, input, 0.3);
  state.banner.age = 1.1;
}

/** The draft scene: a level just earned, three gifts on the table. */
function stageDraft(state) {
  resetDive(state);
  state.levels.set('twin', 1);
  state.levels.set('rapid', 1);
  applyMods(state);
  startWave(state, 5);
  state.director.queue = [];
  state.enemies = [];
  state.keeper.x = 640;
  state.keeper.y = 440;
  state.score = 6850;
  state.kills = 74;
  state.level = 5;
  state.xp = 8;
  state.xpNext = 19;
  state.diveSeconds = 264;
  spawnCreature(state, 'drifter', 300, 290);
  spawnCreature(state, 'splitter', 985, 250);
  spawnCreature(state, 'stinger', 905, 545);
  state.pendingLevels = 1;
  state.draft = ['twin', 'wisp', 'chain'];
  state.banner = null;
  state.phase = PHASE_DRAFT;
}

/** The victory scene: the twelfth wave weathered, the record written. */
function stageVictory(state) {
  resetDive(state);
  state.keeper.x = 640;
  state.keeper.y = 400;
  state.score = 21380;
  state.kills = 231;
  state.level = 9;
  state.wave = 12;
  state.diveSeconds = 754;
  state.newBest = true;
  state.best = { score: 21380, wave: 12, kills: 231 };
  state.banner = null;
  state.particles.ring(state.keeper.x, state.keeper.y, '#ffd98a', 130, 1.2);
  state.particles.burst(state.keeper.x, state.keeper.y - 30, '#ffc46b', 30, 200);
  state.phase = PHASE_WIN;
}

/**
 * Stage the named scene on a fresh world and return it. Any other name
 * stages the title. Scenes run real simulation steps, so what the
 * camera catches is the game itself, posed.
 */
export function stageShot(name, state) {
  if ( name === 'battle' ) stageBattle(state);
  else if ( name === 'upgrade' ) stageDraft(state);
  else if ( name === 'victory' ) stageVictory(state);
  else stageTitle(state);
  return state;
}
