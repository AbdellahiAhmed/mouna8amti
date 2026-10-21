import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("createAccount") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <RegisterForm />
    </AuthShell>
  );
}
