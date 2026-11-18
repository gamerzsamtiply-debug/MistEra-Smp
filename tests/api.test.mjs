// API logic tests. Runs the REAL server code (server/**) against an in-memory fake of Supabase
// (tests/fake-supabase.mjs). It verifies authorization, validation, role rules and response shapes.
// It does NOT talk to a real Supabase project — see README "Verification" for what that means.
//
//   npm run test:api
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'mistera-test-')), 'handler.mjs');
await build({
  entryPoints: [path.join(root, 'server/handler.ts')],
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
  alias: { '@supabase/supabase-js': path.join(root, 'tests/fake-supabase.mjs') },
  absWorkingDir: root,
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
process.env.OWNER_EMAIL = 'gamerzsamtiply@gmail.com';

const fake = await import(pathToFileURL(path.join(root, 'tests/fake-supabase.mjs')).href);
const { handle } = await import(pathToFileURL(out).href);

const call = async (name, input = {}, token) => handle({ method: 'POST', name, authorization: token ? `Bearer ${token}` : undefined, body: input });
const ok = async (name, input, token) => { const r = await call(name, input, token); assert.equal(r.status, 200, `${name} -> ${r.status} ${JSON.stringify(r.body)}`); return r.body; };
const denied = async (name, input, token, status, code) => { const r = await call(name, input, token); assert.equal(r.status, status, `${name} expected ${status}, got ${r.status} ${JSON.stringify(r.body)}`); if (code) assert.equal(r.body.error.code, code); return r.body; };

let passed = 0, failed = 0;
async function test(title, fn) {
  fake.reset();
  try { await fn(); passed++; console.log('  ✓', title); } catch (e) { failed++; console.log('  ✗', title, '\n     ', e.message.split('\n')[0]); }
}
const OWNER = 'gamerzsamtiply@gmail.com';
const users = () => {
  fake.addUser('t-owner', { email: OWNER, meta: { full_name: 'Sam Tiply' } });
  fake.addUser('t-fake-owner', { email: OWNER.toUpperCase(), verified: false });
  fake.addUser('t-admin', { email: 'admin@example.com', meta: { first_name: 'Ada' } });
  fake.addUser('t-mod', { email: 'mod@example.com' });
  fake.addUser('t-m1', { email: 'steve@example.com' });
  fake.addUser('t-m2', { email: 'steve@other.org' });
};
// Makes t-admin an Admin and t-mod a Moderator, as the Owner would.
async function seedStaff() {
  users();
  await ok('getMe', {}, 't-owner'); await ok('getMe', {}, 't-admin'); await ok('getMe', {}, 't-mod');
  const list = (await ok('adminListUsers', {}, 't-owner')).users;
  const id = (n) => list.find((u) => u.username === n).id;
  await ok('adminSetRole', { profileId: id('Ada'), role: 'Admin' }, 't-owner');
  await ok('adminSetRole', { profileId: id('mod'), role: 'Moderator' }, 't-owner');
}

console.log('\nRouting & protocol');
await test('rejects non-POST, unknown endpoints and prototype names', async () => {
  assert.equal((await handle({ method: 'GET', name: 'getSite', body: {} })).status, 405);
  assert.equal((await call('nope')).status, 404);
  assert.equal((await call('__proto__')).status, 404);
  assert.equal((await call('constructor')).status, 404);
});
await test('rejects invalid input with 400 (no stack/SQL leaked)', async () => {
  users();
  const r = await denied('listPosts', { kind: 'Hack' }, undefined, 400, 'BAD_REQUEST');
  assert.ok(!/zod|stack|invalid_enum/i.test(JSON.stringify(r)));
});

console.log('\nAuthentication');
await test('every authenticated endpoint returns 401 without a token or with a bad token', async () => {
  users();
  const names = ['getMe', 'myAlbum', 'mySuggestions', 'deleteMyAlbum', 'deleteMySuggestion', 'submitAlbum', 'submitSuggestion', 'updateMyProfile', 'createUploadUrl',
    'adminGetSettings', 'adminSaveSettings', 'adminListAlbum', 'adminListPages', 'adminListPosts', 'adminListSteps', 'adminListSuggestions', 'adminListUsers', 'adminLogs', 'adminOverview',
    'adminReviewAlbum', 'adminSavePage', 'adminSavePartner', 'adminSavePost', 'adminSaveStep', 'adminSetRole', 'adminUpdateSuggestion', 'adminDeletePartner', 'adminDeletePost'];
  const valid = {
    deleteMyAlbum: { id: 'x' }, deleteMySuggestion: { id: 'x' }, submitAlbum: { imageUrl: 'https://a.b/c.png', caption: '' }, submitSuggestion: { title: 'abcd', description: 'abcdefghij' },
    updateMyProfile: { username: 'abc', bio: '', avatarUrl: '' }, createUploadUrl: { contentType: 'image/png', size: 10 }, adminListAlbum: { status: 'Pending' }, adminListPosts: { kind: 'Update' },
    adminLogs: { type: 'activity' }, adminReviewAlbum: { id: 'x', action: 'Delete' }, adminSavePage: { slug: 'terms', title: 't', content: 'c', published: false },
    adminSavePartner: { name: 'abc', category: 'Shop', description: '', logoUrl: '', websiteUrl: '' }, adminSavePost: { kind: 'Update', title: 'abc', body: 'b', imageUrl: '', published: false, publishedAt: '' },
    adminSaveStep: { slot: 1, title: 't', instructions: 'i', imageUrl: '', enabled: true, sortOrder: 1 }, adminSetRole: { profileId: 'x', role: 'Staff' }, adminUpdateSuggestion: { id: 'x', action: 'Open' },
    adminDeletePartner: { id: 'x' }, adminDeletePost: { id: 'x' },
    adminSaveSettings: { serverAddress: 'a.b', serverPort: 1, platform: '', serverStatus: 'Online', discordUrl: '', voteUrl: '', ticketUrl: '', heroTagline: '', introText: '', maintenanceMode: false, maintenanceMessage: '' },
  };
  for (const n of names) {
    await denied(n, valid[n] ?? {}, undefined, 401, 'UNAUTHORIZED');
    await denied(n, valid[n] ?? {}, 'forged-token', 401, 'UNAUTHORIZED');
  }
});

console.log('\nProfiles & roles');
await test('first login creates a Member profile; usernames are unique and valid', async () => {
  users();
  const a = await ok('getMe', {}, 't-m1'); const b = await ok('getMe', {}, 't-m2');
  assert.equal(a.profile.role, 'Member'); assert.equal(a.isAdmin, false);
  assert.notEqual(a.profile.username, b.profile.username);
  assert.match(a.profile.username, /^[a-zA-Z0-9_]{3,20}$/); assert.match(b.profile.username, /^[a-zA-Z0-9_]{3,20}$/);
});
await test('only the VERIFIED owner email becomes Owner; unverified look-alike stays Member', async () => {
  users();
  const o = await ok('getMe', {}, 't-owner'); assert.equal(o.profile.role, 'Owner'); assert.equal(o.isOwner, true); assert.equal(o.isAdmin, true);
  const f = await ok('getMe', {}, 't-fake-owner'); assert.equal(f.profile.role, 'Member'); assert.equal(f.isAdmin, false);
  await denied('adminGetSettings', {}, 't-fake-owner', 403, 'FORBIDDEN');
});
await test('a stale Owner role on a non-owner is demoted automatically', async () => {
  users();
  await ok('getMe', {}, 't-m1');
  fake.rows('profiles').find((p) => p.username === 'steve').role = 'Owner';
  assert.equal((await ok('getMe', {}, 't-m1')).profile.role, 'Member');
});
await test('role rules: only Owner grants/removes Admin; Owner & self are locked', async () => {
  await seedStaff();
  const list = (await ok('adminListUsers', {}, 't-owner')).users; const id = (n) => list.find((u) => u.username === n).id;
  await ok('getMe', {}, 't-m1'); const m1 = (await ok('adminListUsers', {}, 't-owner')).users.find((u) => u.username === 'steve').id;
  await denied('adminSetRole', { profileId: m1, role: 'Admin' }, 't-admin', 403);       // admin can't grant Admin
  await ok('adminSetRole', { profileId: m1, role: 'Staff' }, 't-admin');                // admin can grant Staff
  await denied('adminSetRole', { profileId: id('Ada'), role: 'Member' }, 't-admin', 403); // self
  await denied('adminSetRole', { profileId: id('Sam'), role: 'Member' }, 't-admin', 403); // owner
  await denied('adminSetRole', { profileId: id('Ada'), role: 'Member' }, 't-mod', 403);  // moderator is not admin
  await denied('adminSetRole', { profileId: 'not-a-uuid', role: 'Staff' }, 't-owner', 404, 'NOT_FOUND');
  await denied('adminSetRole', { profileId: id('Sam'), role: 'Staff' }, 't-owner', 403);
});
await test('members and moderators cannot call ANY admin endpoint', async () => {
  await seedStaff(); await ok('getMe', {}, 't-m1');
  const adminNames = ['adminGetSettings', 'adminListAlbum', 'adminListPages', 'adminListPosts', 'adminListSteps', 'adminListSuggestions', 'adminListUsers', 'adminLogs', 'adminOverview'];
  const inputs = { adminListAlbum: { status: 'Pending' }, adminListPosts: { kind: 'Update' }, adminLogs: { type: 'error' } };
  for (const tok of ['t-m1', 't-mod']) for (const n of adminNames) await denied(n, inputs[n] ?? {}, tok, 403, 'FORBIDDEN');
  for (const tok of ['t-m1', 't-mod']) {
    await denied('adminSavePost', { kind: 'Update', title: 'abc', body: 'b', imageUrl: '', published: true, publishedAt: '' }, tok, 403);
    await denied('adminSaveSettings', { serverAddress: 'evil.com', serverPort: 1, platform: '', serverStatus: 'Offline', discordUrl: '', voteUrl: '', ticketUrl: '', heroTagline: '', introText: '', maintenanceMode: true, maintenanceMessage: '' }, tok, 403);
    await denied('adminSavePartner', { name: 'evil', category: 'Shop', description: '', logoUrl: '', websiteUrl: '' }, tok, 403);
    await denied('adminReviewAlbum', { id: '1', action: 'Approved' }, tok, 403);
    await denied('adminSaveStep', { slot: 1, title: 't', instructions: 'i', imageUrl: '', enabled: true, sortOrder: 1 }, tok, 403);
    await denied('adminSavePage', { slug: 'terms', title: 't', content: 'c', published: true }, tok, 403);
  }
  assert.equal(fake.rows('posts').length, 0); assert.equal(fake.rows('partners').length, 0);
});

console.log('\nServer settings, maintenance, join steps');
await test('settings: defaults, validation, save, public read, change log', async () => {
  users(); await ok('getMe', {}, 't-owner');
  const site0 = await ok('getSite'); assert.equal(site0.settings.serverStatus, 'Online'); assert.equal(site0.settings.maintenanceMode, false); assert.equal(site0.settings.serverPort, null);
  const adm0 = await ok('adminGetSettings', {}, 't-owner'); assert.equal(adm0.serverPort, 19132);
  const base = { ...adm0, serverAddress: 'play.mistera.net', serverPort: 19133, serverStatus: 'Restarting', discordUrl: 'https://discord.gg/abc', heroTagline: 'Hello', maintenanceMode: true, maintenanceMessage: 'Back soon' };
  await denied('adminSaveSettings', { ...base, serverPort: 70000 }, 't-owner', 400);
  await denied('adminSaveSettings', { ...base, serverPort: 1.5 }, 't-owner', 400);
  await denied('adminSaveSettings', { ...base, serverAddress: 'has space' }, 't-owner', 400);
  await denied('adminSaveSettings', { ...base, discordUrl: 'javascript:alert(1)' }, 't-owner', 400);
  const res = await ok('adminSaveSettings', base, 't-owner'); assert.ok(res.changed >= 6);
  const s = (await ok('getSite')).settings;
  assert.deepEqual([s.serverAddress, s.serverPort, s.serverStatus, s.maintenanceMode, s.maintenanceMessage, s.discordUrl], ['play.mistera.net', 19133, 'Restarting', true, 'Back soon', 'https://discord.gg/abc']);
  const logs = (await ok('adminLogs', { type: 'activity' }, 't-owner')).logs;
  assert.ok(logs.some((l) => l.a === 'Changed Server IP' && l.b === 'Server Settings' && l.who === OWNER));
  const again = await ok('adminSaveSettings', base, 't-owner'); assert.equal(again.changed, 0);
  assert.equal(fake.rows('site_settings').length, 1);
});
await test('join steps: 5 slots, step 1 forced on, validation, ordering, public filtering', async () => {
  users(); await ok('getMe', {}, 't-owner');
  const l0 = (await ok('adminListSteps', {}, 't-owner')).steps; assert.equal(l0.length, 5); assert.equal(l0[0].enabled, true);
  const step = (slot, o = {}) => ({ slot, title: `Step ${slot}`, instructions: `Do ${slot}`, imageUrl: '', enabled: true, sortOrder: slot, ...o });
  await denied('adminSaveStep', step(6), 't-owner', 400);
  await denied('adminSaveStep', step(2, { title: ' ' }), 't-owner', 400);
  await ok('adminSaveStep', step(1, { enabled: false }), 't-owner');           // forced on
  await ok('adminSaveStep', step(3, { sortOrder: 2 }), 't-owner');
  await ok('adminSaveStep', step(2, { sortOrder: 3 }), 't-owner');
  await ok('adminSaveStep', step(4, { enabled: false, title: '', instructions: '' }), 't-owner');
  await ok('adminSaveStep', step(2, { instructions: 'Edited' }), 't-owner');   // upsert, not duplicate
  assert.equal(fake.rows('join_steps').length, 4);
  const pub = (await ok('getSite')).steps; assert.deepEqual(pub.map((s) => s.title), ['Step 1', 'Step 3', 'Step 2']);
  assert.equal(pub[2].instructions, 'Edited');
});

console.log('\nAnnouncements & updates');
await test('posts: draft vs published, edit, delete, ordering, bad ids', async () => {
  users(); await ok('getMe', {}, 't-owner');
  const post = (o) => ({ kind: 'Announcement', title: 'Hello world', body: 'Body', imageUrl: '', published: true, publishedAt: '2026-05-01T00:00:00Z', ...o });
  await denied('adminSavePost', post({ title: 'ab' }), 't-owner', 400);
  await denied('adminSavePost', post({ body: ' ' }), 't-owner', 400);
  await denied('adminSavePost', post({ publishedAt: 'garbage' }), 't-owner', 400);
  await ok('adminSavePost', post({ title: 'Old news', publishedAt: '2026-01-01T00:00:00Z' }), 't-owner');
  await ok('adminSavePost', post({ title: 'New news' }), 't-owner');
  await ok('adminSavePost', post({ title: 'Secret draft', published: false }), 't-owner');
  await ok('adminSavePost', post({ kind: 'Update', title: 'Patch 1.2' }), 't-owner');
  assert.deepEqual((await ok('listPosts', { kind: 'Announcement' })).posts.map((p) => p.title), ['New news', 'Old news']);
  assert.equal((await ok('listPosts', { kind: 'Update' })).posts.length, 1);
  const adm = (await ok('adminListPosts', { kind: 'Announcement' }, 't-owner')).posts; assert.equal(adm.length, 3);
  const draft = adm.find((p) => p.title === 'Secret draft'); assert.equal(draft.published, false);
  await ok('adminSavePost', { ...post({ title: 'Secret draft', published: true }), id: draft.id }, 't-owner');
  assert.equal((await ok('listPosts', { kind: 'Announcement' })).posts.length, 3);
  const home = await ok('getHome'); assert.equal(home.announcements.length, 3); assert.equal(home.updates.length, 1);
  await ok('adminDeletePost', { id: draft.id }, 't-owner');
  await denied('adminDeletePost', { id: draft.id }, 't-owner', 404);
  await denied('adminDeletePost', { id: 'nope' }, 't-owner', 404);
  await denied('adminSavePost', { ...post(), id: '00000000-0000-4000-8000-000000000000' }, 't-owner', 404);
  assert.equal((await ok('adminLogs', { type: 'activity' }, 't-owner')).logs.filter((l) => /announcement/i.test(l.a)).length >= 4, true);
});

console.log('\nPartners & content pages');
await test('partners: add, edit, list sorted, validation, delete', async () => {
  users(); await ok('getMe', {}, 't-owner');
  const p = (o) => ({ name: 'Zeta Hosting', category: 'Hosting', description: 'd', logoUrl: '', websiteUrl: 'https://z.example', ...o });
  await denied('adminSavePartner', p({ name: 'x' }), 't-owner', 400);
  await denied('adminSavePartner', p({ websiteUrl: 'ftp://x' }), 't-owner', 400);
  await denied('adminSavePartner', p({ category: 'Nope' }), 't-owner', 400);
  await ok('adminSavePartner', p(), 't-owner'); await ok('adminSavePartner', p({ name: 'Alpha Shop', category: 'Shop' }), 't-owner');
  assert.deepEqual((await ok('listPartners')).partners.map((x) => x.name), ['Alpha Shop', 'Zeta Hosting']);
  const id = (await ok('listPartners')).partners[0].id;
  await ok('adminSavePartner', { ...p({ name: 'Alpha Store', category: 'Shop' }), id }, 't-owner');
  assert.equal((await ok('listPartners')).partners[0].name, 'Alpha Store');
  assert.equal((await ok('getHome')).partners.length, 2);
  await ok('adminDeletePartner', { id }, 't-owner'); await denied('adminDeletePartner', { id }, 't-owner', 404);
});
await test('content pages: unpublished is 404, publish, empty-publish rejected, list defaults', async () => {
  users(); await ok('getMe', {}, 't-owner');
  await denied('getPage', { slug: 'terms' }, undefined, 404);
  const l = (await ok('adminListPages', {}, 't-owner')).pages; assert.deepEqual(l.map((p) => p.title), ['Server Information', 'Terms of Service']);
  await denied('adminSavePage', { slug: 'terms', title: 'T', content: ' ', published: true }, 't-owner', 400);
  await ok('adminSavePage', { slug: 'terms', title: 'Terms', content: '# Rules', published: false }, 't-owner');
  await denied('getPage', { slug: 'terms' }, undefined, 404);
  await ok('adminSavePage', { slug: 'terms', title: 'Terms', content: '# Rules', published: true }, 't-owner');
  const pg = await ok('getPage', { slug: 'terms' }); assert.equal(pg.content, '# Rules'); assert.ok(pg.updatedAt);
  assert.equal(fake.rows('content_pages').length, 1);
});

console.log('\nAlbum (submit → moderate → public)');
await test('album: submit, limits, moderation, public visibility, ownership', async () => {
  await seedStaff(); await ok('getMe', {}, 't-m1'); await ok('getMe', {}, 't-m2');
  await denied('submitAlbum', { imageUrl: '', caption: '' }, 't-m1', 400);
  await denied('submitAlbum', { imageUrl: 'data:image/png;base64,AAA', caption: '' }, 't-m1', 400);
  await denied('submitAlbum', { imageUrl: 'https://fake.supabase.co/storage/v1/object/public/uploads/u/a.png', caption: 'x'.repeat(121) }, 't-m1', 400);
  for (let i = 0; i < 10; i++) await ok('submitAlbum', { imageUrl: `https://fake.supabase.co/storage/v1/object/public/uploads/u/${i}.png`, caption: `c${i}` }, 't-m1');
  await denied('submitAlbum', { imageUrl: 'https://fake.supabase.co/storage/v1/object/public/uploads/u/11.png', caption: '' }, 't-m1', 429, 'RATE_LIMITED');
  assert.equal((await ok('listAlbum')).images.length, 0);                              // pending is not public
  await denied('adminListAlbum', { status: 'Pending' }, 't-mod', 403);              // moderators are NOT admins
  await ok('adminListAlbum', { status: 'Pending' }, 't-admin');
  const items = (await ok('adminListAlbum', { status: 'Pending' }, 't-admin')).items; assert.equal(items.length, 10); assert.equal(items[0].uploader.username, 'steve');
  await ok('adminReviewAlbum', { id: items[0].id, action: 'Approved' }, 't-admin');
  await ok('adminReviewAlbum', { id: items[1].id, action: 'Declined' }, 't-admin');
  const pub = (await ok('listAlbum')).images; assert.equal(pub.length, 1); assert.equal(pub[0].uploader.username, 'steve');
  assert.equal((await ok('getHome')).album.length, 1);
  const prof = await ok('getPublicProfile', { profileId: pub[0].uploader.id }); assert.equal(prof.images.length, 1);
  const mine = (await ok('myAlbum', {}, 't-m1')).items; assert.equal(mine.length, 10); assert.equal(mine.filter((i) => i.status === 'Declined').length, 1);
  await denied('deleteMyAlbum', { id: mine[0].id }, 't-m2', 403, 'FORBIDDEN');         // someone else's
  await denied('deleteMyAlbum', { id: 'zzz' }, 't-m1', 403);
  await ok('deleteMyAlbum', { id: mine[0].id }, 't-m1');
  await ok('adminReviewAlbum', { id: items[2].id, action: 'Delete' }, 't-admin');
  await denied('adminReviewAlbum', { id: items[2].id, action: 'Approved' }, 't-admin', 404);
  assert.ok((await ok('adminLogs', { type: 'activity' }, 't-admin')).logs.some((l) => l.a === 'Approved album image'));
});
await test('album images survive when an uploader account disappears ("Former member")', async () => {
  users(); await ok('getMe', {}, 't-m1');
  await ok('submitAlbum', { imageUrl: 'https://fake.supabase.co/storage/v1/object/public/uploads/u/a.png', caption: 'hi' }, 't-m1');
  fake.rows('album_submissions')[0].status = 'Approved'; fake.rows('album_submissions')[0].uploader = null;
  assert.equal((await ok('listAlbum')).images[0].uploader, null);
});

console.log('\nSuggestions');
await test('suggestions: validation, limits, status workflow, ownership', async () => {
  await seedStaff(); await ok('getMe', {}, 't-m1'); await ok('getMe', {}, 't-m2');
  await denied('submitSuggestion', { title: 'abc', description: 'long enough text' }, 't-m1', 400);
  await denied('submitSuggestion', { title: 'Good title', description: 'short' }, 't-m1', 400);
  for (let i = 0; i < 20; i++) await ok('submitSuggestion', { title: `Idea ${i}`, description: 'A reasonably long description.' }, 't-m1');
  await denied('submitSuggestion', { title: 'One more', description: 'A reasonably long description.' }, 't-m1', 429);
  const all = (await ok('adminListSuggestions', {}, 't-admin')).items; assert.equal(all.length, 20); assert.equal(all[0].author.username, 'steve');
  await ok('adminUpdateSuggestion', { id: all[0].id, action: 'Accepted' }, 't-admin');
  await ok('adminUpdateSuggestion', { id: all[1].id, action: 'Under Review' }, 't-owner');
  await ok('submitSuggestion', { title: 'Allowed again?', description: 'Open count is below the limit.' }, 't-m1'); // 18 open < 20
  const mine = (await ok('mySuggestions', {}, 't-m1')).items; assert.ok(mine.some((s) => s.status === 'Accepted') && mine.some((s) => s.status === 'Under Review'));
  await denied('deleteMySuggestion', { id: mine[0].id }, 't-m2', 403);
  await ok('deleteMySuggestion', { id: mine[0].id }, 't-m1');
  await ok('adminUpdateSuggestion', { id: all[5].id, action: 'Delete' }, 't-admin');
  await denied('adminUpdateSuggestion', { id: all[5].id, action: 'Open' }, 't-admin', 404);
  const ov = (await ok('adminOverview', {}, 't-admin')).counts; assert.equal(ov.suggestions, 19); // 20 + 1 new - 2 deleted
});

console.log('\nProfile editing');
await test('profile: validation, uniqueness, public profile, bad ids', async () => {
  users(); await ok('getMe', {}, 't-m1'); const m2 = await ok('getMe', {}, 't-m2');
  const upd = (o) => ({ username: 'Steve_99', bio: 'I mine.', avatarUrl: '', ...o });
  await denied('updateMyProfile', upd({ username: 'a' }), 't-m1', 400);
  await denied('updateMyProfile', upd({ username: 'bad name!' }), 't-m1', 400);
  await denied('updateMyProfile', upd({ bio: 'x'.repeat(301) }), 't-m1', 400);
  await denied('updateMyProfile', upd({ avatarUrl: 'not a url' }), 't-m1', 400);
  await ok('updateMyProfile', upd(), 't-m1'); await ok('updateMyProfile', upd(), 't-m1');   // re-saving own name is fine
  await denied('updateMyProfile', upd(), 't-m2', 409, 'CONFLICT');
  const pub = await ok('getPublicProfile', { profileId: m2.profile.id }); assert.equal(pub.profile.username, m2.profile.username);
  await denied('getPublicProfile', { profileId: 'garbage' }, undefined, 404);
  await denied('getPublicProfile', { profileId: '00000000-0000-4000-8000-000000000000' }, undefined, 404);
});

console.log('\nStaff directory, overview, logs, uploads');
await test('staff lists only staff roles, grouped data present on home & staff page', async () => {
  await seedStaff(); await ok('getMe', {}, 't-m1');
  const staff = (await ok('listStaff')).staff; assert.deepEqual(staff.map((s) => s.role).sort(), ['Admin', 'Moderator', 'Owner']);
  assert.deepEqual((await ok('getHome')).staff.map((s) => s.role), ['Owner', 'Admin', 'Moderator']);
  assert.ok(!JSON.stringify(staff).includes('@example.com'));                            // no emails leak
});
await test('overview counts and error log flow (client errors are scrubbed)', async () => {
  await seedStaff(); await ok('getMe', {}, 't-m1');
  await ok('submitAlbum', { imageUrl: 'https://fake.supabase.co/storage/v1/object/public/uploads/u/a.png', caption: '' }, 't-m1');
  await ok('submitSuggestion', { title: 'Idea one', description: 'A reasonably long description.' }, 't-m1');
  const ov = await ok('adminOverview', {}, 't-owner');
  assert.deepEqual(ov.counts, { users: 4, staff: 3, partners: 0, pending: 1, suggestions: 1, openSuggestions: 1 });
  assert.ok(ov.recent.length > 0 && ov.recent.length <= 10);
  await ok('logClientError', { operation: 'Load site', category: 'request', correlationId: 'ABCD1234', message: 'server: token=eyJhbGciOi.secret failed' });
  const logs = (await ok('adminLogs', { type: 'error' }, 't-owner')).logs;
  assert.equal(logs.length, 1); assert.equal(logs[0].who, 'ABCD1234'); assert.ok(!/eyJ|secret/.test(logs[0].c));
});
await test('large tables are paged past the 1000-row API cap', async () => {
  users(); await ok('getMe', {}, 't-owner');
  for (let i = 0; i < 1300; i++) fake.rows('profiles').push({ id: crypto.randomUUID(), user_id: crypto.randomUUID(), username: `u${i}`, bio: '', avatar_url: '', role: 'Member', joined_at: `2026-01-01T00:${String(i % 60).padStart(2, '0')}:00Z` });
  assert.equal((await ok('adminListUsers', {}, 't-owner')).users.length, 1301);
});
await test('uploads: signed URL only for logged-in users, image types/size enforced, server picks path', async () => {
  users(); await ok('getMe', {}, 't-m1');
  await denied('createUploadUrl', { contentType: 'image/png', size: 100 }, undefined, 401);
  await denied('createUploadUrl', { contentType: 'text/html', size: 100 }, 't-m1', 400);
  await denied('createUploadUrl', { contentType: 'image/svg+xml', size: 100 }, 't-m1', 400);
  await denied('createUploadUrl', { contentType: 'image/png', size: 6 * 1024 * 1024 }, 't-m1', 400);
  await denied('createUploadUrl', { contentType: 'image/png', size: 0 }, 't-m1', 400);
  const r = await ok('createUploadUrl', { contentType: 'image/webp', size: 1234 }, 't-m1');
  assert.equal(r.bucket, 'uploads'); assert.match(r.path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/); assert.ok(r.publicUrl.endsWith(r.path)); assert.ok(r.token);
});

console.log('\nSecurity hardening');
await test('logClientError: per-IP and global rate limits, size limits, scrubbing', async () => {
  const withIp = (ip, body) => handle({ method: 'POST', name: 'logClientError', body, ip });
  const rpt = (m = 'boom') => ({ operation: 'Load site', category: 'request', correlationId: 'ABCD1234', message: m });
  for (let i = 0; i < 10; i++) assert.equal((await withIp('1.1.1.1', rpt())).status, 200);
  assert.equal(fake.rows('error_logs').length, 10);
  const over = await withIp('1.1.1.1', rpt());                       // 11th from the same IP: accepted but NOT stored
  assert.equal(over.status, 200); assert.equal(fake.rows('error_logs').length, 10);
  await withIp('2.2.2.2', rpt());                                    // a different IP still works
  assert.equal(fake.rows('error_logs').length, 11);
  assert.equal((await withIp('3.3.3.3', { ...rpt(), message: 'x'.repeat(10001) })).status, 400);   // oversize rejected
  assert.equal((await withIp('3.3.3.3', { operation: 1 })).status, 400);
  await withIp('4.4.4.4', rpt('Bearer abc.def.ghi user bob@example.com password=hunter2 eyJhbGciOiJIUzI1NiJ9.payload.sig key: AbC123\nINJECT'));
  const msg = fake.rows('error_logs').at(-1).message;
  assert.ok(!/abc\.def|bob@|hunter2|eyJ|AbC123|\n/.test(msg), msg);
  // global flood protection: 300/hour across all IPs
  fake.reset();
  for (let i = 0; i < 300; i++) await withIp(`9.9.${i >> 8}.${i & 255}`, rpt());
  assert.equal(fake.rows('error_logs').length, 300);
  await withIp('8.8.8.8', rpt()); assert.equal(fake.rows('error_logs').length, 300);
});
await test('logClientError: if the limiter is unavailable nothing is stored (fails closed) and no error is shown', async () => {
  fake.failRpc.on = true;
  const r = await handle({ method: 'POST', name: 'logClientError', body: { operation: 'a', category: 'b', correlationId: 'c', message: 'd' }, ip: '1.1.1.1' });
  assert.equal(r.status, 200); assert.equal(fake.rows('error_logs').length, 0);
});
await test('uploads & submissions are rate limited per user (429), limiter outage fails open', async () => {
  users(); await ok('getMe', {}, 't-m1'); await ok('getMe', {}, 't-m2');
  for (let i = 0; i < 30; i++) await ok('createUploadUrl', { contentType: 'image/png', size: 10 }, 't-m1');
  await denied('createUploadUrl', { contentType: 'image/png', size: 10 }, 't-m1', 429, 'RATE_LIMITED');
  await ok('createUploadUrl', { contentType: 'image/png', size: 10 }, 't-m2');            // other users unaffected
  fake.failRpc.on = true;
  await ok('createUploadUrl', { contentType: 'image/png', size: 10 }, 't-m1');             // limiter down -> still works
});
await test('members can only use images from our own storage bucket (avatars & album)', async () => {
  users(); await ok('getMe', {}, 't-m1');
  const own = 'https://fake.supabase.co/storage/v1/object/public/uploads/x/a.png';
  for (const bad of ['https://evil.example/a.png', 'https://fake.supabase.co.evil.example/storage/v1/object/public/uploads/a.png', 'https://fake.supabase.co/storage/v1/object/public/other/a.png', 'javascript:alert(1)', 'http://fake.supabase.co/storage/v1/object/public/uploads/a.png']) {
    await denied('submitAlbum', { imageUrl: bad, caption: '' }, 't-m1', 400);
    await denied('updateMyProfile', { username: 'Steve_99', bio: '', avatarUrl: bad }, 't-m1', 400);
  }
  await ok('submitAlbum', { imageUrl: own, caption: '' }, 't-m1');
  await ok('updateMyProfile', { username: 'Steve_99', bio: '', avatarUrl: own }, 't-m1');
  await ok('updateMyProfile', { username: 'Steve_98', bio: 'x', avatarUrl: own }, 't-m1');   // keeping the same avatar is fine
  await ok('updateMyProfile', { username: 'Steve_98', bio: 'x', avatarUrl: '' }, 't-m1');    // removing it is fine
});
await test('OWNER_USER_ID pins the Owner role to one exact auth user', async () => {
  users();
  process.env.OWNER_USER_ID = '00000000-0000-4000-8000-0000000000aa';
  try {
    assert.equal((await ok('getMe', {}, 't-owner')).profile.role, 'Member');                  // right email, wrong id
    fake.addUser('t-real-owner', { id: '00000000-0000-4000-8000-0000000000aa', email: OWNER });
    assert.equal((await ok('getMe', {}, 't-real-owner')).profile.role, 'Owner');
  } finally { delete process.env.OWNER_USER_ID; }
});
await test('non-UUID ids on save/delete are a clean 404, never a 500', async () => {
  await seedStaff();
  await denied('adminSavePost', { id: 'not-a-uuid', kind: 'Update', title: 'abc', body: 'b', imageUrl: '', published: false, publishedAt: '' }, 't-owner', 404);
  await denied('adminSavePartner', { id: 'not-a-uuid', name: 'abc', category: 'Shop', description: '', logoUrl: '', websiteUrl: '' }, 't-owner', 404);
  await denied('adminDeletePost', { id: "1' or '1'='1" }, 't-owner', 404);
  await denied('adminSetRole', { profileId: 'nope', role: 'Staff' }, 't-owner', 404);
});
await test('oversized and malformed input is rejected with 400; image settings must be http(s) links', async () => {
  await seedStaff();
  await denied('adminSavePost', { kind: 'Update', title: 'abc', body: 'x'.repeat(30001), imageUrl: '', published: false, publishedAt: '' }, 't-owner', 400);
  await denied('adminSavePage', { slug: 'terms', title: 't', content: 'x'.repeat(200001), published: true }, 't-owner', 400);
  await denied('adminSavePost', { kind: 'Update', title: 'abc', body: 'b', imageUrl: 'javascript:alert(1)', published: false, publishedAt: '' }, 't-owner', 400);
  const s = { serverAddress: 'play.example.com', serverPort: 19132, platform: 'Bedrock', serverStatus: 'Online', discordUrl: '', voteUrl: '', ticketUrl: '', heroTagline: '', introText: '', maintenanceMode: false, maintenanceMessage: '' };
  await denied('adminSaveSettings', { ...s, heroImage: 'javascript:alert(1)' }, 't-owner', 400);
  await ok('adminSaveSettings', { ...s, heroImage: 'https://cdn.example/h.png' }, 't-owner');
});
await test('a failing audit-log write never turns a successful admin action into an error', async () => {
  await seedStaff();
  const orig = fake.rows;
  const created = await ok('adminSavePartner', { name: 'Partner A', category: 'Shop', description: '', logoUrl: '', websiteUrl: '' }, 't-owner');
  assert.deepEqual(created, { ok: true });
  fake.state.failTables = new Set(['activity_logs']);
  try { await ok('adminSavePartner', { name: 'Partner B', category: 'Shop', description: '', logoUrl: '', websiteUrl: '' }, 't-owner'); }
  finally { fake.state.failTables = undefined; }
  assert.equal(fake.rows('partners').length, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
