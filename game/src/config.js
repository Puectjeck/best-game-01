// EMBERDEEP tuning: every number the rest of the game reads lives here,
// so the feel of the dive can be rebalanced in one place.

/** The fixed simulation step: the world advances in 60ths of a second. */
export const STEP = 1 / 60;

/** The trench the keeper swims in, in world pixels. */
export const FIELD = { width: 1280, height: 720, wall: 26 };

/** The lantern keeper: hull, speed, dash and the light he carries. */
export const KEEPER = {
  radius: 13,
  hull: 100,
  speed: 258,
  dashSpeed: 880,
  dashSeconds: 0.16,
  dashCooldown: 1.6,
  invulnerableSeconds: 0.5,
  fireSeconds: 0.21,
  boltSpeed: 640,
  boltDamage: 12,
  boltRadius: 5,
  lightRadius: 215,
  pickupRadius: 54,
};

/** The dive: twelve waves, a Maw at the sixth and the twelfth. */
export const DIVE = {
  waves: 12,
  bossWaves: [6, 12],
  restSeconds: 3.2,
  draftChoices: 3,
};

/** Score values: what a kill, a wave and an ember are worth. */
export const SCORE = {
  drifter: 40,
  stinger: 70,
  spitter: 90,
  splitter: 80,
  mini: 25,
  brute: 220,
  maw: 2500,
  waveClear: 150,
  ember: 6,
};

/** The abyss palette: one hue family per creature, ember gold for the keeper. */
export const PALETTE = {
  deep: '#04121a',
  deepFloor: '#07222e',
  rock: '#0b3040',
  ember: '#ffb454',
  emberHot: '#ffe3ae',
  lantern: '#ffd98a',
  hull: '#7dffce',
  hurt: '#ff5d6e',
  drifter: '#53f5d2',
  stinger: '#ff5d8f',
  spitter: '#b07dff',
  splitter: '#8dff6a',
  mini: '#c2ffa1',
  brute: '#ff7a4d',
  maw: '#ff4d6d',
  shard: '#ffc46b',
  heart: '#ff7d9c',
  text: '#eaf7ff',
  dim: '#8fb8c9',
};
