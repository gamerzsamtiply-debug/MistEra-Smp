// The full loading screen is only for a visitor's very first visit; after that the site opens straight away
// (site settings are cached in localStorage and refreshed in the background).
const KEY = 'mistera-visited';
let first: boolean | null = null;

/** True for the whole first browser session; decided once so the loader doesn't vanish mid-session. */
export function isFirstVisit(): boolean {
  if (first === null) { try { first = !localStorage.getItem(KEY); } catch { first = false; } }
  return first;
}
export function markVisited(): void {
  isFirstVisit();
  try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
}
