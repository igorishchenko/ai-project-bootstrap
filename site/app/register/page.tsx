import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { authScenes, pickState, type AuthScene, type SearchParams } from "@/lib/appState";

export const metadata: Metadata = {
  title: "Sign up — ai-project-bootstrap",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // ?state=onboard is where a confirmed sign-up link lands; ?state=nosub is a
  // confirmed account without a subscription behind it.
  const scene = pickState<AuthScene>(sp.state, authScenes, "signup");
  return <AuthScreen key={scene} scene={scene} />;
}
