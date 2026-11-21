export type Strength = { level: 0 | 1 | 2 | 3; label: 'Weak' | 'Medium' | 'Strong' | 'Extreme'; score: number; hints: string[] };

const COMMON = ['password', 'passw0rd', '12345678', '123456789', 'qwertyui', 'qwerty', 'iloveyou', 'admin123', 'letmein', 'welcome', 'minecraft', 'mistera', 'abc12345', '11111111', '00000000'];

/** Rates a password from what is actually typed: length, variety, repeats, sequences and common words. */
export function rateStrength(pw: string): Strength {
  const hints: string[] = [];
  if (!pw) return { level: 0, label: 'Weak', score: 0, hints: [] };
  let score = 0;
  const len = pw.length;
  score += Math.min(len, 20) * 4; // up to 80
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  score += classes * 10; // up to 40
  if (len >= 12) score += 10;
  if (len >= 16) score += 10;
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) { score -= 40; hints.push('Avoid common words like "password".'); }
  if (/(.)\1{2,}/.test(pw)) { score -= 15; hints.push('Avoid repeating the same character.'); }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(pw)) { score -= 15; hints.push('Avoid simple sequences like 1234 or abcd.'); }
  if (new Set(pw).size <= Math.max(3, len / 4)) score -= 15;
  if (len < 8) hints.unshift('Use at least 8 characters.');
  if (classes < 3 && len >= 8) hints.push('Mix upper & lower case, numbers and symbols.');
  if (len < 12 && classes >= 3) hints.push('Longer is stronger - try 12+ characters.');
  score = Math.max(0, Math.min(100, score));
  const level = len < 8 || score < 40 ? 0 : score < 65 ? 1 : score < 90 ? 2 : 3;
  return { level: level as 0 | 1 | 2 | 3, label: (['Weak', 'Medium', 'Strong', 'Extreme'] as const)[level], score, hints: hints.slice(0, 2) };
}
