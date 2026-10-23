"use client";

import { Check, ChevronsUpDown, LogOut, Menu, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DropdownMenu } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PendingInvitations } from "@/features/auth/pending-invitations";
import { useLogout } from "@/features/auth/queries";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";
import { ADMIN_NAV, OPERATIONS_NAV, PRIMARY_NAV, type NavItem } from "./navigation";
import { useOrganization } from "./organization-context";

const ease = [0.2, 0, 0, 1] as const;

const menuClass =
  "z-50 min-w-64 rounded-md border border-hairline bg-canvas p-1.5 shadow-float data-[state=open]:animate-[menu-in_220ms_cubic-bezier(0.3,0,0,1.15)]";
const menuItemClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-body text-charcoal outline-none data-[highlighted]:bg-surface-sunken";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRtl = useLocale() === "ar";
  const { user } = useOrganization();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] print:block">
      <aside className="sticky top-0 hidden h-dvh print:!hidden flex-col gap-7 overflow-y-auto border-e border-hairline bg-canvas px-5 pb-6 pt-7 lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <MobileTopbar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, x: isRtl ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className="mx-auto w-full max-w-[76rem] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-10"
          >
            <div className="mb-6 empty:hidden">
              <PendingInvitations user={user} />
            </div>
            {children}
          </motion.main>
        </AnimatePresence>
        <MobileTabs />
      </div>
    </div>
  );
}

function useVisibleNav() {
  const { can } = useOrganization();
  const visible = (item: NavItem) => !item.permission || can(item.permission);
  return { primary: PRIMARY_NAV.filter(visible), operations: OPERATIONS_NAV.filter(visible), admin: ADMIN_NAV.filter(visible) };
}

function useIsActive() {
  const { organization } = useOrganization();
  const pathname = usePathname();
  const base = `/${organization.slug}`;
  return (item: NavItem) => (item.href === "" ? pathname === base : pathname.startsWith(`${base}${item.href}`));
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("app.nav");
  const { primary, operations, admin } = useVisibleNav();

  return (
    <>
      <div className="px-2">
        <Logo className="[&>span:last-child]:text-[1.5rem]" />
      </div>
      <OrganizationSwitcher />
      <nav className="flex flex-col gap-5">
        <NavGroup items={primary} onNavigate={onNavigate} />
        {operations.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="px-3.5 text-caption font-medium text-steel">{t("operations")}</p>
            <NavGroup items={operations} onNavigate={onNavigate} />
          </div>
        )}
        {admin.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="px-3.5 text-caption font-medium text-steel">{t("admin")}</p>
            <NavGroup items={admin} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
      <UserBlock />
    </>
  );
}

