import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsShell } from "@/components/docs/DocsShell";
import { ORDER, PAGES } from "@/content/docs/pages";

const DEFAULT_PAGE = "what-this-is";

export function generateStaticParams() {
  return [{ slug: [] as string[] }, ...ORDER.map((id) => ({ slug: [id] }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const id = slug?.[0] ?? DEFAULT_PAGE;
  const page = PAGES[id];
  return { title: page ? `${page.title} — ai-project-bootstrap docs` : "Docs — ai-project-bootstrap" };
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const id = slug?.[0] ?? DEFAULT_PAGE;
  if (!PAGES[id]) notFound();
  return <DocsShell pageId={id} />;
}
