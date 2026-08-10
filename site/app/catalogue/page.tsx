import type { Metadata } from "next";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { CtaBand } from "@/components/shared/CtaBand";
import { Footer } from "@/components/shared/Footer";
import {
  CategoriesSection,
  ToolMatrixSection,
  ContractSection,
  ArchetypeSection,
} from "@/components/catalogue/CatalogueSections";

export const metadata: Metadata = {
  title: "Catalogue — ai-project-bootstrap",
  description: "Every module, and what lands in the repo.",
};

export default function CataloguePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="The catalogue"
        title="Every module, and what lands in the repo"
        lead="Sixteen categories, thirty-five modules, and the exact file contract a run produces. Generated from the manifests — a test fails CI if this drifts."
      />
      <CategoriesSection />
      <ToolMatrixSection />
      <ContractSection />
      <ArchetypeSection />
      <CtaBand
        title="Pick a stack, or let the wizard pick"
        lead="Every module on this page is free. Run the wizard and answer sixteen questions, or start from a preset and change what you disagree with."
        secondaryHref="/commands"
        secondaryLabel="See the commands →"
      />
      <Footer />
    </PageShell>
  );
}
