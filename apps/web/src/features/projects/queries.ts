"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/features/organization/organization-context";
import { api } from "@/lib/api";
import type { Paginated, Project, ProjectStatus, Resource } from "@/lib/types";

export type ProjectFilters = { status?: ProjectStatus; search?: string };

export type ProjectInput = {
  code: string;
  name: string;
  description: string | null;
  manager_membership_id: number | null;
  starts_on: string;
  ends_on: string;
  status: ProjectStatus;
  progress: number;
};

function useProjectsPath() {
  return `/orgs/${useOrganization().organization.slug}/projects`;
}

export function useProjects(filters: ProjectFilters) {
  const path = useProjectsPath();
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  return useQuery({
    queryKey: [path, filters],
    queryFn: () => api<Paginated<Project>>(`${path}?${params}`),
    // Keeps the current rows on screen while a new filter loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useSaveProject(projectId?: number) {
  const path = useProjectsPath();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectInput) =>
      api<Resource<Project>>(projectId ? `${path}/${projectId}` : path, {
        method: projectId ? "PUT" : "POST",
        json: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}