function NavGroup({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const t = useTranslations("app.nav");
  const { organization } = useOrganization();
  const isActive = useIsActive();

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        const content = (
          <>
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-[10px] bg-primary-soft"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon aria-hidden className="relative size-5 shrink-0" strokeWidth={1.8} />
            <span className="relative flex-1">{t(item.key)}</span>
            {item.soon && (
              <span className="relative rounded-full bg-surface px-2 py-0.5 text-caption text-steel">{t("soon")}</span>
            )}
          </>
        );
        const className = cn(
          "relative flex min-h-12 items-center gap-3.5 rounded-[10px] px-3.5 text-body transition-colors duration-[120ms]",
          active ? "font-semibold text-night" : "font-medium text-charcoal",
          item.soon ? "cursor-default text-steel" : !active && "hover:bg-surface-sunken hover:text-ink",
        );

        return (
          <li key={item.key}>
            {item.soon ? (
              <span className={className} aria-disabled="true">
                {content}
              </span>
            ) : (
              <Link
                href={`/${organization.slug}${item.href}`}
                className={className}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function OrganizationSwitcher() {
  const t = useTranslations("shell");
  const { organization, user } = useOrganization();
  const memberships = (user.memberships ?? []).filter((m) => m.organization);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md border border-hairline bg-[#faf9f6] p-3 text-start transition-colors duration-[120ms] hover:border-hairline-strong dark:bg-surface"
        >
          <span className="grid size-[2.375rem] shrink-0 place-items-center rounded-[10px] bg-primary-soft font-display font-semibold text-primary">
            {organization.name.trim()[0]}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-normal">
            <span className="truncate text-[0.9375rem] font-semibold text-ink">{organization.name}</span>
            <span className="truncate text-caption text-slate">{organization.legal_name ?? organization.currency}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-steel" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={8} className={menuClass}>
          <DropdownMenu.Label className="px-3 py-1.5 text-caption font-medium text-steel">{t("switchOrg")}</DropdownMenu.Label>
          {memberships.map((m) => (
            <DropdownMenu.Item key={m.id} asChild className={menuItemClass}>
              <Link href={`/${m.organization!.slug}`}>
                <span className="flex-1 truncate">{m.organization!.name}</span>
                {m.organization!.id === organization.id && <Check aria-hidden className="size-4 text-primary" />}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-hairline-soft" />
          <DropdownMenu.Item asChild className={menuItemClass}>
            <Link href="/onboarding">
              <Plus aria-hidden className="size-4" />
              {t("newOrganization")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function UserBlock() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const { user, membership } = useOrganization();
  const logout = useLogout();
  const router = useRouter();
  const role = membership.title ?? membership.roles?.[0]?.name[locale];

  return (
    <div className="mt-auto border-t border-hairline-soft pt-4">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors duration-[120ms] hover:bg-surface-sunken"
          >
            <span className="grid size-[2.625rem] shrink-0 place-items-center rounded-full bg-primary font-display font-semibold text-on-primary">
              {initials(user.name)}
            </span>
            <span className="flex min-w-0 flex-col leading-normal">
              <span className="truncate text-[0.9375rem] font-semibold text-ink">{user.name}</span>
              {role && <span className="truncate text-caption text-slate">{role}</span>}
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side="top" align="start" sideOffset={8} className={menuClass}>
            <p className="px-3 py-2 text-caption text-steel" dir="ltr">
              {user.email}
            </p>
            <div className="px-2 pb-2">
              <LocaleSwitcher />
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-hairline-soft" />
            <DropdownMenu.Item
              onSelect={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}
              className={menuItemClass}
            >
              <LogOut aria-hidden className="size-[1.125rem] rtl:rotate-180" />
              {t("signOut")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function MobileTopbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-hairline bg-canvas px-4 lg:hidden print:hidden">
      <Logo className="[&_svg]:size-8 [&>span:last-child]:text-[1.2rem]" />
    </header>
  );
}

/** Bottom tab bar on phones: the first four reachable modules, then "more" for the full sidebar. */
function MobileTabs() {
  const t = useTranslations("app.nav");
  const { organization } = useOrganization();
  const { primary } = useVisibleNav();
  const isActive = useIsActive();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerFrom = useLocale() === "ar" ? "100%" : "-100%";
  const tabs = primary.filter((item) => !item.soon).slice(0, 4);
  const tabClass = "flex flex-1 flex-col items-center justify-center gap-1 text-[0.75rem] font-medium";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[4.5rem] print:hidden border-t border-hairline bg-canvas px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={`/${organization.slug}${item.href}`}
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active ? "text-primary" : "text-slate")}
          >
            <Icon aria-hidden className="size-[1.375rem]" strokeWidth={active ? 2.2 : 1.8} />
            <span className="max-w-full truncate">{t(item.key)}</span>
          </Link>
        );
      })}

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Trigger className={cn(tabClass, "text-slate")}>
          <Menu aria-hidden className="size-[1.375rem]" strokeWidth={1.8} />
          {t("more")}
        </Dialog.Trigger>
        <AnimatePresence>
          {menuOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-40 bg-ink/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed inset-y-0 start-0 z-50 flex w-[18rem] flex-col gap-6 overflow-y-auto bg-canvas px-5 pb-6 pt-7 shadow-float"
                  initial={{ x: drawerFrom }}
                  animate={{ x: 0 }}
                  exit={{ x: drawerFrom }}
                  transition={{ duration: 0.22, ease }}
                >
                  <Dialog.Title className="sr-only">{t("more")}</Dialog.Title>
                  <Dialog.Close
                    className="absolute end-4 top-6 grid size-10 place-items-center rounded-full text-slate hover:bg-surface-sunken"
                    aria-label="Close"
                  >
                    <X aria-hidden className="size-5" />
                  </Dialog.Close>
                  <SidebarContent onNavigate={() => setMenuOpen(false)} />
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </nav>
  );
}
