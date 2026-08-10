import type { Metadata } from "next";
import { ChatScreen } from "@/components/app/ChatScreen";
import { chatScenes, pickState, type ChatScene, type SearchParams } from "@/lib/appState";

export const metadata: Metadata = {
  title: "Chat — ai-project-bootstrap",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // No `?state=` means live data; with it the screen renders fixtures instead.
  const scene = sp.state ? pickState<ChatScene>(sp.state, chatScenes, "thread") : null;
  const draft = Array.isArray(sp.draft) ? sp.draft[0] : sp.draft;
  return <ChatScreen key={scene ?? "live"} scene={scene} initialDraft={draft} />;
}
