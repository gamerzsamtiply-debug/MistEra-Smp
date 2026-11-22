import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './handler.js';

const MAX_BODY_BYTES = 1_000_000;

class BadBody extends Error {}

async function readBody(req: IncomingMessage): Promise<unknown> {
  // Vercel pre-parses JSON bodies onto req.body.
  const pre = (req as IncomingMessage & { body?: unknown }).body;
  if (pre !== undefined && pre !== null) {
    if (Buffer.isBuffer(pre)) return parse(pre.toString('utf8'));
    if (typeof pre === 'string') return parse(pre);
    return pre;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += b.length;
    if (size > MAX_BODY_BYTES) throw new BadBody('too large');
    chunks.push(b);
  }
  return parse(Buffer.concat(chunks).toString('utf8'));
}

function parse(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadBody('invalid json');
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

/** Vercel overwrites x-real-ip / x-forwarded-for with the real client address, so they can be trusted there. */
function clientIp(req: IncomingMessage): string {
  const fwd = header(req, 'x-forwarded-for')?.split(',')[0]?.trim();
  return (header(req, 'x-real-ip') ?? fwd ?? req.socket?.remoteAddress ?? 'unknown').slice(0, 64);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/** Node (req, res) adapter. Default export so it can be used directly as a Vercel function. */
export default async function nodeHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const m = /^\/api\/([A-Za-z0-9_]+)\/?$/.exec(pathname);
  if (!m) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Unknown API endpoint.' } });

  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { error: { code: 'BAD_REQUEST', message: 'Invalid request body.' } });
  }
  const auth = req.headers.authorization;
  const out = await handle({ method: req.method ?? 'GET', name: m[1], authorization: Array.isArray(auth) ? auth[0] : auth, body, ip: clientIp(req) });
  send(res, out.status, out.body);
}
