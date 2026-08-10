/**
 * Client for the hosted backend (`ai-project-bootstrap-cloud`).
 *
 * Requests go straight from the browser to the API rather than through a Next
 * route handler. That is what the backend is built for: its CORS allow-list is
 * exactly `APP_BASE_URL` with `credentials: true`, and the session cookie it
 * sets is same-site with the dashboard (`localhost` in dev, one registrable
 * domain in production), so `sameSite: lax` still sends it. A proxy would add a
 * hop and buy nothing.
 *
 * The consequence, and it is deliberate: the session cookie belongs to the API
 * origin, so Next's server cannot read it. Every dashboard screen therefore
 * loads its data client-side and shows the loading and empty states the design
 * already specifies.
 */

const DEFAULT_API_URL = "http://localhost:8787";

export function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/** Error codes the backend returns in `{ error: { code } }`. */
export type ApiErrorCode =
  | "INVALID_CONFIG"
  | "UNAUTHENTICATED"
  | "LICENSE_REQUIRED"
  | "IDEA_REQUEST_FAILED"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "NO_LICENSE"
  | "EMAIL_TAKEN"
  | "SUBSCRIPTION_ACTIVE"
  | "LINK_EXPIRED"
  | "LINK_CONSUMED"
  | "LINK_INVALID"
  | "RATE_LIMITED"
  | "OFFLINE";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly hint?: string;

  constructor(status: number, code: ApiErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.hint = hint;
  }

  /** True when the thread is intact and sending the same message again is safe. */
  get retryable(): boolean {
    return this.status === 422 || this.code === "OFFLINE";
  }
}

type ErrorBody = { error?: { code?: string; message?: string; hint?: string } };
/** `@fastify/rate-limit` answers in its own shape, not the `{ error }` envelope. */
type RateLimitBody = { statusCode?: number; error?: string; message?: string };

function toApiError(status: number, body: unknown): ApiError {
  if (status === 429) {
    const rl = body as RateLimitBody | undefined;
    return new ApiError(
      429,
      "RATE_LIMITED",
      typeof rl?.message === "string" ? rl.message : "Rate limit exceeded.",
    );
  }
  const err = (body as ErrorBody | undefined)?.error;
  const code = (typeof err?.code === "string" ? err.code : "INTERNAL_ERROR") as ApiErrorCode;
  return new ApiError(status, code, err?.message ?? `The server returned ${status}.`, err?.hint);
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method: init.method ?? "GET",
      // Without this the session cookie is neither sent nor stored.
      credentials: "include",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    // fetch only rejects on transport failure — DNS, offline, CORS preflight.
    throw new ApiError(0, "OFFLINE", "Could not reach the server.");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

/* -------------------------------------------------------------------------- */
/* Shapes, transcribed from the route handlers                                */
/* -------------------------------------------------------------------------- */

export interface Proposal {
  preset: {
    id: string;
    name: string;
    description: string;
    choices: Record<string, string | string[]>;
  };
  suggestedName?: string;
  reasoning?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  proposal?: Proposal;
  createdAt: string;
}

export type LicenseStatus = "active" | "past_due" | "canceled";

export interface Me {
  email: string;
  displayName?: string | null;
  plan: "pro" | "free";
  status: LicenseStatus | "none";
}

export interface LicenseInfo {
  /** Absent when the row predates encryption-at-rest — offer Rotate instead. */
  keyPlain?: string;
  keyMasked: string;
  recoverable: boolean;
  status: LicenseStatus;
  createdAt?: string;
  lastUsedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export const api = {
  /** Always 204 — whether the address has an account is not disclosed. */
  requestLink: (email: string) =>
    request<void>("/v1/auth/request-link", { method: "POST", body: { email } }),

  verifyLink: (token: string) =>
    request<{ user: { email?: string; displayName?: string | null } }>("/v1/auth/verify", {
      method: "POST",
      body: { token },
    }),

  signOut: () => request<{ signedOut: true }>("/v1/auth/signout", { method: "POST" }),

  me: () => request<Me>("/v1/me"),

  updateDisplayName: (displayName: string | null) =>
    request<{ email: string; displayName?: string | null }>("/v1/me", {
      method: "PATCH",
      body: { displayName },
    }),

  requestEmailChange: (newEmail: string) =>
    request<{ pending: true; newEmail: string }>("/v1/me/email", {
      method: "POST",
      body: { newEmail },
    }),

  confirmEmailChange: (token: string) =>
    request<{ confirmed: true; applied: boolean; email?: string; awaiting?: "current" | "new" }>(
      "/v1/me/email/confirm",
      { method: "POST", body: { token } },
    ),

  deleteAccount: (confirmEmail: string) =>
    request<{ deleted: true }>("/v1/me", { method: "DELETE", body: { confirmEmail } }),

  license: () => request<LicenseInfo>("/v1/license"),

  rotateLicense: () =>
    request<{ key: string; keyMasked: string }>("/v1/license/rotate", { method: "POST" }),

  /**
   * Local development only. The backend registers this route solely when its
   * `APP_BASE_URL` is `http://`, because it self-grants a subscription that no
   * payment provider knows about — it exists so the paywall can be got past in
   * the browser while real checkout is still unbuilt.
   *
   * Against a deployed API the route is absent, so this rejects with a 404 —
   * which callers use to fall back to the real pricing page rather than
   * needing to know which environment they are in.
   */
  devActivate: () => request<{ activated: true; key: string }>("/v1/billing/dev-activate", {
    method: "POST",
  }),

  getChat: () => request<{ conversationId: string | null; messages: Message[] }>("/v1/chat"),

  sendChat: (message: string) =>
    request<{ conversationId: string; reply: string; proposal?: Proposal }>("/v1/chat", {
      method: "POST",
      body: { message },
    }),

  resetChat: () => request<{ reset: true }>("/v1/chat/reset", { method: "POST" }),
};
