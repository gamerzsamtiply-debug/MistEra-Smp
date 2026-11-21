import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { health } from '@/lib/api';
import { useLoad } from '../../lib/useLoad';

/** Shows exactly what is missing when the site returns "500 / Setup needed" (env variables, SQL migrations). */
export default function SetupCheck() {
  const { data } = useLoad('Setup check', () => health({}));
  if (!data) return null;
  if (data.ok) return <div className="glass flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Setup check passed: environment variables and database tables are all in place.</div>;
  const missingEnv = Object.entries(data.env).filter(([k, v]) => !v && k !== 'OWNER_USER_ID').map(([k]) => k);
  return (
    <div className="glass space-y-2 border-destructive/40 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" />Setup needs attention</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {missingEnv.length > 0 && <li>Set in Vercel, then redeploy: <code>{missingEnv.join(', ')}</code></li>}
        {data.keyProblem && <li>The database rejected the key. Use the <b>service_role</b> key as <code>SUPABASE_SERVICE_ROLE_KEY</code>, not the anon key.</li>}
        {data.missingTables.length > 0 && <li>Run these SQL files in Supabase (SQL Editor): <code>supabase/migrations/0001 to 0004</code>. Missing tables: <code>{data.missingTables.join(', ')}</code></li>}
        {!data.env.OWNER_USER_ID && <li>Recommended: set <code>OWNER_USER_ID</code> (your Supabase user UID).</li>}
      </ul>
    </div>
  );
}
