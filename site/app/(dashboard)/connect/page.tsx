import type { Metadata } from "next";
import { ConnectScreen } from "@/components/app/ConnectScreen";
import {
  connectScenes,
  pickState,
  type ConnectScene,
  type SearchParams,
} from "@/lib/appState";

export const metadata: Metadata = {
  title: "Connect your editor — ai-project-bootstrap",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const scene = sp.state ? pickState<ConnectScene>(sp.state, connectScenes, "ok") : null;
  return <ConnectScreen key={scene ?? "live"} scene={scene} />;
}
