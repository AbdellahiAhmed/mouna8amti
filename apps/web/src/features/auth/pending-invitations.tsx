"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { currentUserKey } from "./queries";

/** Seats offered by organisations: nothing opens until the person accepts. */
export function PendingInvitations({ user }: { user: User }) {
  const t = useTranslations("auth.invitation");
  const queryClient = useQueryClient();
  const router = useRouter();
  const answer = useMutation({
    mutationFn: ({ id, accept }: { id: number; slug: string; accept: boolean }) =>
      api<void>(`/auth/invitations/${id}/${accept ? "accept" : "decline"}`, { method: "POST" }),
    onSuccess: async (_, { slug, accept }) => {
      await queryClient.invalidateQueries({ queryKey: currentUserKey });
      if (accept) router.push(`/${slug}`);
    },
  });

  if (!user.invitations?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {user.invitations.map((invitation) => (
        <section key={invitation.id} className="flex flex-wrap items-center gap-4 rounded-[18px] border border-[#9cc9b6] bg-mist p-5 dark:bg-surface">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-on-primary">
            <Mail aria-hidden className="size-5" />
          </span>
          <p className="min-w-0 flex-1 text-body text-ink">
            {t.rich("pending", { organization: invitation.organization.name, b: (chunk) => <b className="font-semibold">{chunk}</b> })}
          </p>
          <div className="flex gap-2">
            <Button disabled={answer.isPending} onClick={() => answer.mutate({ id: invitation.id, slug: invitation.organization.slug, accept: true })}>
              {t("accept")}
            </Button>
            <Button variant="ghost" disabled={answer.isPending} onClick={() => answer.mutate({ id: invitation.id, slug: invitation.organization.slug, accept: false })}>
              {t("decline")}
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
