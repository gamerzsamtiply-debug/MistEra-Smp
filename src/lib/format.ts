import { format } from 'date-fns';
export const fmtDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy'); };
export const fmtDateTime = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy · h:mm a'); };
