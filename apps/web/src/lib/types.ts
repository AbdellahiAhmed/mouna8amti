// Mirrors the Laravel API resources in apps/api/app/Http/Resources.

export type Locale = "ar" | "fr" | "en";

export type LocalizedText = Record<Locale, string>;

export interface Organization {
  id: number;
  name: string;
  slug: string;
  legal_name: string | null;
  country: string;
  currency: string;
  locale: Locale;
  fiscal_year_start_month: number;
  logo_url: string | null;
}

export interface Role {
  id: number;
  key: string;
  name: LocalizedText;
  permissions: string[];
  is_system: boolean;
}

export type MembershipStatus = "invited" | "active" | "suspended";

export interface Membership {
  id: number;
  status: MembershipStatus;
  title: string | null;
  organization?: Organization;
  user?: User;
  roles?: Role[];
  permissions?: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  locale: Locale;
  avatar_url: string | null;
  memberships?: Membership[];
}

export interface AuditLog {
  id: number;
  event: "created" | "updated" | "deleted";
  subject: { type: string; id: number };
  actor: { id: number; name: string } | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface Resource<T> {
  data: T;
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page?: number; last_page?: number; total?: number; next_cursor?: string | null };
}

export type ProjectStatus = "draft" | "active" | "on_hold" | "closed";

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  starts_on: string;
  ends_on: string;
  manager?: { membership_id: number; name: string } | null;
}

export type DonorType = "multilateral" | "bilateral" | "foundation" | "government" | "private" | "other";

export interface Donor {
  id: number;
  name: string;
  type: DonorType;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
}
