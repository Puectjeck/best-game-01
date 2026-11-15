// EMBERDEEP — entry program for make.fun's best-game-01.
//
// The game itself is the static site under game/ (plain files, no build
// step, no network): a browser opens game/index.html and plays. This
// program is only the courier. It copies game/ and screenshots/ from the
// repository into the output directory and writes dossier.json there with
// the kit's own buildDossier library, then prints a short manifest of
// what it handed in so a human can see the shape of the entry at a glance.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, mirrored so the courier refuses early anything the
// scorer would refuse anyway: at most 4 screenshots of 256 KiB, at most
// 993 entries and 48 MiB under game/, no path under game/ over 1,000
// bytes, and the dossier text capped at 160 KiB.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Count the files and bytes of a directory tree, for the manifest line. */
function measureTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for ( const entry of readdirSync(dir, { withFileTypes: true }) ) {
    const full = join(dir, entry.name);
    if ( entry.isDirectory() ) {
      const inner = measureTree(full);
      files += inner.files;
      bytes += inner.bytes;
    } else if ( entry.isFile() ) {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if ( existsSync(shotsDir) ) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));

const game = measureTree(join(outputDir, 'game'));
const shots = existsSync(join(outputDir, 'screenshots')) ? measureTree(join(outputDir, 'screenshots')) : { files: 0, bytes: 0 };
const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
console.log(`emberdeep: handed in game/ (${game.files} files, ${game.bytes} bytes), ` +
  `screenshots/ (${shots.files} files, ${shots.bytes} bytes), dossier.json (${dossierBytes} bytes)`);
