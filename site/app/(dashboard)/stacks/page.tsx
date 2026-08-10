import type { Metadata } from "next";
import { StacksListScreen } from "@/components/app/StacksScreen";
import {
  pickState,
  stacksScenes,
  type SearchParams,
  type StacksScene,
} from "@/lib/appState";

export const metadata: Metadata = {
  title: "Saved stacks — ai-project-bootstrap",
};

export default async function StacksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const scene = pickState<StacksScene>(sp.state, stacksScenes, "list");
  return <StacksListScreen key={scene} scene={scene} />;
}
