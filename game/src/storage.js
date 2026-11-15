// The keeper's record book: the best dive, kept in localStorage so it
// survives between visits. Every read and write is guarded — a browser
// that refuses storage simply plays without a record.

const BEST_KEY = 'emberdeep.best.v1';

/** The stored best: { score, wave, kills } or null when no dive is recorded. */
export function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if ( !raw ) return null;
    const parsed = JSON.parse(raw);
    if ( typeof parsed?.score !== 'number' ) return null;
    return { score: parsed.score, wave: parsed.wave ?? 0, kills: parsed.kills ?? 0 };
  } catch {
    return null;
  }
}

/** Record a finished dive if it beats the stored best; returns the best now held. */
export function saveBest(score, wave, kills) {
  const current = loadBest();
  if ( current && current.score >= score ) return current;
  const best = { score, wave, kills };
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* storage refused: the record lives only in this page */
  }
  return best;
}
