"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/features/organization/organization-context";
import { api } from "@/lib/api";
import type { Paginated, Resource } from "@/lib/types";

/** List / save / delete for the simple operations resources (purchase-requests, employees, assets, documents). */
function useResourcePath(resource: string) {
  return `/orgs/${useOrganization().organization.slug}/${resource}`;
}

export function useRecords<T>(resource: string, params: Record<string, string | undefined> = {}) {
  const path = useResourcePath(resource);
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  return useQuery({
    queryKey: [path, params],
    queryFn: () => api<Paginated<T>>(`${path}?${query}`),
    placeholderData: keepPreviousData,
  });
}

export function useSaveRecord<T>(resource: string) {
  const path = useResourcePath(resource);
  const queryClient = useQueryClient();
  return useMutation({
    // FormData bodies go as POST (+ _method=PATCH on edits): PHP parses files on POST only.
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> | FormData }) => {
      if (body instanceof FormData) {
        if (id) body.set("_method", "PATCH");
        return api<Resource<T>>(id ? `${path}/${id}` : path, { method: "POST", body });
      }
      return api<Resource<T>>(id ? `${path}/${id}` : path, { method: id ? "PUT" : "POST", json: body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}

export function useDeleteRecord(resource: string) {
  const path = useResourcePath(resource);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`${path}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}

export function usePurchaseStatus() {
  const path = useResourcePath("purchase-requests");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api<unknown>(`${path}/${id}/status`, { method: "POST", json: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}
