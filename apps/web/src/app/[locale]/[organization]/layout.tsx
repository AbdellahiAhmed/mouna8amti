"use client";

import { useTranslations } from "next-intl";
import { use, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorState } from "@/components/ui/states";
import { useRequiredUser } from "@/features/auth/use-required-user";
import { AppShell } from "@/features/organization/app-shell";
import { OrganizationProvider } from "@/features/organization/organization-context";
import { Link } from "@/i18n/navigation";
import type { Organization } from "@/lib/types";

export default function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ organization: string }>;
}) {
  const { organization: slug } = use(params);
  const { data: user, error, refetch, isPending } = useRequiredUser();

  if (isPending) return <PageLoader />;
  if (!user) return <ErrorState error={error} onRetry={() => refetch()} />;

  const membership = user.memberships?.find((m) => m.organization?.slug === slug);
  if (!membership?.organization) return <NotAMember />;

  return (
    <OrganizationProvider user={user} membership={{ ...membership, organization: membership.organization as Organization }}>
      <AppShell>{children}</AppShell>
    </OrganizationProvider>
  );
}

function NotAMember() {
  const t = useTranslations("shell");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <Logo />
        <p className="text-body-lg text-slate">{t("notMember")}</p>
        <Button asChild variant="secondary">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
