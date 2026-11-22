/**
 * Download link for a stored file. Files live in our public Supabase Storage bucket, which serves them with
 * "Content-Disposition: attachment" when `?download=<name>` is added - this works across origins (a plain
 * <a download> is ignored for cross-origin URLs).
 */
export function downloadUrl(src: string, name = 'mistera-smp'): string {
  if (!src) return '';
  try {
    const u = new URL(src);
    const ext = (u.pathname.match(/\.(\w{2,5})$/)?.[1] ?? '').toLowerCase();
    const base = name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'mistera-smp';
    u.searchParams.set('download', ext ? `${base}.${ext}` : base);
    return u.toString();
  } catch {
    return src;
  }
}
