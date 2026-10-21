"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Membership, Paginated, Role } from "@/lib/types";
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
