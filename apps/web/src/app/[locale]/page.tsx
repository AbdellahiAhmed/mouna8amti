"use client";

import { useEffect } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { homePathFor } from "@/features/auth/queries";
import { useRequiredUser } from "@/features/auth/use-required-user";
import { useRouter } from "@/i18n/navigation";

/** Routes "/" to the right place: login, onboarding, or the user's organisation. */
export default function EntryPage() {
  const { data: user } = useRequiredUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(homePathFor(user));
  }, [user, router]);

  return <PageLoader />;
}
