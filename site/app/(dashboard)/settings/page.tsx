import type { Metadata } from "next";
import { SettingsScreen } from "@/components/app/SettingsScreen";
import { settingsTabs, type SettingsTabId } from "@/content/app";
import {
  pickState,
  settingsScenes,
  type SearchParams,
  type SettingsScene,
} from "@/lib/appState";

export const metadata: Metadata = {
  title: "Settings — ai-project-bootstrap",
};

const tabIds = settingsTabs.map((t) => t.id);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  return (
    <SettingsScreen
      tab={pickState<SettingsTabId>(sp.tab, tabIds, "account")}
      scene={sp.state ? pickState<SettingsScene>(sp.state, settingsScenes, "active") : null}
    />
  );
}
