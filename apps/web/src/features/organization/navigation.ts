import {
  BarChart3,
  FolderKanban,
  HandCoins,
  History,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: "dashboard" | "projects" | "donors" | "expenses" | "reports" | "members" | "settings" | "roles" | "audit";
  href: string;
  icon: LucideIcon;
  /** Hidden when the viewer lacks it. */
  permission?: string;
  /** Module not shipped yet; shown but not navigable. */
  soon?: boolean;
};

// Order follows the validated design sidebar.
export const PRIMARY_NAV: NavItem[] = [
  { key: "dashboard", href: "", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderKanban, permission: "projects.view" },
  { key: "donors", href: "/donors", icon: HandCoins, permission: "projects.view" },
  { key: "expenses", href: "/expenses", icon: ReceiptText, permission: "projects.view" },
  { key: "reports", href: "/reports", icon: BarChart3, permission: "projects.view" },
  { key: "members", href: "/members", icon: Users, permission: "members.view" },
  { key: "settings", href: "/settings", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { key: "roles", href: "/roles", icon: ShieldCheck, permission: "members.view" },
  { key: "audit", href: "/audit", icon: History, permission: "audit.view" },
];
