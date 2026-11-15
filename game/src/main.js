// EMBERDEEP's entry point: the canvas, the fixed-step loop, the screen
// state machine, and the wiring between the world's events and the
// sound board. Everything else lives in its own file; this one only
// conducts.

import { FIELD, STEP } from './config.js';
import { Input } from './input.js';
import { SoundBoard } from './audio.js';
import { loadBest } from './storage.js';
import {
  createWorld, resetDive, stepWorld, drainEvents, chooseUpgrade,
  PHASE_TITLE, PHASE_PLAY, PHASE_DRAFT, PHASE_PAUSE, PHASE_OVER, PHASE_WIN,
} from './world.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawTitle, drawDraft, drawPause, drawOver, drawWin, resetButtons, buttonAt } from './screens.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '') || (Date.now() % 2147483647);
const shotName = params.get('shot');

const input = new Input(canvas, { width: FIELD.width, height: FIELD.height });
const sound = new SoundBoard();
const state = createWorld(seed, loadBest());
state.pointer = { x: FIELD.width / 2, y: FIELD.height / 2 };
state.muted = false;

if ( shotName ) stageShot(shotName, state);

/** Begin a dive: fresh world, pad humming, lantern lit. */
function startDive() {
  sound.unlock();
  sound.startPad();
  resetDive(state);
  announce('The dive begins. Wave one of twelve.');
}

/** Mirror the world's events into the sound board. */
function playEvents(events) {
  for ( const event of events ) {
    if ( event === 'shoot' ) sound.shoot();
    else if ( event === 'hit' ) sound.hit();
    else if ( event === 'kill' ) sound.kill();
    else if ( event === 'hurt' ) sound.hurt();
    else if ( event === 'dash' ) sound.dash();
    else if ( event === 'pickup' ) sound.pickup();
    else if ( event === 'heart' ) sound.heart();
    else if ( event === 'levelup' ) sound.levelUp();
    else if ( event === 'draftPick' ) sound.draftPick();
    else if ( event === 'waveClear' ) sound.waveClear();
    else if ( event === 'mawArrives' ) sound.bossRoar();
    else if ( event === 'gameOver' ) { sound.gameOver(); sound.stopPad(); }
    else if ( event === 'victory' ) { sound.victory(); sound.stopPad(); }
  }
}

const statusLine = document.getElementById('status');
let lastAnnouncedPhase = state.phase;

/** Keep the screen-reader line abreast of the screen. */
function announce(text) {
  if ( statusLine ) statusLine.textContent = text;
}

/** Announce phase changes as they happen. */
function announcePhaseChanges() {
  if ( state.phase === lastAnnouncedPhase ) return;
  lastAnnouncedPhase = state.phase;
  if ( state.phase === PHASE_OVER ) announce(`The light goes out on wave ${state.wave}. Score ${state.score}.`);
  else if ( state.phase === PHASE_WIN ) announce(`Victory. The deep recedes. Score ${state.score}.`);
  else if ( state.phase === PHASE_DRAFT ) announce(`Level ${state.level}. The deep offers three gifts; choose one.`);
  else if ( state.phase === PHASE_PAUSE ) announce('Paused.');
}

/** Act on the button a click landed on, by screen. */
function handleClick(id) {
  if ( id === 'start' || id === 'again' ) startDive();
  else if ( id === 'resume' ) state.phase = PHASE_PLAY;
  else if ( id === 'restart' ) startDive();
  else if ( id && id.startsWith('draft:') ) chooseUpgrade(state, id.slice('draft:'.length));
}

/** One frame's worth of clicks and keys, read after the world steps. */
function handleControls() {
  state.pointer.x = input.pointer.x;
  state.pointer.y = input.pointer.y;

  if ( input.pointer.clicked ) {
    sound.unlock();
    handleClick(buttonAt(input.pointer.x, input.pointer.y));
  }
  if ( input.tapped('Enter') ) {
    if ( state.phase === PHASE_TITLE || state.phase === PHASE_OVER || state.phase === PHASE_WIN ) startDive();
  }
  if ( input.tapped('KeyP', 'Escape') ) {
    if ( state.phase === PHASE_PLAY ) state.phase = PHASE_PAUSE;
    else if ( state.phase === PHASE_PAUSE ) state.phase = PHASE_PLAY;
  }
  if ( input.tapped('KeyM') ) {
    sound.unlock();
    state.muted = sound.toggleMute();
  }
  if ( state.phase === PHASE_DRAFT ) {
    const picks = ['Digit1', 'Digit2', 'Digit3'];
    picks.forEach((code, index) => {
      if ( input.tapped(code) && state.draft[index] ) chooseUpgrade(state, state.draft[index]);
    });
  }
  input.endStep();
}

/** Draw the current frame: world, then HUD, then the screen of the phase. */
function draw(renderTime) {
  ctx.save();
  if ( state.shake > 0.2 ) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawWorld(ctx, state, renderTime);
  ctx.restore();

  resetButtons();
  if ( state.phase === PHASE_PLAY || state.phase === PHASE_DRAFT || state.phase === PHASE_PAUSE ) {
    drawHud(ctx, state);
  }
  if ( state.phase === PHASE_TITLE ) drawTitle(ctx, state, renderTime);
  else if ( state.phase === PHASE_DRAFT ) drawDraft(ctx, state);
  else if ( state.phase === PHASE_PAUSE ) drawPause(ctx, state);
  else if ( state.phase === PHASE_OVER ) drawOver(ctx, state);
  else if ( state.phase === PHASE_WIN ) drawWin(ctx, state);
}

let previousStamp = performance.now();
let accumulator = 0;

/** The loop: fixed steps for the world, one draw per animation frame. */
function frame(stamp) {
  const elapsed = Math.min(0.1, (stamp - previousStamp) / 1000);
  previousStamp = stamp;
  const renderTime = stamp / 1000;

  if ( shotName ) {
    // A posed scene: render it breathing, never simulate it away.
    state.particles.update(STEP);
    draw(renderTime);
    requestAnimationFrame(frame);
    return;
  }

  accumulator += elapsed;
  let steps = 0;
  while ( accumulator >= STEP && steps < 5 ) {
    stepWorld(state, input, STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if ( steps === 5 ) accumulator = 0;
  playEvents(drainEvents(state));
  handleControls();
  announcePhaseChanges();
  draw(renderTime);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
