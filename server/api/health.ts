import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { env, supabaseUrl } from '../env.js';

const TABLES = ['site_settings', 'join_steps', 'profiles', 'posts', 'partners', 'album_submissions', 'suggestions', 'activity_logs', 'error_logs', 'staff_members', 'feedback', 'album_likes', 'album_comments'];

/**
 * Setup checker. Open https://YOUR-SITE/api/health with a POST (or the Admin > Overview card) to see exactly what is
 * missing. It never returns secret values, only true/false and table names.
 */
export default publicEndpoint(z.object({}), async () => {
  const envOk = { SUPABASE_URL: !!supabaseUrl(), SUPABASE_SERVICE_ROLE_KEY: !!env('SUPABASE_SERVICE_ROLE_KEY'), OWNER_USER_ID: !!env('OWNER_USER_ID') };
  const missingTables: string[] = [];
  let keyProblem = false;
  if (envOk.SUPABASE_URL && envOk.SUPABASE_SERVICE_ROLE_KEY) {
    await Promise.all(TABLES.map(async (t) => {
      try {
        const r = await db().from(t).select('*', { count: 'exact', head: true });
        if (r.error) {
          if (['42P01', 'PGRST205'].includes(r.error.code ?? '')) missingTables.push(t);
          else keyProblem = true;
        }
      } catch { keyProblem = true; }
    }));
  }
  const ok = envOk.SUPABASE_URL && envOk.SUPABASE_SERVICE_ROLE_KEY && !missingTables.length && !keyProblem;
  return { ok, env: envOk, missingTables: missingTables.sort(), keyProblem };
});
