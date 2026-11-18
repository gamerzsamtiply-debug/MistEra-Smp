// In-memory stand-in for @supabase/supabase-js, used ONLY by tests/api.test.mjs.
// It mimics the subset of PostgREST behaviour the server code relies on:
// filters, ordering (incl. NULL ordering), ranges, the 1000-row response cap, unique and
// CHECK constraints, uuid parsing errors, upsert, count/head, plus auth.getUser and storage.
import { randomUUID } from 'node:crypto';

// Shared through globalThis: the test bundles this file into the handler AND imports it directly.
export const state = (globalThis.__fakeSupabaseState ??= { tables: {}, users: {}, tick: 0 });
export function reset() {
  (globalThis.__fakeRateState ??= { hits: {} }).hits = {};
  if (globalThis.__fakeRpcFail) globalThis.__fakeRpcFail.on = false;
  state.tables = {};
  state.users = {};
  state.tick = 0;
}
export function addUser(token, { id = randomUUID(), email, verified = true, meta = {}, providers = ['email'] }) {
  state.users[token] = { id, email, email_confirmed_at: verified ? '2026-01-01T00:00:00Z' : null, user_metadata: meta, app_metadata: { provider: providers[0], providers } };
  return id;
}
export const rows = (t) => (state.tables[t] ??= []);

