"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Membership, Paginated, Resource, Role } from "@/lib/types";
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

export type InviteInput = { name: string; email: string; title: string | null; role_id: number };

export function useInviteMember() {
  const base = useOrgPath();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) => api<Resource<Membership>>(`${base}/members`, { method: "POST", json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [base, "members"] }),
  });
}
