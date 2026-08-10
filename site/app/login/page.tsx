import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { authScenes, pickState, type AuthScene, type SearchParams } from "@/lib/appState";

export const metadata: Metadata = {
  title: "Sign in — ai-project-bootstrap",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // The link interstitials are what a real magic-link redirect lands on:
  // /login?state=expired, ?state=used, ?state=session.
  const scene = pickState<AuthScene>(sp.state, authScenes, "signin");
  return <AuthScreen key={scene} scene={scene} />;
}
