export type Role = 'Owner' | 'Admin' | 'Moderator' | 'Staff' | 'Member';
export type ServerStatus = 'Online' | 'Offline' | 'Restarting';
export type PostKind = 'Announcement' | 'Update';
export type AlbumStatus = 'Pending' | 'Approved' | 'Declined';
export type SuggestionStatus = 'Open' | 'Under Review' | 'Accepted' | 'Declined';
export type PartnerCategory = 'Discord' | 'Hosting' | 'Shop' | 'Server' | 'SMP' | 'Community';

export interface SettingsRow {
  id: string;
  key: string;
  server_address: string | null;
  server_port: number | null;
  platform: string | null;
  server_status: ServerStatus | null;
  discord_url: string | null;
  vote_url: string | null;
  ticket_url: string | null;
  hero_tagline: string | null;
  intro_text: string | null;
  maintenance_mode: boolean | null;
  maintenance_message: string | null;
  hero_image: string | null;
  gallery_image_one: string | null;
  gallery_image_two: string | null;
  banner_image: string | null;
}

export interface JoinStepRow {
  id: string;
  slot: number;
  title: string | null;
  instructions: string | null;
  image_url: string | null;
  enabled: boolean | null;
  sort_order: number | null;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: Role | null;
  joined_at: string | null;
}

export type StaffPosition = 'Owner' | 'Admin' | 'Moderator' | 'Developer' | 'Builder' | 'Helper' | 'Staff';

export interface StaffRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
  position: StaffPosition | null;
  profile_id: string | null;
  claim_hash?: string | null;
  claim_expires?: string | null;
  created_at?: string | null;
}

export interface PartnerRow {
  id: string;
  name: string | null;
  category: PartnerCategory | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
}

export interface PostRow {
  id: string;
  title: string | null;
  kind: PostKind | null;
  body: string | null;
  image_url: string | null;
  published: boolean | null;
  published_at: string | null;
}

export interface ContentPageRow {
  id: string;
  slug: 'information' | 'terms';
  title: string | null;
  content: string | null;
  published: boolean | null;
  updated_at: string | null;
}

export interface AlbumRow {
  id: string;
  caption: string | null;
  image_url: string | null;
  uploader: string | null;
  status: AlbumStatus | null;
  submitted_at: string | null;
}

export interface SuggestionRow {
  id: string;
  title: string | null;
  description: string | null;
  author: string | null;
  status: SuggestionStatus | null;
  submitted_at: string | null;
}

export interface ActivityLogRow {
  id: string;
  action: string | null;
  admin_email: string | null;
  resource: string | null;
  details: string | null;
  logged_at: string | null;
}

export interface ErrorLogRow {
  id: string;
  operation: string | null;
  category: string | null;
  correlation_id: string | null;
  message: string | null;
  logged_at: string | null;
}

/** Public shape of a user as returned by list endpoints (uploader / author / staff). */
export interface PublicUser {
  id: string; // profile id
  username: string;
  avatarUrl: string;
  role: string;
}
