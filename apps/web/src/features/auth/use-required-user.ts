"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "./queries";

/** The signed-in user, or a redirect to /login once the API says there is none. */
export function useRequiredUser() {
  const query = useCurrentUser();
  const router = useRouter();
  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401;

  useEffect(() => {
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  return query;
}
