import type { Metadata } from "next";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { CtaBand } from "@/components/shared/CtaBand";
import { Footer } from "@/components/shared/Footer";
import { ProblemSection, CommandsSection, AudienceSection } from "@/components/commands/CommandsSections";

export const metadata: Metadata = {
  title: "Commands — ai-project-bootstrap",
  description: "The commands you run after the first one.",
};

export default function CommandsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Beyond generate"
        title="The commands you run after the first one"
        lead="Generating the repo is one command. Keeping it current — adding a technology, implementing a feature, reviewing what an assistant wrote — is the rest of them."
      />
      <ProblemSection />
      <CommandsSection />
      <AudienceSection />
      <CtaBand
        title="All of this is the free tier"
        lead="Every command here runs on your machine, needs no account, and is MIT-licensed. The one paid flag is --idea."
        secondaryHref="/pricing"
        secondaryLabel="See what Pro costs →"
      />
      <Footer />
    </PageShell>
  );
}
