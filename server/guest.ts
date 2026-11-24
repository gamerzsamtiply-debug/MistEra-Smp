import { fail } from './errors.js';

/** The anonymous per-browser id (src/lib/visitor.ts). It identifies a guest for likes, comments and push messages. */
export const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function guestKeyOrNull(v: unknown): string | null {
  return typeof v === 'string' && VISITOR_ID_RE.test(v) ? `g:${v}` : null;
}

export function requireGuestKey(v: unknown): string {
  const k = guestKeyOrNull(v);
  if (!k) throw fail('BAD_REQUEST', 'Your browser could not be recognised. Please reload the page and try again.');
  return k;
}

/** Guest display name: letters, digits, spaces and _ . - only, 2-24 characters. */
export function cleanGuestName(v: unknown): string {
  const s = (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 24 || !/^[\p{L}\p{N} _.-]+$/u.test(s)) {
    throw fail('BAD_REQUEST', 'Please choose a guest name of 2 to 24 characters (letters, numbers, spaces, _ . -).');
  }
  return s;
}
