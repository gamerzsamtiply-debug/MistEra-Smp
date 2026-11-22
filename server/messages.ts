import { db } from './db.js';
import { MESSAGE_BUCKET } from './social.js';

export interface MessageRow {
  id: string; sender_id: string; recipient_id: string; body: string | null;
  attachment_path: string | null; attachment_name: string | null; attachment_type: string | null; attachment_size: number | null;
  edited_at: string | null; deleted_at: string | null; sender_hidden: boolean | null; recipient_hidden: boolean | null; read_at: string | null; created_at: string | null;
}

export interface MessageOut {
  id: string; mine: boolean; body: string; createdAt: string; edited: boolean; deleted: boolean; read: boolean;
  attachment: { name: string; type: string; size: number; url: string; isImage: boolean } | null;
}

/** Turns rows into what the browser sees. Attachments get 1-hour signed links (the bucket is private). */
export async function messageOut(rows: MessageRow[], me: string): Promise<MessageOut[]> {
  const paths = [...new Set(rows.filter((m) => !m.deleted_at && m.attachment_path).map((m) => m.attachment_path as string))];
  const urls = new Map<string, string>();
  if (paths.length) {
    try {
      const r = await db().storage.from(MESSAGE_BUCKET).createSignedUrls(paths, 3600);
      for (const x of r.data ?? []) if (x.signedUrl && x.path) urls.set(x.path, x.signedUrl);
    } catch (e) {
      console.error('[storage] createSignedUrls failed:', e);
    }
  }
  return rows.map((m) => {
    const deleted = !!m.deleted_at;
    const url = !deleted && m.attachment_path ? urls.get(m.attachment_path) : undefined;
    const type = m.attachment_type ?? '';
    return {
      id: m.id, mine: m.sender_id === me, body: deleted ? '' : m.body ?? '', createdAt: m.created_at ?? '', edited: !!m.edited_at && !deleted, deleted, read: !!m.read_at,
      attachment: url ? { name: m.attachment_name ?? 'file', type, size: m.attachment_size ?? 0, url, isImage: type.startsWith('image/') } : null,
    };
  });
}
