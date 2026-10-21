"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Membership, Organization, User } from "@/lib/types";

type OrganizationContextValue = {
  organization: Organization;
  membership: Membership;
  user: User;
  can: (permission: string) => boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({
  user,
  membership,
  children,
}: {
  user: User;
  membership: Membership & { organization: Organization };
  children: ReactNode;
}) {
  const permissions = new Set(membership.permissions ?? []);

  return (
    <OrganizationContext.Provider
      value={{ organization: membership.organization, membership, user, can: (p) => permissions.has(p) }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

/** The organisation being viewed, the viewer's membership and a permission check (UI hint only; the API enforces). */
export function useOrganization(): OrganizationContextValue {
  const value = useContext(OrganizationContext);
  if (!value) throw new Error("useOrganization must be used inside an organisation route");
  return value;
}
