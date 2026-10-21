"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { currentUserKey } from "@/features/auth/queries";
import { ApiError } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    // An expired session surfaces as a 401 anywhere; refetching /me lets useRequiredUser redirect to /login.
    // A 401 from /me itself is that redirect's input; refetching it again would loop forever.
    const onError = (error: unknown, queryKey?: readonly unknown[]) => {
      const isCurrentUser = queryKey?.[0] === currentUserKey[0] && queryKey?.[1] === currentUserKey[1];
      if (error instanceof ApiError && error.status === 401 && !isCurrentUser) {
        void client.invalidateQueries({ queryKey: currentUserKey });
      }
    };

    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError: (error, query) => onError(error, query.queryKey) }),
      mutationCache: new MutationCache({ onError: (error) => onError(error) }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          // 4xx answers are final; retrying them only delays the error state.
          retry: (failureCount, error) =>
            !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
        },
      },
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
