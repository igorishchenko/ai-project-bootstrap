import type { Metadata } from "next";
import { VerifyLink } from "@/components/auth/VerifyLink";
import type { SearchParams } from "@/lib/appState";

export const metadata: Metadata = {
  title: "Signing you in — ai-project-bootstrap",
};

/**
 * Where the emailed magic link lands: the backend builds
 * `${APP_BASE_URL}/auth/verify?token=…`. The exchange itself has to happen in
 * the browser — `POST /v1/auth/verify` sets the session cookie on the API's
 * origin, and only a browser request can receive it.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  return <VerifyLink token={token ?? ""} />;
}