const UNIQUE = { staff_members: ['profile_id', 'claim_hash'], profiles: ['user_id', 'username'], join_steps: ['slot'], content_pages: ['slug'], site_settings: ['key'] };
const TIME = { profiles: 'joined_at', album_submissions: 'submitted_at', suggestions: 'submitted_at', activity_logs: 'logged_at', error_logs: 'logged_at' };
const DEFAULTS = {
  site_settings: { server_address: '', server_port: null, platform: '', server_status: 'Online', discord_url: '', vote_url: '', ticket_url: '', hero_tagline: '', intro_text: '', maintenance_mode: false, maintenance_message: '', hero_image: '', gallery_image_one: '', gallery_image_two: '', banner_image: '' },
  join_steps: { title: '', instructions: '', image_url: '', enabled: false, sort_order: 0 },
  profiles: { bio: '', avatar_url: '', role: 'Member' },
  staff_members: { avatar_url: '', position: 'Staff', profile_id: null, claim_hash: null, claim_expires: null },
  partners: { category: 'Community', description: '', logo_url: '', website_url: '' },
  posts: { body: '', image_url: '', published: false, published_at: null },
  content_pages: { title: '', content: '', published: false },
  album_submissions: { caption: '', status: 'Pending' },
  suggestions: { description: '', status: 'Open' },
  activity_logs: { admin_email: '', resource: '', details: '' },
  error_logs: { operation: '', category: '', correlation_id: '', message: '' },
};
const CHECKS = {
  profiles: { role: ['Owner', 'Admin', 'Moderator', 'Staff', 'Member'] },
  posts: { kind: ['Announcement', 'Update'] },
  partners: { category: ['Discord', 'Hosting', 'Shop', 'Server', 'SMP', 'Community'] },
  album_submissions: { status: ['Pending', 'Approved', 'Declined'] },
  suggestions: { status: ['Open', 'Under Review', 'Accepted', 'Declined'] },
  site_settings: { server_status: ['Online', 'Offline', 'Restarting'] },
  join_steps: { slot: [1, 2, 3, 4, 5] },
  content_pages: { slug: ['information', 'terms'] },
};
const NOT_NULL = { posts: ['title', 'kind'], partners: ['name'], album_submissions: ['image_url'], suggestions: ['title'], profiles: ['user_id', 'username'], activity_logs: ['action'] };
const UUID_COLS = new Set(['id', 'user_id', 'uploader', 'author']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const now = () => new Date(Date.UTC(2026, 10, 17, 0, 0, 0) + ++state.tick * 1000).toISOString();
const err = (code, message) => ({ data: null, error: { code, message }, count: null });

function validate(table, row, existing) {
  for (const c of NOT_NULL[table] ?? []) if (row[c] === null || row[c] === undefined) return err('23502', `null value in column "${c}"`);
  for (const [c, allowed] of Object.entries(CHECKS[table] ?? {})) if (row[c] !== undefined && row[c] !== null && !allowed.includes(row[c])) return err('23514', `check constraint on ${c}`);
  if (table === 'site_settings' && row.server_port != null && (row.server_port < 1 || row.server_port > 65535)) return err('23514', 'check constraint on server_port');
  for (const c of UNIQUE[table] ?? []) if (rows(table).some((r) => r !== existing && r[c] === row[c])) return err('23505', `duplicate key value violates unique constraint on ${c}`);
  return null;
}

class Query {
  constructor(table) {
    Object.assign(this, { t: table, op: 'select', filters: [], orders: [], lim: null, rng: null, count: null, head: false, payload: null, returning: false, single_: null, conflict: null, bad: null });
  }
  select(_cols = '*', opts = {}) {
    if (this.op === 'select') Object.assign(this, { count: opts.count ?? null, head: !!opts.head });
    else this.returning = true;
    return this;
  }
  insert(p) { this.op = 'insert'; this.payload = p; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(p, o = {}) { this.op = 'upsert'; this.payload = p; this.conflict = o.onConflict; return this; }
  eq(c, v) { if (UUID_COLS.has(c) && typeof v === 'string' && !UUID_RE.test(v)) this.bad = err('22P02', `invalid input syntax for type uuid: "${v}"`); this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  not(c, op, v) { this.filters.push((r) => (op === 'is' ? (r[c] ?? null) !== v : true)); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  order(c, o = {}) { this.orders.push({ c, asc: o.ascending !== false, nullsFirst: o.nullsFirst }); return this; }
  limit(n) { this.lim = n; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  maybeSingle() { this.single_ = 'maybe'; return this; }
  single() { this.single_ = 'one'; return this; }
  then(res, rej) { return Promise.resolve(this.exec()).then(res, rej); }

  exec() {
    if (this.bad) return this.bad;
    if (this.op === 'insert' && state.failTables?.has(this.t)) return err('XX000', 'forced failure (test)');
    const all = rows(this.t);
    const matched = () => all.filter((r) => this.filters.every((f) => f(r)));
    const finish = (list) => {
      if (this.single_) {
        if (list.length === 0) return this.single_ === 'maybe' ? { data: null, error: null } : err('PGRST116', 'no rows');
        if (list.length > 1) return err('PGRST116', 'multiple rows');
        return { data: structuredClone(list[0]), error: null };
      }
      return { data: structuredClone(list), error: null };
    };
    if (this.op === 'select') {
      let list = matched();
      if (this.head) return { data: null, error: null, count: list.length };
      for (const o of [...this.orders].reverse()) {
        const nf = o.nullsFirst ?? !o.asc; // Postgres: NULLS LAST for ASC, NULLS FIRST for DESC
        list = [...list].sort((a, b) => {
          const x = a[o.c], y = b[o.c];
          if (x == null || y == null) return x == null && y == null ? 0 : (x == null) === nf ? -1 : 1;
          return (x < y ? -1 : x > y ? 1 : 0) * (o.asc ? 1 : -1);
        });
      }
      if (this.rng) list = list.slice(this.rng[0], this.rng[1] + 1);
      else if (this.lim != null) list = list.slice(0, this.lim);
      list = list.slice(0, 1000); // PostgREST max-rows
      return finish(list);
    }
    if (this.op === 'insert' || this.op === 'upsert') {
      const out = [];
      for (const p of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const base = { ...(DEFAULTS[this.t] ?? {}), ...p };
        const existing = this.op === 'upsert' ? all.find((r) => r[this.conflict] === base[this.conflict]) : undefined;
        if (existing) {
          const merged = { ...existing, ...p };
          const bad = validate(this.t, merged, existing);
          if (bad) return bad;
          Object.assign(existing, merged);
          if (this.t === 'content_pages' || this.t === 'join_steps' || this.t === 'site_settings') existing.updated_at = now();
          out.push(existing);
        } else {
          const row = { id: randomUUID(), created_at: now(), ...base };
          if (TIME[this.t]) row[TIME[this.t]] = now();
          if (['content_pages', 'join_steps', 'site_settings'].includes(this.t)) row.updated_at = now();
          const bad = validate(this.t, row);
          if (bad) return bad;
          all.push(row);
          out.push(row);
        }
      }
      return this.returning || this.single_ ? finish(out) : { data: null, error: null };
    }
    if (this.op === 'update') {
      const list = matched();
      for (const r of list) {
        const merged = { ...r, ...this.payload };
        const bad = validate(this.t, merged, r);
        if (bad) return bad;
        Object.assign(r, merged);
        if (['content_pages', 'join_steps', 'site_settings'].includes(this.t)) r.updated_at = now();
      }
      return this.returning ? finish(list) : { data: null, error: null };
    }
    if (this.op === 'delete') {
      const list = matched();
      state.tables[this.t] = all.filter((r) => !list.includes(r));
      return { data: null, error: null };
    }
    return err('XX000', 'unsupported');
  }
}

// Fixed-window counters keyed like the real check_rate_limit() SQL function (migration 0002).
const rateState = (globalThis.__fakeRateState ??= { hits: {} });
export function resetRates() { rateState.hits = {}; }
export const failRpc = (globalThis.__fakeRpcFail ??= { on: false });

export function createClient() {
  return {
    from: (t) => new Query(t),
    rpc: async (fn, args) => {
      if (fn !== 'check_rate_limit') return { data: null, error: { message: 'function not found', code: '42883' } };
      if (failRpc.on) return { data: null, error: { message: 'relation public.rate_limits does not exist', code: '42P01' } };
      const h = (rateState.hits[args.p_key] ??= { n: 0 });
      h.n += 1;
      return { data: h.n <= args.p_limit, error: null };
    },
    auth: {
      admin: {
        createUser: async ({ email, password }) => {
          if (Object.values(state.users).some((u) => u.email === email)) return { data: null, error: { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' } };
          if (password.length < 6) return { data: null, error: { message: 'Password should be at least 6 characters', status: 422, code: 'weak_password' } };
          state.users[`created-${email}`] = { id: randomUUID(), email, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {}, app_metadata: { provider: 'email', providers: ['email'] } };
          return { data: { user: state.users[`created-${email}`] }, error: null };
        },
      },
      getUser: async (token) => {
        const u = state.users[token];
        return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } };
      },
    },
    storage: {
      from: (bucket) => ({
        createSignedUploadUrl: async (path) => ({ data: { signedUrl: `https://fake/upload/${bucket}/${path}?token=t`, token: 't', path }, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  };
}
