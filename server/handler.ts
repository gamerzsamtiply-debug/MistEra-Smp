import { authenticate, type AuthUser } from './auth.js';
import { ApiError } from './errors.js';
import { endpoints } from './api/index.js';

export interface HandlerRequest {
  method: string;
  name: string;
  authorization?: string;
  body: unknown;
  /** Client IP as seen by the proxy (optional; defaults to "unknown"). */
  ip?: string;
}
export interface HandlerResponse {
  status: number;
  body: unknown;
}

const errorBody = (code: string, message: string) => ({ error: { code, message } });

/** Framework-independent request handler used by both Vercel (api/[name].ts) and the local dev server. */
export async function handle(req: HandlerRequest): Promise<HandlerResponse> {
  try {
    if (req.method !== 'POST') return { status: 405, body: errorBody('METHOD_NOT_ALLOWED', 'Use POST.') };
    if (!Object.prototype.hasOwnProperty.call(endpoints, req.name)) return { status: 404, body: errorBody('NOT_FOUND', 'Unknown API endpoint.') };
    const ep = endpoints[req.name];

    const parsed = ep.input.safeParse(req.body ?? {});
    if (!parsed.success) return { status: 400, body: errorBody('BAD_REQUEST', 'Some information is missing or invalid. Please review the form.') };

    let user: AuthUser | null = null;
    if (ep.authenticated) {
      user = await authenticate(req.authorization);
      if (!user) return { status: 401, body: errorBody('UNAUTHORIZED', 'Please log in to continue.') };
    }

    const result = await ep.run(parsed.data, user, { ip: req.ip || 'unknown' });
    return { status: 200, body: result ?? {} };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'INTERNAL') return { status: 500, body: errorBody('INTERNAL', 'Something went wrong on our side. Please try again.') };
      return { status: e.status, body: errorBody(e.code, e.message) };
    }
    console.error(`[api:${req.name}]`, e);
    return { status: 500, body: errorBody('INTERNAL', 'Something went wrong on our side. Please try again.') };
  }
}
