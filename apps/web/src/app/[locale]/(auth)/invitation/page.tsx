import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/auth-shell";
import { InvitationForm } from "@/features/auth/invitation-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.invitation");
  return { title: t("title") };
}

export default async function InvitationPage() {
  const t = await getTranslations("auth.invitation");

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      {/* The form reads the token from the URL, which only exists at request time. */}
      <Suspense>
        <InvitationForm />
      </Suspense>
    </AuthShell>
  );
}
