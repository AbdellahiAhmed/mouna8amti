import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <LoginForm />
    </AuthShell>
  );
}
