"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Locale, Resource, User } from "@/lib/types";

export const currentUserKey = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: () => api<Resource<User>>("/auth/me").then((r) => r.data),
  });
}

export type LoginInput = { email: string; password: string; remember: boolean };
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  locale: Locale;
};

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api<Resource<User>>("/auth/login", { method: "POST", json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api<Resource<User>>("/auth/register", { method: "POST", json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSettled: () => queryClient.clear(),
  });
}

/** Where a signed-in user belongs: their first organisation, or onboarding if they have none. */
export function homePathFor(user: User): string {
  const organization = user.memberships?.[0]?.organization;
  return organization ? `/${organization.slug}` : "/onboarding";
}
