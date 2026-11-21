import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Records a non-sensitive client-side error for admins to review',
  inputSchema: z.object({ operation: z.string(), category: z.string(), correlationId: z.string(), message: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const scrub = (s: string, n: number) => s.replace(/(password|token|otp|secret|key)\S*/gi, '[redacted]').slice(0, n);
    await zite.errorLogs.create({ record: { operation: scrub(input.operation, 100), category: scrub(input.category, 50), correlationId: input.correlationId.slice(0, 40), message: scrub(input.message, 500) } });
    return { ok: true };
  },
});
