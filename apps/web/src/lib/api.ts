/**
 * Browser-side API client. Requests go to this origin and are proxied to
 * Laravel (see next.config.ts), so the Sanctum session cookie is first-party.
 */

export type ApiErrorCode =
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_state"
  | "too_many_attempts"
  | "too_many_requests"
  | "http_error"
  | "network_error"
  | "server_error";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  firstFieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readXsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function ensureCsrfCookie(force = false): Promise<void> {
  if (force || !readXsrfToken()) {
    await fetch("/sanctum/csrf-cookie", { credentials: "include" });
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", document.documentElement.lang || "ar");

  if (MUTATING.has(method)) {
    await ensureCsrfCookie(retried);
    const token = readXsrfToken();
    if (token) headers.set("X-XSRF-TOKEN", token);
  }

  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, method, headers, body, credentials: "include" });
  } catch {
    throw new ApiError(0, "network_error", "Network unreachable");
  }

  if (response.status === 204) return undefined as T;

  // 419: the XSRF cookie outlived its session (expiry, server restart). Refresh it and try once more.
  if (response.status === 419 && !retried) return api<T>(path, init, true);

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code ?? (response.status >= 500 ? "server_error" : "http_error"),
      payload?.message ?? response.statusText,
      payload?.errors ?? {},
    );
  }

  return payload as T;
}
