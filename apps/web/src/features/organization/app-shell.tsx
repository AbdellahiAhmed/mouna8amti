"use client";

import { LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DropdownMenu } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/queries";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, PRIMARY_NAV, type NavItem } from "./navigation";
import { useOrganization } from "./organization-context";

const ease = [0.2, 0, 0, 1] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRtl = useLocale() === "ar";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-hairline-soft bg-surface-sunken lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <Topbar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, x: isRtl ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 sm:px-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useOrganization();
  const adminItems = ADMIN_NAV.filter((item) => !item.permission || can(item.permission));

  return (
    <>
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <NavGroup items={PRIMARY_NAV.filter((item) => !item.permission || can(item.permission))} onNavigate={onNavigate} />
        {adminItems.length > 0 && (
          <>
            <hr className="mx-3 border-hairline" />
            <NavGroup items={adminItems} onNavigate={onNavigate} />
          </>
        )}
      </nav>
    </>
  );
}

function NavGroup({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const t = useTranslations("app.nav");
  const { organization } = useOrganization();
  const pathname = usePathname();
  const base = `/${organization.slug}`;

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
        const Icon = item.icon;
        const content = (
          <>
            {isActive && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-sm bg-primary-soft"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon aria-hidden className="relative size-[1.125rem] shrink-0" />
            <span className="relative flex-1">{t(item.key)}</span>
            {item.soon && (
              <span className="relative rounded-full bg-surface px-2 py-0.5 text-caption text-steel">
                {t("soon")}
              </span>
            )}
          </>
        );
        const className = cn(
          "relative flex h-10 items-center gap-3 rounded-sm px-3 text-body transition-colors duration-[120ms]",
          isActive ? "font-medium text-primary" : "text-charcoal",
          item.soon ? "cursor-default text-steel" : !isActive && "hover:bg-surface",
        );

        return (
          <li key={item.key}>
            {item.soon ? (
              <span className={className} aria-disabled="true">
                {content}
              </span>
            ) : (
              <Link href={href} className={className} aria-current={isActive ? "page" : undefined} onClick={onNavigate}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Topbar() {
  const t = useTranslations("shell");
  const { organization } = useOrganization();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerFrom = useLocale() === "ar" ? "100%" : "-100%";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline-soft bg-surface/80 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-8">
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")}>
            <Menu aria-hidden />
          </Button>
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
                  className="fixed inset-y-0 start-0 z-50 flex w-[17rem] flex-col bg-surface-sunken shadow-float"
                  initial={{ x: drawerFrom }}
                  animate={{ x: 0 }}
                  exit={{ x: drawerFrom }}
                  transition={{ duration: 0.22, ease }}
                >
                  <Dialog.Title className="sr-only">{t("menu")}</Dialog.Title>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" className="absolute end-3 top-3" aria-label="Close">
                      <X aria-hidden />
                    </Button>
                  </Dialog.Close>
                  <SidebarContent onNavigate={() => setMenuOpen(false)} />
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      <p className="min-w-0 flex-1 truncate font-display text-h4 text-ink">{organization.name}</p>

      <LocaleSwitcher className="hidden sm:inline-flex" />
      <UserMenu />
    </header>
  );
}

function UserMenu() {
  const t = useTranslations("common");
  const { user } = useOrganization();
  const logout = useLogout();
  const router = useRouter();
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full bg-primary font-display text-label font-semibold text-on-primary transition-transform duration-[120ms] active:scale-[0.97]"
          aria-label={user.name}
        >
          {initials}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-60 rounded-md border border-hairline bg-canvas p-1.5 shadow-float data-[state=open]:animate-[menu-in_220ms_cubic-bezier(0.3,0,0,1.15)]"
        >
          <div className="px-3 py-2">
            <p className="font-medium text-ink">{user.name}</p>
            <p className="text-caption text-steel" dir="ltr">
              {user.email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-hairline-soft" />
          <DropdownMenu.Item
            onSelect={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-body text-charcoal outline-none data-[highlighted]:bg-surface-sunken"
          >
            <LogOut aria-hidden className="size-[1.125rem] rtl:rotate-180" />
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
