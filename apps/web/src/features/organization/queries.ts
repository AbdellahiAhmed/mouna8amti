"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog, Membership, Paginated, Role } from "@/lib/types";
import { useOrganization } from "./organization-context";

function useOrgPath() {
  return `/orgs/${useOrganization().organization.slug}`;
}

export function useMembers() {
  const base = useOrgPath();
  return useQuery({
    queryKey: [base, "members"],
    queryFn: () => api<Paginated<Membership>>(`${base}/members`),
  });
}

export function useRoles() {
  const base = useOrgPath();
  return useQuery({
    queryKey: [base, "roles"],
    queryFn: () => api<{ data: Role[] }>(`${base}/roles`).then((r) => r.data),
  });
}

export function useAuditLogs() {
  const base = useOrgPath();
  return useQuery({
    queryKey: [base, "audit-logs"],
    queryFn: () => api<Paginated<AuditLog>>(`${base}/audit-logs`),
  });
}
