import { supabase } from './supabase';

/** Error thrown for any failed API call. Has the same fields the app's error classifier reads. */
export class ApiRequestError extends Error {
  status: number;
  code: string;
  userFacingMessage: string;
  constructor(status: number, code: string, message: string) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.userFacingMessage = message;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Calls a Vercel serverless endpoint (POST /api/<name>), attaching the current
 * Supabase access token when the visitor is signed in. Authorization is enforced
 * on the server — the token is only a credential, never a permission.
 */
async function call<T = Any>(name: string, input: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/${name}`, { method: 'POST', headers, body: JSON.stringify(input ?? {}) });
  let payload: Any = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response (e.g. a gateway error page) */
  }
  if (!res.ok) throw new ApiRequestError(res.status, payload?.error?.code ?? '', payload?.error?.message ?? '');
  if (payload === null) throw new ApiRequestError(502, 'BAD_GATEWAY', 'The server returned an unexpected response.');
  return payload as T;
}

// ───────────── Types the UI relies on ─────────────
export type ServerStatus = 'Online' | 'Offline' | 'Restarting';

export interface SiteSettings {
  serverAddress: string;
  serverPort: number | null;
  platform: string;
  serverStatus: ServerStatus;
  discordUrl: string;
  voteUrl: string;
  ticketUrl: string;
  heroTagline: string;
  introText: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  heroImage: string;
  galleryImageOne: string;
  galleryImageTwo: string;
  bannerImage: string;
  heroTitle?: string;
  aboutHeading?: string;
  aboutText?: string;
  aboutTagline?: string;
  seoDescription?: string;
}

export interface GetSiteOutputType {
  settings: SiteSettings;
  steps: { id: string; title: string; instructions: string; imageUrl: string }[];
}

export interface AdminSaveSettingsInputType {
  serverAddress: string;
  serverPort: number;
  platform: string;
  serverStatus: ServerStatus;
  discordUrl: string;
  voteUrl: string;
  ticketUrl: string;
  heroTagline: string;
  introText: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  heroImage?: string;
  galleryImageOne?: string;
  galleryImageTwo?: string;
  bannerImage?: string;
  heroTitle?: string;
  aboutHeading?: string;
  aboutText?: string;
  aboutTagline?: string;
  seoDescription?: string;
}

export interface AdminSavePartnerInputType {
  id?: string;
  name: string;
  category: 'Discord' | 'Hosting' | 'Shop' | 'Server' | 'SMP' | 'Community';
  description: string;
  logoUrl: string;
  websiteUrl: string;
}

export const STAFF_POSITIONS = ['Owner', 'Admin', 'Moderator', 'Developer', 'Builder', 'Helper', 'Staff'] as const;
export type StaffPosition = (typeof STAFF_POSITIONS)[number];

export interface AdminSaveStaffInputType {
  id?: string;
  name: string;
  avatarUrl: string;
  position: StaffPosition;
}

export interface StaffMember {
  id: string;
  name: string;
  avatarUrl: string;
  position: StaffPosition;
  profileId: string | null;
}

export interface CreateUploadUrlOutputType {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
}

// ───────────── Endpoints (1:1 with server/api/*.ts) ─────────────
export const register = (input: { email: string; password: string }) => call<{ ok: true }>('register', input);
export const adminListStaff = (input?: Any) => call<Any>('adminListStaff', input);
export const adminSaveStaff = (input?: AdminSaveStaffInputType) => call<Any>('adminSaveStaff', input);
export const adminDeleteStaff = (input?: Any) => call<Any>('adminDeleteStaff', input);
export const adminLinkStaff = (input?: { id: string; username: string | null }) => call<Any>('adminLinkStaff', input);
export const adminStaffClaimCode = (input?: { id: string }) => call<{ code: string; expiresAt: string }>('adminStaffClaimCode', input);
export const claimStaff = (input?: { code: string }) => call<{ ok: true; name: string }>('claimStaff', input);
export const adminDeletePartner = (input?: Any) => call<Any>('adminDeletePartner', input);
export const adminDeletePost = (input?: Any) => call<Any>('adminDeletePost', input);
export const adminGetSettings = (input?: Any) => call<Any>('adminGetSettings', input);
export const adminListAlbum = (input?: Any) => call<Any>('adminListAlbum', input);
export const adminListPages = (input?: Any) => call<Any>('adminListPages', input);
export const adminListPosts = (input?: Any) => call<Any>('adminListPosts', input);
export const adminListSteps = (input?: Any) => call<Any>('adminListSteps', input);
export const adminListSuggestions = (input?: Any) => call<Any>('adminListSuggestions', input);
export const adminListUsers = (input?: Any) => call<Any>('adminListUsers', input);
export const adminLogs = (input?: Any) => call<Any>('adminLogs', input);
export const adminOverview = (input?: Any) => call<Any>('adminOverview', input);
export const adminReviewAlbum = (input?: Any) => call<Any>('adminReviewAlbum', input);
export const adminSavePage = (input?: Any) => call<Any>('adminSavePage', input);
export const adminSavePartner = (input?: AdminSavePartnerInputType) => call<Any>('adminSavePartner', input);
export const adminSavePost = (input?: Any) => call<Any>('adminSavePost', input);
export const adminSaveSettings = (input?: AdminSaveSettingsInputType) => call<Any>('adminSaveSettings', input);
export const adminSaveStep = (input?: Any) => call<Any>('adminSaveStep', input);
export const adminSetRole = (input?: Any) => call<Any>('adminSetRole', input);
export const adminUpdateSuggestion = (input?: Any) => call<Any>('adminUpdateSuggestion', input);
export const createUploadUrl = (input?: { contentType: string; size: number }) => call<CreateUploadUrlOutputType>('createUploadUrl', input);
export const deleteMyAlbum = (input?: Any) => call<Any>('deleteMyAlbum', input);
export const deleteMySuggestion = (input?: Any) => call<Any>('deleteMySuggestion', input);
export const getHome = (input?: Any) => call<Any>('getHome', input);
export const getMe = (input?: Any) => call<Any>('getMe', input);
export const getPage = (input?: Any) => call<Any>('getPage', input);
export const getPublicProfile = (input?: Any) => call<Any>('getPublicProfile', input);
export const getSite = (input?: Record<string, never> | undefined) => call<GetSiteOutputType>('getSite', input);
export const listAlbum = (input?: Any) => call<{ images: AlbumItem[] }>('listAlbum', input);
export const listPartners = (input?: Any) => call<Any>('listPartners', input);
export const listPosts = (input?: Any) => call<Any>('listPosts', input);
export const listStaff = (input?: Any) => call<Any>('listStaff', input);
export const logClientError = (input?: Any) => call<Any>('logClientError', input);
export const myAlbum = (input?: Any) => call<Any>('myAlbum', input);
export const mySuggestions = (input?: Any) => call<Any>('mySuggestions', input);
export const submitAlbum = (input?: Any) => call<Any>('submitAlbum', input);
export const submitSuggestion = (input?: Any) => call<Any>('submitSuggestion', input);
export const updateMyProfile = (input?: Any) => call<Any>('updateMyProfile', input);
export const submitFeedback = (input: { name?: string; contact?: string; message: string }) => call<{ ok: true }>('submitFeedback', input);
export const adminListFeedback = (input?: Any) => call<Any>('adminListFeedback', input);
export const adminDeleteFeedback = (input?: Any) => call<Any>('adminDeleteFeedback', input);
export const latestPosts = (input?: Any) => call<{ posts: { id: string; kind: 'Announcement' | 'Update'; title: string; body: string; imageUrl: string; publishedAt: string }[] }>('latestPosts', input);
export interface AlbumItem {
  id: string; mediaType: 'image' | 'video'; imageUrl: string; caption: string; submittedAt: string;
  uploader: { id: string; username: string; avatarUrl: string; role: string } | null;
  likeCount: number; commentCount: number; likedByMe: boolean; viewCount: number;
}
export interface AlbumComment {
  id: string; parentId: string | null; body: string; createdAt: string;
  user: { id: string; username: string; avatarUrl: string; role: string } | null; canDelete: boolean;
}
export const toggleAlbumLike = (input: { id: string }) => call<{ liked: boolean; likes: number }>('toggleAlbumLike', input);
export const listAlbumComments = (input: { id: string }) => call<{ comments: AlbumComment[] }>('listAlbumComments', input);
export const addAlbumComment = (input: { id: string; body: string; parentId?: string | null }) => call<{ comment: AlbumComment }>('addAlbumComment', input);
export const deleteAlbumComment = (input: { id: string }) => call<{ ok: true }>('deleteAlbumComment', input);
export const health = (input?: Any) => call<{ ok: boolean; env: Record<string, boolean>; missingTables: string[]; keyProblem: boolean }>('health', input);
export const trackView = (input: { visitorId: string; path: string }) => call<{ ok: true }>('trackView', input);
export const trackAlbumView = (input: { id: string; visitorId?: string }) => call<{ views: number }>('trackAlbumView', input);
export const recordLogin = (input: { method: 'password' | 'google' | 'session' }) => call<{ ok: true }>('recordLogin', input);
export const adminViews = (input?: Any) => call<{ ready: boolean; total: number; unique: number; today: number; last7: number; daily: { day: string; views: number; visitors: number }[]; topPages: { path: string; views: number }[]; logins: { id: string; email: string; method: string; ip: string; at: string }[] }>('adminViews', input);
