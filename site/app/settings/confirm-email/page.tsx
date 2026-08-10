import type { Metadata } from "next";
import { ConfirmEmail } from "@/components/auth/ConfirmEmail";
import type { SearchParams } from "@/lib/appState";

export const metadata: Metadata = {
  title: "Confirm your email — ai-project-bootstrap",
};

/**
 * Both halves of an email change land here — the backend mails
 * `${APP_BASE_URL}/settings/confirm-email?token=…` to the old address and the
 * new one. Deliberately outside the dashboard shell: the new address cannot
 * sign in yet, so this page must work without a session.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  return <ConfirmEmail token={token ?? ""} />;
}
