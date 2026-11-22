import { useSyncExternalStore } from 'react';
import type { AppNotification } from './api';

export interface PostItem { id: string; kind: 'Announcement' | 'Update'; title: string; body: string; imageUrl: string; publishedAt: string }
interface State { messages: number; unread: number; items: AppNotification[]; posts: PostItem[] }

let state: State = { messages: 0, unread: 0, items: [], posts: [] };
const subs = new Set<() => void>();

export function setNotifState(patch: Partial<State>): void {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export const getNotifState = (): State => state;
export const resetNotifState = (): void => setNotifState({ messages: 0, unread: 0, items: [] });

/** One shared copy of "what is new", so the navbar (which is on screen twice: sidebar + top bar) never double-polls. */
export function useNotifState(): State {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, getNotifState, getNotifState);
}
