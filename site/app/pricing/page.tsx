import type { Metadata } from "next";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { CtaBand } from "@/components/shared/CtaBand";
import { Footer } from "@/components/shared/Footer";
import { TiersSection, CompareSection, FaqSection, LocksSection } from "@/components/pricing/PricingSections";

export const metadata: Metadata = {
  title: "Pricing — ai-project-bootstrap",
  description: "Two tiers, and the line between them is a server.",
};

export default function PricingPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Pricing"
        title="Two tiers, and the line between them is a server"
        lead="Everything that runs on your machine is free and MIT-licensed, permanently. Everything that calls our backend is Pro, because each call spends real API budget. That is the entire rule."
      />
      <TiersSection />
      <CompareSection />
      <FaqSection />
      <LocksSection />
      <CtaBand
        title="Free is one command away"
        lead="Install nothing, sign up for nothing. Subscribe later only if you want a stack proposed from a sentence."
        secondaryHref="#stripe"
        secondaryLabel="Subscribe to Pro →"
      />
      <Footer />
    </PageShell>
  );
}
