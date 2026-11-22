import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the Vercel/.env variables are missing; main.tsx then shows a setup message. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Browser Supabase client. It only uses the public anon key and is used for
 * authentication (sessions) and signed image uploads. All table data is read and
 * written through the /api serverless functions — never directly from the browser.
 */
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
