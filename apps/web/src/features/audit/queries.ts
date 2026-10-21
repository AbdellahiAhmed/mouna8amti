"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useOrganization } from "@/features/organization/organization-context";
import { api } from "@/lib/api";
import type { AuditLog, AuditSubjectType, Paginated } from "@/lib/types";

export function useAuditTrail(subject?: AuditSubjectType) {
  const path = `/orgs/${useOrganization().organization.slug}/audit-logs`;

  return useInfiniteQuery({
    queryKey: [path, subject],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (pageParam) params.set("cursor", pageParam);
      return api<Paginated<AuditLog>>(`${path}?${params}`);
    },
    getNextPageParam: (page) => page.meta?.next_cursor ?? null,
  });
}
