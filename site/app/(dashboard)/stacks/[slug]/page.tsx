import type { Metadata } from "next";
import { StackDetailScreen } from "@/components/app/StacksScreen";

export const metadata: Metadata = {
  title: "Saved stack — ai-project-bootstrap",
};

export default async function StackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StackDetailScreen slug={slug} />;
}
