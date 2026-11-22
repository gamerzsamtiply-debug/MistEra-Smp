import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { enforceRateLimit } from '../ratelimit.js';

// Anyone can send feedback (no account needed). Rate limited per IP.
export default publicEndpoint(
  z.object({ name: z.string().max(100).optional(), contact: z.string().max(200).optional(), message: z.string().max(5000) }),
  async ({ input, ip }) => {
    await enforceRateLimit('submitFeedback', ip, 5, 3600, 'You have sent a lot of feedback recently. Please try again later.');
    const message = input.message.trim();
    if (message.length < 5 || message.length > 2000) throw fail('BAD_REQUEST', 'Feedback must be between 5 and 2000 characters.');
    must(await db().from('feedback').insert({ name: (input.name ?? '').trim().slice(0, 40), contact: (input.contact ?? '').trim().slice(0, 100), message }), 'feedback.insert');
    return { ok: true };
  },
);
