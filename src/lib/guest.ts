// The name a guest (someone without an account) comments under. Random until they choose one; kept in this browser only.
const KEY = 'mistera-guest-name';

export const randomGuestName = (): string => `Guest${Math.floor(1000 + Math.random() * 9000)}`;
export const validGuestName = (v: string): boolean => { const s = v.trim(); return s.length >= 2 && s.length <= 24 && /^[\p{L}\p{N} _.-]+$/u.test(s); };

/** The saved guest name, or '' when the guest has not chosen one yet. */
export function getGuestName(): string {
  try { const v = localStorage.getItem(KEY) ?? ''; return validGuestName(v) ? v.trim() : ''; } catch { return ''; }
}
export function setGuestName(name: string): void {
  try { localStorage.setItem(KEY, name.trim()); } catch { /* storage unavailable */ }
}
