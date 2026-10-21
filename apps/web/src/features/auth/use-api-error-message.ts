"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";

/** Turns any mutation error into one sentence for a form-level alert, or null when field errors cover it. */
export function useApiErrorMessage() {
  const t = useTranslations("common");

  return (error: unknown): string | null => {
    if (!(error instanceof ApiError)) return error ? t("serverError") : null;

    switch (error.code) {
      case "validation_failed":
        return null;
      case "too_many_attempts":
      case "too_many_requests":
        return t("tooMany");
      case "network_error":
        return t("networkError");
      default:
        return error.status >= 500 ? t("serverError") : error.message;
    }
  };
}
