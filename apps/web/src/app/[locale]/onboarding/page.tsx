"use client";

import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { StarField } from "@/components/brand/star-field";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PageLoader } from "@/components/ui/page-loader";
import { useRequiredUser } from "@/features/auth/use-required-user";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const { data: user } = useRequiredUser();

  if (!user) return <PageLoader />;

  return (
    <main className="relative min-h-dvh overflow-hidden px-6 py-8 sm:px-12">
      <StarField className="pointer-events-none absolute inset-0 text-primary/[0.05]" />

      <header className="relative flex items-center justify-between gap-4">
        <Logo />
        <LocaleSwitcher />
      </header>

      <div className="relative mx-auto max-w-xl py-16">
        <h1 className="text-h1 tracking-[-0.5px]">{t("title")}</h1>
        <p className="mt-2 text-body-lg text-slate">{t("subtitle")}</p>
        <div className="mt-10">
          <OnboardingWizard />
        </div>
      </div>
    </main>
  );
}
