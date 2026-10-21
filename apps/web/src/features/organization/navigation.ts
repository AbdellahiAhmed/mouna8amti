import {
  FolderKanban,
  HandCoins,
  History,
  LayoutDashboard,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: "dashboard" | "projects" | "donors" | "budgets" | "expenses" | "members" | "roles" | "audit";
  href: string;
  icon: LucideIcon;
  /** Hidden when the viewer lacks it. */
  permission?: string;
  /** Module planned in a later milestone; shown but not navigable. */
  soon?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { key: "dashboard", href: "", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderKanban, permission: "projects.view" },
  { key: "donors", href: "/donors", icon: HandCoins, permission: "projects.view" },
  { key: "budgets", href: "/budgets", icon: PieChart, soon: true },
  { key: "expenses", href: "/expenses", icon: ReceiptText, soon: true },
];

export const ADMIN_NAV: NavItem[] = [
  { key: "members", href: "/members", icon: Users, permission: "members.view" },
  { key: "roles", href: "/roles", icon: ShieldCheck, permission: "members.view" },
  { key: "audit", href: "/audit", icon: History, permission: "audit.view" },
];
