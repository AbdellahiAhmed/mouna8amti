"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/features/organization/organization-context";
import { api } from "@/lib/api";
import type { Donor, DonorType, Paginated, Resource } from "@/lib/types";

export type DonorInput = {
  name: string;
  type: DonorType;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

function useDonorsPath() {
  return `/orgs/${useOrganization().organization.slug}/donors`;
}

export function useDonors() {
  const path = useDonorsPath();
  return useQuery({ queryKey: [path], queryFn: () => api<Paginated<Donor>>(path) });
}

export function useSaveDonor(donorId?: number) {
  const path = useDonorsPath();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DonorInput) =>
      api<Resource<Donor>>(donorId ? `${path}/${donorId}` : path, { method: donorId ? "PUT" : "POST", json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}
