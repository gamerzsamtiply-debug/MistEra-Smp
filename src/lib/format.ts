import { format } from 'date-fns';
export const fmtDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy'); };
export const fmtDateTime = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy - h:mm a'); };

/** Descriptive alt text for a community-album screenshot: the caption when there is one, otherwise who shared it. */
export const albumAlt = (a: { caption?: string | null; uploader?: { username: string } | null }) =>
  a.caption?.trim() || `MistEra SMP screenshot shared by ${a.uploader?.username ? '@' + a.uploader.username : 'a community member'}`;
