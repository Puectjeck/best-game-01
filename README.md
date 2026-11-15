# EMBERDEEP

**A lantern lit against the abyss.** An original arcade survival game in
plain JavaScript — no engine, no build step, no network. Open
`game/index.html` in a desktop browser and play.

You keep the last light in a drowned trench. The deep sends its creatures
in twelve waves — drifting jellies, lunging stingers, spitting anglers,
splitting amoebas and spiked brutes — and twice, at the sixth wave and the
twelfth, the Maw itself. Gather the ember shards of the fallen to level
up, choose one of three gifts at every level (twin bolts, piercing light,
orbit wisps, a storm lantern that arcs lightning, and ten more), and still
be burning at the end.

## Controls

- **WASD / arrows** — swim
- **Mouse** — aim the lantern
- **Hold click / Space** — fire light bolts
- **Shift** — dash (briefly untouchable)
- **1–3** — choose a gift in the draft
- **P** — pause · **M** — mute · **Enter** — begin / dive again

## The entry

This repository is a make.fun **best-game-01** entry. `main.ts` (Node 22,
standard library only) hands the game in: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
kit's vendored `buildDossier` library. `node serve.ts` serves `game/` at
http://localhost:8090 for local play. Screenshots in `shots.json` are
posed by the game's own `?shot=` scenes in `game/src/shots.js`.

## Layout

- `game/index.html` — the page
- `game/src/` — the game, one job per file: `world` (the simulation),
  `waves` (the director), `enemies` (the bestiary), `player` (the
  keeper), `bullets`, `pickups`, `upgrades`, `particles`, `floaters`,
  `audio` (synthesised WebAudio), `render`, `hud`, `screens`, `input`,
  `storage`, `random`, `config`, `shots`, `main`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

MIT licensed — see `LICENSE`.
