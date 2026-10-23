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
  /** Seats offered to this user, waiting for them to accept. */
  invitations?: { id: number; title: string | null; organization: { name: string; slug: string } }[];
}

export type AuditSubjectType =
  | "organization" | "membership" | "role" | "project" | "donor" | "grant" | "budget_line" | "expense"
  | "activity" | "donor_report" | "purchase_request" | "employee" | "asset" | "document";

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

export interface AuditLog {
  id: number;
  event: "created" | "updated" | "deleted";
  subject: { type: AuditSubjectType; id: number; label: string | null };
  actor: { id: number; name: string } | null;
  changes: AuditChange[];
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
  location: string | null;
  status: ProjectStatus;
  progress: number;
  starts_on: string;
  ends_on: string;
  manager?: { membership_id: number; name: string } | null;
  /** Present on list, detail and dashboard payloads. */
  budget?: number;
  spent?: number;
  grants?: Grant[];
}

export type DonorType = "multilateral" | "bilateral" | "foundation" | "government" | "private" | "other";

export interface Donor {
  id: number;
  name: string;
  type: DonorType;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  promised?: number;
  received?: number;
  grants?: Grant[];
}

// Amounts are integers in the organisation currency's minor unit (see lib/money.ts).

export interface GrantTranche {
  id: number;
  amount: number;
  expected_on: string;
  received_on: string | null;
}

export interface Grant {
  id: number;
  reference: string | null;
  amount: number;
  received: number;
  signed_on: string | null;
  donor?: { id: number; name: string };
  project?: { id: number; code: string; name: string };
  tranches?: GrantTranche[];
}

export interface BudgetLine {
  id: number;
  project_id: number;
  name: string;
  amount: number;
  spent: number;
}

export type ExpenseStatus = "submitted" | "reviewed" | "approved" | "rejected";
export type ExpenseAction = "edit" | "delete" | "review" | "approve" | "reject";

export interface ExpenseStep {
  membership_id: number;
  name: string | null;
  at: string | null;
}

export interface Expense {
  id: number;
  number: string;
  description: string;
  payee: string | null;
  amount: number;
  spent_on: string;
  status: ExpenseStatus;
  project?: { id: number; code: string; name: string };
  attachment: { name: string } | null;
  allocations?: { budget_line_id: number; name: string | null; percent: number }[];
  submitted: ExpenseStep | null;
  reviewed: ExpenseStep | null;
  approved: ExpenseStep | null;
  rejected: ExpenseStep | null;
  rejection_reason: string | null;
  actions: ExpenseAction[];
}

export interface Dashboard {
  totals: {
    promised: number;
    received: number;
    spent: number;
    balance: number;
    pending: { count: number; amount: number };
  };
  awaiting_me: { review: number; approve: number };
  reports_due: { id: number; title: string; due_on: string; donor: string }[];
  projects: Project[];
  recent_expenses: Expense[];
}

export interface MonthlyReport {
  month: string;
  received: { total: number; by_donor: { donor: string; amount: number }[] };
  spent: { total: number; count: number; by_project: { project: { id: number; code: string; name: string }; amount: number; count: number }[] };
  pending: { count: number; amount: number };
  rejected_count: number;
  balance_at_end: number;
  series: { month: string; received: number; spent: number }[];
}

export interface Activity {
  id: number;
  project_id: number;
  title: string;
  due_on: string | null;
  done_on: string | null;
}

export interface DonorReport {
  id: number;
  grant_id: number;
  title: string;
  due_on: string;
  submitted_on: string | null;
  donor?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
}

export type PurchaseStatus = "requested" | "approved" | "ordered" | "received" | "cancelled";

export interface PurchaseRequest {
  id: number;
  number: string;
  title: string;
  details: string | null;
  supplier: string | null;
  estimated_amount: number;
  needed_by: string | null;
  status: PurchaseStatus;
  next: PurchaseStatus[];
  project?: { id: number; name: string };
  requested?: { membership_id: number; name: string | null; at: string | null };
  approved?: { membership_id: number; name: string | null; at: string | null } | null;
}

export type ContractType = "permanent" | "fixed_term" | "consultant" | "volunteer";

export interface Employee {
  id: number;
  full_name: string;
  position: string;
  contract_type: ContractType;
  starts_on: string;
  ends_on: string | null;
  /** Only present for HR managers. */
  monthly_salary?: number | null;
  phone: string | null;
  email: string | null;
  project?: { id: number; name: string } | null;
}

export type AssetCategory = "vehicle" | "it" | "furniture" | "equipment" | "other";
export type AssetCondition = "good" | "fair" | "broken" | "disposed";

export interface Asset {
  id: number;
  name: string;
  category: AssetCategory;
  tag: string | null;
  location: string | null;
  holder: string | null;
  acquired_on: string | null;
  value: number | null;
  condition: AssetCondition;
  project?: { id: number; name: string } | null;
}

export type DocumentCategory = "contract" | "report" | "letter" | "invoice" | "other";
export type DocumentDirection = "incoming" | "outgoing" | "internal";

export interface ArchiveDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  direction: DocumentDirection;
  reference: string | null;
  dated_on: string;
  file: { name: string } | null;
  project?: { id: number; name: string } | null;
}
